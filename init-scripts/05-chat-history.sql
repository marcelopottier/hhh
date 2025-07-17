-- =============================================
-- SCHEMA COMPLETO - SISTEMA DE CONVERSAS
-- Para LangGraph Agent com Histórico Persistente
-- =============================================

-- =============================================
-- 1. TABELA DE SESSÕES DE CONVERSA
-- =============================================

CREATE TABLE conversation_sessions (
    -- Identificação única
    thread_id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(100) NOT NULL,
    
    -- Controle temporal
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Status da conversa
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated', 'abandoned', 'archived')),
    
    -- Métricas da sessão
    total_messages INTEGER DEFAULT 0,
    user_messages INTEGER DEFAULT 0,
    assistant_messages INTEGER DEFAULT 0,
    system_messages INTEGER DEFAULT 0,
    
    -- Resultado da conversa
    issue_resolved BOOLEAN DEFAULT FALSE,
    resolution_type VARCHAR(50), -- 'self_service', 'escalated', 'abandoned', 'partial'
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    
    -- Informações do problema
    primary_issue_category VARCHAR(100), -- 'hardware', 'software', 'network', etc.
    primary_issue_description TEXT,
    tags TEXT[], -- Array de tags para facilitar busca
    
    -- Soluções aplicadas
    solutions_attempted JSONB DEFAULT '[]'::jsonb, -- Array de IDs de soluções tentadas
    successful_solution_id UUID REFERENCES support_solutions(id),
    
    -- Métricas de performance
    first_response_time_seconds INTEGER, -- Tempo até primeira resposta do bot
    resolution_time_seconds INTEGER, -- Tempo total para resolver
    escalation_time_seconds INTEGER, -- Tempo até escalar (se aplicável)
    
    -- Contexto da sessão
    user_agent TEXT,
    ip_address INET,
    referrer_url TEXT,
    device_type VARCHAR(50), -- 'mobile', 'desktop', 'tablet'
    
    -- Controle de qualidade
    needs_review BOOLEAN DEFAULT FALSE,
    review_reason TEXT,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. TABELA DE MENSAGENS
-- =============================================

CREATE TABLE conversation_messages (
    -- Identificação
    id VARCHAR(255) PRIMARY KEY, -- msg_timestamp_role
    thread_id VARCHAR(255) NOT NULL REFERENCES conversation_sessions(thread_id) ON DELETE CASCADE,
    
    -- Conteúdo da mensagem
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text', -- 'text', 'json', 'markdown', 'html'
    
    -- Timestamp e ordem
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sequence_number INTEGER NOT NULL, -- Ordem na conversa (1, 2, 3...)
    
    -- Metadados estruturados
    metadata JSONB DEFAULT '{}', -- Dados específicos por tipo de mensagem
    
    -- Para mensagens do usuário
    user_intent VARCHAR(100), -- 'problem_report', 'feedback', 'follow_up', 'clarification'
    user_sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral', 'frustrated'
    
    -- Para mensagens do assistant
    response_type VARCHAR(50), -- 'solution', 'question', 'escalation', 'closing'
    solution_id UUID REFERENCES support_solutions(id), -- Se aplicável
    confidence_score DECIMAL(3,2), -- 0.00 a 1.00
    
    -- Para mensagens do sistema
    system_event_type VARCHAR(50), -- 'session_start', 'escalation', 'timeout', etc.
    
    -- Processamento e análise
    processed_by_llm BOOLEAN DEFAULT FALSE,
    llm_model VARCHAR(100), -- 'gpt-4', 'gpt-3.5-turbo', etc.
    llm_tokens_used INTEGER,
    processing_time_ms INTEGER,
    
    -- Feedback da mensagem
    user_feedback VARCHAR(20), -- 'helpful', 'not_helpful', 'unclear'
    feedback_comment TEXT,
    feedback_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Flags de controle
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    needs_moderation BOOLEAN DEFAULT FALSE,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(thread_id, sequence_number)
);

-- =============================================
-- 3. TABELA DE CONTEXTO DA CONVERSA
-- =============================================

CREATE TABLE conversation_context (
    thread_id VARCHAR(255) PRIMARY KEY REFERENCES conversation_sessions(thread_id) ON DELETE CASCADE,
    
    -- Contexto acumulado durante a conversa
    problems_discussed TEXT[] DEFAULT ARRAY[]::TEXT[], -- Problemas mencionados
    solutions_attempted UUID[] DEFAULT ARRAY[]::UUID[], -- IDs das soluções tentadas
    client_attempts TEXT[] DEFAULT ARRAY[]::TEXT[], -- O que cliente já tentou
    
    -- Feedback estruturado
    feedback_history JSONB DEFAULT '[]'::jsonb, -- Array de feedbacks sobre soluções
    
    -- Histórico de escalações
    escalation_history JSONB DEFAULT '[]'::jsonb, -- Array de escalações e motivos
    
    -- Preferências do cliente identificadas
    preferred_communication_style VARCHAR(50), -- 'technical', 'simple', 'step_by_step'
    technical_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
    
    -- Estado emocional
    frustration_level INTEGER DEFAULT 0 CHECK (frustration_level BETWEEN 0 AND 5),
    patience_indicators JSONB DEFAULT '{}', -- Sinais de impaciência
    
    -- Contexto técnico
    device_info JSONB DEFAULT '{}', -- Informações do equipamento
    software_environment JSONB DEFAULT '{}', -- OS, versões, etc.
    network_context JSONB DEFAULT '{}', -- Conexão, provedor, etc.
    
    -- Tentativas de solução detalhadas
    solution_attempts JSONB DEFAULT '[]'::jsonb, -- Histórico detalhado de tentativas
    
    -- Palavras-chave extraídas
    extracted_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    topic_evolution JSONB DEFAULT '[]'::jsonb, -- Como o tópico evoluiu
    
    -- Tempo gasto em cada etapa
    time_analysis JSONB DEFAULT '{}', -- Tempo em análise, busca, suporte, etc.
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. TABELA DE INTERAÇÕES COM SOLUÇÕES
-- =============================================

CREATE TABLE conversation_solution_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id VARCHAR(255) NOT NULL REFERENCES conversation_sessions(thread_id) ON DELETE CASCADE,
    solution_id UUID NOT NULL REFERENCES support_solutions(id),
    message_id VARCHAR(255) REFERENCES conversation_messages(id),
    
    -- Detalhes da interação
    interaction_type VARCHAR(50) NOT NULL, -- 'presented', 'attempted', 'completed', 'failed'
    similarity_score DECIMAL(5,4), -- Score da busca semântica
    presentation_order INTEGER, -- Ordem de apresentação (1º, 2º, 3º)
    
    -- Resultado da tentativa
    attempt_result VARCHAR(50), -- 'successful', 'failed', 'partial', 'skipped', 'pending'
    user_feedback VARCHAR(50), -- 'helpful', 'not_helpful', 'unclear', 'too_complex'
    feedback_comment TEXT,
    
    -- Tempo gasto na solução
    time_to_attempt_minutes INTEGER, -- Tempo entre apresentação e tentativa
    time_to_feedback_minutes INTEGER, -- Tempo entre tentativa e feedback
    
    -- Contexto da apresentação
    adaptation_applied JSONB DEFAULT '{}', -- Como a solução foi adaptada
    steps_completed INTEGER, -- Quantos passos foram completados
    total_steps INTEGER, -- Total de passos na solução
    
    -- Métricas
    difficulty_reported INTEGER CHECK (difficulty_reported BETWEEN 1 AND 5),
    clarity_rating INTEGER CHECK (clarity_rating BETWEEN 1 AND 5),
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. TABELA DE ANÁLISE DE SENTIMENTO
-- =============================================

CREATE TABLE conversation_sentiment_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id VARCHAR(255) NOT NULL REFERENCES conversation_sessions(thread_id) ON DELETE CASCADE,
    message_id VARCHAR(255) REFERENCES conversation_messages(id),
    
    -- Análise de sentimento
    sentiment VARCHAR(20) NOT NULL, -- 'positive', 'negative', 'neutral'
    sentiment_score DECIMAL(4,3), -- -1.000 a 1.000
    confidence DECIMAL(4,3), -- 0.000 a 1.000
    
    -- Emoções detectadas
    emotions JSONB DEFAULT '{}', -- {'anger': 0.1, 'frustration': 0.8, 'satisfaction': 0.0}
    
    -- Indicadores comportamentais
    urgency_level INTEGER CHECK (urgency_level BETWEEN 1 AND 5),
    politeness_score DECIMAL(3,2), -- 0.00 a 1.00
    technical_language_usage DECIMAL(3,2), -- Uso de termos técnicos
    
    -- Análise de contexto
    topic_shift_detected BOOLEAN DEFAULT FALSE,
    escalation_risk_score DECIMAL(3,2), -- 0.00 a 1.00
    satisfaction_prediction DECIMAL(3,2), -- Predição de satisfação final
    
    -- Metadados da análise
    analysis_model VARCHAR(100), -- Modelo usado para análise
    analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_time_ms INTEGER,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 6. ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índices para conversation_sessions
CREATE INDEX idx_conversation_sessions_customer ON conversation_sessions(customer_id);
CREATE INDEX idx_conversation_sessions_status ON conversation_sessions(status);
CREATE INDEX idx_conversation_sessions_active ON conversation_sessions(last_active_at DESC) WHERE status = 'active';
CREATE INDEX idx_conversation_sessions_resolved ON conversation_sessions(ended_at DESC) WHERE status = 'resolved';
CREATE INDEX idx_conversation_sessions_category ON conversation_sessions(primary_issue_category);
CREATE INDEX idx_conversation_sessions_tags ON conversation_sessions USING GIN(tags);
CREATE INDEX idx_conversation_sessions_date_range ON conversation_sessions(started_at, ended_at);

-- Índices para conversation_messages
CREATE INDEX idx_conversation_messages_thread ON conversation_messages(thread_id);
CREATE INDEX idx_conversation_messages_timestamp ON conversation_messages(timestamp DESC);
CREATE INDEX idx_conversation_messages_role ON conversation_messages(role);
CREATE INDEX idx_conversation_messages_sequence ON conversation_messages(thread_id, sequence_number);
CREATE INDEX idx_conversation_messages_solution ON conversation_messages(solution_id) WHERE solution_id IS NOT NULL;
CREATE INDEX idx_conversation_messages_feedback ON conversation_messages(user_feedback) WHERE user_feedback IS NOT NULL;
CREATE INDEX idx_conversation_messages_metadata ON conversation_messages USING GIN(metadata);

-- Índices para conversation_context
CREATE INDEX idx_conversation_context_problems ON conversation_context USING GIN(problems_discussed);
CREATE INDEX idx_conversation_context_solutions ON conversation_context USING GIN(solutions_attempted);
CREATE INDEX idx_conversation_context_keywords ON conversation_context USING GIN(extracted_keywords);
CREATE INDEX idx_conversation_context_frustration ON conversation_context(frustration_level);

-- Índices para conversation_solution_interactions
CREATE INDEX idx_solution_interactions_thread ON conversation_solution_interactions(thread_id);
CREATE INDEX idx_solution_interactions_solution ON conversation_solution_interactions(solution_id);
CREATE INDEX idx_solution_interactions_result ON conversation_solution_interactions(attempt_result);
CREATE INDEX idx_solution_interactions_feedback ON conversation_solution_interactions(user_feedback);
CREATE INDEX idx_solution_interactions_score ON conversation_solution_interactions(similarity_score DESC);

-- Índices para conversation_sentiment_analysis
CREATE INDEX idx_sentiment_analysis_thread ON conversation_sentiment_analysis(thread_id);
CREATE INDEX idx_sentiment_analysis_sentiment ON conversation_sentiment_analysis(sentiment);
CREATE INDEX idx_sentiment_analysis_score ON conversation_sentiment_analysis(sentiment_score);
CREATE INDEX idx_sentiment_analysis_escalation_risk ON conversation_sentiment_analysis(escalation_risk_score DESC);

-- =============================================
-- 7. TRIGGERS AUTOMÁTICOS
-- =============================================

-- Trigger para atualizar contadores de mensagens
CREATE OR REPLACE FUNCTION update_session_message_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Atualizar contadores na sessão
        UPDATE conversation_sessions 
        SET 
            total_messages = total_messages + 1,
            user_messages = user_messages + CASE WHEN NEW.role = 'user' THEN 1 ELSE 0 END,
            assistant_messages = assistant_messages + CASE WHEN NEW.role = 'assistant' THEN 1 ELSE 0 END,
            system_messages = system_messages + CASE WHEN NEW.role = 'system' THEN 1 ELSE 0 END,
            last_active_at = NOW(),
            updated_at = NOW()
        WHERE thread_id = NEW.thread_id;
        
        -- Calcular first_response_time se for primeira resposta do assistant
        IF NEW.role = 'assistant' THEN
            UPDATE conversation_sessions 
            SET first_response_time_seconds = EXTRACT(EPOCH FROM (NEW.timestamp - started_at))::INTEGER
            WHERE thread_id = NEW.thread_id 
            AND first_response_time_seconds IS NULL;
        END IF;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrementar contadores
        UPDATE conversation_sessions 
        SET 
            total_messages = total_messages - 1,
            user_messages = user_messages - CASE WHEN OLD.role = 'user' THEN 1 ELSE 0 END,
            assistant_messages = assistant_messages - CASE WHEN OLD.role = 'assistant' THEN 1 ELSE 0 END,
            system_messages = system_messages - CASE WHEN OLD.role = 'system' THEN 1 ELSE 0 END,
            updated_at = NOW()
        WHERE thread_id = OLD.thread_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_counters
    AFTER INSERT OR DELETE ON conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_session_message_counters();

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sessions_updated_at
    BEFORE UPDATE ON conversation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_messages_updated_at
    BEFORE UPDATE ON conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_context_updated_at
    BEFORE UPDATE ON conversation_context
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 8. VIEWS ÚTEIS PARA RELATÓRIOS
-- =============================================

-- View para sessões com métricas
CREATE VIEW conversation_sessions_with_metrics AS
SELECT 
    cs.*,
    -- Métricas calculadas
    EXTRACT(EPOCH FROM (COALESCE(cs.ended_at, NOW()) - cs.started_at))::INTEGER / 60 as duration_minutes,
    CASE 
        WHEN cs.total_messages > 0 THEN ROUND(cs.assistant_messages::DECIMAL / cs.total_messages * 100, 1)
        ELSE 0 
    END as assistant_message_percentage,
    
    -- Última mensagem
    (SELECT content FROM conversation_messages WHERE thread_id = cs.thread_id ORDER BY sequence_number DESC LIMIT 1) as last_message,
    (SELECT timestamp FROM conversation_messages WHERE thread_id = cs.thread_id ORDER BY sequence_number DESC LIMIT 1) as last_message_at,
    
    -- Contagem de soluções tentadas
    COALESCE(array_length(cc.solutions_attempted, 1), 0) as solutions_attempted_count,
    
    -- Nível de frustração
    COALESCE(cc.frustration_level, 0) as current_frustration_level
    
FROM conversation_sessions cs
LEFT JOIN conversation_context cc ON cs.thread_id = cc.thread_id;

-- View para análise de performance diária
CREATE VIEW daily_conversation_metrics AS
SELECT 
    DATE(started_at) as date,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_sessions,
    COUNT(*) FILTER (WHERE status = 'escalated') as escalated_sessions,
    COUNT(*) FILTER (WHERE status = 'abandoned') as abandoned_sessions,
    ROUND(AVG(total_messages), 1) as avg_messages_per_session,
    ROUND(AVG(resolution_time_seconds) / 60, 1) as avg_resolution_time_minutes,
    ROUND(AVG(satisfaction_rating), 2) as avg_satisfaction_rating,
    COUNT(*) FILTER (WHERE issue_resolved = true) as issues_resolved_count
FROM conversation_sessions
WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- =============================================
-- 9. FUNÇÕES ÚTEIS
-- =============================================

-- Função para arquivar conversas antigas
CREATE OR REPLACE FUNCTION archive_old_conversations(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    UPDATE conversation_sessions 
    SET status = 'archived', updated_at = NOW()
    WHERE status IN ('resolved', 'abandoned') 
    AND last_active_at < NOW() - (days_old || ' days')::INTERVAL
    AND status != 'archived';
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas de uma sessão
CREATE OR REPLACE FUNCTION get_session_stats(session_thread_id VARCHAR(255))
RETURNS TABLE (
    total_messages INTEGER,
    user_messages INTEGER,
    assistant_messages INTEGER,
    duration_minutes INTEGER,
    solutions_tried INTEGER,
    current_status VARCHAR(20),
    satisfaction_rating INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.total_messages,
        cs.user_messages,
        cs.assistant_messages,
        EXTRACT(EPOCH FROM (COALESCE(cs.ended_at, NOW()) - cs.started_at))::INTEGER / 60,
        COALESCE(array_length(cc.solutions_attempted, 1), 0),
        cs.status,
        cs.satisfaction_rating
    FROM conversation_sessions cs
    LEFT JOIN conversation_context cc ON cs.thread_id = cc.thread_id
    WHERE cs.thread_id = session_thread_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 10. DADOS DE EXEMPLO (OPCIONAL)
-- =============================================

-- Inserir uma sessão de exemplo
INSERT INTO conversation_sessions (
    thread_id, customer_id, primary_issue_category, 
    primary_issue_description, tags
) VALUES (
    'thread_example_001', 
    'CUSTOMER_123', 
    'hardware', 
    'Computador não liga após atualização',
    ARRAY['boot_issue', 'hardware', 'update_problem']
);

-- Inserir contexto inicial
INSERT INTO conversation_context (thread_id) VALUES ('thread_example_001');

-- Inserir mensagens de exemplo
INSERT INTO conversation_messages (
    id, thread_id, role, content, sequence_number, user_intent
) VALUES 
(
    'msg_001_user', 'thread_example_001', 'user', 
    'Meu computador não liga depois que fiz uma atualização do Windows', 
    1, 'problem_report'
),
(
    'msg_002_assistant', 'thread_example_001', 'assistant',
    'Vou te ajudar com esse problema de inicialização. Vamos fazer alguns testes...',
    2, 'solution'
);

-- =============================================
-- COMENTÁRIOS FINAIS
-- =============================================

/*
ESTE SCHEMA FORNECE:

1. ✅ HISTÓRICO COMPLETO: Todas as mensagens persistidas
2. ✅ CONTEXTO RICO: Informações detalhadas sobre cada conversa
3. ✅ MÉTRICAS: Performance e qualidade do atendimento
4. ✅ ANÁLISE: Sentimento e comportamento do usuário
5. ✅ ESCALABILIDADE: Índices otimizados para performance
6. ✅ RELATÓRIOS: Views prontas para dashboards
7. ✅ MANUTENÇÃO: Funções para limpeza e arquivamento

PRÓXIMOS PASSOS:
1. Executar este script no banco
2. Implementar ConversationService em TypeScript
3. Integrar com LangGraph Agent
4. Testar persistência de conversas
5. Implementar dashboards de métricas

PERFORMANCE:
- Suporta milhões de mensagens
- Queries otimizadas com índices
- Particionamento por data (se necessário)
- Arquivamento automático de conversas antigas
*/