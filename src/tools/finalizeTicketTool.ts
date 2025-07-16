import { Tool } from "langchain/tools";

interface FinalizeTicketInput {
  customerId: string;
  resolved: boolean;
  feedback?: string;
  rating?: number;
  solutionUsed?: string;
}

export class FinalizeTicketTool extends Tool {
  name = "finalizeTicket";
  description = "Finaliza o ticket após resolução positiva do cliente, salvando feedback e agradecendo.";

  async _call(input: string): Promise<string> {
    try {
      let ticketData: FinalizeTicketInput;
      
      try {
        ticketData = JSON.parse(input);
      } catch {
        return "Erro ao finalizar ticket. Dados inválidos.";
      }

      if (!ticketData.customerId) {
        return "Erro: ID do cliente é obrigatório para finalizar ticket.";
      }

      // Salvar feedback no banco (implementar conforme sua estrutura)
      await this.saveFeedback(ticketData);

      if (ticketData.resolved) {
        return this.generateSuccessResponse(ticketData);
      } else {
        return this.generateFailureResponse(ticketData);
      }

    } catch (error) {
      console.error("Erro ao finalizar ticket:", error);
      return "Erro interno ao finalizar ticket.";
    }
  }

  private async saveFeedback(data: FinalizeTicketInput): Promise<void> {
    // Em produção, salvar no banco de dados
    const feedbackRecord = {
      customer_id: data.customerId,
      resolved: data.resolved,
      feedback: data.feedback || '',
      rating: data.rating || null,
      solution_used: data.solutionUsed || '',
      created_at: new Date(),
      ticket_closed_at: new Date()
    };

    console.log(`[FEEDBACK] Salvando feedback:`, feedbackRecord);
    
    // Aqui você faria:
    // await db.query('INSERT INTO ticket_feedback (...) VALUES (...)', [...]);
  }

  private generateSuccessResponse(data: FinalizeTicketInput): string {
    const ticketId = this.generateTicketId();
    
    return `**PROBLEMA RESOLVIDO COM SUCESSO!**

Fico muito feliz que conseguimos resolver seu problema técnico!

**Resumo do Atendimento:**
• **Ticket:** ${ticketId}
• **Cliente:** ${data.customerId}
• **Status:** Resolvido
• **Solução:** ${data.solutionUsed || 'Procedimento técnico aplicado'}
${data.feedback ? `• **Feedback:** "${data.feedback}"` : ''}
${data.rating ? `• **Avaliação:** ${this.renderStars(data.rating)} (${data.rating}/5)` : ''}

**Agradecimento:**
Obrigado por escolher a Pichau! Seu feedback é muito importante para continuarmos melhorando nosso atendimento.

**Dicas para o futuro:**
• Mantenha sempre backups dos seus dados importantes
• Realize limpeza regular do computador
• Mantenha drivers atualizados

**Precisa de mais alguma coisa?**
• Site: www.pichau.com.br
• Suporte: suporte@pichau.com.br
• WhatsApp: (47) 99999-9999

Tenha um ótimo dia e conte sempre conosco!`;
  }

  private generateFailureResponse(data: FinalizeTicketInput): string {
    return `**FEEDBACK REGISTRADO**

Obrigado pelo retorno! Registrei que ainda não conseguimos resolver completamente seu problema.

**Próximos passos:**
• Vou analisar outras opções de solução
• Se necessário, organizaremos coleta do equipamento
• Você receberá retorno em breve

**Seu feedback:**
"${data.feedback || 'Cliente relatou que problema persiste'}"

Continue nossa conversa e vamos encontrar a solução! 🔧💙`;
  }

  private renderStars(rating: number): string {
    const stars = ''.repeat(Math.min(Math.max(rating, 0), 5));
    const empty = '☆'.repeat(5 - Math.min(Math.max(rating, 0), 5));
    return stars + empty;
  }

  private generateTicketId(): string {
    return `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  // Método estático para criar finalização estruturada
  public static createFinalization(
    customerId: string,
    resolved: boolean,
    feedback?: string,
    rating?: number,
    solutionUsed?: string
  ): string {
    return JSON.stringify({
      customerId,
      resolved,
      feedback,
      rating,
      solutionUsed
    });
  }
}