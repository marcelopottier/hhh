import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { extractTicketId } from "./freshdeskUpdateTool";
import { generateProblemSummary, updateFreshdeskForCollectionChoice, updateFreshdeskForVoucherChoice } from "../helpers/generalHelper";

const processVoucherSimplifiedSchema = z.object({
  threadId: z.string().describe("ID da thread/conversa"),
  customerChoice: z.enum(["voucher", "coleta"]).describe("Escolha do cliente: voucher ou coleta"),
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

export const processVoucherSimplifiedTool = tool(
  async ({ threadId, customerChoice, customerAddress, customerData, problemTag }) => {
    console.log(`[TOOL] Processando escolha: ${customerChoice}`);
    
    try {
      const ticketId = extractTicketId(threadId);
      const problemSummary = generateProblemSummary(problemTag);
      
      if (customerChoice === "voucher") {
        // Cliente escolheu voucher - transferir para humano
        const freshdeskUpdate = await updateFreshdeskForVoucherChoice(
          ticketId,
          customerAddress,
          customerData,
          problemTag,
          problemSummary
        );

        const message = `✅ **VOUCHER DE R$ 150,00 SOLICITADO**

Perfeito! Você escolheu o voucher de reembolso.

**Próximos passos:**
• Nossa equipe entrará em contato em até 2 horas
• Você receberá orientações sobre assistências credenciadas
• Após o reparo, envie a nota fiscal para reembolso

**Valor:** R$ 150,00
**Processo:** Reembolso por transferência/PIX

Um especialista humano cuidará do seu caso a partir de agora! 💙`;

        return JSON.stringify({
          success: true,
          message: message,
          action: 'voucher_requested',
          status: 'transferred_to_human_voucher',
          freshdeskUpdated: freshdeskUpdate.success,
          ticketId: ticketId,
        });
        
      } else {
        // Cliente escolheu coleta - confirmar endereço e transferir
        const freshdeskUpdate = await updateFreshdeskForCollectionChoice(
          ticketId,
          customerAddress,
          customerData,
          problemTag,
          problemSummary
        );

        const message = `Coleta gratuita confirmada.

**Confirme seus dados:**
**Endereço:** ${customerAddress.fullAddress}

**Está correto?** Se sim, nossa logística entrará em contato em até 24h para agendar a coleta.

**Cronograma:**
• Contato: 24h
• Coleta: 3 dias úteis
• Reparo: 5-7 dias úteis  
• Retorno: Frete grátis`;

        return JSON.stringify({
          success: true,
          message: message,
          action: 'collection_requested',
          status: 'transferred_to_human_collection',
          freshdeskUpdated: freshdeskUpdate.success,
          ticketId: ticketId,
          addressToConfirm: customerAddress.fullAddress,
        });
      }
      
    } catch (error) {
      console.error("[TOOL] Erro ao processar escolha:", error);
      
      return JSON.stringify({
        success: false,
        message: "Erro interno. Transferindo para especialista.",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  },
  {
    name: "processVoucherSimplified",
    description: "Processa escolha do cliente entre voucher ou coleta para regiões fora de Joinville e transfere para humano",
    schema: processVoucherSimplifiedSchema,
  }
);