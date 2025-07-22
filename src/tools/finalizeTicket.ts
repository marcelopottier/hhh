import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { extractTicketId } from "./freshdeskUpdateTool";

const finalizeTicketSchema = z.object({
  threadId: z.string().describe("ID da thread/conversa"),
  resolution: z.enum(["resolved", "customer_satisfied"]).describe("Tipo de resolução"),
  customerFeedback: z.string().describe("Feedback positivo do cliente"),
  solutionUsed: z.string().optional().describe("Solução que resolveu o problema"),
  problemTag: z.string().optional().describe("Tag do problema que foi resolvido"),
  totalSteps: z.number().optional().describe("Número total de steps executados"),
});

export const finalizeTicketTool = tool(
  async ({ 
    threadId, 
    resolution, 
    customerFeedback, 
    solutionUsed, 
    problemTag, 
    totalSteps = 1 
  }) => {
    console.log(`[TOOL] Finalizando ticket - Thread: ${threadId}`);
    console.log(`[TOOL] Resolução: ${resolution}`);
    console.log(`[TOOL] Feedback: "${customerFeedback}"`);
    
    try {
      // Extrair ticket ID
      const ticketId = extractTicketId(threadId);
      
      // Preparar mensagem de finalização para o cliente
      const clientMessage = generateSuccessMessage(customerFeedback);
      
      // Preparar nota interna de resolução
      const internalNote = `🎉 PROBLEMA RESOLVIDO PELO AGENTE IA

✅ STATUS: ${resolution.toUpperCase()}

💬 FEEDBACK DO CLIENTE:
"${customerFeedback}"

🔧 SOLUÇÃO UTILIZADA:
${solutionUsed || 'Procedimento padrão'}

📋 DETALHES:
- Problema Tag: ${problemTag || 'Não especificado'}
- Steps executados: ${totalSteps}
- Resolução automática: Sim

📊 MÉTRICAS:
- Tempo de resolução: Automático
- Satisfação: Positiva (cliente confirmou)
- Intervenção humana: Não necessária

🕐 RESOLVIDO EM: ${new Date().toLocaleString('pt-BR')}`;

      // Atualizar FreshDesk
      const freshdeskUpdate = await updateFreshdeskForResolution(
        ticketId, 
        clientMessage, 
        internalNote
      );
      
      if (!freshdeskUpdate.success) {
        throw new Error(`Falha ao atualizar FreshDesk: ${freshdeskUpdate.error}`);
      }

      console.log(`[TOOL] Ticket ${ticketId} finalizado com sucesso`);

      return JSON.stringify({
        success: true,
        message: clientMessage,
        ticketId: ticketId,
        resolution: resolution,
        freshdeskUpdated: true,
        status: 'resolved',
        finalResponse: clientMessage,
      });
      
    } catch (error) {
      console.error("[TOOL] Erro ao finalizar ticket:", error);
      
      return JSON.stringify({
        success: false,
        message: "Erro interno ao finalizar ticket",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  },
  {
    name: "finalizeTicket",
    description: "Finaliza ticket no FreshDesk quando cliente confirma que problema foi resolvido",
    schema: finalizeTicketSchema,
  }
);

// Função para gerar mensagem de sucesso
function generateSuccessMessage(customerFeedback: string): string {
  const successMessages = [
    `🎉 **PROBLEMA RESOLVIDO COM SUCESSO!**

Que ótima notícia! Fico muito feliz que conseguimos resolver seu problema.

**Seu feedback:** "${customerFeedback}"

**Para o futuro:**
• Mantenha drivers sempre atualizados
• Faça backups regulares
• Execute limpezas preventivas

**Precisar de algo mais:**
• Site: www.pichau.com.br
• Suporte: suporte@pichau.com.br

Obrigado por escolher a Pichau! 💙`,

    `✅ **EXCELENTE! PROBLEMA SOLUCIONADO!**

"${customerFeedback}" - isso é música para nossos ouvidos!

**Dicas para manter tudo funcionando:**
🔧 Mantenha o sistema atualizado
💾 Faça backups periódicos  
🧹 Limpeza regular do PC

**Estamos sempre aqui quando precisar!**

Tenha um ótimo dia! 😊`,

    `🚀 **SUCESSO TOTAL!**

Perfeito! O problema está resolvido e você está satisfeito.

**Lembre-se:**
• Nossa equipe está sempre disponível
• Mantenha contato conosco para dúvidas futuras
• Sua experiência é nossa prioridade

**Obrigado pela confiança na Pichau!** 💙`
  ];
  
  // Escolher mensagem aleatória
  return successMessages[Math.floor(Math.random() * successMessages.length)];
}

// Função para atualizar FreshDesk para resolução
async function updateFreshdeskForResolution(
  ticketId: string,
  clientMessage: string,
  internalNote: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[FRESHDESK] Finalizando ticket ${ticketId}`);
    
    // Simular atualização do FreshDesk
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const updateData = {
      status: 4, // Resolved
      priority: 1, // Low (problema resolvido)
      tags: ['resolved_by_ai', 'customer_satisfied', 'automated_resolution'],
      public_reply: {
        body: clientMessage,
        private: false
      },
      private_note: {
        body: internalNote,
        private: true
      }
    };
    
    console.log(`[FRESHDESK] 💬 Resposta enviada ao cliente`);
    console.log(`[FRESHDESK] 📝 Nota interna de resolução adicionada`);
    console.log(`[FRESHDESK] 🏷️  Tags: ${updateData.tags.join(', ')}`);
    console.log(`[FRESHDESK] ✅ Status: Resolved`);
    
    // 98% de chance de sucesso para resolução
    if (Math.random() > 0.02) {
      return { success: true };
    } else {
      throw new Error("Simulated API failure");
    }
    
  } catch (error) {
    console.error(`[FRESHDESK] Erro ao finalizar ticket ${ticketId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}