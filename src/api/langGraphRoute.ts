import { Request, Response } from 'express';
import { LangGraphAgent } from '../services/langGraphAgent';

export class LangGraphRoute {
  private agent: LangGraphAgent | null = null; // Inicializar como null
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // NÃO inicializar o agent no constructor
    // Será inicializado no primeiro uso (lazy loading)
  }

  /**
   * Garantir que o agent está inicializado
   */
  private async ensureAgentInitialized(): Promise<LangGraphAgent> {
    if (this.agent) {
      return this.agent;
    }

    // Se já está inicializando, aguardar
    if (this.initializationPromise) {
      await this.initializationPromise;
      return this.agent!;
    }

    // Inicializar pela primeira vez
    this.initializationPromise = this.initializeAgent();
    await this.initializationPromise;
    this.initializationPromise = null;

    return this.agent!;
  }

  /**
   * Inicializar o agent de forma segura
   */
  private async initializeAgent(): Promise<void> {
    try {
      console.log('[ROUTE] 🚀 Inicializando LangGraphAgent...');
      
      this.agent = LangGraphAgent.getInstance();
      await this.agent.initialize();
      
      console.log('[ROUTE] ✅ LangGraphAgent inicializado com sucesso');
    } catch (error) {
      console.error('[ROUTE] ❌ Erro ao inicializar LangGraphAgent:', error);
      this.agent = null;
      throw error;
    }
  }

  public async handleTechSupport(req: Request, res: Response): Promise<void> {
    try {
      const { message, customerId, threadId } = req.body;

      if (!message || !customerId) {
        res.status(400).json({
          success: false,
          error: 'message e customerId são obrigatórios'
        });
        return;
      }

      const actualThreadId = threadId || `customer_${customerId}`;
      console.log(`[ROUTE] Processando: Customer=${customerId}, Thread=${actualThreadId}`);

      // Garantir que agent está inicializado
      const agent = await this.ensureAgentInitialized();

      const result = await agent.processQuery(message, actualThreadId, []);
      const threadStats = await agent.getThreadStats(actualThreadId);

      res.json({
        success: true,
        data: {
          response: result.response,
          customerId,
          threadId: actualThreadId,
          messageCount: result.messages?.length || 0,
          threadStats: {
            totalMessages: threadStats.messageCount,
            threadAge: threadStats.threadAge,
            hasHistory: threadStats.messageCount > 1
          }
        }
      });

    } catch (error) {
      console.error('[ROUTE] Erro no LangGraph agent:', error);
      
      res.status(500).json({
        success: false,
        error: 'Erro interno',
        message: 'Ocorreu um erro ao processar sua solicitação. Um especialista entrará em contato.'
      });
    }
  }

  // MÉTODO PRINCIPAL CORRIGIDO
  public async handleContinueConversation(req: Request, res: Response): Promise<void> {
    try {
      const { message, customerId, customerName, customerEmail } = req.body;

      if (!message || !customerId) {
        res.status(400).json({
          success: false,
          error: 'message e customerId são obrigatórios'
        });
        return;
      }

      const threadId = `customer_${customerId}`;
      console.log(`[ROUTE] Continuando conversa: Customer=${customerId}, Thread=${threadId}`);

      // CORREÇÃO: Garantir que agent está inicializado ANTES de usar
      const agent = await this.ensureAgentInitialized();

      // Se nome ou email foram fornecidos, atualizar informações do cliente
      if (customerName || customerEmail) {
        try {
          const { CustomerService } = require('../services/customerService');
          const customerService = CustomerService.getInstance();
          
          await customerService.updateCustomerInfo(customerId, {
            name: customerName,
            email: customerEmail
          });
          
          console.log(`[ROUTE] ✅ Informações do cliente atualizadas: ${customerName || 'N/A'}, ${customerEmail || 'N/A'}`);
        } catch (customerError) {
          console.warn(`[ROUTE] ⚠️ Erro ao atualizar cliente (continuando):`, customerError);
          // Continuar mesmo se falhar ao atualizar cliente
        }
      }

      // CORREÇÃO: Verificar stats com fallback seguro
      let existingStats;
      let isNewConversation = true;
      
      try {
        existingStats = await agent.getThreadStats(threadId);
        isNewConversation = existingStats.messageCount === 0;
        console.log(`[ROUTE] ${isNewConversation ? '🆕 Nova conversa' : `🔄 Continuando conversa (${existingStats.messageCount} mensagens)`}`);
      } catch (statsError) {
        console.warn(`[ROUTE] ⚠️ Erro ao obter stats (assumindo nova conversa):`, statsError);
        existingStats = { messageCount: 0 };
        isNewConversation = true;
      }

      // Processar mensagem
      console.log(`[ROUTE] 📨 Processando mensagem: "${message.substring(0, 50)}..."`);
      const result = await agent.processQuery(message, threadId, []);

      // Obter stats atualizados com fallback
      let updatedStats;
      try {
        updatedStats = await agent.getThreadStats(threadId);
      } catch (statsError) {
        console.warn(`[ROUTE] ⚠️ Erro ao obter stats atualizados:`, statsError);
        updatedStats = {
          messageCount: (existingStats.messageCount || 0) + 1,
          firstMessage: message.substring(0, 100),
          lastMessage: result.response?.substring(0, 100) || '',
          threadAge: 0
        };
      }

      console.log(`[ROUTE] ✅ Resposta processada: ${result.response?.substring(0, 100) || 'Sem resposta'}...`);

      res.json({
        success: true,
        data: {
          response: result.response,
          customerId,
          threadId,
          isNewConversation,
          conversationStats: {
            messageCount: updatedStats.messageCount,
            firstMessage: updatedStats.firstMessage,
            lastMessage: updatedStats.lastMessage,
            threadAge: updatedStats.threadAge
          }
        }
      });

    } catch (error) {
      console.error('[ROUTE] ❌ Erro na conversa contínua:', error);
      
      // Log detalhado para debug
      if (error instanceof Error) {
        console.error('[ROUTE] Stack trace:', error.stack);
        console.error('[ROUTE] Erro detalhado:', {
          message: error.message,
          name: error.name,
          cause: error
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Erro interno',
        message: 'Erro ao processar conversa',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      });
    }
  }

  // Todos os outros métodos com correções similares
  public async handleToolTest(req: Request, res: Response): Promise<void> {
    try {
      const { toolName, input } = req.body;

      if (!toolName || !input) {
        res.status(400).json({
          success: false,
          error: 'toolName e input são obrigatórios'
        });
        return;
      }

      console.log(`[ROUTE] Testando tool: ${toolName}`);

      const agent = await this.ensureAgentInitialized();
      const result = await agent.testTool(toolName, input);

      res.json({
        success: true,
        data: {
          toolName,
          input,
          result
        }
      });

    } catch (error) {
      console.error(`[ROUTE] Erro ao testar tool:`, error);
      res.status(500).json({
        success: false,
        error: 'Erro ao testar tool',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  public async handleHealthCheck(_: Request, res: Response): Promise<void> {
    try {
      // CORREÇÃO: Health check mesmo sem agent inicializado
      let agentHealth = null;
      let agentInfo = null;
      
      try {
        const agent = await this.ensureAgentInitialized();
        agentHealth = await agent.healthCheck();
        agentInfo = agent.getInfo();
      } catch (agentError) {
        console.warn('[ROUTE] Agent não disponível para health check:', agentError);
        agentHealth = {
          status: 'unhealthy',
          details: { error: 'Agent não inicializado' }
        };
        agentInfo = { initialized: false };
      }
      
      res.json({
        success: true,
        data: {
          health: agentHealth,
          info: agentInfo,
          route: {
            initialized: this.agent !== null,
            timestamp: new Date().toISOString()
          }
        }
      });

    } catch (error) {
      console.error(`[ROUTE] Erro no health check:`, error);
      res.status(500).json({
        success: false,
        error: 'Erro no health check',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  public async handleGetThreadHistory(req: Request, res: Response): Promise<void> {
    try {
      const { threadId } = req.params;

      if (!threadId) {
        res.status(400).json({
          success: false,
          error: 'threadId é obrigatório'
        });
        return;
      }

      console.log(`[ROUTE] Obtendo histórico da thread: ${threadId}`);

      const agent = await this.ensureAgentInitialized();
      const stats = await agent.getThreadStats(threadId);
      const debug = await agent.debugThread(threadId);

      res.json({
        success: true,
        data: {
          threadId,
          stats,
          debug: {
            messageCount: debug.messageCount,
            hasCheckpoint: debug.hasCheckpoint,
            lastUpdate: debug.lastUpdate
          }
        }
      });

    } catch (error) {
      console.error(`[ROUTE] Erro ao obter histórico:`, error);
      res.status(500).json({
        success: false,
        error: 'Erro ao obter histórico',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  public async handleClearThread(req: Request, res: Response): Promise<void> {
    try {
      const { threadId } = req.params;

      if (!threadId) {
        res.status(400).json({
          success: false,
          error: 'threadId é obrigatório'
        });
        return;
      }

      console.log(`[ROUTE] Limpando thread: ${threadId}`);

      const agent = await this.ensureAgentInitialized();
      const success = await agent.clearThread(threadId);

      res.json({
        success,
        data: {
          threadId,
          cleared: success
        }
      });

    } catch (error) {
      console.error(`[ROUTE] Erro ao limpar thread:`, error);
      res.status(500).json({
        success: false,
        error: 'Erro ao limpar thread',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
  
  public async handleValidateConfig(req: Request, res: Response): Promise<void> {
    try {
      const agent = await this.ensureAgentInitialized();
      const validation = agent.validateConfiguration();
      
      res.json({
        success: validation.valid,
        data: validation
      });

    } catch (error) {
      console.error(`[ROUTE] Erro na validação:`, error);
      res.status(500).json({
        success: false,
        error: 'Erro na validação',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  public async handleTestMemory(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.body;
      const testThreadId = customerId ? `test_memory_${customerId}` : 'test_memory_default';
      
      console.log(`[ROUTE] Testando memória com thread: ${testThreadId}`);

      const agent = await this.ensureAgentInitialized();
      const memoryTest = await agent.testMemory(testThreadId);

      res.json({
        success: true,
        data: {
          testThreadId,
          memoryTest
        }
      });

    } catch (error) {
      console.error(`[ROUTE] Erro no teste de memória:`, error);
      res.status(500).json({
        success: false,
        error: 'Erro no teste de memória',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}

export function setupLangGraphRoutes(app: any) {
  const route = new LangGraphRoute();

  // Rota principal - NOVA (com thread consistente e tratamento de erro)
  app.post('/v2/conversation', async (req: any, res: any) => {
    try {
      await route.handleContinueConversation(req, res);
    } catch (error) {
      console.error('[SETUP] Erro na rota conversation:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Erro ao processar conversa'
      });
    }
  });
  
  // Rota principal - ANTIGA (mantida para compatibilidade)
  app.post('/v2/tech-support', async (req: any, res: any) => {
    try {
      await route.handleTechSupport(req, res);
    } catch (error) {
      console.error('[SETUP] Erro na rota tech-support:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  });
  
  // Todas as outras rotas com tratamento similar...
  app.get('/v2/thread/:threadId/history', async (req: any, res: any) => {
    try {
      await route.handleGetThreadHistory(req, res);
    } catch (error) {
      console.error('[SETUP] Erro na rota history:', error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });
  
  app.delete('/v2/thread/:threadId/clear', async (req: any, res: any) => {
    try {
      await route.handleClearThread(req, res);
    } catch (error) {
      console.error('[SETUP] Erro na rota clear:', error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });
  
  app.post('/v2/test-tool', async (req: any, res: any) => {
    try {
      await route.handleToolTest(req, res);
    } catch (error) {
      console.error('[SETUP] Erro na rota test-tool:', error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });
  
  app.post('/v2/test-memory', async (req: any, res: any) => {
    try {
      await route.handleTestMemory(req, res);
    } catch (error) {
      console.error('[SETUP] Erro na rota test-memory:', error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });
  
  app.get('/v2/health', async (req: any, res: any) => {
    try {
      await route.handleHealthCheck(req, res);
    } catch (error) {
      console.error('[SETUP] Erro na rota health:', error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });
  
  app.get('/v2/validate', async (req: any, res: any) => {
    try {
      await route.handleValidateConfig(req, res);
    } catch (error) {
      console.error('[SETUP] Erro na rota validate:', error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });
  
  console.log('✅ Rotas LangGraph v2 configuradas com tratamento de erro robusto');
}