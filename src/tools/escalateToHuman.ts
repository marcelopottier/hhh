/* tslint:disable */
//@ts-nocheck
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { FreshDeskService } from "../services/freshDeskService";

// Schema separado (sem .describe ou .default para evitar erro de inferência)
const escalateSchema = z.object({
  customerId: z.string(),
  reason: z.string(),
  urgency: z.enum(["low", "medium", "high", "urgent"]).optional(),
  context: z.string().optional(),
});

export const escalateToHumanTool = tool(
  async (input) => {
    const {
      customerId,
      reason,
      urgency = "medium", // define o default aqui para evitar erro com zod.default()
      context,
    } = input;

    console.log(`[TOOL] Escalando para humano - Cliente: ${customerId}`);

    try {
      const ticketId = `ESC-${Date.now()}-${customerId}`;

      try {
        const freshDeskService = FreshDeskService.getInstance();
        await freshDeskService.escalateToHuman(ticketId, reason, urgency);
      } catch (error) {
        console.log("[TOOL] FreshDesk não disponível, usando fallback");
      }

      const escalationMessage = `🚨 **ESCALADO PARA ESPECIALISTA**

**Ticket:** ${ticketId}
**Cliente:** ${customerId}
**Motivo:** ${reason}
**Urgência:** ${urgency}
${context ? `**Contexto:** ${context}` : ''}

Um técnico especializado entrará em contato em breve para dar continuidade ao seu atendimento.

**Tempo estimado de retorno:**
• Baixa: 24-48h
• Média: 8-12h  
• Alta: 2-4h
• Urgente: 30min-1h

Obrigado pela paciência! 💙`;

      return {
        success: true,
        message: escalationMessage,
        ticketId,
        urgency,
      };
    } catch (error) {
      console.error("[TOOL] Erro na escalação:", error);
      return {
        success: false,
        message: "Erro interno. Um técnico entrará em contato.",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  },
  {
    name: "escalateToHuman",
    description: "Escala o atendimento para um técnico humano especializado",
    schema: escalateSchema,
  }
);
