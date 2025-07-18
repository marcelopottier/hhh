-- =============================================
-- 04-cleanup-config.sql
-- Limpeza e configurações finais para o sistema
-- =============================================

-- =============================================
-- 1. LIMPEZA DE DADOS ANTIGOS (SE EXISTIREM)
-- =============================================

-- Remove tabelas da estrutura antiga se existirem
-- (Execute apenas se estiver migrando de estrutura anterior)

-- DROP TABLE IF EXISTS historico_uso CASCADE;
-- DROP TABLE IF EXISTS recursos_apoio CASCADE;  
-- DROP TABLE IF EXISTS passos_procedimento CASCADE;
-- DROP TABLE IF EXISTS procedimentos CASCADE;
-- DROP TABLE IF EXISTS categorias_problema CASCADE;

-- =============================================
-- 2. CONFIGURAÇÕES DE PERFORMANCE
-- =============================================

-- Configurações específicas para pgvector e performance
-- (Estas configurações devem ser adicionadas ao postgresql.conf)

/*
CONFIGURAÇÕES RECOMENDADAS PARA postgresql.conf:

# pgvector settings
shared_preload_libraries = 'vector'
max_connections = 100

# Memory settings para embeddings
work_mem = 256MB
shared_buffers = 512MB
effective_cache_size = 2GB

# Logging para debug
log_min_duration_statement = 1000
log_statement = 'mod'

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
*/

-- =============================================
-- 3. JOBS DE MANUTENÇÃO AUTOMÁTICA
-- =============================================

-- Função para manutenção automática diária
CREATE OR REPLACE FUNCTION daily_maintenance()
RETURNS void AS $$
BEGIN
    -- Limpa cache expirado
    PERFORM cleanup_expired_cache();
    
    -- Atualiza estatísticas das tabelas principais
    ANALYZE support_solutions;
    ANALYZE solution_embeddings;
    ANALYZE solution_interactions;
    
    -- Log da execução
    RAISE NOTICE 'Manutenção diária executada em %', NOW();
    
    -- Limpa interações muito antigas (mais de 1 ano)
    DELETE FROM solution_interactions 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Vacuum nas tabelas principais
    VACUUM ANALYZE support_solutions;
    VACUUM ANALYZE solution_embeddings;
    
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. FUNÇÕES DE MONITORAMENTO
-- =============================================

-- Função para verificar saúde do sistema
CREATE OR REPLACE FUNCTION check_system_health()
RETURNS TABLE (
    metric VARCHAR(50),
    value TEXT,
    status VARCHAR(20),
    recommendation TEXT
) AS $$
BEGIN
    -- Verificar número total de soluções
    RETURN QUERY
    SELECT 
        'total_solutions'::VARCHAR(50),
        COUNT(*)::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END::VARCHAR(20),
        CASE WHEN COUNT(*) = 0 THEN 'Nenhuma solução cadastrada' ELSE 'Sistema funcionando' END
    FROM support_solutions 
    WHERE is_active = TRUE;
    
    -- Verificar embeddings órfãos
    RETURN QUERY
    SELECT 
        'orphaned_embeddings'::VARCHAR(50),
        COUNT(*)::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::VARCHAR(20),
        CASE WHEN COUNT(*) > 0 THEN 'Limpar embeddings órfãos' ELSE 'Nenhum embedding órfão' END
    FROM solution_embeddings e
    LEFT JOIN support_solutions s ON e.solution_id = s.id
    WHERE s.id IS NULL;
    
    -- Verificar soluções sem embeddings
    RETURN QUERY
    SELECT 
        'solutions_without_embeddings'::VARCHAR(50),
        COUNT(*)::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::VARCHAR(20),
        CASE WHEN COUNT(*) > 0 THEN 'Gerar embeddings faltantes' ELSE 'Todos embeddings presentes' END
    FROM support_solutions s
    LEFT JOIN solution_embeddings e ON s.id = e.solution_id
    WHERE s.is_active = TRUE AND s.approval_status = 'approved' AND e.id IS NULL;
    
    -- Verificar tamanho do cache
    RETURN QUERY
    SELECT 
        'cache_entries'::VARCHAR(50),
        COUNT(*)::TEXT,
        CASE WHEN COUNT(*) < 1000 THEN 'OK' ELSE 'INFO' END::VARCHAR(20),
        CASE WHEN COUNT(*) >= 1000 THEN 'Considerar limpeza do cache' ELSE 'Cache em tamanho normal' END
    FROM search_cache;
    
    -- Verificar interações recentes
    RETURN QUERY
    SELECT 
        'interactions_last_7_days'::VARCHAR(50),
        COUNT(*)::TEXT,
        'INFO'::VARCHAR(20),
        'Atividade do sistema'
    FROM solution_interactions
    WHERE created_at >= NOW() - INTERVAL '7 days';
    
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. FUNÇÕES DE BACKUP E RESTORE
-- =============================================

-- Função para exportar configuração de uma solução
CREATE OR REPLACE FUNCTION export_solution(solution_uuid UUID)
RETURNS JSON AS $$
DECLARE
    solution_data JSON;
BEGIN
    SELECT row_to_json(export_row) INTO solution_data
    FROM (
        SELECT 
            s.problem_tag,
            s.step,
            s.title,
            s.introduction,
            s.problem_description,
            s.content,
            s.procedures,
            s.resources,
            s.closing_message,
            s.next_steps,
            s.tools_required,
            s.keywords,
            s.tags,
            s.category,
            s.subcategory,
            s.difficulty,
            s.estimated_time_minutes,
            s.created_by,
            s.approval_status
        FROM support_solutions s
        WHERE s.id = solution_uuid
    ) export_row;
    
    RETURN solution_data;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. SEGURANÇA E PERMISSÕES
-- =============================================

-- Criar role para aplicação
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'support_agent_app') THEN
        CREATE ROLE support_agent_app LOGIN PASSWORD 'change_this_password';
    END IF;
END
$$;

-- Permissões para a aplicação
GRANT CONNECT ON DATABASE pichau TO support_agent_app;
GRANT USAGE ON SCHEMA public TO support_agent_app;

-- Permissões nas tabelas
GRANT SELECT, INSERT, UPDATE ON support_solutions TO support_agent_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON solution_embeddings TO support_agent_app;
GRANT INSERT, SELECT ON solution_interactions TO support_agent_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON search_cache TO support_agent_app;

-- Permissões nas sequences (se houver)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO support_agent_app;

-- Permissões nas funções
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO support_agent_app;

-- =============================================
-- 7. ÍNDICES ADICIONAIS PARA PERFORMANCE
-- =============================================

-- Índice para queries por data de criação
CREATE INDEX IF NOT EXISTS idx_support_solutions_created_at 
ON support_solutions(created_at DESC) 
WHERE is_active = TRUE;

-- Índice para filtrar por múltiplas tags
CREATE INDEX IF NOT EXISTS idx_support_solutions_tags_multi 
ON support_solutions USING gin(tags) 
WHERE is_active = TRUE;

-- Índice para analytics por período
CREATE INDEX IF NOT EXISTS idx_solution_interactions_created_month 
ON solution_interactions(date_trunc('month', created_at));

-- =============================================
-- 8. CONFIGURAÇÕES INICIAIS
-- =============================================

-- Configurar timezone
SET timezone = 'America/Sao_Paulo';

-- Configurar locale para português
-- (Deve ser configurado no initdb ou postgresql.conf)
-- lc_collate = 'pt_BR.UTF-8'
-- lc_ctype = 'pt_BR.UTF-8'

-- =============================================
-- 9. VERIFICAÇÕES FINAIS
-- =============================================

-- Verificar se todas as extensões estão instaladas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE EXCEPTION 'Extensão vector não está instalada';
    END IF;
    
    RAISE NOTICE 'Sistema de suporte IA configurado com sucesso!';
    RAISE NOTICE 'Total de soluções: %', (SELECT COUNT(*) FROM support_solutions WHERE is_active = TRUE);
    RAISE NOTICE 'Embeddings pendentes: %', (SELECT COUNT(*) FROM find_solutions_needing_reembedding());
END
$$;

-- =============================================
-- 10. SCRIPT DE VERIFICAÇÃO DE INTEGRIDADE
-- =============================================

-- Função para verificar integridade dos dados
CREATE OR REPLACE FUNCTION verify_data_integrity()
RETURNS TABLE (
    check_name VARCHAR(100),
    status VARCHAR(20),
    details TEXT
) AS $$
BEGIN
    -- Verificar constraint de hash
    RETURN QUERY
    SELECT 
        'content_hash_consistency'::VARCHAR(100),
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END::VARCHAR(20),
        CASE WHEN COUNT(*) = 0 THEN 'Todos os hashes estão consistentes' 
             ELSE COUNT(*)::TEXT || ' soluções com hash inconsistente' END
    FROM support_solutions s
    WHERE s.content_hash != encode(digest(
        COALESCE(s.content, '') || 
        COALESCE(s.procedures::text, '') || 
        COALESCE(s.resources::text, '') ||
        COALESCE(s.problem_description, ''), 'sha256'), 'hex');
    
    -- Verificar referências de embeddings
    RETURN QUERY
    SELECT 
        'embedding_references'::VARCHAR(100),
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END::VARCHAR(20),
        CASE WHEN COUNT(*) = 0 THEN 'Todas as referências estão válidas'
             ELSE COUNT(*)::TEXT || ' embeddings com referências inválidas' END
    FROM solution_embeddings e
    LEFT JOIN support_solutions s ON e.solution_id = s.id
    WHERE s.id IS NULL;
    
    -- Verificar unicidade problem_tag + step
    RETURN QUERY
    SELECT 
        'unique_problem_tag_step'::VARCHAR(100),
        CASE WHEN COUNT(*) = (SELECT COUNT(DISTINCT (problem_tag, step)) FROM support_solutions WHERE is_active = TRUE) 
             THEN 'OK' ELSE 'ERROR' END::VARCHAR(20),
        'Verificação de unicidade problem_tag + step'
    FROM support_solutions
    WHERE is_active = TRUE;
    
END;
$$ LANGUAGE plpgsql;

-- Executar verificação inicial
SELECT * FROM verify_data_integrity();

-- =============================================
-- FINALIZAÇÃO
-- =============================================

/*
PRÓXIMOS PASSOS APÓS EXECUTAR ESTE SCRIPT:

1. CONFIGURAR POSTGRESQL.CONF:
   - Adicionar as configurações de performance mencionadas acima
   - Reiniciar PostgreSQL

2. EXECUTAR SCRIPT PYTHON:
   - Gerar embeddings para todas as soluções
   - Testar busca semântica

3. CONFIGURAR BACKUP:
   - Configurar backup automático do banco
   - Testar restore

4. MONITORAMENTO:
   - Configurar alertas para verificações de saúde
   - Agendar execução da manutenção diária

5. SEGURANÇA:
   - Alterar senha do role support_agent_app
   - Configurar SSL se necessário
   - Revisar permissões

6. TESTES:
   - Testar todas as funções de busca
   - Validar performance com volume de dados esperado
   - Testar cenários de erro e recovery

COMANDOS ÚTEIS:

-- Verificar saúde do sistema
SELECT * FROM check_system_health();

-- Executar manutenção manual
SELECT daily_maintenance();

-- Verificar integridade
SELECT * FROM verify_data_integrity();

-- Exportar solução
SELECT export_solution('uuid-da-solucao');

*/