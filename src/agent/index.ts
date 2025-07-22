import { createSupportGraph } from "../graph/supportGraph";
import { ConversationService } from "../services/conversationService";
import type { SupportState, SupportStateType } from "../state/supportState";
import type { 
  ChatMessage, 
  ConversationSession 
} from "../types/base";
import { 
  createUserMessage,
  createAssistantMessage,
  createSystemMessage 
} from "../utils/messageHelpers";

export class SupportAgent {
  private graph: any;
  private conversationService: ConversationService;
  private static instance: SupportAgent;

  private constructor() {
    this.graph = createSupportGraph();
    this.conversationService = ConversationService.getInstance();
    console.log('✅ Support Agent inicializado com tipos unificados');
  }

  public static getInstance(): SupportAgent {
    if (!SupportAgent.instance) {
      SupportAgent.instance = new SupportAgent();
    }
    return SupportAgent.instance;
  }

  public async processQuery(
    customerId: string,
    query: string,
    threadId?: string,
    metadata?: {
      userAgent?: string;
      ipAddress?: string;
      deviceType?: string;
    }
  ): Promise<{
    response: string;
    ticketStatus: string;
    attemptCount: number;
    threadId: string;
    messageId: string;
    sessionData?: any;
  }> {
    const actualThreadId = threadId || `thread_${customerId}_${Date.now()}`;
    
    console.log(`[AGENT] Processando: ${customerId} - Thread: ${actualThreadId}`);
    
    try {
      // Verificar se sessão existe, senão criar
      let session = await this.conversationService.getSession(actualThreadId);
      
      if (!session) {
        console.log(`[AGENT] Criando nova sessão para thread: ${actualThreadId}`);
        session = await this.conversationService.createSession({
          threadId: actualThreadId,
          customerId,
          primaryIssueCategory: this.categorizeQuery(query),
          primaryIssueDescription: query,
          tags: this.extractTags(query),
          userAgent: metadata?.userAgent,
          ipAddress: metadata?.ipAddress,
          deviceType: metadata?.deviceType
        });
      }

      // Carregar histórico e contexto existentes
      const existingMessages = await this.conversationService.getMessages(actualThreadId);
      const existingContext = await this.conversationService.getContext(actualThreadId);
      
      console.log(`[AGENT] Carregadas ${existingMessages.length} mensagens do histórico`);
      
      // Obter próximo sequence number
      const nextSeq = await this.conversationService.getNextSequenceNumber(actualThreadId);
      
      // Criar mensagem do usuário usando função auxiliar
      const userMessage = createUserMessage(
        query,
        actualThreadId, // threadId sempre presente
        customerId,
        {
          deviceType: metadata?.deviceType,
          userAgent: metadata?.userAgent,
          ipAddress: metadata?.ipAddress,
        }
      );
      
      // Adicionar campos específicos
      userMessage.sequenceNumber = nextSeq;
      userMessage.userIntent = this.detectUserIntent(query, existingMessages);
      userMessage.userSentiment = this.analyzeSentiment(query);
      
      // Salvar mensagem do usuário
      await this.conversationService.saveMessage(userMessage);
      
      // Preparar estado inicial com histórico completo
      const initialState: Partial<SupportStateType> = {
        threadId: actualThreadId,
        customerId,
        currentQuery: query,
        messages: [...existingMessages, userMessage],
        session: {
          threadId: actualThreadId,
          customerId,
          startedAt: session.startedAt,
          lastActiveAt: new Date(),
          status: 'active',
          totalMessages: existingMessages.length + 1,
          userMessages: 0,
          assistantMessages: 0,
          systemMessages: 0,
          issueResolved: false,
        },
        conversationContext: existingContext || {
          threadId: actualThreadId,
          problemsDiscussed: [],
          solutionsAttempted: [],
          clientAttempts: [],
          feedbackHistory: [],
          escalationHistory: [],
          frustrationLevel: 0,
          extractedKeywords: [],
          topicEvolution: []
        },
        attemptCount: existingMessages.filter(m => m.role === 'user').length,
        context: {},
      };

      const config = {
        configurable: { thread_id: actualThreadId },
        recursionLimit: 5,
      };

      // Executar grafo
      const result = await this.graph.invoke(initialState, config);
      
      // Criar e salvar resposta do assistant
      let assistantMessageId = '';
      if (result.finalResponse) {
        const assistantMessage = createAssistantMessage(
          result.finalResponse,
          actualThreadId, // threadId sempre presente
          {
            nodeType: 'provide_support',
            processingTimeMs: Date.now() - userMessage.timestamp.getTime()
          }
        );
        
        // Adicionar campos específicos
        assistantMessage.sequenceNumber = nextSeq + 1;
        assistantMessage.responseType = result.ticketStatus === 'escalated' ? 'escalation' : 'solution';
        assistantMessage.solutionId = result.context?.solutionUsed;
        assistantMessage.confidenceScore = result.foundSolutions?.[0]?.similarity_score;
        
        await this.conversationService.saveMessage(assistantMessage);
        assistantMessageId = assistantMessage.id;
        
        // Registrar interação com solução se aplicável
        if (result.context?.solutionUsed && result.foundSolutions?.length > 0) {
          await this.conversationService.recordSolutionInteraction({
            threadId: actualThreadId,
            solutionId: result.context.solutionUsed,
            messageId: assistantMessage.id,
            interactionType: 'presented',
            similarityScore: result.foundSolutions[0].similarity_score,
            presentationOrder: 1
          });
        }
      }
      
      // Atualizar sessão
      await this.conversationService.updateSession(actualThreadId, {
        status: result.ticketStatus === 'resolved' ? 'resolved' : 
                result.ticketStatus === 'escalated' ? 'escalated' : 'active',
        issueResolved: result.ticketStatus === 'resolved',
        resolutionType: result.ticketStatus === 'resolved' ? 'self_service' :
                       result.ticketStatus === 'escalated' ? 'escalated' : undefined,
        endedAt: result.ticketStatus === 'resolved' || result.ticketStatus === 'escalated' ? 
                 new Date() : undefined
      });
      
      // Atualizar contexto se necessário
      if (result.conversationContext) {
        await this.conversationService.updateContext(actualThreadId, result.conversationContext);
      }

      return {
        response: result.finalResponse || "Processamento concluído.",
        ticketStatus: result.ticketStatus || "open",
        attemptCount: result.attemptCount || 1,
        threadId: actualThreadId,
        messageId: assistantMessageId,
        sessionData: {
          totalMessages: session.totalMessages + 2,
          duration: Math.floor((Date.now() - session.startedAt.getTime()) / 1000 / 60),
          solutionsAttempted: result.conversationContext?.solutionsAttempted?.length || 0
        }
      };

    } catch (error) {
      console.error("[AGENT] Erro:", error);
      
      // Salvar erro como mensagem do sistema usando função auxiliar
      try {
        const errorMessage = createSystemMessage(
          `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          actualThreadId, // threadId sempre presente
          'error',
          {
            errorType: 'processing_error',
            timestamp: new Date().toISOString()
          }
        );
        
        // Adicionar sequenceNumber
        errorMessage.sequenceNumber = await this.conversationService.getNextSequenceNumber(actualThreadId);
        
        await this.conversationService.saveMessage(errorMessage);
      } catch (saveError) {
        console.error("Erro ao salvar mensagem de erro:", saveError);
      }
      
      return {
        response: "Erro interno. Transferindo para atendimento humano.",
        ticketStatus: "escalated",
        attemptCount: 0,
        threadId: actualThreadId,
        messageId: ''
      };
    }
  }

  public async streamQuery(
    customerId: string,
    query: string,
    threadId?: string
  ): Promise<AsyncGenerator<any, void, unknown>> {
    const actualThreadId = threadId || `thread_${customerId}_${Date.now()}`;
    
    try {
      // Carregar histórico existente
      const existingMessages = await this.conversationService.getMessages(actualThreadId);
      const existingContext = await this.conversationService.getContext(actualThreadId);
      
      // Criar mensagem do usuário
      const userMessage = createUserMessage(query, actualThreadId, customerId);
      userMessage.sequenceNumber = await this.conversationService.getNextSequenceNumber(actualThreadId);
      userMessage.userIntent = this.detectUserIntent(query, existingMessages);
      userMessage.userSentiment = this.analyzeSentiment(query);
      
      // Salvar mensagem do usuário
      await this.conversationService.saveMessage(userMessage);
      
      // Preparar estado inicial
      const initialState: Partial<SupportStateType> = {
        threadId: actualThreadId,
        customerId,
        currentQuery: query,
        messages: [...existingMessages, userMessage],
        conversationContext: existingContext || {
          threadId: actualThreadId,
          problemsDiscussed: [],
          solutionsAttempted: [],
          clientAttempts: [],
          feedbackHistory: [],
          escalationHistory: [],
          frustrationLevel: 0,
          extractedKeywords: [],
          topicEvolution: []
        },
        context: {},
      };

      const config = {
        configurable: { thread_id: actualThreadId },
        recursionLimit: 5,
      };

      return this.graph.stream(initialState, config);
      
    } catch (error) {
      console.error("[AGENT] Erro no streaming:", error);
      throw error;
    }
  }

  // Métodos auxiliares para análise
  private categorizeQuery(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('não liga') || queryLower.includes('boot')) return 'hardware';
    if (queryLower.includes('tela azul') || queryLower.includes('erro')) return 'software';
    if (queryLower.includes('internet') || queryLower.includes('wifi')) return 'network';
    if (queryLower.includes('lento') || queryLower.includes('travando')) return 'performance';
    
    return 'general';
  }

  private extractTags(query: string): string[] {
    const tags: string[] = [];
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('não liga')) tags.push('boot_issue');
    if (queryLower.includes('tela azul')) tags.push('bsod');
    if (queryLower.includes('lento')) tags.push('performance');
    if (queryLower.includes('atualização')) tags.push('update_issue');
    
    return tags;
  }

  private detectUserIntent(query: string, previousMessages: ChatMessage[]): string {
    const queryLower = query.toLowerCase();
    
    // Se é a primeira mensagem, é relatório de problema
    if (previousMessages.filter(m => m.role === 'user').length === 0) {
      return 'problem_report';
    }
    
    // Detectar feedback
    if (queryLower.includes('funcionou') || queryLower.includes('resolveu')) {
      return 'positive_feedback';
    }
    
    if (queryLower.includes('não funcionou') || queryLower.includes('não resolveu')) {
      return 'negative_feedback';
    }
    
    // Detectar pedido de esclarecimento
    if (queryLower.includes('como') || queryLower.includes('onde') || queryLower.includes('?')) {
      return 'clarification_request';
    }
    
    return 'follow_up';
  }

  private analyzeSentiment(query: string): string {
    const queryLower = query.toLowerCase();
    
    const negativeWords = ['problema', 'erro', 'não funciona', 'quebrado', 'ruim'];
    const positiveWords = ['obrigado', 'funcionou', 'resolveu', 'ótimo'];
    
    const negativeScore = negativeWords.filter(word => queryLower.includes(word)).length;
    const positiveScore = positiveWords.filter(word => queryLower.includes(word)).length;
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    
    return 'neutral';
  }

  // Métodos para consultar histórico
  public async getCustomerHistory(customerId: string): Promise<ConversationSession[]> {
    return await this.conversationService.getCustomerConversations(customerId);
  }

  public async loadConversation(threadId: string): Promise<ChatMessage[]> {
    return await this.conversationService.getMessages(threadId);
  }

  public async updateMessageFeedback(
    messageId: string, 
    feedback: 'helpful' | 'not_helpful' | 'unclear',
    comment?: string
  ): Promise<void> {
    return await this.conversationService.updateMessageFeedback(messageId, feedback, comment);
  }

  public async getSessionStats(threadId: string): Promise<any> {
    return await this.conversationService.getSessionStats(threadId);
  }

  // Método para obter estatísticas gerais
  public async getDashboardMetrics(): Promise<any> {
    try {
      const dailyMetrics = await this.conversationService.getDailyMetrics(7);
      
      return {
        dailyMetrics,
        summary: {
          totalConversations: dailyMetrics.reduce((sum, day) => sum + day.total_sessions, 0),
          resolvedConversations: dailyMetrics.reduce((sum, day) => sum + day.resolved_sessions, 0),
          escalatedConversations: dailyMetrics.reduce((sum, day) => sum + day.escalated_sessions, 0),
          averageResolutionTime: dailyMetrics.reduce((sum, day) => sum + (day.avg_resolution_time_minutes || 0), 0) / dailyMetrics.length,
          averageSatisfaction: dailyMetrics.reduce((sum, day) => sum + (day.avg_satisfaction_rating || 0), 0) / dailyMetrics.length
        }
      };
    } catch (error) {
      console.error("Erro ao obter métricas:", error);
      return null;
    }
  }
}

// Exportações
export * from "../state";