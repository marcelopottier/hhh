/* tslint:disable */
//@ts-nocheck
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const escalateSchema = z.object({
  customerId: z.string().describe("ID do cliente"),
  reason: z.string().describe("Motivo da escalação"),
  urgency: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium").describe("Nível de urgência"),
  context: z.string().optional().describe("Contexto adicional"),
});

export const escalateToHumanTool = tool(
  async ({ customerId, reason, urgency = "medium", context }) => {
    console.log(`[TOOL] Escalando para humano - Cliente: ${customerId}`);

    try {
      const ticketId = `ESC-${Date.now()}-${customerId.slice(-4)}`;

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

      return JSON.stringify({
        success: true,
        message: escalationMessage,
        ticketId,
        urgency,
      });
    } catch (error) {
      console.error("[TOOL] Erro na escalação:", error);
      return JSON.stringify({
        success: false,
        message: "Erro interno. Um técnico entrará em contato.",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  },
  {
    name: "escalateToHuman",
    description: "Escala o atendimento para um técnico humano especializado quando não é possível resolver automaticamente",
    schema: escalateSchema,
  }
);