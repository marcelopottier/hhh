import { Request, Response } from 'express';
import { LangGraphAgent } from '../services/langGraphAgent';

export class LangGraphRoute {
  private agent: LangGraphAgent;

  constructor() {
    this.agent = LangGraphAgent.getInstance();
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

      // Gerar thread ID correto baseado no customerId
      const actualThreadId = threadId || `customer_${customerId}_${Date.now()}`;

      console.log(`[ROUTE] Processando: Customer=${customerId}, Thread=${actualThreadId}`);
      console.log(`[ROUTE] Mensagem: "${message}"`);

      // Garantir que o agent está inicializado
      await this.agent.initialize();

      // Processar com o LangGraph Agent (com memória persistente)
      const result = await this.agent.processQuery(
        message,
        actualThreadId,
        [] // LangGraph gerencia o histórico automaticamente via checkpointer
      );

      console.log(`[ROUTE] Resposta do agent: "${result.response.substring(0, 100)}..."`);
      console.log(`[ROUTE] Mensagens na thread após processamento: ${result.threadHistory?.length || 0}`);

      // Obter estatísticas da thread para debug
      const threadStats = await this.agent.getThreadStats(actualThreadId);

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
      
      // Log detalhado para debug
      if (error instanceof Error) {
        console.error('[ROUTE] Stack trace:', error.stack);
      }
      
      res.status(500).json({
        success: false,
        error: 'Erro interno',
        message: 'Ocorreu um erro ao processar sua solicitação. Um especialista entrará em contato.'
      });
    }
  }

  // Endpoint para testar tools individualmente
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

      const result = await this.agent.testTool(toolName, input);

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

  // Endpoint para health check do agent
  public async handleHealthCheck(_: Request, res: Response): Promise<void> {
    try {
      const health = await this.agent.healthCheck();
      const info = this.agent.getInfo();
      
      res.json({
        success: true,
        data: {
          health,
          info,
          timestamp: new Date().toISOString()
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

  // Endpoint para obter histórico de uma thread
  public async handleGetThreadHistory(_: Request, res: Response): Promise<void> {
    try {
      const { threadId } = res.req.params;

      if (!threadId) {
        res.status(400).json({
          success: false,
          error: 'threadId é obrigatório'
        });
        return;
      }

      console.log(`[ROUTE] Obtendo histórico da thread: ${threadId}`);

      const stats = await this.agent.getThreadStats(threadId);
      const debug = await this.agent.debugThread(threadId);

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

  // Endpoint para limpar thread
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

      const success = await this.agent.clearThread(threadId);

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
  
  // Endpoint para validar configuração
  public async handleValidateConfig(req: Request, res: Response): Promise<void> {
    try {
      const validation = this.agent.validateConfiguration();
      
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
}


// Setup das rotas
export function setupLangGraphRoutes(app: any) {
  const route = new LangGraphRoute();

  // Rota principal
  app.post('/v2/tech-support', route.handleTechSupport.bind(route));
  
  // Rotas de memória/thread
  app.get('/v2/thread/:threadId/history', route.handleGetThreadHistory.bind(route));
  app.delete('/v2/thread/:threadId/clear', route.handleClearThread.bind(route));
  
  // Rotas de debug/teste
  app.post('/v2/test-tool', route.handleToolTest.bind(route));
  app.get('/v2/health', route.handleHealthCheck.bind(route));
  app.get('/v2/validate', route.handleValidateConfig.bind(route));
  
  console.log('✅ Rotas LangGraph v2 configuradas:');
  console.log('   POST /v2/tech-support           - Suporte técnico principal');
  console.log('   GET  /v2/thread/:id/history     - Obter histórico da thread');
  console.log('   DEL  /v2/thread/:id/clear       - Limpar thread');
  console.log('   POST /v2/test-tool              - Testar tool específica');
  console.log('   GET  /v2/health                 - Health check do agent');
  console.log('   GET  /v2/validate               - Validar configuração');
}