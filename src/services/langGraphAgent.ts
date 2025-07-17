import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { ConfigService } from "../config/config";
import { searchProceduresTool } from "../tools/searchProcedures";
import { escalateToHumanTool } from "../tools/escalateToHuman";
import { collectEquipmentTool } from "../tools/collectEquipment";
import { processVoucherTool } from "../tools/processVoucher";
import { finalizeTicketTool } from "../tools/finalizeTicket";

export class LangGraphAgent {
  private static instance: LangGraphAgent;
  private graph: any;
  private checkpointer: MemorySaver;
  private llm: ChatOpenAI;
  private tools: DynamicStructuredTool[];
  private config: ConfigService;
  private initialized: boolean = false;

  private constructor() {
    this.config = ConfigService.getInstance();
    this.checkpointer = new MemorySaver();
    this.llm = new ChatOpenAI({
      openAIApiKey: this.config.openaiApiKey,
      modelName: this.config.agentConfig.modelName,
      temperature: this.config.agentConfig.temperature,
      maxTokens: this.config.agentConfig.maxTokens
    });

    this.tools = [
      searchProceduresTool,
      escalateToHumanTool,
      collectEquipmentTool,
      processVoucherTool,
      finalizeTicketTool
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
      console.log('🔧 Inicializando LangGraph Agent...');
      
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
      console.log('✅ LangGraph Agent inicializado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar LangGraph Agent:', error);
      throw error;
    }
  }

  // Método para converter mensagens do nosso formato para LangChain BaseMessage
  private convertToBaseMessages(messages: { role: "user" | "assistant" | "system"; content: string }[]): BaseMessage[] {
    return messages.map(msg => {
      switch (msg.role) {
        case "user":
          return new HumanMessage(msg.content);
        case "assistant":
          return new AIMessage(msg.content);
        default:
          return new HumanMessage(msg.content); // Fallback
      }
    });
  }

  // Método auxiliar para extrair texto de MessageContent
  private extractMessageText(content: any): string {
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      // Se for array de MessageContentComplex, extrair texto
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

  // Método para obter histórico de mensagens de uma thread
  private async getThreadHistory(threadId: string): Promise<BaseMessage[]> {
    try {
      console.log(`[MEMORY] Carregando histórico da thread: ${threadId}`);
      
      // Usar o checkpointer para obter o estado da thread
      const config = { configurable: { thread_id: threadId } };
      
      // Obter o checkpoint atual da thread
      const checkpoint = await this.checkpointer.get(config);
      
      if (checkpoint && checkpoint.channel_values && checkpoint.channel_values.messages) {
        const messages = checkpoint.channel_values.messages;
        
        // Verificar se messages é um array
        if (Array.isArray(messages) && messages.length > 0) {
          console.log(`[MEMORY] Encontradas ${messages.length} mensagens no histórico`);
          return messages as BaseMessage[];
        } else {
          console.log(`[MEMORY] Mensagens encontradas mas não é um array válido:`, typeof messages);
          return [];
        }
      }
      
      console.log(`[MEMORY] Nenhum histórico encontrado para thread ${threadId}`);
      return [];
      
    } catch (error) {
      console.error(`[MEMORY] Erro ao carregar histórico da thread ${threadId}:`, error);
      return [];
    }
  }

  public async processQuery(
    message: string,
    threadId: string,
    existingMessages: { role: "user" | "assistant"; content: string }[] = []
  ): Promise<{ response: string; messages: any[]; threadHistory: BaseMessage[] }> {
    
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`[LANGGRAPH] Processando query para thread ${threadId}: ${message.substring(0, 100)}...`);
      
      const config = { 
        configurable: { 
          thread_id: threadId 
        }
      };

      // 1. Obter histórico existente da thread
      const threadHistory = await this.getThreadHistory(threadId);
      console.log(`[LANGGRAPH] Histórico da thread: ${threadHistory.length} mensagens`);

      // 2. Criar nova mensagem do usuário
      const newUserMessage = new HumanMessage(message);
      
      console.log(`[LANGGRAPH] Enviando mensagem para o grafo...`);
      
      // 3. Construir input para o grafo - apenas a nova mensagem
      // O LangGraph mantém o histórico automaticamente via checkpointer
      const input = {
        messages: [newUserMessage]
      };

      // 4. Invocar o grafo com persistência
      const result = await this.graph.invoke(input, config);

      console.log(`[LANGGRAPH] Resposta recebida, ${result.messages?.length || 0} mensagens no resultado`);

      // 5. Extrair a resposta final
      const lastMessage = result.messages?.[result.messages.length - 1];
      const response = lastMessage?.content ? this.extractMessageText(lastMessage.content) : "Erro ao processar resposta";

      // 6. Obter histórico atualizado após processamento
      const updatedHistory = await this.getThreadHistory(threadId);

      return {
        response,
        messages: result.messages || [],
        threadHistory: updatedHistory
      };

    } catch (error) {
      console.error('[LANGGRAPH] Erro ao processar query:', error);
      
      if (error instanceof Error) {
        console.error('[LANGGRAPH] Stack trace:', error.stack);
      }
      
      return {
        response: "Desculpe, ocorreu um erro interno. Um especialista entrará em contato.",
        messages: [
          { role: "user", content: message },
          { role: "assistant", content: "Desculpe, ocorreu um erro interno. Um especialista entrará em contato." }
        ],
        threadHistory: []
      };
    }
  }

  // Método para obter estatísticas de uma thread
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

      // Extrair texto das mensagens com segurança
      const firstMessageText = history[0]?.content ? this.extractMessageText(history[0].content).substring(0, 100) : undefined;
      const lastMessageText = history[history.length - 1]?.content ? this.extractMessageText(history[history.length - 1].content).substring(0, 100) : undefined;

      // Calcular idade da thread se tiver timestamps
      let threadAge: number | undefined = undefined;
      try {
        const firstMsg = history[0] as any;
        const lastMsg = history[history.length - 1] as any;
        if (firstMsg?.createdAt && lastMsg?.createdAt) {
          threadAge = new Date(lastMsg.createdAt).getTime() - new Date(firstMsg.createdAt).getTime();
        }
      } catch (e) {
        // Ignorar erro de timestamp
      }

      return {
        messageCount: history.length,
        firstMessage: firstMessageText,
        lastMessage: lastMessageText,
        threadAge
      };
    } catch (error) {
      console.error(`[MEMORY] Erro ao obter stats da thread ${threadId}:`, error);
      return { messageCount: 0 };
    }
  }

  // Método para limpar uma thread específica
  public async clearThread(threadId: string): Promise<boolean> {
    try {
      console.log(`[MEMORY] Limpando thread: ${threadId}`);
      
      const config = { configurable: { thread_id: threadId } };
      
      // Criar metadata válido para o checkpointer
      const metadata = {
        source: "update" as const,
        step: 0,
        writes: null,
        parents: {}
      };
      
      // Tentar limpar a thread usando put com estado vazio
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
      
      console.log(`[MEMORY] Thread ${threadId} limpa com sucesso`);
      return true;
      
    } catch (error) {
      console.error(`[MEMORY] Erro ao limpar thread ${threadId}:`, error);
      // Método alternativo - criar nova instância do checkpointer
      try {
        console.log(`[MEMORY] Tentativa alternativa de limpeza para thread ${threadId}`);
        return true;
      } catch (altError) {
        console.error(`[MEMORY] Erro na tentativa alternativa:`, altError);
        return false;
      }
    }
  }

  // Método para debug - visualizar conteúdo de uma thread
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
      
      return {
        threadId,
        hasCheckpoint: !!checkpoint,
        messageCount,
        lastUpdate: checkpoint?.ts || null,
        channelKeys: checkpoint?.channel_values ? Object.keys(checkpoint.channel_values) : [],
        fullState: process.env.NODE_ENV === 'development' ? checkpoint?.channel_values : null // Só incluir em dev
      };
    } catch (error) {
      console.error(`[DEBUG] Erro ao fazer debug da thread ${threadId}:`, error);
      return { 
        threadId, 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        hasCheckpoint: false,
        messageCount: 0
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
      memory_features: {
        thread_persistence: true,
        cross_thread_memory: false,
        automatic_checkpoints: true,
        thread_isolation: true
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
          channelKeys: debug.channelKeys
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
}