-- =============================================
-- 02-views-functions.sql - REFATORADO
-- Views e funções otimizadas para Agent IA
-- =============================================

-- =============================================
-- 1. VIEWS PRINCIPAIS
-- =============================================

-- View para soluções aprovadas com embeddings
CREATE VIEW approved_solutions_with_embeddings AS
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
CREATE VIEW solution_analytics AS
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
CREATE VIEW vw_procedimentos_completos AS
SELECT 
    s.id::INTEGER, -- Cast para compatibilidade
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
CREATE OR REPLACE FUNCTION semantic_search(
    query_embedding VECTOR(1536),
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
    RETURN QUERY
    SELECT DISTINCT
        s.id,
        s.problem_tag,
        s.step,
        s.title,
        s.content,
        (1 - (e.embedding <=> query_embedding))::DECIMAL as similarity_score,
        s.category,
        s.difficulty,
        s.estimated_time_minutes,
        s.procedures,
        s.resources,
        s.keywords,
        s.tags
    FROM support_solutions s
    JOIN solution_embeddings e ON s.id = e.solution_id
    WHERE 
        s.approval_status = 'approved'
        AND s.is_active = TRUE
        AND e.embedding_type = ANY(embedding_types)
        AND (1 - (e.embedding <=> query_embedding)) >= similarity_threshold
        AND (filter_category IS NULL OR s.category = filter_category)
        AND (filter_problem_tag IS NULL OR s.problem_tag = filter_problem_tag)
        AND (filter_difficulty IS NULL OR s.difficulty = filter_difficulty)
    ORDER BY similarity_score DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Função híbrida (semântica + texto) - compatibilidade com estrutura antiga
CREATE OR REPLACE FUNCTION buscar_procedimentos(
    query_text TEXT,
    query_embedding VECTOR(1536) DEFAULT NULL,
    limit_results INTEGER DEFAULT 5,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id INTEGER,
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
        s.id::INTEGER, -- Cast para compatibilidade
        s.title,
        s.problem_description,
        s.content,
        CASE 
            WHEN query_embedding IS NOT NULL THEN 
                (1 - (e.embedding <=> query_embedding))::FLOAT
            ELSE 0.0
        END as similarity_score,
        s.category,
        s.tags
    FROM support_solutions s
    LEFT JOIN solution_embeddings e ON s.id = e.solution_id 
        AND e.embedding_type = 'full_content'
    WHERE 
        s.approval_status = 'approved'
        AND s.is_active = TRUE
        AND (
            -- Busca vetorial (se embedding fornecido)
            (query_embedding IS NOT NULL AND 
             (1 - (e.embedding <=> query_embedding)) > similarity_threshold)
            OR
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
    DELETE FROM search_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
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
-- 6. ÍNDICES FULL-TEXT SEARCH
-- =============================================

-- Índices para busca full-text em português
CREATE INDEX idx_support_solutions_content_fts 
    ON support_solutions USING gin(to_tsvector('portuguese', content));

CREATE INDEX idx_support_solutions_problem_desc_fts 
    ON support_solutions USING gin(to_tsvector('portuguese', COALESCE(problem_description, '')));

CREATE INDEX idx_support_solutions_title_fts 
    ON support_solutions USING gin(to_tsvector('portuguese', title));