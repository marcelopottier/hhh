import { Request, Response } from 'express';
import { LangGraphSupportAgent } from '..';

export class LangGraphRoute {
  private agent: LangGraphSupportAgent;

  constructor() {
    this.agent = LangGraphSupportAgent.getInstance();
  }

  public async handleTechSupport(req: Request, res: Response): Promise<void> {
    try {
      const { message, customerId, threadId } = req.body;

      if (!message || !customerId) {
        res.status(400).json({
          error: 'message e customerId são obrigatórios'
        });
        return;
      }

      const thread = threadId || `customer_${customerId}_${Date.now()}`;

      const result = await this.agent.processQuery(customerId, message, thread);

      res.json({
        success: true,
        data: {
          response: result.response,
          ticketStatus: result.ticketStatus,
          attemptCount: result.attemptCount,
          customerId,
          threadId: thread,
        }
      });

    } catch (error) {
      console.error('Erro no LangGraph agent:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: 'Ocorreu um erro ao processar sua solicitação'
      });
    }
  }

  /*public async handleStream(req: Request, res: Response): Promise<void> {
    try {
      const { message, customerId, threadId } = req.body;

      if (!message || !customerId) {
        res.status(400).json({
          error: 'message e customerId são obrigatórios'
        });
        return;
      }

      const thread = threadId || `customer_${customerId}_${Date.now()}`;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = await this.agent.streamQuery(customerId, message, thread);

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.end();

    } catch (error) {
      console.error('Erro no stream:', error);
      res.status(500).json({
        error: 'Erro interno no stream'
      });
    }
  }*/
}

// Setup das rotas
export function setupLangGraphRoutes(app: any) {
  const route = new LangGraphRoute();

  app.post('/v2/tech-support', route.handleTechSupport.bind(route));
  // app.post('/v2/tech-support/stream', route.handleStream.bind(route));
}