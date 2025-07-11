CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Tabela principal de categorias de problemas
CREATE TABLE categorias_problema (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de procedimentos/soluções
CREATE TABLE procedimentos (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES categorias_problema(id),
    titulo VARCHAR(500) NOT NULL,
    descricao_problema TEXT NOT NULL,
    solucao_completa TEXT NOT NULL,
    palavras_chave TEXT[], -- Array de palavras-chave para busca adicional
    dificuldade INTEGER CHECK (dificuldade BETWEEN 1 AND 5), -- 1=fácil, 5=difícil
    tempo_estimado INTEGER, -- tempo em minutos
    embedding vector(1536), -- Vetor para busca semântica (dimensão do OpenAI)
    embedding_problema vector(1536), -- Embedding específico da descrição do problema
    embedding_solucao vector(1536), -- Embedding específico da solução
    tags TEXT[], -- Tags para categorização adicional
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de passos individuais (para procedimentos complexos)
CREATE TABLE passos_procedimento (
    id SERIAL PRIMARY KEY,
    procedimento_id INTEGER REFERENCES procedimentos(id) ON DELETE CASCADE,
    numero_passo INTEGER NOT NULL,
    titulo_passo VARCHAR(255),
    descricao_passo TEXT NOT NULL,
    tipo_passo VARCHAR(50) DEFAULT 'acao', -- 'acao', 'verificacao', 'observacao', 'aviso'
    obrigatorio BOOLEAN DEFAULT TRUE,
    tempo_estimado INTEGER, -- tempo em minutos
    embedding vector(1536), -- Embedding do passo individual
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(procedimento_id, numero_passo)
);

-- 4. Tabela de recursos de apoio (vídeos, imagens, links)
CREATE TABLE recursos_apoio (
    id SERIAL PRIMARY KEY,
    procedimento_id INTEGER REFERENCES procedimentos(id) ON DELETE CASCADE,
    passo_id INTEGER REFERENCES passos_procedimento(id) ON DELETE CASCADE,
    tipo_recurso VARCHAR(50) NOT NULL, -- 'video', 'imagem', 'link', 'documento'
    titulo VARCHAR(255),
    url TEXT,
    descricao TEXT,
    ordem INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela de histórico de uso (para melhorar recomendações)
CREATE TABLE historico_uso (
    id SERIAL PRIMARY KEY,
    procedimento_id INTEGER REFERENCES procedimentos(id),
    cliente_id VARCHAR(255), -- ID do cliente ou sessão
    resolveu_problema BOOLEAN,
    feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
    comentarios TEXT,
    tempo_execucao INTEGER, -- tempo real de execução em minutos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimizar consultas
CREATE INDEX idx_procedimentos_embedding ON procedimentos USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_procedimentos_embedding_problema ON procedimentos USING ivfflat (embedding_problema vector_cosine_ops);
CREATE INDEX idx_procedimentos_embedding_solucao ON procedimentos USING ivfflat (embedding_solucao vector_cosine_ops);
CREATE INDEX idx_passos_embedding ON passos_procedimento USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX idx_procedimentos_categoria ON procedimentos(categoria_id);
CREATE INDEX idx_procedimentos_tags ON procedimentos USING GIN(tags);
CREATE INDEX idx_procedimentos_palavras_chave ON procedimentos USING GIN(palavras_chave);
CREATE INDEX idx_passos_procedimento_id ON passos_procedimento(procedimento_id);
CREATE INDEX idx_recursos_procedimento ON recursos_apoio(procedimento_id);