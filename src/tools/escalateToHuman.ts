import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { extractTicketId } from "./freshdeskUpdateTool";

const escalateSchema = z.object({
  threadId: z.string().describe("ID da thread/conversa"),
  reason: z.string().describe("Motivo da escalação"),
  customerQuery: z.string().describe("Query original do cliente"),
  urgency: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium").describe("Nível de urgência"),
  context: z.string().optional().describe("Contexto adicional da conversa"),
});

export const escalateToHumanTool = tool(
  async ({ threadId, reason, customerQuery, urgency = "medium", context }) => {
    console.log(`[TOOL] Escalando para humano - Thread: ${threadId}`);
    console.log(`[TOOL] Motivo: ${reason}`);

    try {
      // Extrair ticket ID do thread ID
      const ticketId = extractTicketId(threadId);
      
      // Preparar nota interna detalhada
      const internalNote = `🤖 ESCALAÇÃO AUTOMÁTICA DO AGENTE IA

📋 MOTIVO: ${reason}

💬 CONSULTA ORIGINAL:
"${customerQuery}"

🔍 ANÁLISE:
${context || 'Problema não encontrado no banco de conhecimento técnico.'}

⚠️ AÇÃO NECESSÁRIA:
- Analisar problema específico do cliente
- Fornecer solução personalizada
- Atualizar banco de conhecimento se necessário

📊 URGÊNCIA: ${urgency.toUpperCase()}
🕐 ESCALADO EM: ${new Date().toLocaleString('pt-BR')}`;

      // Atualizar ticket no FreshDesk via simulação
      const freshdeskUpdate = await updateFreshdeskForEscalation(ticketId, internalNote, urgency);
      
      if (!freshdeskUpdate.success) {
        throw new Error(`Falha ao atualizar FreshDesk: ${freshdeskUpdate.error}`);
      }

      console.log(`[TOOL] Escalação registrada no FreshDesk - Ticket: ${ticketId}`);

      return JSON.stringify({
        success: true,
        message: "ESCALATED_TO_HUMAN", // Sinal especial para não responder nada ao cliente
        escalationType: "no_procedure_found",
        ticketId: ticketId,
        urgency: urgency,
        escalationReason: reason,
        internalNote: internalNote,
        freshdeskUpdated: true,
        doNotRespond: true, // Flag para o agent não gerar resposta ao cliente
      });
      
    } catch (error) {
      console.error("[TOOL] Erro na escalação:", error);
      
      return JSON.stringify({
        success: false,
        message: "Erro interno na escalação",
        error: error instanceof Error ? error.message : "Erro desconhecido",
        fallbackAction: "manual_escalation_required"
      });
    }
  },
  {
    name: "escalateToHuman",
    description: "Escala para técnico humano quando não há procedimento conhecido. NUNCA gere resposta ao cliente após usar esta tool.",
    schema: escalateSchema,
  }
);

// Função para atualizar FreshDesk especificamente para escalação
async function updateFreshdeskForEscalation(
  ticketId: string, 
  internalNote: string, 
  urgency: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[FRESHDESK] Atualizando ticket ${ticketId} para escalação`);
    
    // Simular atualização do FreshDesk
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const priorityMap = { 
      low: 1, 
      medium: 2, 
      high: 3, 
      urgent: 4 
    };
    
    const updateData = {
      status: 2, // Open
      priority: priorityMap[urgency as keyof typeof priorityMap],
      tags: ['escalated_from_ai', 'requires_human_support', 'no_procedure_found'],
      private_note: {
        body: internalNote,
        private: true
      }
    };
    
    // Simular chamada à API
    console.log(`[FRESHDESK] 📝 Nota interna adicionada ao ticket ${ticketId}`);
    console.log(`[FRESHDESK] 🏷️  Tags adicionadas: ${updateData.tags.join(', ')}`);
    console.log(`[FRESHDESK] ⚡ Prioridade ajustada para: ${urgency} (${updateData.priority})`);
    console.log(`[FRESHDESK] 📊 Status: Open (aguardando técnico)`);
    
    // 95% de chance de sucesso
    if (Math.random() > 0.05) {
      return { success: true };
    } else {
      throw new Error("Simulated API failure");
    }
    
  } catch (error) {
    console.error(`[FRESHDESK] Erro ao atualizar ticket ${ticketId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}