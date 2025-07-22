import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { ConfigService } from "../config/config";
import { ConversationService } from "./conversationService";
import { createUserMessage, createAssistantMessage } from "../types/conversation";
import { ResponseFormatter, CustomerInfo } from '../utils/responseFormatter';
import { CustomerService } from './customerService';

// Importar as novas tools
import { searchProceduresTool } from "../tools/searchProcedures";
import { escalateToHumanTool } from "../tools/escalateToHuman";
import { finalizeTicketTool } from "../tools/finalizeTicket";
import { freshdeskUpdateTool } from "../tools/freshdeskUpdateTool";
import { analyzeLocationTool } from "../tools/analyzeLocationTool";
import { processVoucherSimplifiedTool } from "../tools/processVoucher";
import { requestAddressTool } from "../tools/requestAddress";

export class LangGraphAgent {
  private static instance: LangGraphAgent;
  private graph: any;
  private checkpointer: MemorySaver;
  private llm: ChatOpenAI;
  private tools: DynamicStructuredTool[];
  private config: ConfigService;
  private conversationService: ConversationService;
  private initialized: boolean = false;
  private responseFormatter: ResponseFormatter;
  private customerService: CustomerService;

  private constructor() {
    this.config = ConfigService.getInstance();
    this.conversationService = ConversationService.getInstance();
    this.responseFormatter = ResponseFormatter.getInstance();
    this.customerService = CustomerService.getInstance();
    this.checkpointer = new MemorySaver();
    this.llm = new ChatOpenAI({
      openAIApiKey: this.config.openaiApiKey,
      modelName: this.config.agentConfig.modelName,
      temperature: this.config.agentConfig.temperature,
      maxTokens: this.config.agentConfig.maxTokens
    });

    // Tools atualizadas para novo fluxo
    this.tools = [
  searchProceduresTool,          // Busca procedimentos com suporte a steps
  requestAddressTool,            // NOVO: Solicita endereço do cliente
  freshdeskUpdateTool,           // Atualiza FreshDesk
  escalateToHumanTool,           // Escala para humano
  finalizeTicketTool,            // Finaliza ticket
  analyzeLocationTool,           // Analisa localização APÓS receber endereço
  processVoucherSimplifiedTool,            // Processa voucher região Norte // Agenda coleta outras regiões
];

    console.log(`🤖 LangGraph Agent criado com ${this.tools.length} tools:`);
    this.tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
  }

  public static getInstance(): LangGraphAgent {
    if (!LangGraphAgent.instance) {
      LangGraphAgent.instance = new LangGraphAgent();
    }
    return LangGraphAgent.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('⚡ LangGraph Agent já inicializado');
      return;
    }

    try {
      console.log('🔧 Inicializando LangGraph Agent com novo fluxo...');
      
      // Verificar se todas as tools são válidas
      for (const tool of this.tools) {
        if (!tool.name || !tool.description) {
          throw new Error(`Tool inválida: ${JSON.stringify({
            name: tool.name,
            hasDescription: !!tool.description,
            hasSchema: !!tool.schema
          })}`);
        }
      }
      
      // Criar o agente com checkpointer para persistência
      this.graph = createReactAgent({
        llm: this.llm,
        tools: this.tools,
        checkpointSaver: this.checkpointer,
        messageModifier: this.config.agentConfig.systemPrompt,
      });

      this.initialized = true;
      console.log('✅ LangGraph Agent inicializado com fluxo completo');
      console.log('🔄 Fluxo: Busca → FreshDesk → Steps → Coleta/Voucher');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar LangGraph Agent:', error);
      throw error;
    }
  }

  // Método auxiliar para extrair texto de MessageContent
  private extractMessageText(content: any): string {
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      return content.map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item.text) return item.text;
        return JSON.stringify(item);
      }).join(' ');
    }
    if (typeof content === 'object' && content.text) {
      return content.text;
    }
    return String(content || '');
  }

  // Método para extrair customerId do threadId
  private extractCustomerId(threadId: string): string {
    const match = threadId.match(/^customer_(.+)$/);
    return match ? match[1] : 'unknown';
  }

  // Método para categorizar query
  private categorizeQuery(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('não liga') || queryLower.includes('boot')) return 'hardware';
    if (queryLower.includes('tela azul') || queryLower.includes('erro')) return 'software';
    if (queryLower.includes('internet') || queryLower.includes('wifi')) return 'network';
    if (queryLower.includes('lento') || queryLower.includes('travando')) return 'performance';
    
    return 'general';
  }

  // Método para obter histórico de mensagens de uma thread
  private async getThreadHistory(threadId: string): Promise<BaseMessage[]> {
    try {
      console.log(`[MEMORY] Carregando histórico da thread: ${threadId}`);
      
      const config = { configurable: { thread_id: threadId } };
      const checkpoint = await this.checkpointer.get(config);
      
      if (checkpoint && checkpoint.channel_values && checkpoint.channel_values.messages) {
        const messages = checkpoint.channel_values.messages;
        
        if (Array.isArray(messages) && messages.length > 0) {
          console.log(`[MEMORY] Encontradas ${messages.length} mensagens no histórico`);
          return messages as BaseMessage[];
        }
      }
      
      console.log(`[MEMORY] Nenhum histórico encontrado para thread ${threadId}`);
      return [];
      
    } catch (error) {
      console.error(`[MEMORY] Erro ao carregar histórico da thread ${threadId}:`, error);
      return [];
    }
  }

  // Método principal para processar queries
public async processQuery(
    message: string,
    threadId: string,
    existingMessages: { role: "user" | "assistant"; content: string }[] = []
  ): Promise<{ response: string; messages: any[]; threadHistory: BaseMessage[] }> {
    
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`[LANGGRAPH] 🔄 NOVO FLUXO - Processando: ${message.substring(0, 80)}...`);
      console.log(`[LANGGRAPH] Thread: ${threadId}`);
      
      const customerId = this.extractCustomerId(threadId);
      
      // 1. Obter informações do cliente
      const customerInfo = await this.customerService.getCustomerInfo(customerId);
      
      // 2. Verificar se cliente mencionou nome na mensagem
      const extractedName = this.customerService.extractNameFromMessage(message);
      if (extractedName && !customerInfo.name) {
        await this.customerService.updateCustomerInfo(customerId, { name: extractedName });
        customerInfo.name = extractedName;
      }

      const config = { 
        configurable: { 
          thread_id: threadId 
        }
      };

      // ... processamento do grafo existente ...
      await this.ensureConversationSession(threadId, customerId, message);
      const threadHistory = await this.getThreadHistory(threadId);
      const conversationContext = this.analyzeConversationContext(threadHistory, message);
      const newUserMessage = new HumanMessage(message);
      
      const input = {
        messages: [newUserMessage]
      };

      console.log(`[LANGGRAPH] 🚀 Enviando para grafo com novo fluxo...`);
      const result = await this.graph.invoke(input, config);

      // 3. NOVA PARTE: Processar e formatar resultado
      const processedResult = await this.processAgentResult(result, threadId, customerId, message);
      
      // 4. FORMATAR RESPOSTA com cumprimento e HTML
      let finalResponse = processedResult.response;
      
      if (finalResponse && finalResponse.trim()) {
        const customerData: CustomerInfo = {
          customerId,
          name: customerInfo.name,
          email: customerInfo.email
        };

        finalResponse = this.responseFormatter.formatResponse(
          finalResponse,
          customerData,
          {
            includeGreeting: true,
            convertToHtml: true,
            emailFormat: true
          }
        );

        console.log(`[RESPONSE] Resposta formatada com cumprimento e HTML`);
      }

      const updatedHistory = await this.getThreadHistory(threadId);
      await this.updateSessionStats(threadId, updatedHistory.length);

      return {
        response: finalResponse,
        messages: result.messages || [],
        threadHistory: updatedHistory
      };

    } catch (error) {
      console.error('[LANGGRAPH] ❌ Erro ao processar query:', error);
      
      // Resposta de erro também formatada
      const customerId = this.extractCustomerId(threadId);
      const customerInfo = await this.customerService.getCustomerInfo(customerId);
      
      const errorResponse = this.responseFormatter.formatResponse(
        "Erro interno. Um especialista entrará em contato.",
        {
          customerId,
          name: customerInfo.name,
          email: customerInfo.email
        }
      );
      
      return {
        response: errorResponse,
        messages: [],
        threadHistory: []
      };
    }
  }

  // Método para analisar contexto da conversa
private analyzeConversationContext(history: BaseMessage[], currentMessage: string): {
  type: 'first_contact' | 'follow_up' | 'feedback';
  isPositiveFeedback: boolean;
  isNegativeFeedback: boolean;
  currentStep: number;
  problemTag?: string;
} {
  const userMessages = history.filter(msg => msg instanceof HumanMessage);
  const messageCount = userMessages.length;
  const currentLower = currentMessage.toLowerCase();
  
  // Detectar feedback positivo
  const positiveKeywords = ['funcionou', 'resolveu', 'deu certo', 'consegui', 'obrigado', 'obrigada'];
  const isPositiveFeedback = positiveKeywords.some(word => currentLower.includes(word));
  
  // Detectar feedback negativo - CORRIGIDO
  const negativeKeywords = [
    'não funcionou', 'não deu certo', 'ainda não', 'ainda nao', 
    'continua', 'mesmo problema', 'não resolveu', 'ainda não resolveu',
    'persiste', 'não consegui'
  ];
  const isNegativeFeedback = negativeKeywords.some(word => currentLower.includes(word));
  
  // Extrair problemTag e currentStep do histórico
  let problemTag: string | undefined;
  let currentStep = 1;
  
  // CORRIGIDO: Buscar no histórico das mensagens do assistant
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg instanceof AIMessage) {
      const content = this.extractMessageText(msg.content);
      
      // Tentar extrair problemTag de tool calls anteriores
      if (content.includes('problemTag') || content.includes('problem_tag')) {
        try {
          const match = content.match(/"(?:problemTag|problem_tag)"\s*:\s*"([^"]+)"/);
          if (match) {
            problemTag = match[1];
            break;
          }
        } catch (error) {
          // Ignorar erros de parsing
        }
      }
    }
  }
  
  // Se não encontrou problemTag no histórico, tentar extrair da mensagem atual
  if (!problemTag && !isPositiveFeedback && !isNegativeFeedback && messageCount === 0) {
    problemTag = this.extractProblemTagFromMessage(currentMessage);
  }
  
  // Determinar currentStep baseado no histórico
  if (problemTag && isNegativeFeedback) {
    // Se há feedback negativo, incrementar step
    currentStep = this.extractCurrentStepFromHistory(history) + 1;
  }
  
  // CORRIGIDO: Lógica de classificação
  let type: 'first_contact' | 'follow_up' | 'feedback';
  
  if (messageCount === 0) {
    type = 'first_contact';
  } else if (isPositiveFeedback || isNegativeFeedback) {
    type = 'feedback';
  } else {
    type = 'follow_up';
  }
  
  console.log(`[CONTEXT] Tipo: ${type}, Mensagens: ${messageCount}, Feedback+: ${isPositiveFeedback}, Feedback-: ${isNegativeFeedback}`);
  console.log(`[CONTEXT] ProblemTag: ${problemTag}, Step: ${currentStep}`);
  
  return {
    type,
    isPositiveFeedback,
    isNegativeFeedback,
    currentStep,
    problemTag
  };
}

private extractProblemTagFromMessage(message: string): string | undefined {
  const messageLower = message.toLowerCase();
  
  // Mapear mensagens para problem tags conhecidos
  const problemMappings = {
    'não liga': 'nao_liga',
    'nao liga': 'nao_liga',
    'não dá vídeo': 'nao_da_video',
    'nao da video': 'nao_da_video',
    'tela azul': 'tela_azul',
    'bsod': 'tela_azul',
    'blue screen': 'tela_azul',
    'sem imagem': 'nao_da_video',
    'tela preta': 'nao_da_video'
  };
  
  for (const [keyword, tag] of Object.entries(problemMappings)) {
    if (messageLower.includes(keyword)) {
      return tag;
    }
  }
  
  return undefined;
}

private extractCurrentStepFromHistory(history: BaseMessage[]): number {
  let lastStep = 1;
  
  // Buscar o último step mencionado no histórico
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg instanceof AIMessage) {
      const content = this.extractMessageText(msg.content);
      
      const stepMatch = content.match(/"(?:currentStep|step)"\s*:\s*(\d+)/);
      if (stepMatch) {
        lastStep = parseInt(stepMatch[1]);
        break;
      }
    }
  }
  
  return lastStep;
}

  // Método para processar resultado do agent
  private async processAgentResult(result: any, threadId: string, customerId: string, userMessage: string): Promise<{
    response: string;
    shouldRespond: boolean;
  }> {
    const lastMessage = result.messages?.[result.messages.length - 1];
    let response = lastMessage?.content ? this.extractMessageText(lastMessage.content) : "";
    
    // Verificar se houve escalação (não deve responder)
    const hasEscalation = result.messages?.some((msg: any) => 
      msg.content && msg.content.includes('ESCALATED_TO_HUMAN')
    );
    
    if (hasEscalation) {
      console.log(`[LANGGRAPH] 🔄 Escalação detectada - não respondendo ao cliente`);
      response = ""; // Não responder nada ao cliente
    }
    
    // Salvar mensagens na base de dados
    await this.saveConversationMessages(threadId, customerId, userMessage, response);
    
    return {
      response,
      shouldRespond: !hasEscalation
    };
  }

  // Métodos auxiliares (manter os existentes)
  private async ensureConversationSession(threadId: string, customerId: string, message: string): Promise<void> {
    try {
      const existingSession = await this.conversationService.getSession(threadId);
      
      if (!existingSession) {
        console.log(`[SESSION] 🆕 Criando nova sessão: ${threadId}`);
        
        await this.conversationService.createSession({
          threadId,
          customerId,
          primaryIssueCategory: this.categorizeQuery(message),
          primaryIssueDescription: message,
          tags: this.extractTags(message),
          userAgent: 'LangGraph-Agent-V2',
          deviceType: 'web'
        });
      }
    } catch (error) {
      console.error(`[SESSION] Erro ao criar/verificar sessão ${threadId}:`, error);
    }
  }

  private async saveConversationMessages(threadId: string, customerId: string, userMessage: string, assistantResponse: string): Promise<void> {
    try {
      const nextSeq = await this.conversationService.getNextSequenceNumber(threadId);

      // Salvar mensagem do usuário
      const userMsg = createUserMessage(userMessage, threadId, customerId);
      userMsg.sequenceNumber = nextSeq;
      userMsg.userIntent = this.detectUserIntent(userMessage);
      userMsg.userSentiment = this.analyzeSentiment(userMessage);
      
      await this.conversationService.saveMessage(userMsg);

      // Salvar resposta do assistant (se houver)
      if (assistantResponse.trim()) {
        const assistantMsg = createAssistantMessage(assistantResponse, threadId);
        assistantMsg.sequenceNumber = nextSeq + 1;
        assistantMsg.responseType = 'solution';
        
        await this.conversationService.saveMessage(assistantMsg);
      }

      console.log(`[MESSAGES] 💾 Mensagens salvas para thread ${threadId}`);
      
    } catch (error) {
      console.error(`[MESSAGES] Erro ao salvar mensagens para thread ${threadId}:`, error);
    }
  }

  private async updateSessionStats(threadId: string, totalMessages: number): Promise<void> {
    try {
      await this.conversationService.updateSession(threadId, {
        status: 'active'
      });
    } catch (error) {
      console.error(`[SESSION] Erro ao atualizar estatísticas ${threadId}:`, error);
    }
  }

  // Métodos auxiliares para análise
  private extractTags(query: string): string[] {
    const tags: string[] = [];
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('não liga')) tags.push('boot_issue');
    if (queryLower.includes('tela azul')) tags.push('bsod');
    if (queryLower.includes('lento')) tags.push('performance');
    
    return tags;
  }

  private detectUserIntent(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('funcionou') || queryLower.includes('resolveu')) {
      return 'positive_feedback';
    }
    
    if (queryLower.includes('não funcionou') || queryLower.includes('não resolveu')) {
      return 'negative_feedback';
    }
    
    if (queryLower.includes('como') || queryLower.includes('onde')) {
      return 'clarification_request';
    }
    
    return 'problem_report';
  }

  private analyzeSentiment(query: string): string {
    const queryLower = query.toLowerCase();
    
    const negativeWords = ['problema', 'erro', 'não funciona'];
    const positiveWords = ['obrigado', 'funcionou', 'resolveu'];
    
    const negativeScore = negativeWords.filter(word => queryLower.includes(word)).length;
    const positiveScore = positiveWords.filter(word => queryLower.includes(word)).length;
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    
    return 'neutral';
  }

  // Métodos públicos (manter os existentes)
  public async getThreadStats(threadId: string): Promise<{
    messageCount: number;
    firstMessage?: string;
    lastMessage?: string;
    threadAge?: number;
  }> {
    try {
      const history = await this.getThreadHistory(threadId);
      
      if (history.length === 0) {
        return { messageCount: 0 };
      }

      const firstMessageText = history[0]?.content ? this.extractMessageText(history[0].content).substring(0, 100) : undefined;
      const lastMessageText = history[history.length - 1]?.content ? this.extractMessageText(history[history.length - 1].content).substring(0, 100) : undefined;

      return {
        messageCount: history.length,
        firstMessage: firstMessageText,
        lastMessage: lastMessageText,
      };
    } catch (error) {
      console.error(`[MEMORY] Erro ao obter stats da thread ${threadId}:`, error);
      return { messageCount: 0 };
    }
  }

  public async clearThread(threadId: string): Promise<boolean> {
    try {
      console.log(`[MEMORY] Limpando thread: ${threadId}`);
      
      const config = { configurable: { thread_id: threadId } };
      
      const metadata = {
        source: "update" as const,
        step: 0,
        writes: null,
        parents: {}
      };
      
      await this.checkpointer.put(config, {
        configurable: config.configurable,
        checkpoint: {
          ts: new Date().toISOString(),
          channel_values: { messages: [] },
          channel_versions: {},
          versions_seen: {}
        },
        metadata
      } as any, metadata);
      
      try {
        await this.conversationService.updateSession(threadId, {
          status: 'archived'
        });
      } catch (dbError) {
        console.warn(`[MEMORY] Erro ao arquivar sessão no banco:`, dbError);
      }
      
      console.log(`[MEMORY] Thread ${threadId} limpa com sucesso`);
      return true;
      
    } catch (error) {
      console.error(`[MEMORY] Erro ao limpar thread ${threadId}:`, error);
      return false;
    }
  }

  public async debugThread(threadId: string): Promise<any> {
    try {
      const config = { configurable: { thread_id: threadId } };
      const checkpoint = await this.checkpointer.get(config);
      
      let messageCount = 0;
      if (checkpoint?.channel_values?.messages) {
        const messages = checkpoint.channel_values.messages;
        if (Array.isArray(messages)) {
          messageCount = messages.length;
        }
      }

      // Obter também dados do banco
      let dbSessionData = null;
      try {
        const session = await this.conversationService.getSession(threadId);
        const messages = await this.conversationService.getMessages(threadId);
        dbSessionData = {
          sessionExists: !!session,
          sessionStatus: session?.status,
          dbMessageCount: messages.length,
          lastActiveAt: session?.lastActiveAt
        };
      } catch (dbError) {
        console.warn(`[DEBUG] Erro ao acessar dados do banco:`, dbError);
      }
      
      return {
        threadId,
        hasCheckpoint: !!checkpoint,
        messageCount,
        lastUpdate: checkpoint?.ts || null,
        channelKeys: checkpoint?.channel_values ? Object.keys(checkpoint.channel_values) : [],
        databaseData: dbSessionData,
        fullState: process.env.NODE_ENV === 'development' ? checkpoint?.channel_values : null
      };
    } catch (error) {
      console.error(`[DEBUG] Erro ao fazer debug da thread ${threadId}:`, error);
      return { 
        threadId, 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        hasCheckpoint: false,
        messageCount: 0,
        databaseData: null
      };
    }
  }

  public async streamQuery(
    message: string,
    threadId: string
  ): Promise<AsyncGenerator<any, void, unknown>> {
    
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`[LANGGRAPH] Iniciando stream para thread ${threadId}`);
      
      const config = {
        configurable: {
          thread_id: threadId,
        },
      };

      const input = {
        messages: [new HumanMessage(message)]
      };

      return this.graph.stream(input, config);

    } catch (error) {
      console.error('[LANGGRAPH] Erro no stream:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      return {
        status: 'healthy',
        details: {
          initialized: this.initialized,
          tools_count: this.tools.length,
          model: this.llm.modelName,
          tools_available: this.tools.map(t => t.name),
          checkpointer_type: 'MemorySaver',
          memory_enabled: true,
          conversation_service_enabled: true,
          new_flow_enabled: true,
          flow_features: {
            step_progression: true,
            freshdesk_integration: true,
            location_analysis: true,
            voucher_system: true,
            collection_scheduling: true
          },
          llm_config: {
            temperature: this.llm.temperature,
            maxTokens: this.llm.maxTokens
          }
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          initialized: this.initialized,
          tools_count: this.tools.length,
          stack: error instanceof Error ? error.stack : undefined
        }
      };
    }
  }

  public getInfo(): any {
    return {
      initialized: this.initialized,
      model: this.llm.modelName,
      temperature: this.llm.temperature,
      maxTokens: this.llm.maxTokens,
      tools: this.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        schema: tool.schema ? 'defined' : 'missing'
      })),
      checkpointer: 'MemorySaver',
      conversation_integration: true,
      new_features: {
        step_progression: 'Suporte a múltiplos steps por problema',
        freshdesk_integration: 'Atualização automática de tickets',
        smart_escalation: 'Escalação inteligente sem resposta ao cliente',
        location_analysis: 'Análise de localização para coleta/voucher',
        regional_voucher: 'Voucher R$ 150 para região Norte',
        collection_scheduling: 'Agendamento de coleta gratuita'
      },
      memory_features: {
        thread_persistence: true,
        cross_thread_memory: false,
        automatic_checkpoints: true,
        thread_isolation: true,
        database_persistence: true
      }
    };
  }

  public async testTool(toolName: string, input: any): Promise<any> {
    try {
      const tool = this.tools.find(t => t.name === toolName);
      if (!tool) {
        throw new Error(`Tool '${toolName}' não encontrada`);
      }

      console.log(`[LANGGRAPH] Testando tool ${toolName} com input:`, input);
      
      const result = await tool.invoke(input);
      
      console.log(`[LANGGRAPH] Resultado da tool ${toolName}:`, result);
      
      return result;
    } catch (error) {
      console.error(`[LANGGRAPH] Erro ao testar tool ${toolName}:`, error);
      throw error;
    }
  }

  public validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.llm.openAIApiKey) {
      errors.push('OpenAI API Key não configurada');
    }

    if (this.tools.length === 0) {
      errors.push('Nenhuma tool configurada');
    }

    // Verificar tools específicas do novo fluxo
    const requiredTools = [
      'searchProcedures',
      'updateFreshDesk', 
      'escalateToHuman',
      'finalizeTicket',
      'analyzeLocation',
      'processVoucher',
      'scheduleCollection'
    ];

    const availableTools = this.tools.map(t => t.name);
    const missingTools = requiredTools.filter(tool => !availableTools.includes(tool));
    
    if (missingTools.length > 0) {
      errors.push(`Tools obrigatórias ausentes: ${missingTools.join(', ')}`);
    }

    this.tools.forEach((tool, index) => {
      if (!tool.name) {
        errors.push(`Tool ${index} sem nome`);
      }
      if (!tool.description) {
        errors.push(`Tool ${index} (${tool.name}) sem descrição`);
      }
      if (!tool.schema) {
        errors.push(`Tool ${index} (${tool.name}) sem schema`);
      }
    });

    if (!this.config.agentConfig.systemPrompt) {
      errors.push('System prompt não configurado');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Método adicional para testar memória especificamente
  public async testMemory(threadId: string = 'test_memory'): Promise<any> {
    try {
      console.log(`[MEMORY_TEST] Testando memória com thread: ${threadId}`);
      
      // 1. Primeira mensagem
      const result1 = await this.processQuery("Meu nome é João", threadId);
      
      // 2. Segunda mensagem para testar se lembra
      const result2 = await this.processQuery("Qual é o meu nome?", threadId);
      
      // 3. Obter stats
      const stats = await this.getThreadStats(threadId);
      const debug = await this.debugThread(threadId);
      
      return {
        test_completed: true,
        first_response: result1.response.substring(0, 100),
        second_response: result2.response.substring(0, 100),
        memory_working: result2.response.toLowerCase().includes('joão'),
        stats,
        debug: {
          hasCheckpoint: debug.hasCheckpoint,
          messageCount: debug.messageCount,
          channelKeys: debug.channelKeys,
          databaseData: debug.databaseData
        }
      };
      
    } catch (error) {
      console.error('[MEMORY_TEST] Erro no teste de memória:', error);
      return {
        test_completed: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // Método para obter conversas do cliente no banco
  public async getCustomerConversations(customerId: string): Promise<any[]> {
    try {
      const conversations = await this.conversationService.getCustomerConversations(customerId);
      return conversations;
    } catch (error) {
      console.error(`[CONVERSATIONS] Erro ao obter conversas do cliente ${customerId}:`, error);
      return [];
    }
  }

  // Método para obter dashboard de métricas
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

  // Método para testar o fluxo completo
  public async testCompleteFlow(customerId: string = 'TEST_FLOW'): Promise<any> {
    try {
      console.log(`[FLOW_TEST] 🧪 Testando fluxo completo para cliente: ${customerId}`);
      
      const threadId = `customer_${customerId}`;
      const results = [];
      
      // 1. Primeira mensagem (problema)
      console.log(`[FLOW_TEST] 1️⃣ Teste: Problema inicial`);
      const result1 = await this.processQuery("meu pc não liga", threadId);
      results.push({
        step: 1,
        input: "meu pc não liga",
        response: result1.response.substring(0, 200),
        messageCount: result1.threadHistory.length
      });
      
      // 2. Feedback negativo (próximo step)
      console.log(`[FLOW_TEST] 2️⃣ Teste: Feedback negativo`);
      const result2 = await this.processQuery("tentei mas não funcionou, ainda não liga", threadId);
      results.push({
        step: 2,
        input: "tentei mas não funcionou, ainda não liga",
        response: result2.response.substring(0, 200),
        messageCount: result2.threadHistory.length
      });
      
      // 3. Feedback positivo (finalizar)
      console.log(`[FLOW_TEST] 3️⃣ Teste: Feedback positivo`);
      const result3 = await this.processQuery("funcionou! obrigado, resolveu o problema", threadId);
      results.push({
        step: 3,
        input: "funcionou! obrigado, resolveu o problema",
        response: result3.response.substring(0, 200),
        messageCount: result3.threadHistory.length
      });
      
      const finalStats = await this.getThreadStats(threadId);
      
      return {
        test_completed: true,
        customer_id: customerId,
        thread_id: threadId,
        results,
        final_stats: finalStats,
        flow_working: results.length === 3 && finalStats.messageCount > 0
      };
      
    } catch (error) {
      console.error('[FLOW_TEST] Erro no teste de fluxo:', error);
      return {
        test_completed: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}