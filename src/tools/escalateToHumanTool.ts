import { Tool } from "langchain/tools";
import { FreshDeskService } from "../services/freshDeskService";

interface EscalationInput {
  customerId: string;
  ticketId?: string;
  reason: string;
  urgency?: 'low' | 'medium' | 'high' | 'urgent';
  context?: string;
}

export class EscalateToHumanTool extends Tool {
  name = "escalateToHuman";
  description = "Escala o atendimento para um técnico humano no FreshDesk quando não há procedimentos específicos ou o problema é muito complexo.";

  private freshDeskService: FreshDeskService;

  constructor() {
    super();
    this.freshDeskService = FreshDeskService.getInstance();
  }

  async _call(input: string): Promise<any> {
    try {
      let escalationData: EscalationInput;
      
      try {
        escalationData = JSON.parse(input);
      } catch {
        // Se não conseguir parse, trata como string simples (reason)
        escalationData = {
          customerId: 'unknown',
          reason: input,
          urgency: 'medium'
        };
      }

      const ticketId = escalationData.ticketId || `TEMP-${Date.now()}`;
      
      // Atualizar ticket no FreshDesk
      if (escalationData.ticketId) {
        await this.freshDeskService.escalateToHuman(
          escalationData.ticketId,
          escalationData.reason,
          escalationData.urgency || 'medium'
        );
      }

    } catch (error) {
      console.error("Erro ao escalar atendimento:", error);
      return "Erro interno ao escalar atendimento. Um técnico entrará em contato.";
    }
  };
}