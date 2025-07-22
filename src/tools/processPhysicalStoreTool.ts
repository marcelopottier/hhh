import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { extractTicketId } from "./freshdeskUpdateTool";
import { generateProblemSummary } from "../helpers/generalHelper";

const processPhysicalStoreSchema = z.object({
  threadId: z.string().describe("ID da thread/conversa"),
  customerAccepted: z.boolean().describe("Se cliente aceitou levar na loja física"),
  customerAddress: z.object({
    street: z.string(),
    neighborhood: z.string(),
    cep: z.string(),
    complement: z.string().optional(),
    fullAddress: z.string()
  }).describe("Endereço do cliente"),
  customerData: z.object({
    name: z.string().optional(),
    orderNumber: z.string().optional(),
    equipmentModel: z.string().optional(),
  }).optional(),
  problemTag: z.string().describe("Tag do problema"),
});

export const processPhysicalStoreTool = tool(
  async ({ threadId, customerAccepted, customerAddress, customerData, problemTag }) => {
    console.log(`[TOOL] Processando loja física - Aceito: ${customerAccepted}`);
    
    if (!customerAccepted) {
      return JSON.stringify({
        success: true,
        message: "Sem problemas! Vamos então organizar a coleta gratuita em sua residência. Nossa equipe entrará em contato para agendar.",
        action: "fallback_to_collection",
        storeDeclined: true,
      });
    }

    try {
      const ticketId = extractTicketId(threadId);
      
      // Criar resumo do problema para nota interna
      const problemSummary = generateProblemSummary(problemTag);
      
      // Atualizar FreshDesk com transferência para humano
      // const freshdeskUpdate = await updateFreshdeskForPhysicalStore(
      //   ticketId,
      //   customerAddress,
      //   customerData,
      //   problemTag,
      //   problemSummary
      // ); 

      const message = `**PERFEITO! LOJA FÍSICA CONFIRMADA**

Seu atendimento na loja está organizado! 

**RESUMO DO SEU PROBLEMA:**
${problemSummary}

**LOJA PICHAU JOINVILLE**
Rua Visconde de Taunay, 380 - Atiradores
Segunda a Sexta: 8h às 18h
(47) 3422-1234

**O que levar:**
Seu equipamento
Documento com foto
Nota fiscal (se tiver)

**Próximos passos:**
• Compareça na loja no horário de funcionamento
• Nossa equipe fará o diagnóstico
• Você receberá orientações diretas sobre o reparo

Um técnico da loja será notificado sobre seu caso para agilizar o atendimento! `;

      return JSON.stringify({
        success: true,
        message: message,
        action: 'physical_store_confirmed',
        status: 'transferred_to_physical_store',
        // freshdeskUpdated: freshdeskUpdate.success,
        ticketId: ticketId,
        storeInfo: {
          address: "Rua Visconde de Taunay, 380 - Atiradores, Joinville - SC",
          hours: "Segunda a Sexta: 8h às 18h",
          phone: "(47) 3422-1234"
        }
      });
      
    } catch (error) {
      console.error("[TOOL] Erro ao processar loja física:", error);
      
      return JSON.stringify({
        success: false,
        message: "Erro interno. Um técnico entrará em contato para organizar.",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  },
  {
    name: "processPhysicalStore",
    description: "Processa escolha do cliente pela loja física em Joinville e transfere para humano com nota interna",
    schema: processPhysicalStoreSchema,
  }
);