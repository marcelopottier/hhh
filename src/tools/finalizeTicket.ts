//@ts-nocheck
/* tslint:disable */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const finalizeTicketSchema = z.object({
  customerId: z.string().describe("ID do cliente"),
  resolved: z.boolean().describe("Se o problema foi resolvido"),
  feedback: z.string().optional().describe("Feedback do cliente"),
  rating: z.number().min(1).max(5).optional().describe("Avaliação de 1 a 5"),
  solutionUsed: z.string().optional().describe("Solução que foi aplicada"),
});

export const finalizeTicketTool = tool(
  async ({ customerId, resolved, feedback, rating, solutionUsed }) => {
    console.log(`[TOOL] Finalizando ticket - Cliente: ${customerId}, Resolvido: ${resolved}`);
    
    try {
      const ticketId = generateTicketId();
      
      // Salvar feedback (implementar conforme necessário)
      const feedbackRecord = {
        ticketId,
        customerId,
        resolved,
        feedback: feedback || '',
        rating: rating || null,
        solutionUsed: solutionUsed || '',
        createdAt: new Date(),
      };
      
      console.log("[TOOL] Feedback salvo:", feedbackRecord);
      
      if (resolved) {
        return {
          success: true,
          message: generateSuccessMessage(ticketId, customerId, feedback, rating, solutionUsed),
          ticketId,
          status: 'resolved',
        };
      } else {
        return {
          success: true,
          message: generateContinueMessage(feedback),
          ticketId,
          status: 'pending',
        };
      }
      
    } catch (error) {
      console.error("[TOOL] Erro ao finalizar ticket:", error);
      return {
        success: false,
        message: "Erro interno ao finalizar ticket.",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  },
  {
    name: "finalizeTicket",
    description: "Finaliza o ticket após resolução ou coleta feedback para continuar",
    schema: finalizeTicketSchema,
  }
);

function generateTicketId(): string {
  return `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

function generateSuccessMessage(ticketId: string, customerId: string, feedback?: string, rating?: number, solutionUsed?: string): string {
  const stars = rating ? '⭐'.repeat(rating) + '☆'.repeat(5 - rating) : '';
  
  return `🎉 **PROBLEMA RESOLVIDO!**

**Ticket:** ${ticketId}
**Cliente:** ${customerId}
**Status:** Resolvido com sucesso

${solutionUsed ? `**Solução aplicada:** ${solutionUsed}` : ''}
${feedback ? `**Seu feedback:** "${feedback}"` : ''}
${rating ? `**Avaliação:** ${stars} (${rating}/5)` : ''}

**Obrigado por escolher a Pichau!** 💙

**Dicas para o futuro:**
• Mantenha backups atualizados
• Realize limpeza regular do PC
• Mantenha drivers atualizados

**Precisa de mais alguma coisa?**
• Site: www.pichau.com.br
• Suporte: suporte@pichau.com.br

Tenha um ótimo dia! 😊`;
}

function generateContinueMessage(feedback?: string): string {
  return `📝 **FEEDBACK REGISTRADO**

Obrigado pelo retorno! 

${feedback ? `**Você disse:** "${feedback}"` : ''}

Vou analisar outras opções de solução para resolver seu problema.

Continue nossa conversa - vamos encontrar a solução! 🔧💙`;
}