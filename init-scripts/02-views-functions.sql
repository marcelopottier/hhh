CREATE OR REPLACE VIEW vw_procedimentos_completos AS
SELECT 
    p.id,
    p.titulo,
    p.descricao_problema,
    p.solucao_completa,
    p.palavras_chave,
    p.tags,
    p.dificuldade,
    p.tempo_estimado,
    c.nome as categoria,
    COALESCE(
        array_agg(
            json_build_object(
                'numero', pp.numero_passo,
                'titulo', pp.titulo_passo,
                'descricao', pp.descricao_passo,
                'tipo', pp.tipo_passo,
                'obrigatorio', pp.obrigatorio
            ) ORDER BY pp.numero_passo
        ) FILTER (WHERE pp.id IS NOT NULL),
        ARRAY[]::json[]
    ) as passos,
    COALESCE(
        array_agg(
            json_build_object(
                'tipo', ra.tipo_recurso,
                'titulo', ra.titulo,
                'url', ra.url,
                'descricao', ra.descricao
            )
        ) FILTER (WHERE ra.id IS NOT NULL),
        ARRAY[]::json[]
    ) as recursos
FROM procedimentos p
LEFT JOIN categorias_problema c ON p.categoria_id = c.id
LEFT JOIN passos_procedimento pp ON p.id = pp.procedimento_id
LEFT JOIN recursos_apoio ra ON p.id = ra.procedimento_id
WHERE p.ativo = TRUE
GROUP BY p.id, p.titulo, p.descricao_problema, p.solucao_completa, 
         p.palavras_chave, p.tags, p.dificuldade, p.tempo_estimado, c.nome;


-- Função para busca híbrida (semântica + texto)
CREATE OR REPLACE FUNCTION buscar_procedimentos(
    query_text TEXT,
    query_embedding vector(1536),
    limit_results INTEGER DEFAULT 5,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id INTEGER,
    titulo VARCHAR,
    descricao_problema TEXT,
    solucao_completa TEXT,
    similarity_score FLOAT,
    categoria VARCHAR,
    tags TEXT[]
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.titulo,
        p.descricao_problema,
        p.solucao_completa,
        (1 - (p.embedding <=> query_embedding))::FLOAT as similarity_score,
        c.nome as categoria,
        p.tags
    FROM procedimentos p
    LEFT JOIN categorias_problema c ON p.categoria_id = c.id
    WHERE 
        p.ativo = TRUE
        AND (
            -- Busca vetorial
            (1 - (p.embedding <=> query_embedding)) > similarity_threshold
            OR
            -- Busca por texto em palavras-chave e tags
            query_text ILIKE ANY(p.palavras_chave)
            OR
            p.tags && string_to_array(lower(query_text), ' ')
            OR
            -- Busca full-text na descrição do problema
            to_tsvector('portuguese', p.descricao_problema) @@ plainto_tsquery('portuguese', query_text)
        )
    ORDER BY similarity_score DESC
    LIMIT limit_results;
END;
$ LANGUAGE plpgsql;