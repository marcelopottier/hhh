-- =============================================
-- 03-dados-iniciais.sql - REFATORADO
-- Migração dos dados existentes para nova estrutura
-- =============================================

-- =============================================
-- 1. INSERÇÃO DA SOLUÇÃO PRINCIPAL: NÃO DÁ VÍDEO
-- =============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO support_solutions (
    problem_tag,
    step,
    title,
    introduction,
    problem_description,
    content,
    procedures,
    resources,
    closing_message,
    next_steps,
    tools_required,
    keywords,
    tags,
    category,
    subcategory,
    difficulty,
    estimated_time_minutes,
    created_by
) VALUES (
    'nao_da_video',
    1,
    'Computador não liga ou não dá vídeo - Testes iniciais',
    'Vou te passar alguns testes para que possamos descartar algumas possíveis causas. Ao final da listagem estou te enviando alguns links de vídeos que podem auxiliar no processo ok?',
    'Computador apresenta problemas para inicializar, não exibe imagem no monitor ou não responde ao pressionar o botão de energia',
    E'Por gentileza:\n\n' ||
    E'• Remova as memórias e utilize uma borracha branca ou folha de papel para realizar a limpeza dos contatos da memória (parte dourada/amarela).\n' ||
    E'• Verifique o encaixe da(s) memória(s) e troque-as de slot para verificar se o computador passa a funcionar.\n' ||
    E'• Se o seu computador tiver 2 módulos de memória, utilize apenas uma de cada vez para testes.\n' ||
    E'• Verifique se os cabos da fonte estão bem encaixados nos componentes e na placa-mãe: conector de 24 pinos e conector de alimentação do processador.\n' ||
    E'• Verifique se o dissipador de calor do processador está bem encaixado.\n' ||
    E'• Tente ligar com outro cabo de energia ou em outra tomada/filtro de linha. Evite utilizar adaptadores.\n' ||
    E'• Tente estar utilizando em outro monitor/televisor.\n' ||
    E'• Tente utilizar outro cabo em sua conexão de vídeo do pc/monitor.\n' ||
    E'• Evite utilizar adaptadores ou conversores em cabos de vídeo.\n\n' ||
    E'Se estiver tudo certo tente resetar a BIOS; Por gentileza, siga as seguintes etapas:\n' ||
    E'1 - Primeiramente desligue o computador e desconecte todos os cabos da parte traseira, incluindo o cabo de alimentação.\n' ||
    E'2 - Após isso localize a bateria da Placa mãe. Ela tem um formato circular e normalmente fica próxima ao SLOT PCI da placa de vídeo.\n' ||
    E'3 - Uma vez localizada a bateria, empurre a trava que prende a bateria para remove-la da placa mãe.\n' ||
    E'4 - Uma vez removida a bateria, pressione o botão LIGAR do gabinete por 15 segundos pelo menos e solte.\n' ||
    E'5 - Após isso recoloque a bateria do computador e tente ligar o PC novamente.\n\n' ||
    E'Lembre-se de desconectar o computador da tomada antes de trabalhar em sua placa-mãe e manusear a bateria com cuidado.',
    '[
        {
            "order": 1,
            "category": "memory",
            "instruction": "Remova as memórias e utilize uma borracha branca ou folha de papel para realizar a limpeza dos contatos da memória (parte dourada/amarela).",
            "type": "acao",
            "safety_warning": "Desligue o computador antes de manusear componentes internos",
            "estimated_minutes": 5
        },
        {
            "order": 2,
            "category": "memory",
            "instruction": "Verifique o encaixe da(s) memória(s) e troque-as de slot para verificar se o computador passa a funcionar.",
            "type": "verificacao",
            "estimated_minutes": 3
        },
        {
            "order": 3,
            "category": "memory",
            "instruction": "Se o seu computador tiver 2 módulos de memória, utilize apenas uma de cada vez para testes.",
            "type": "acao",
            "estimated_minutes": 5
        },
        {
            "order": 4,
            "category": "power",
            "instruction": "Verifique se os cabos da fonte estão bem encaixados nos componentes e na placa-mãe: conector de 24 pinos e conector de alimentação do processador.",
            "type": "verificacao",
            "estimated_minutes": 3
        },
        {
            "order": 5,
            "category": "cooling",
            "instruction": "Verifique se o dissipador de calor do processador está bem encaixado.",
            "type": "verificacao",
            "estimated_minutes": 2
        },
        {
            "order": 6,
            "category": "power",
            "instruction": "Tente ligar com outro cabo de energia ou em outra tomada/filtro de linha. Evite utilizar adaptadores.",
            "type": "acao",
            "estimated_minutes": 2
        },
        {
            "order": 7,
            "category": "display",
            "instruction": "Tente estar utilizando em outro monitor/televisor.",
            "type": "acao",
            "estimated_minutes": 3
        },
        {
            "order": 8,
            "category": "display",
            "instruction": "Tente utilizar outro cabo em sua conexão de vídeo do pc/monitor. Evite utilizar adaptadores ou conversores em cabos de vídeo.",
            "type": "acao",
            "estimated_minutes": 3
        },
        {
            "order": 9,
            "category": "bios",
            "instruction": "Primeiramente desligue o computador e desconecte todos os cabos da parte traseira, incluindo o cabo de alimentação.",
            "type": "preparacao",
            "safety_warning": "Certifique-se de que o computador está completamente desligado",
            "estimated_minutes": 2
        },
        {
            "order": 10,
            "category": "bios",
            "instruction": "Após isso localize a bateria da Placa mãe. Ela tem um formato circular e normalmente fica próxima ao SLOT PCI da placa de vídeo.",
            "type": "localizacao",
            "estimated_minutes": 3
        },
        {
            "order": 11,
            "category": "bios",
            "instruction": "Uma vez localizada a bateria, empurre a trava que prende a bateria para remove-la da placa mãe.",
            "type": "acao",
            "safety_warning": "Manuseie a bateria com cuidado",
            "estimated_minutes": 2
        },
        {
            "order": 12,
            "category": "bios",
            "instruction": "Uma vez removida a bateria, pressione o botão LIGAR do gabinete por 15 segundos pelo menos e solte.",
            "type": "acao",
            "estimated_minutes": 1
        },
        {
            "order": 13,
            "category": "bios",
            "instruction": "Após isso recoloque a bateria do computador e tente ligar o PC novamente.",
            "type": "finalizacao",
            "estimated_minutes": 3
        }
    ]'::jsonb,
    '[
        {
            "type": "video",
            "title": "Retirando a memória RAM",
            "url": "https://youtu.be/UU_KTI3IjQY",
            "description": "Vídeo demonstrando como remover corretamente os módulos de memória RAM",
            "category": "memory",
            "duration_seconds": 180
        },
        {
            "type": "video", 
            "title": "Limpando a memória RAM",
            "url": "https://youtu.be/ds0Dz957rJo",
            "description": "Como limpar adequadamente os contatos dourados da memória RAM",
            "category": "memory",
            "duration_seconds": 120
        },
        {
            "type": "guide",
            "title": "Localização da bateria CMOS",
            "description": "Guia visual para localizar a bateria da placa-mãe",
            "category": "bios"
        }
    ]'::jsonb,
    'Estarei aguardando seu retorno com os resultados dos procedimentos. Qualquer dúvida estou à disposição!',
    ARRAY['nao_da_video_step_2'],
    ARRAY['borracha_branca', 'papel', 'cabo_energia_extra', 'monitor_extra', 'cabo_video_extra'],
    ARRAY['não liga', 'não dá vídeo', 'tela preta', 'não inicializa', 'memória RAM', 'fonte', 'BIOS', 'boot', 'inicialização'],
    ARRAY['hardware', 'inicializacao', 'memoria', 'fonte', 'bios', 'troubleshooting', 'boot_issues'],
    'hardware',
    'boot_issues',
    3, -- dificuldade média
    25, -- 25 minutos estimados
    'admin'
);

-- =============================================
-- 2. INSERÇÃO DE OUTRAS SOLUÇÕES DE EXEMPLO
-- =============================================

-- Solução 2: Computador desligando sozinho
INSERT INTO support_solutions (
    problem_tag,
    step,
    title,
    introduction,
    problem_description,
    content,
    procedures,
    resources,
    closing_message,
    keywords,
    tags,
    category,
    subcategory,
    difficulty,
    estimated_time_minutes,
    created_by
) VALUES (
    'desliga_sozinho',
    1,
    'Computador desligando automaticamente - Verificação de temperatura',
    'Vamos verificar se o problema está relacionado ao superaquecimento dos componentes.',
    'PC desliga automaticamente durante uso, especialmente em jogos ou tarefas pesadas',
    E'Vamos seguir alguns passos para verificar a temperatura e sistema de refrigeração:\n\n' ||
    E'• Baixe e instale um software de monitoramento de temperatura (como HWMonitor ou Core Temp)\n' ||
    E'• Observe as temperaturas do processador e placa de vídeo durante uso normal\n' ||
    E'• Verifique se os coolers estão funcionando (girando) quando o computador está ligado\n' ||
    E'• Limpe o pó acumulado nos coolers e dissipadores usando ar comprimido\n' ||
    E'• Verifique se a pasta térmica do processador não está ressecada\n' ||
    E'• Teste o computador após a limpeza',
    '[
        {
            "order": 1,
            "category": "monitoring",
            "instruction": "Baixe e instale um software de monitoramento de temperatura como HWMonitor ou Core Temp",
            "type": "acao",
            "estimated_minutes": 5
        },
        {
            "order": 2,
            "category": "monitoring",
            "instruction": "Execute o software e observe as temperaturas durante 10 minutos de uso normal",
            "type": "observacao",
            "estimated_minutes": 10
        },
        {
            "order": 3,
            "category": "hardware",
            "instruction": "Verifique visualmente se todos os coolers estão girando quando o computador está ligado",
            "type": "verificacao",
            "estimated_minutes": 2
        },
        {
            "order": 4,
            "category": "cleaning",
            "instruction": "Desligue o computador e limpe o pó dos coolers e dissipadores com ar comprimido",
            "type": "acao",
            "safety_warning": "Desligue o computador e desconecte da tomada antes da limpeza",
            "estimated_minutes": 10
        }
    ]'::jsonb,
    '[
        {
            "type": "software",
            "title": "HWMonitor",
            "url": "https://www.cpuid.com/softwares/hwmonitor.html",
            "description": "Software gratuito para monitoramento de temperatura",
            "category": "monitoring"
        },
        {
            "type": "video",
            "title": "Como limpar computador - Remoção de poeira",
            "description": "Tutorial para limpeza adequada dos componentes internos",
            "category": "cleaning"
        }
    ]'::jsonb,
    'Após realizar estes procedimentos, monitore o comportamento do computador. Se o problema persistir, pode ser necessário trocar a pasta térmica ou verificar a fonte de alimentação.',
    ARRAY['desliga sozinho', 'superaquecimento', 'temperatura alta', 'cooler', 'travamento', 'shutdown'],
    ARRAY['hardware', 'temperatura', 'cooler', 'limpeza', 'monitoramento'],
    'hardware',
    'temperature_issues',
    2, -- dificuldade baixa
    30, -- 30 minutos
    'admin'
);

-- Solução 3: Tela azul (BSOD)
INSERT INTO support_solutions (
    problem_tag,
    step,
    title,
    introduction,
    problem_description,
    content,
    procedures,
    resources,
    closing_message,
    keywords,
    tags,
    category,
    subcategory,
    difficulty,
    estimated_time_minutes,
    created_by
) VALUES (
    'tela_azul_bsod',
    1,
    'Tela azul (BSOD) - Diagnóstico inicial',
    'Vamos identificar a causa da tela azul e realizar os primeiros procedimentos de correção.',
    'Sistema apresenta tela azul da morte (Blue Screen of Death) com frequência durante o uso',
    E'A tela azul pode ter várias causas. Vamos seguir uma sequência de diagnóstico:\n\n' ||
    E'• Anote o código de erro que aparece na tela azul (ex: SYSTEM_THREAD_EXCEPTION_NOT_HANDLED)\n' ||
    E'• Execute o Verificador de Arquivos do Sistema (sfc /scannow)\n' ||
    E'• Execute o verificador de memória do Windows (mdsched.exe)\n' ||
    E'• Verifique se há drivers desatualizados no Gerenciador de Dispositivos\n' ||
    E'• Desinstale programas instalados recentemente\n' ||
    E'• Execute o verificador de disco (chkdsk)',
    '[
        {
            "order": 1,
            "category": "diagnosis",
            "instruction": "Anote o código de erro completo que aparece na tela azul",
            "type": "observacao",
            "estimated_minutes": 2
        },
        {
            "order": 2,
            "category": "system",
            "instruction": "Abra o Prompt de Comando como Administrador e execute: sfc /scannow",
            "type": "acao",
            "estimated_minutes": 15
        },
        {
            "order": 3,
            "category": "memory",
            "instruction": "Execute o comando mdsched.exe para testar a memória RAM",
            "type": "acao",
            "estimated_minutes": 30
        },
        {
            "order": 4,
            "category": "drivers",
            "instruction": "Verifique no Gerenciador de Dispositivos se há dispositivos com problema (ícone amarelo)",
            "type": "verificacao",
            "estimated_minutes": 5
        }
    ]'::jsonb,
    '[
        {
            "type": "guide",
            "title": "Códigos de erro BSOD mais comuns",
            "description": "Lista dos códigos de erro mais frequentes e suas causas",
            "category": "reference"
        },
        {
            "type": "tool",
            "title": "BlueScreenView",
            "description": "Ferramenta para analisar dumps de tela azul",
            "category": "diagnosis"
        }
    ]'::jsonb,
    'Após executar estes procedimentos, reinicie o computador e observe se o problema persiste. Se continuar, pode ser necessário fazer análise mais aprofundada dos drivers ou hardware.',
    ARRAY['tela azul', 'BSOD', 'blue screen', 'crash', 'erro sistema', 'travamento'],
    ARRAY['software', 'drivers', 'sistema', 'memoria', 'diagnostico'],
    'software',
    'system_errors',
    4, -- dificuldade alta
    60, -- 60 minutos
    'admin'
);

-- =============================================
-- 3. DADOS PARA TESTES E DEMONSTRAÇÃO
-- =============================================

-- Inserir algumas interações de exemplo para analytics
INSERT INTO solution_interactions (
    solution_id,
    user_query,
    user_query_hash,
    similarity_score,
    was_helpful,
    user_feedback,
    session_id,
    resolution_time_minutes
) 
SELECT 
    s.id,
    'meu computador não liga',
    encode(digest('meu computador não liga', 'sha256'), 'hex'),
    0.85,
    true,
    'Funcionou perfeitamente, obrigado!',
    'session_' || random()::text,
    20
FROM support_solutions s 
WHERE s.problem_tag = 'nao_da_video'
LIMIT 1;

INSERT INTO solution_interactions (
    solution_id,
    user_query,
    user_query_hash,
    similarity_score,
    was_helpful,
    user_feedback,
    session_id,
    resolution_time_minutes
)
SELECT 
    s.id,
    'pc desligando sozinho',
    encode(digest('pc desligando sozinho', 'sha256'), 'hex'),
    0.92,
    true,
    'O problema era mesmo temperatura, resolvido!',
    'session_' || random()::text,
    25
FROM support_solutions s 
WHERE s.problem_tag = 'desliga_sozinho'
LIMIT 1;

-- =============================================
-- 4. ATUALIZAÇÃO DE CONTADORES
-- =============================================

-- Atualizar contadores de uso baseado nas interações inseridas
UPDATE support_solutions 
SET usage_count = (
    SELECT COUNT(*) 
    FROM solution_interactions 
    WHERE solution_id = support_solutions.id
),
success_rate = (
    SELECT COALESCE(
        ROUND(
            (COUNT(CASE WHEN was_helpful = true THEN 1 END)::DECIMAL / 
             NULLIF(COUNT(*), 0)) * 100, 2
        ), 0
    )
    FROM solution_interactions 
    WHERE solution_id = support_solutions.id
);

-- =============================================
-- 5. COMENTÁRIOS E OBSERVAÇÕES
-- =============================================

/*
NOTAS IMPORTANTES SOBRE A MIGRAÇÃO:

1. ESTRUTURA DE DADOS:
   - Os dados foram migrados da estrutura antiga (tabelas separadas) para a nova estrutura unificada
   - Procedures agora são armazenados como JSONB dentro da tabela support_solutions
   - Resources também são JSONB, permitindo mais flexibilidade

2. COMPATIBILIDADE:
   - Views de compatibilidade foram criadas (vw_procedimentos_completos)
   - Funções antigas (buscar_procedimentos) foram adaptadas para nova estrutura
   - IDs são UUID na nova estrutura, mas views fazem cast para INTEGER quando necessário

3. EMBEDDINGS:
   - Estrutura preparada para embeddings, mas será necessário popular com script
   - Diferentes tipos de embedding: full_content, keywords, title, problem_description
   - Sistema de hash para controlar quando reprocessar embeddings

4. NEXT STEPS:
   - Executar script para gerar embeddings iniciais
   - Configurar rotina de backup
   - Implementar monitoramento de performance das buscas semânticas
   - Ajustar parâmetros do índice ivfflat conforme volume de dados cresce

5. PERFORMANCE:
   - Índices otimizados para diferentes tipos de busca
   - Cache de buscas implementado
   - Full-text search em português configurado

6. ANALYTICS:
   - Sistema completo de tracking de interações
   - Métricas de sucesso e tempo de resolução
   - Views de analytics prontas para dashboards
*/