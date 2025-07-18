//@ts-nocheck
/* tslint:disable */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const freshdeskUpdateSchema = z.object({
  ticketId: z.string().describe("ID do ticket no FreshDesk"),
  updateType: z.enum(["solution_provided", "escalated", "resolved", "collected", "voucher_processed"]).describe("Tipo de atualização"),
  message: z.string().describe("Mensagem/resposta para o cliente"),
  internalNote: z.string().optional().describe("Nota interna para equipe"),
  status: z.enum(["open", "pending", "resolved", "closed"]).optional().describe("Novo status do ticket"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("Nova prioridade"),
  tags: z.array(z.string()).optional().describe("Tags para adicionar ao ticket"),
  customFields: z.record(z.any()).optional().describe("Campos customizados"),
});

export const freshdeskUpdateTool = tool(
  async ({ 
    ticketId, 
    updateType, 
    message, 
    internalNote, 
    status, 
    priority, 
    tags = [], 
    customFields = {} 
  }) => {
    console.log(`[FRESHDESK] Atualizando ticket ${ticketId} - Tipo: ${updateType}`);
    
    try {
      // TODO: Implementar integração real com FreshDesk API
      // Por enquanto, simular a atualização
      
      const updateData = {
        ticketId,
        updateType,
        timestamp: new Date().toISOString(),
        changes: {
          status,
          priority,
          tags: tags.length > 0 ? tags : undefined,
          customFields: Object.keys(customFields).length > 0 ? customFields : undefined
        },
        publicReply: updateType !== "escalated" ? message : undefined,
        privateNote: internalNote || getDefaultInternalNote(updateType),
      };

      // Simular diferentes tipos de resposta da API FreshDesk
      const apiResponse = await simulateFreshdeskAPI(updateData);

      if (!apiResponse.success) {
        throw new Error(`FreshDesk API Error: ${apiResponse.error}`);
      }

      console.log(`[FRESHDESK] Ticket ${ticketId} atualizado com sucesso`);
      
      return JSON.stringify({
        success: true,
        message: "Ticket atualizado no FreshDesk com sucesso",
        ticketId,
        updateType,
        freshdeskResponse: apiResponse,
        publicReply: updateType !== "escalated" ? message : null,
        internalNote: internalNote || getDefaultInternalNote(updateType),
        updatedAt: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error(`[FRESHDESK] Erro ao atualizar ticket ${ticketId}:`, error);
      
      return JSON.stringify({
        success: false,
        message: "Erro ao atualizar ticket no FreshDesk",
        ticketId,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        fallbackAction: "manual_update_required",
      });
    }
  },
  {
    name: "updateFreshDesk",
    description: "Atualiza ticket no FreshDesk com resposta para cliente ou nota interna. Use sempre após fornecer solução ou escalar.",
    schema: freshdeskUpdateSchema,
  }
);

// Função para simular API do FreshDesk
async function simulateFreshdeskAPI(updateData: any): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  // Simular delay da API
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Simular diferentes cenários
  const randomSuccess = Math.random() > 0.05; // 95% de sucesso
  
  if (randomSuccess) {
    console.log(`[FRESHDESK API] ✅ Simulação de sucesso para ticket ${updateData.ticketId}`);
    console.log(`[FRESHDESK API] 📝 Tipo: ${updateData.updateType}`);
    if (updateData.publicReply) {
      console.log(`[FRESHDESK API] 💬 Resposta pública: ${updateData.publicReply.substring(0, 100)}...`);
    }
    if (updateData.privateNote) {
      console.log(`[FRESHDESK API] 🔒 Nota interna: ${updateData.privateNote}`);
    }
    console.log(`[FRESHDESK API] 🏷️  Status: ${updateData.changes.status || 'não alterado'}`);
    console.log(`[FRESHDESK API] ⚡ Prioridade: ${updateData.changes.priority || 'não alterada'}`);
    
    return {
      success: true,
      ticketId: updateData.ticketId
    };
  } else {
    console.log(`[FRESHDESK API] ❌ Simulação de erro para ticket ${updateData.ticketId}`);
    return {
      success: false,
      error: "Simulated API timeout"
    };
  }
}

// Função para gerar notas internas padrão
function getDefaultInternalNote(updateType: string): string {
  const notes = {
    solution_provided: "Agente IA forneceu solução técnica para o cliente. Aguardando feedback.",
    escalated: "Ticket escalado do agente IA. Problema não encontrado no banco de conhecimento ou requer intervenção humana.",
    resolved: "Problema resolvido com sucesso através do agente IA. Cliente confirmou resolução.",
    collected: "Coleta do equipamento agendada através do agente IA. Aguardando processamento logístico.",
    voucher_processed: "Voucher de assistência técnica processado. Cliente orientado sobre próximos passos."
  };
  
  return notes[updateType as keyof typeof notes] || "Atualização automática do agente IA.";
}

// Função auxiliar para extrair ticket ID do thread ID ou contexto
export function extractTicketId(threadId: string, context?: any): string {
  // Se thread ID tem formato ticket_XXXXX, extrair o ID
  const ticketMatch = threadId.match(/ticket_(\d+)/);
  if (ticketMatch) {
    return ticketMatch[1];
  }
  
  // Se não conseguir extrair, usar um ID de fallback baseado no thread
  const fallbackId = threadId.replace(/[^0-9]/g, '').slice(-6) || '999999';
  console.log(`[FRESHDESK] ID do ticket não encontrado, usando fallback: ${fallbackId}`);
  return fallbackId;
}