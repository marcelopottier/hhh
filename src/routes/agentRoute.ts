import { Request, Response } from 'express';
import { LangGraphAgent } from '../services/langGraphAgent';

export class AgentRoute {
  private agent: LangGraphAgent;

  constructor() {
    this.agent = LangGraphAgent.getInstance();
  }

  public async initialize(): Promise<void> {
    await this.agent.initialize();
  }

  public async handleQuery(req: Request, res: Response): Promise<void> {
    try {
      const { message, threadId } = req.body;

      if (!message || !threadId) {
        res.status(400).json({
          error: 'message e threadId são obrigatórios'
        });
        return;
      }

      const result = await this.agent.processQuery(message, threadId);

      res.json({
        success: true,
        data: {
          response: result.response,
          threadId: threadId,
          messageCount: result.messages.length
        }
      });

    } catch (error) {
      console.error('Erro no agent:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  public async handleStream(req: Request, res: Response): Promise<void> {
    try {
      const { message, threadId } = req.body;

      if (!message || !threadId) {
        res.status(400).json({
          error: 'message e threadId são obrigatórios'
        });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = await this.agent.streamQuery(message, threadId);

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
  }
}