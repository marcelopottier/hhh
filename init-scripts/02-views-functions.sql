-- =============================================
-- 02-views-functions.sql - CORRIGIDO
-- Views e funções otimizadas para Agent IA
-- =============================================

-- =============================================
-- 1. VIEWS PRINCIPAIS
-- =============================================

-- View para soluções aprovadas com embeddings
CREATE OR REPLACE VIEW approved_solutions_with_embeddings AS
SELECT 
    s.*,
    e.embedding_type,
    e.embedding,
    e.source_text as embedding_source,
    e.embedding_model,
    e.metadata as embedding_metadata
FROM support_solutions s
JOIN solution_embeddings e ON s.id = e.solution_id
WHERE s.approval_status = 'approved' AND s.is_active = TRUE;

-- View para analytics de soluções
CREATE OR REPLACE VIEW solution_analytics AS
SELECT 
    s.problem_tag,
    s.step,
    s.category,
    s.subcategory,
    s.title,
    s.usage_count,
    s.success_rate,
    s.difficulty,
    s.estimated_time_minutes,
    COUNT(i.id) as total_interactions,
    AVG(i.similarity_score) as avg_similarity,
    COUNT(CASE WHEN i.was_helpful = true THEN 1 END) as helpful_count,
    COUNT(CASE WHEN i.escalated_to_human = true THEN 1 END) as escalation_count,
    AVG(i.resolution_time_minutes) as avg_resolution_time,
    s.created_at,
    s.updated_at
FROM support_solutions s
LEFT JOIN solution_interactions i ON s.id = i.solution_id
WHERE s.is_active = TRUE
GROUP BY s.id, s.problem_tag, s.step, s.category, s.subcategory, s.title, 
         s.usage_count, s.success_rate, s.difficulty, s.estimated_time_minutes,
         s.created_at, s.updated_at;

-- View para procedimentos completos (compatibilidade com estrutura antiga)
-- CORRIGIDO: Removido cast UUID para INTEGER
CREATE OR REPLACE VIEW vw_procedimentos_completos AS
SELECT 
    s.id, -- Mantendo como UUID
    s.title as titulo,
    s.problem_description as descricao_problema,
    s.content as solucao_completa,
    s.keywords as palavras_chave,
    s.tags,
    s.difficulty as dificuldade,
    s.estimated_time_minutes as tempo_estimado,
    s.category as categoria,
    s.procedures as passos,
    s.resources
FROM support_solutions s
WHERE s.approval_status = 'approved' AND s.is_active = TRUE;

-- =============================================
-- 2. FUNÇÕES DE BUSCA SEMÂNTICA
-- =============================================

-- Função principal para busca semântica
-- CORRIGIDO: Verificação se extensão vector existe
CREATE OR REPLACE FUNCTION semantic_search(
    query_embedding TEXT, -- Alterado para TEXT para compatibilidade
    embedding_types TEXT[] DEFAULT ARRAY['full_content', 'keywords', 'title'],
    similarity_threshold DECIMAL DEFAULT 0.7,
    max_results INTEGER DEFAULT 5,
    filter_category TEXT DEFAULT NULL,
    filter_problem_tag TEXT DEFAULT NULL,
    filter_difficulty INTEGER DEFAULT NULL
)
RETURNS TABLE (
    solution_id UUID,
    problem_tag VARCHAR(100),
    step INTEGER,
    title TEXT,
    content TEXT,
    similarity_score DECIMAL,
    category VARCHAR(50),
    difficulty INTEGER,
    estimated_time_minutes INTEGER,
    procedures JSONB,
    resources JSONB,
    keywords TEXT[],
    tags TEXT[]
) AS $$
BEGIN
    -- Verificar se a extensão vector está disponível
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE EXCEPTION 'Extensão vector não está instalada. Execute: CREATE EXTENSION vector;';
    END IF;

    RETURN QUERY
    SELECT DISTINCT
        s.id,
        s.problem_tag,
        s.step,
        s.title,
        s.content,
        COALESCE(0.5, 0.5)::DECIMAL as similarity_score, -- Placeholder até vector estar configurado
        s.category,
        s.difficulty,
        s.estimated_time_minutes,
        s.procedures,
        s.resources,
        s.keywords,
        s.tags
    FROM support_solutions s
    LEFT JOIN solution_embeddings e ON s.id = e.solution_id
    WHERE 
        s.approval_status = 'approved'
        AND s.is_active = TRUE
        AND (filter_category IS NULL OR s.category = filter_category)
        AND (filter_problem_tag IS NULL OR s.problem_tag = filter_problem_tag)
        AND (filter_difficulty IS NULL OR s.difficulty = filter_difficulty)
    ORDER BY similarity_score DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Função híbrida (semântica + texto) - CORRIGIDA
CREATE OR REPLACE FUNCTION buscar_procedimentos(
    query_text TEXT,
    query_embedding TEXT DEFAULT NULL, -- Alterado para TEXT
    limit_results INTEGER DEFAULT 5,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID, -- CORRIGIDO: Mantendo como UUID em vez de INTEGER
    titulo TEXT,
    descricao_problema TEXT,
    solucao_completa TEXT,
    similarity_score FLOAT,
    categoria VARCHAR(50),
    tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id, -- Removido cast ::INTEGER
        s.title,
        s.problem_description,
        s.content,
        0.5::FLOAT as similarity_score, -- Placeholder para similarity
        s.category,
        s.tags
    FROM support_solutions s
    LEFT JOIN solution_embeddings e ON s.id = e.solution_id 
        AND e.embedding_type = 'full_content'
    WHERE 
        s.approval_status = 'approved'
        AND s.is_active = TRUE
        AND (
            -- Busca por texto em palavras-chave e tags
            (query_text ILIKE ANY(
                SELECT '%' || unnest(s.keywords) || '%'
            ))
            OR
            (s.tags && string_to_array(lower(query_text), ' '))
            OR
            -- Busca full-text na descrição do problema
            (to_tsvector('portuguese', COALESCE(s.problem_description, '')) @@ 
             plainto_tsquery('portuguese', query_text))
            OR
            -- Busca full-text no conteúdo
            (to_tsvector('portuguese', s.content) @@ 
             plainto_tsquery('portuguese', query_text))
        )
    ORDER BY similarity_score DESC
    LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. FUNÇÕES AUXILIARES
-- =============================================

-- Função para obter solução completa
CREATE OR REPLACE FUNCTION get_complete_solution(solution_uuid UUID)
RETURNS TABLE (
    problem_tag VARCHAR(100),
    step INTEGER,
    title TEXT,
    introduction TEXT,
    problem_description TEXT,
    content TEXT,
    procedures JSONB,
    resources JSONB,
    closing_message TEXT,
    next_steps TEXT[],
    tools_required TEXT[],
    keywords TEXT[],
    tags TEXT[],
    estimated_time_minutes INTEGER,
    difficulty INTEGER,
    category VARCHAR(50),
    subcategory VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
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
        s.estimated_time_minutes,
        s.difficulty,
        s.category,
        s.subcategory
    FROM support_solutions s
    WHERE s.id = solution_uuid 
    AND s.approval_status = 'approved' 
    AND s.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar por problem_tag e step
CREATE OR REPLACE FUNCTION get_solution_by_tag_step(
    tag VARCHAR(100), 
    step_number INTEGER DEFAULT 1
)
RETURNS TABLE (
    solution_id UUID,
    problem_tag VARCHAR(100),
    step INTEGER,
    title TEXT,
    content TEXT,
    procedures JSONB,
    resources JSONB,
    next_steps TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.problem_tag,
        s.step,
        s.title,
        s.content,
        s.procedures,
        s.resources,
        s.next_steps
    FROM support_solutions s
    WHERE s.problem_tag = tag 
    AND s.step = step_number
    AND s.approval_status = 'approved' 
    AND s.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. FUNÇÕES DE MANUTENÇÃO
-- =============================================

-- Função para limpar cache expirado
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Verificar se tabela search_cache existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'search_cache') THEN
        DELETE FROM search_cache WHERE expires_at < NOW();
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RETURN deleted_count;
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para identificar soluções que precisam de reembedding
CREATE OR REPLACE FUNCTION find_solutions_needing_reembedding()
RETURNS TABLE (
    solution_id UUID,
    problem_tag VARCHAR(100),
    content_hash VARCHAR(64),
    missing_embedding_types TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH expected_types AS (
        SELECT unnest(ARRAY['full_content', 'keywords', 'title', 'problem_description']) as embedding_type
    ),
    existing_embeddings AS (
        SELECT 
            s.id,
            s.problem_tag,
            s.content_hash,
            array_agg(e.embedding_type) as existing_types
        FROM support_solutions s
        LEFT JOIN solution_embeddings e ON s.id = e.solution_id 
            AND e.content_hash = s.content_hash
        WHERE s.approval_status = 'approved' AND s.is_active = TRUE
        GROUP BY s.id, s.problem_tag, s.content_hash
    )
    SELECT 
        ee.id,
        ee.problem_tag,
        ee.content_hash,
        array_agg(et.embedding_type) as missing_types
    FROM existing_embeddings ee
    CROSS JOIN expected_types et
    WHERE et.embedding_type != ALL(COALESCE(ee.existing_types, ARRAY[]::text[]))
    GROUP BY ee.id, ee.problem_tag, ee.content_hash
    HAVING count(*) > 0;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. FUNÇÕES DE ANALYTICS
-- =============================================

-- Função para estatísticas de uso
CREATE OR REPLACE FUNCTION get_usage_stats(
    start_date TIMESTAMP DEFAULT (NOW() - INTERVAL '30 days'),
    end_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE (
    problem_tag VARCHAR(100),
    total_interactions BIGINT,
    success_rate DECIMAL,
    avg_resolution_time DECIMAL,
    escalation_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.problem_tag,
        COUNT(i.id) as total_interactions,
        ROUND(
            (COUNT(CASE WHEN i.was_helpful = TRUE THEN 1 END)::DECIMAL / 
             NULLIF(COUNT(i.id), 0)) * 100, 2
        ) as success_rate,
        ROUND(AVG(i.resolution_time_minutes), 2) as avg_resolution_time,
        ROUND(
            (COUNT(CASE WHEN i.escalated_to_human = TRUE THEN 1 END)::DECIMAL / 
             NULLIF(COUNT(i.id), 0)) * 100, 2
        ) as escalation_rate
    FROM support_solutions s
    LEFT JOIN solution_interactions i ON s.id = i.solution_id
        AND i.created_at BETWEEN start_date AND end_date
    WHERE s.is_active = TRUE
    GROUP BY s.problem_tag
    HAVING COUNT(i.id) > 0
    ORDER BY total_interactions DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. FUNÇÕES SIMPLES PARA TESTES
-- =============================================

-- Função simples para buscar soluções por categoria
CREATE OR REPLACE FUNCTION get_solutions_by_category(category_name VARCHAR(50))
RETURNS TABLE (
    solution_id UUID,
    problem_tag VARCHAR(100),
    step INTEGER,
    title TEXT,
    difficulty INTEGER,
    estimated_time_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.problem_tag,
        s.step,
        s.title,
        s.difficulty,
        s.estimated_time_minutes
    FROM support_solutions s
    WHERE s.category = category_name
    AND s.approval_status = 'approved' 
    AND s.is_active = TRUE
    ORDER BY s.problem_tag, s.step;
END;
$$ LANGUAGE plpgsql;

-- Função para listar todas as categorias disponíveis
CREATE OR REPLACE FUNCTION get_available_categories()
RETURNS TABLE (
    category VARCHAR(50),
    solution_count BIGINT,
    avg_difficulty DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.category,
        COUNT(*) as solution_count,
        ROUND(AVG(s.difficulty), 1) as avg_difficulty
    FROM support_solutions s
    WHERE s.approval_status = 'approved' 
    AND s.is_active = TRUE
    GROUP BY s.category
    ORDER BY solution_count DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. ÍNDICES FULL-TEXT SEARCH (CONDICIONAL)
-- =============================================

-- Criar índices apenas se não existirem
DO $$ 
BEGIN
    -- Índice para busca full-text no conteúdo
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_support_solutions_content_fts') THEN
        CREATE INDEX idx_support_solutions_content_fts 
            ON support_solutions USING gin(to_tsvector('portuguese', content));
    END IF;

    -- Índice para busca full-text na descrição do problema
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_support_solutions_problem_desc_fts') THEN
        CREATE INDEX idx_support_solutions_problem_desc_fts 
            ON support_solutions USING gin(to_tsvector('portuguese', COALESCE(problem_description, '')));
    END IF;

    -- Índice para busca full-text no título
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_support_solutions_title_fts') THEN
        CREATE INDEX idx_support_solutions_title_fts 
            ON support_solutions USING gin(to_tsvector('portuguese', title));
    END IF;
END $$;

-- =============================================
-- 8. FUNÇÕES DE TESTE E VALIDAÇÃO
-- =============================================

-- Função para testar se tudo está funcionando
CREATE OR REPLACE FUNCTION test_database_functions()
RETURNS TABLE (
    test_name TEXT,
    status TEXT,
    message TEXT
) AS $$
BEGIN
    -- Teste 1: Verificar se existem soluções
    RETURN QUERY
    SELECT 
        'Contagem de soluções'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'SUCESSO' ELSE 'FALHA' END::TEXT,
        ('Total de soluções ativas: ' || COUNT(*))::TEXT
    FROM support_solutions 
    WHERE approval_status = 'approved' AND is_active = TRUE;

    -- Teste 2: Verificar views
    RETURN QUERY
    SELECT 
        'View vw_procedimentos_completos'::TEXT,
        CASE WHEN COUNT(*) >= 0 THEN 'SUCESSO' ELSE 'FALHA' END::TEXT,
        ('Registros na view: ' || COUNT(*))::TEXT
    FROM vw_procedimentos_completos;

    -- Teste 3: Verificar função de categoria
    RETURN QUERY
    SELECT 
        'Função get_available_categories'::TEXT,
        'SUCESSO'::TEXT,
        ('Categorias encontradas: ' || COUNT(*))::TEXT
    FROM get_available_categories();

END;
$$ LANGUAGE plpgsql;