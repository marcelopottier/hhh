import { Pool } from 'pg';
import db from '../config/database';
import { 
  ChatMessage, 
  ConversationSession, 
  ConversationContext 
} from '../types/conversation';

export class ConversationService {
  private static instance: ConversationService;
  private pool: Pool;

  private constructor() {
    this.pool = db.getPool();
  }

  public static getInstance(): ConversationService {
    if (!ConversationService.instance) {
      ConversationService.instance = new ConversationService();
    }
    return ConversationService.instance;
  }

  // =============================================
  // GERENCIAMENTO DE SESSÕES
  // =============================================

  async createSession(session: Partial<ConversationSession>): Promise<ConversationSession> {
    try {
      const result = await this.pool.query(`
        INSERT INTO conversation_sessions (
          thread_id, customer_id, primary_issue_category, 
          primary_issue_description, tags, user_agent, 
          ip_address, device_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        session.threadId,
        session.customerId,
        session.primaryIssueCategory,
        session.primaryIssueDescription,
        session.tags || [],
        session.userAgent,
        session.ipAddress,
        session.deviceType
      ]);

      // Criar contexto inicial
      await this.pool.query(`
        INSERT INTO conversation_context (thread_id) VALUES ($1)
      `, [session.threadId]);

      return this.mapSessionFromDB(result.rows[0]);
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      throw error;
    }
  }

  async getSession(threadId: string): Promise<ConversationSession | null> {
    try {
      const result = await this.pool.query(`
        SELECT * FROM conversation_sessions WHERE thread_id = $1
      `, [threadId]);

      if (result.rows.length === 0) return null;
      
      return this.mapSessionFromDB(result.rows[0]);
    } catch (error) {
      console.error('Erro ao buscar sessão:', error);
      return null;
    }
  }

  async updateSession(threadId: string, updates: Partial<ConversationSession>): Promise<void> {
    try {
      const setClause = [];
      const values = [];
      let paramIndex = 1;

      // Construir query dinâmica baseada nos campos fornecidos
      if (updates.status) {
        setClause.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      
      if (updates.issueResolved !== undefined) {
        setClause.push(`issue_resolved = $${paramIndex++}`);
        values.push(updates.issueResolved);
      }
      
      if (updates.resolutionType) {
        setClause.push(`resolution_type = $${paramIndex++}`);
        values.push(updates.resolutionType);
      }
      
      if (updates.satisfactionRating) {
        setClause.push(`satisfaction_rating = $${paramIndex++}`);
        values.push(updates.satisfactionRating);
      }
      
      if (updates.endedAt) {
        setClause.push(`ended_at = $${paramIndex++}`);
        values.push(updates.endedAt);
      }
      
      if (updates.successfulSolutionId) {
        setClause.push(`successful_solution_id = $${paramIndex++}`);
        values.push(updates.successfulSolutionId);
      }

      // Sempre atualizar last_active_at e updated_at
      setClause.push(`last_active_at = NOW()`, `updated_at = NOW()`);
      
      if (setClause.length > 0) {
        values.push(threadId);
        await this.pool.query(`
          UPDATE conversation_sessions 
          SET ${setClause.join(', ')}
          WHERE thread_id = $${paramIndex}
        `, values);
      }
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error);
      throw error;
    }
  }

  // =============================================
  // GERENCIAMENTO DE MENSAGENS
  // =============================================

  async saveMessage(message: ChatMessage): Promise<void> {
    try {
      // Validar que threadId está presente
      if (!message.threadId) {
        throw new Error(`Mensagem ${message.id} não tem threadId`);
      }

      await this.pool.query(`
        INSERT INTO conversation_messages (
          id, thread_id, role, content, content_type, timestamp,
          sequence_number, metadata, user_intent, user_sentiment,
          response_type, solution_id, confidence_score, system_event_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `, [
        message.id,
        message.threadId, // Agora garantido que não é undefined
        message.role,
        message.content,
        message.contentType || 'text',
        message.timestamp,
        message.sequenceNumber,
        JSON.stringify(message.metadata || {}),
        message.userIntent,
        message.userSentiment,
        message.responseType,
        message.solutionId,
        message.confidenceScore,
        message.systemEventType
      ]);
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      throw error;
    }
  }

  async getMessages(threadId: string, limit?: number): Promise<ChatMessage[]> {
    try {
      const query = `
        SELECT 
          id, thread_id, role, content, content_type, timestamp,
          sequence_number, metadata, user_intent, user_sentiment,
          response_type, solution_id, confidence_score, system_event_type,
          user_feedback, feedback_comment, feedback_timestamp
        FROM conversation_messages
        WHERE thread_id = $1
        ORDER BY sequence_number ASC
        ${limit ? `LIMIT $2` : ''}
      `;
      
      const params = limit ? [threadId, limit] : [threadId];
      const result = await this.pool.query(query, params);

      return result.rows.map(row => this.mapMessageFromDB(row));
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      return [];
    }
  }

  async getNextSequenceNumber(threadId: string): Promise<number> {
    try {
      const result = await this.pool.query(`
        SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq
        FROM conversation_messages
        WHERE thread_id = $1
      `, [threadId]);
      
      return result.rows[0].next_seq;
    } catch (error) {
      console.error('Erro ao obter próximo sequence number:', error);
      return 1;
    }
  }

  async updateMessageFeedback(
    messageId: string, 
    feedback: 'helpful' | 'not_helpful' | 'unclear',
    comment?: string
  ): Promise<void> {
    try {
      await this.pool.query(`
        UPDATE conversation_messages 
        SET user_feedback = $1, feedback_comment = $2, feedback_timestamp = NOW()
        WHERE id = $3
      `, [feedback, comment, messageId]);
    } catch (error) {
      console.error('Erro ao atualizar feedback:', error);
      throw error;
    }
  }

  // =============================================
  // GERENCIAMENTO DE CONTEXTO
  // =============================================

  async getContext(threadId: string): Promise<ConversationContext | null> {
    try {
      const result = await this.pool.query(`
        SELECT * FROM conversation_context WHERE thread_id = $1
      `, [threadId]);

      if (result.rows.length === 0) return null;
      
      return this.mapContextFromDB(result.rows[0]);
    } catch (error) {
      console.error('Erro ao carregar contexto:', error);
      return null;
    }
  }

  async updateContext(threadId: string, updates: Partial<ConversationContext>): Promise<void> {
    try {
      const setClause = [];
      const values = [];
      let paramIndex = 1;

      if (updates.problemsDiscussed) {
        setClause.push(`problems_discussed = $${paramIndex++}`);
        values.push(updates.problemsDiscussed);
      }
      
      if (updates.solutionsAttempted) {
        setClause.push(`solutions_attempted = $${paramIndex++}`);
        values.push(updates.solutionsAttempted);
      }
      
      if (updates.clientAttempts) {
        setClause.push(`client_attempts = $${paramIndex++}`);
        values.push(updates.clientAttempts);
      }
      
      if (updates.feedbackHistory) {
        setClause.push(`feedback_history = $${paramIndex++}`);
        values.push(JSON.stringify(updates.feedbackHistory));
      }
      
      if (updates.escalationHistory) {
        setClause.push(`escalation_history = $${paramIndex++}`);
        values.push(JSON.stringify(updates.escalationHistory));
      }
      
      if (updates.frustrationLevel !== undefined) {
        setClause.push(`frustration_level = $${paramIndex++}`);
        values.push(updates.frustrationLevel);
      }
      
      if (updates.extractedKeywords) {
        setClause.push(`extracted_keywords = $${paramIndex++}`);
        values.push(updates.extractedKeywords);
      }
      
      if (updates.deviceInfo) {
        setClause.push(`device_info = $${paramIndex++}`);
        values.push(JSON.stringify(updates.deviceInfo));
      }

      if (updates.preferredCommunicationStyle) {
        setClause.push(`preferred_communication_style = $${paramIndex++}`);
        values.push(updates.preferredCommunicationStyle);
      }

      if (updates.technicalLevel) {
        setClause.push(`technical_level = $${paramIndex++}`);
        values.push(updates.technicalLevel);
      }

      if (updates.topicEvolution) {
        setClause.push(`topic_evolution = $${paramIndex++}`);
        values.push(JSON.stringify(updates.topicEvolution));
      }

      if (setClause.length > 0) {
        setClause.push(`updated_at = NOW()`);
        values.push(threadId);
        
        await this.pool.query(`
          UPDATE conversation_context 
          SET ${setClause.join(', ')}
          WHERE thread_id = $${paramIndex}
        `, values);
      }
    } catch (error) {
      console.error('Erro ao atualizar contexto:', error);
      throw error;
    }
  }

  // =============================================
  // INTERAÇÕES COM SOLUÇÕES
  // =============================================

  async recordSolutionInteraction(interaction: {
    threadId: string;
    solutionId: string;
    messageId?: string;
    interactionType: 'presented' | 'attempted' | 'completed' | 'failed';
    similarityScore?: number;
    presentationOrder?: number;
    attemptResult?: 'successful' | 'failed' | 'partial' | 'skipped' | 'pending';
    userFeedback?: 'helpful' | 'not_helpful' | 'unclear' | 'too_complex';
    feedbackComment?: string;
    timeToAttemptMinutes?: number;
    stepsCompleted?: number;
    totalSteps?: number;
  }): Promise<void> {
    try {
      await this.pool.query(`
        INSERT INTO conversation_solution_interactions (
          thread_id, solution_id, message_id, interaction_type,
          similarity_score, presentation_order, attempt_result,
          user_feedback, feedback_comment, time_to_attempt_minutes,
          steps_completed, total_steps
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        interaction.threadId,
        interaction.solutionId,
        interaction.messageId,
        interaction.interactionType,
        interaction.similarityScore,
        interaction.presentationOrder,
        interaction.attemptResult,
        interaction.userFeedback,
        interaction.feedbackComment,
        interaction.timeToAttemptMinutes,
        interaction.stepsCompleted,
        interaction.totalSteps
      ]);
    } catch (error) {
      console.error('Erro ao registrar interação com solução:', error);
      throw error;
    }
  }

  // =============================================
  // CONSULTAS E RELATÓRIOS
  // =============================================

  async getCustomerConversations(customerId: string, limit: number = 10): Promise<ConversationSession[]> {
    try {
      const result = await this.pool.query(`
        SELECT * FROM conversation_sessions
        WHERE customer_id = $1
        ORDER BY last_active_at DESC
        LIMIT $2
      `, [customerId, limit]);

      return result.rows.map(row => this.mapSessionFromDB(row));
    } catch (error) {
      console.error('Erro ao buscar conversas do cliente:', error);
      return [];
    }
  }

  async getSessionStats(threadId: string): Promise<any> {
    try {
      const result = await this.pool.query(`
        SELECT 
          cs.total_messages,
          cs.user_messages,
          cs.assistant_messages,
          cs.system_messages,
          EXTRACT(EPOCH FROM (COALESCE(cs.ended_at, NOW()) - cs.started_at))::INTEGER / 60 as duration_minutes,
          COALESCE(array_length(cc.solutions_attempted, 1), 0) as solutions_tried,
          cs.status as current_status,
          cs.satisfaction_rating,
          cs.issue_resolved,
          cs.resolution_type
        FROM conversation_sessions cs
        LEFT JOIN conversation_context cc ON cs.thread_id = cc.thread_id
        WHERE cs.thread_id = $1
      `, [threadId]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Erro ao obter estatísticas da sessão:', error);
      return null;
    }
  }

  async getDailyMetrics(days: number = 7): Promise<any[]> {
    try {
      const result = await this.pool.query(`
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
        WHERE started_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(started_at)
        ORDER BY date DESC
      `);

      return result.rows;
    } catch (error) {
      console.error('Erro ao obter métricas diárias:', error);
      return [];
    }
  }

  async getSolutionEffectiveness(solutionId: string): Promise<any> {
    try {
      const result = await this.pool.query(`
        SELECT 
          solution_id,
          COUNT(*) as total_presentations,
          COUNT(*) FILTER (WHERE interaction_type = 'attempted') as total_attempts,
          COUNT(*) FILTER (WHERE attempt_result = 'successful') as successful_attempts,
          COUNT(*) FILTER (WHERE user_feedback = 'helpful') as helpful_feedback,
          AVG(similarity_score) as avg_similarity_score,
          AVG(time_to_attempt_minutes) as avg_time_to_attempt,
          ROUND(
            COUNT(*) FILTER (WHERE attempt_result = 'successful')::DECIMAL / 
            NULLIF(COUNT(*) FILTER (WHERE interaction_type = 'attempted'), 0) * 100, 2
          ) as success_rate
        FROM conversation_solution_interactions
        WHERE solution_id = $1
        GROUP BY solution_id
      `, [solutionId]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Erro ao analisar efetividade da solução:', error);
      return null;
    }
  }

  // =============================================
  // BUSCA E FILTROS
  // =============================================

  async searchConversations(filters: {
    customerId?: string;
    status?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ conversations: ConversationSession[], total: number }> {
    try {
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      if (filters.customerId) {
        conditions.push(`customer_id = $${paramIndex++}`);
        values.push(filters.customerId);
      }

      if (filters.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(filters.status);
      }

      if (filters.category) {
        conditions.push(`primary_issue_category = $${paramIndex++}`);
        values.push(filters.category);
      }

      if (filters.startDate) {
        conditions.push(`started_at >= $${paramIndex++}`);
        values.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push(`started_at <= $${paramIndex++}`);
        values.push(filters.endDate);
      }

      if (filters.tags && filters.tags.length > 0) {
        conditions.push(`tags && $${paramIndex++}`);
        values.push(filters.tags);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // Contar total
      const countResult = await this.pool.query(`
        SELECT COUNT(*) as total FROM conversation_sessions ${whereClause}
      `, values);

      // Buscar dados com paginação
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      
      values.push(limit, offset);
      const dataResult = await this.pool.query(`
        SELECT * FROM conversation_sessions 
        ${whereClause}
        ORDER BY started_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `, values);

      return {
        conversations: dataResult.rows.map(row => this.mapSessionFromDB(row)),
        total: parseInt(countResult.rows[0].total)
      };
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      return { conversations: [], total: 0 };
    }
  }

  // =============================================
  // MAPEAMENTO DE DADOS
  // =============================================

  private mapSessionFromDB(row: any): ConversationSession {
    return {
      threadId: row.thread_id,
      customerId: row.customer_id,
      startedAt: new Date(row.started_at),
      lastActiveAt: new Date(row.last_active_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      status: row.status,
      totalMessages: row.total_messages,
      userMessages: row.user_messages,
      assistantMessages: row.assistant_messages,
      systemMessages: row.system_messages,
      issueResolved: row.issue_resolved,
      resolutionType: row.resolution_type,
      satisfactionRating: row.satisfaction_rating,
      primaryIssueCategory: row.primary_issue_category,
      primaryIssueDescription: row.primary_issue_description,
      tags: row.tags || [],
      solutionsAttempted: row.solutions_attempted || [],
      successfulSolutionId: row.successful_solution_id,
      firstResponseTimeSeconds: row.first_response_time_seconds,
      resolutionTimeSeconds: row.resolution_time_seconds,
      escalationTimeSeconds: row.escalation_time_seconds,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      deviceType: row.device_type
    };
  }

  private mapMessageFromDB(row: any): ChatMessage {
    return {
      id: row.id,
      threadId: row.thread_id,
      role: row.role,
      content: row.content,
      contentType: row.content_type,
      timestamp: new Date(row.timestamp),
      sequenceNumber: row.sequence_number,
      metadata: row.metadata || {},
      userIntent: row.user_intent,
      userSentiment: row.user_sentiment,
      responseType: row.response_type,
      solutionId: row.solution_id,
      confidenceScore: row.confidence_score,
      systemEventType: row.system_event_type,
      userFeedback: row.user_feedback,
      feedbackComment: row.feedback_comment,
      feedbackTimestamp: row.feedback_timestamp ? new Date(row.feedback_timestamp) : undefined
    };
  }

  private mapContextFromDB(row: any): ConversationContext {
    return {
      threadId: row.thread_id,
      problemsDiscussed: row.problems_discussed || [],
      solutionsAttempted: row.solutions_attempted || [],
      clientAttempts: row.client_attempts || [],
      feedbackHistory: row.feedback_history || [],
      escalationHistory: row.escalation_history || [],
      preferredCommunicationStyle: row.preferred_communication_style,
      technicalLevel: row.technical_level,
      frustrationLevel: row.frustration_level || 0,
      deviceInfo: row.device_info || {},
      softwareEnvironment: row.software_environment || {},
      extractedKeywords: row.extracted_keywords || [],
      topicEvolution: row.topic_evolution || []
    };
  }

  // =============================================
  // FUNÇÕES DE LIMPEZA E MANUTENÇÃO
  // =============================================

  async archiveOldConversations(daysOld: number = 90): Promise<number> {
    try {
      const result = await this.pool.query(`
        UPDATE conversation_sessions 
        SET status = 'archived', updated_at = NOW()
        WHERE status IN ('resolved', 'abandoned') 
        AND last_active_at < NOW() - INTERVAL '${daysOld} days'
        AND status != 'archived'
      `);

      return result.rowCount || 0;
    } catch (error) {
      console.error('Erro ao arquivar conversas antigas:', error);
      return 0;
    }
  }

  async cleanupUnfinishedSessions(hoursOld: number = 24): Promise<number> {
    try {
      const result = await this.pool.query(`
        UPDATE conversation_sessions 
        SET status = 'abandoned', updated_at = NOW()
        WHERE status = 'active' 
        AND last_active_at < NOW() - INTERVAL '${hoursOld} hours'
        AND total_messages > 0
      `);

      return result.rowCount || 0;
    } catch (error) {
      console.error('Erro ao limpar sessões inacabadas:', error);
      return 0;
    }
  }

  async deleteOldData(daysOld: number = 365): Promise<{
    deletedSessions: number;
    deletedMessages: number;
    deletedInteractions: number;
  }> {
    try {
      // Excluir interações antigas
      const interactionsResult = await this.pool.query(`
        DELETE FROM conversation_solution_interactions 
        WHERE created_at < NOW() - INTERVAL '${daysOld} days'
      `);

      // Excluir mensagens antigas (cascata deletará contextos)
      const messagesResult = await this.pool.query(`
        DELETE FROM conversation_messages 
        WHERE thread_id IN (
          SELECT thread_id FROM conversation_sessions 
          WHERE started_at < NOW() - INTERVAL '${daysOld} days'
          AND status = 'archived'
        )
      `);

      // Excluir sessões arquivadas antigas
      const sessionsResult = await this.pool.query(`
        DELETE FROM conversation_sessions 
        WHERE started_at < NOW() - INTERVAL '${daysOld} days'
        AND status = 'archived'
      `);

      return {
        deletedSessions: sessionsResult.rowCount || 0,
        deletedMessages: messagesResult.rowCount || 0,
        deletedInteractions: interactionsResult.rowCount || 0
      };
    } catch (error) {
      console.error('Erro ao deletar dados antigos:', error);
      return { deletedSessions: 0, deletedMessages: 0, deletedInteractions: 0 };
    }
  }

  // =============================================
  // ANÁLISE E INSIGHTS
  // =============================================

  async getTopIssueCategories(days: number = 30): Promise<any[]> {
    try {
      const result = await this.pool.query(`
        SELECT 
          primary_issue_category,
          COUNT(*) as total_sessions,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved_sessions,
          COUNT(*) FILTER (WHERE status = 'escalated') as escalated_sessions,
          ROUND(AVG(satisfaction_rating), 2) as avg_satisfaction,
          ROUND(
            COUNT(*) FILTER (WHERE status = 'resolved')::DECIMAL / 
            COUNT(*) * 100, 1
          ) as resolution_rate
        FROM conversation_sessions
        WHERE started_at >= NOW() - INTERVAL '${days} days'
        AND primary_issue_category IS NOT NULL
        GROUP BY primary_issue_category
        ORDER BY total_sessions DESC
        LIMIT 10
      `);

      return result.rows;
    } catch (error) {
      console.error('Erro ao obter categorias principais:', error);
      return [];
    }
  }

  async getConversationTrends(days: number = 30): Promise<any> {
    try {
      const result = await this.pool.query(`
        SELECT 
          DATE(started_at) as date,
          COUNT(*) as total_conversations,
          AVG(total_messages) as avg_messages,
          AVG(resolution_time_seconds / 60) as avg_resolution_minutes,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
          COUNT(*) FILTER (WHERE status = 'escalated') as escalated_count
        FROM conversation_sessions
        WHERE started_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(started_at)
        ORDER BY date ASC
      `);

      return result.rows;
    } catch (error) {
      console.error('Erro ao obter tendências:', error);
      return [];
    }
  }
}