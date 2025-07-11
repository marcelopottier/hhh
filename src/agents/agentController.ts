import { Request, Response } from 'express';
import SuporteAgent from './suporteAgent';
import { logger } from '../utils/logger';
import { Validators } from '../utils/validators';
import { ConversationContext, ChatMessage } from './types';

export class AgentController {
  private agent: SuporteAgent;
  private activeSessions: Map<string, ConversationContext> = new Map();

  constructor() {
    this.agent = new SuporteAgent();
  }

  /**
   * Endpoint principal do chat com agente
   */
  public chat = async (req: Request, res: Response): Promise<void> => {
    try {
      const { message, clienteId, sessionId } = req.body;

      if (!message || !clienteId) {
        res.status(400).json({ error: 'Mensagem e clienteId são obrigatórios' });
        return;
      }

      // Validar mensagem
      const mensagemValidada = Validators.validarChatMessage({ content: message });
      
      // Obter ou criar contexto da conversa
      const context = this.getOrCreateContext(clienteId, sessionId);
      
      // Adicionar mensagem do usuário ao histórico
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      context.historico.push(userMessage);

      // Processar com o agente
      const startTime = Date.now();
      const agentResponse = await this.agent.processarMensagem(message, clienteId);
      const responseTime = Date.now() - startTime;

      // Adicionar resposta do agente ao histórico
      const agentMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'agent',
        content: agentResponse.message,
        timestamp: new Date(),
        confidence: agentResponse.confidence,
        tools_used: agentResponse.tools_used
      };
      context.historico.push(agentMessage);

      // Atualizar contexto
      this.activeSessions.set(context.sessionId, context);

      // Log da interação
      logger.info(`Chat processado - Cliente: ${clienteId}, Sessão: ${sessionId}, Tempo: ${responseTime}ms`);

      // Resposta
      res.json({
        message: agentResponse.message,
        action: agentResponse.action,
        confidence: agentResponse.confidence,
        tools_used: agentResponse.tools_used,
        next_steps: agentResponse.next_steps,
        response_time: responseTime,
        session_id: context.sessionId,
        ticket_info: agentResponse.ticket_update,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro no chat com agente:', error);
      res.status(500).json({ 
        error: 'Erro interno do agente',
        message: 'Desculpe, ocorreu um erro. Tente novamente ou entre em contato com nosso suporte.'
      });
    }
  };

  /**
   * Obter histórico da conversa
   */
  public getHistorico = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      
      const context = this.activeSessions.get(sessionId);
      
      if (!context) {
        res.status(404).json({ error: 'Sessão não encontrada' });
        return;
      }

      res.json({
        session_id: sessionId,
        cliente_id: context.clienteId,
        ticket_id: context.ticketId,
        total_messages: context.historico.length,
        historico: context.historico,
        metadata: context.metadata
      });

    } catch (error) {
      logger.error('Erro ao obter histórico:', error);
      res.status(500).json({ error: 'Erro ao obter histórico' });
    }
  };

  /**
   * Encerrar sessão
   */
  public encerrarSessao = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { feedback, rating } = req.body;

      const context = this.activeSessions.get(sessionId);
      
      if (context) {
        // Salvar feedback se fornecido
        if (feedback || rating) {
          // Implementar salvamento do feedback
          logger.info(`Feedback recebido - Sessão: ${sessionId}, Rating: ${rating}`);
        }

        // Limpar memória do agente para esta sessão
        await this.agent.limparMemoria();
        
        // Remover sessão ativa
        this.activeSessions.delete(sessionId);
      }

      res.json({
        message: 'Sessão encerrada com sucesso',
        session_id: sessionId,
        agradecimento: 'Obrigado por usar o suporte da Pichau!'
      });

    } catch (error) {
      logger.error('Erro ao encerrar sessão:', error);
      res.status(500).json({ error: 'Erro ao encerrar sessão' });
    }
  };

  /**
   * Estatísticas do agente
   */
  public getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.agent.obterEstatisticas();
      
      const sessionsAtivas = this.activeSessions.size;
      const tempoMedioSessao = this.calcularTempoMedioSessao();
      
      res.json({
        ...stats,
        sessoes_ativas: sessionsAtivas,
        tempo_medio_sessao: tempoMedioSessao,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
  };

  /**
   * Health check do agente
   */
  public healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      // Teste simples do agente
      const testResponse = await this.agent.processarMensagem("teste", "health_check");
      
      res.json({
        status: 'healthy',
        agent_responsive: true,
        active_sessions: this.activeSessions.size,
        confidence: testResponse.confidence,
        tools_available: testResponse.tools_used.length > 0,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Health check falhou:', error);
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Obter ou criar contexto da conversa
   */
  private getOrCreateContext(clienteId: string, sessionId?: string): ConversationContext {
    const id = sessionId || `session_${clienteId}_${Date.now()}`;
    
    let context = this.activeSessions.get(id);
    
    if (!context) {
      context = {
        clienteId,
        sessionId: id,
        historico: [],
        metadata: {
          created_at: new Date(),
          user_agent: 'web',
          ip_address: 'unknown'
        }
      };
      
      this.activeSessions.set(id, context);
      logger.info(`Nova sessão criada: ${id} para cliente: ${clienteId}`);
    }
    
    return context;
  }

  /**
   * Calcular tempo médio de sessão
   */
  private calcularTempoMedioSessao(): number {
    if (this.activeSessions.size === 0) return 0;
    
    const agora = new Date();
    let totalTempo = 0;
    
    for (const context of this.activeSessions.values()) {
      const inicio = context.metadata.created_at;
      totalTempo += agora.getTime() - inicio.getTime();
    }
    
    return Math.round(totalTempo / this.activeSessions.size / 1000 / 60); // minutos
  }
}