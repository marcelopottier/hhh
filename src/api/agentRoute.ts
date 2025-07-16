import { Request, Response } from 'express';
import { LangGraphAgent } from '../services/langGraphAgent';
import { basicAuthMiddleware } from '../middleware/basicAuth';

export class AgentRoute {
  private agent: LangGraphAgent;

  constructor() {
    this.agent = LangGraphAgent.getInstance();
  }

  public async initialize(): Promise<void> {
    await this.agent.initialize();
  }

  public async handleTechSupport(req: Request, res: Response): Promise<void> {
    try {
      const { message, customerId } = req.body;

      if (!message || !customerId) {
        res.status(400).json({
          error: 'message e customerId são obrigatórios'
        });
        return;
      }

      const result = await this.agent.processQuery(message, customerId);

      res.json({
        success: true,
        data: {
          response: result.response,
          customerId: customerId,
          messageCount: result.messages.length
        }
      });
      } catch (error) {
      console.error('Erro no suporte técnico:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: 'Ocorreu um erro ao processar sua solicitação'
      });
    }
  }

  public async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId } = req.body;

      if (!ticketId) {
        res.status(400).json({
          error: 'ticketId é obrigatório'
        });
        return;
      }

      console.log('Webhook recebido - ticketId:', ticketId);

      res.json({
        success: true,
        message: 'Webhook processado com sucesso',
        ticketId: ticketId
      });
    } catch (error) {
      console.error('Erro no webhook:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: 'Ocorreu um erro ao processar o webhook'
      });
    }
  }
}

export function setupAgentRoutes(app: any) {
  const agentRoute = new AgentRoute();

  agentRoute.initialize().then(() => {
    console.log('Agent LangGraph inicializado!');
  });

  app.post('/tech-support', agentRoute.handleTechSupport.bind(agentRoute));
  
  app.post('/api/webhook', 
    basicAuthMiddleware,
    agentRoute.handleWebhook.bind(agentRoute)
  );
}