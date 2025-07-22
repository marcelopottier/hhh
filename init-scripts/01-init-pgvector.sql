CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================
-- 1. TABELA PRINCIPAL DE SOLUÇÕES (REFATORADA)
-- =============================================

CREATE TABLE support_solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_tag VARCHAR(100) NOT NULL,
    step INTEGER NOT NULL DEFAULT 1,
    
    -- Controle de conteúdo e versioning
    content_hash VARCHAR(64) NULL,
    content_version INTEGER DEFAULT 1,
    
    -- Metadados de classificação
    category VARCHAR(50),
    subcategory VARCHAR(50),
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5), -- 1=fácil, 5=difícil
    estimated_time_minutes INTEGER,
    
    -- Conteúdo estruturado
    title TEXT NOT NULL,
    introduction TEXT,
    problem_description TEXT, -- Descrição do problema
    content TEXT NOT NULL, -- Texto completo da solução
    procedures JSONB DEFAULT '[]'::jsonb, -- Array de procedimentos estruturados
    resources JSONB DEFAULT '[]'::jsonb, -- Links, vídeos, documentos
    closing_message TEXT,
    
    -- Controle de fluxo
    next_steps TEXT[] DEFAULT ARRAY[]::TEXT[], -- Próximos steps possíveis
    related_problems TEXT[] DEFAULT ARRAY[]::TEXT[], -- Tags de problemas relacionados
    tools_required TEXT[] DEFAULT ARRAY[]::TEXT[], -- Ferramentas necessárias
    keywords TEXT[] DEFAULT ARRAY[]::TEXT[], -- Palavras-chave para busca
    tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- Tags adicionais
    
    -- Controle de qualidade e analytics
    approval_status VARCHAR(20) DEFAULT 'approved' CHECK (approval_status IN ('draft', 'review', 'approved', 'deprecated')),
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'system',
    updated_by VARCHAR(100) DEFAULT 'system',
    
    -- Constraints
    UNIQUE(problem_tag, step),
    CONSTRAINT valid_success_rate CHECK (success_rate >= 0 AND success_rate <= 100)
);

-- =============================================
-- 2. TABELA DE EMBEDDINGS (NOVA)
-- =============================================

CREATE TABLE solution_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_id UUID NOT NULL REFERENCES support_solutions(id) ON DELETE CASCADE,
    
    -- Controle de embedding
    embedding_type VARCHAR(50) NOT NULL, -- 'full_content', 'keywords', 'procedures', 'title', 'problem_description'
    content_hash VARCHAR(64) NULL,
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',

    -- Embedding vector (ajuste a dimensão conforme seu modelo)
    embedding VECTOR(1536), -- OpenAI 3-small usa 1536 dimensões

    -- Texto que gerou o embedding
    source_text TEXT NOT NULL,
    
    -- Metadados para busca
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(solution_id, embedding_type, content_hash)
);

-- =============================================
-- 3. TABELA DE INTERAÇÕES/ANALYTICS (NOVA)
-- =============================================

CREATE TABLE solution_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_id UUID NOT NULL REFERENCES support_solutions(id) ON DELETE CASCADE,
    
    -- Dados da interação
    user_query TEXT NOT NULL,
    user_query_hash VARCHAR(64) NOT NULL,
    similarity_score DECIMAL(8,6),
    
    -- Resultado da interação
    was_helpful BOOLEAN,
    user_feedback TEXT,
    escalated_to_human BOOLEAN DEFAULT FALSE,
    resolution_time_minutes INTEGER,
    
    -- Contexto da sessão
    session_id VARCHAR(100),
    user_id VARCHAR(100),
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. TABELA DE CACHE DE BUSCAS (NOVA)
-- =============================================

CREATE TABLE search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Query normalizada
    query_normalized TEXT NOT NULL,
    query_hash VARCHAR(64) NOT NULL UNIQUE,
    
    -- Resultado da busca
    results JSONB NOT NULL,
    
    -- Metadados
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
    search_params JSONB DEFAULT '{}'::jsonb,
    
    -- Controle de cache
    hit_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMP WITH TIME ZONE,
    
    -- TTL e limpeza
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- =============================================
-- 5. ÍNDICES OTIMIZADOS
-- =============================================

-- Índices para support_solutions
CREATE INDEX idx_support_solutions_problem_tag ON support_solutions(problem_tag);
CREATE INDEX idx_support_solutions_category ON support_solutions(category, subcategory);
CREATE INDEX idx_support_solutions_keywords ON support_solutions USING GIN(keywords);
CREATE INDEX idx_support_solutions_tags ON support_solutions USING GIN(tags);
CREATE INDEX idx_support_solutions_content_hash ON support_solutions(content_hash);
CREATE INDEX idx_support_solutions_approval ON support_solutions(approval_status) WHERE approval_status = 'approved';
CREATE INDEX idx_support_solutions_active ON support_solutions(is_active) WHERE is_active = TRUE;

-- Índices para embeddings (CRUCIAL para performance)
CREATE INDEX idx_solution_embeddings_solution ON solution_embeddings(solution_id);
CREATE INDEX idx_solution_embeddings_type ON solution_embeddings(embedding_type);
CREATE INDEX idx_solution_embeddings_vector ON solution_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Índices compostos para buscas complexas
CREATE INDEX idx_solutions_tag_step ON support_solutions(problem_tag, step);
CREATE INDEX idx_embeddings_solution_type ON solution_embeddings(solution_id, embedding_type);

-- Índices para analytics
CREATE INDEX idx_solution_interactions_date ON solution_interactions(created_at);
CREATE INDEX idx_solution_interactions_solution ON solution_interactions(solution_id);
CREATE INDEX idx_solution_interactions_helpful ON solution_interactions(was_helpful);

-- Índices para cache
CREATE INDEX idx_search_cache_expires ON search_cache(expires_at);
CREATE INDEX idx_search_cache_hash ON search_cache(query_hash);

-- =============================================
-- 6. TRIGGERS PARA AUDITORIA E CONTROLE
-- =============================================

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para support_solutions
CREATE TRIGGER update_support_solutions_updated_at
    BEFORE UPDATE ON support_solutions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para solution_embeddings
CREATE TRIGGER update_solution_embeddings_updated_at
    BEFORE UPDATE ON solution_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para controlar mudanças de conteúdo
CREATE OR REPLACE FUNCTION check_content_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.content IS DISTINCT FROM NEW.content OR 
       OLD.procedures IS DISTINCT FROM NEW.procedures OR
       OLD.resources IS DISTINCT FROM NEW.resources OR
       OLD.problem_description IS DISTINCT FROM NEW.problem_description THEN
        
        NEW.content_version = OLD.content_version + 1;
        NEW.content_hash = encode(digest(
            COALESCE(NEW.content, '') || 
            COALESCE(NEW.procedures::text, '') || 
            COALESCE(NEW.resources::text, '') ||
            COALESCE(NEW.problem_description, ''), 'sha256'), 'hex');
        
        DELETE FROM solution_embeddings WHERE solution_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;s

-- Trigger para detectar mudanças de conteúdo
CREATE OR REPLACE FUNCTION calculate_initial_content_hash()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.content_hash IS NULL OR NEW.content_hash = '' THEN
        NEW.content_hash = encode(digest(
            COALESCE(NEW.content, '') || 
            COALESCE(NEW.procedures::text, '') || 
            COALESCE(NEW.resources::text, '') ||
            COALESCE(NEW.problem_description, ''), 'sha256'), 'hex');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular hash inicial
CREATE TRIGGER calculate_support_solutions_initial_hash
    BEFORE INSERT ON support_solutions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_initial_content_hash();