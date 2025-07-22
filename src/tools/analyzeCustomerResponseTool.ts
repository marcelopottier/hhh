import { tool } from "@langchain/core/tools";
import { extractTicketId } from "./freshdeskUpdateTool";
import { z } from "zod";
import { analyzeCustomerIntent, generateProblemSummary, updateFreshdeskForCollectionChoice, updateFreshdeskForPhysicalStore, updateFreshdeskForVoucherChoice } from "../helpers/generalHelper";

const analyzeCustomerResponseSchema = z.object({
  threadId: z.string().describe("ID da thread/conversa"),
  customerResponse: z.string().describe("Resposta natural do cliente"),
  currentContext: z.enum(["joinville_store_choice", "other_region_choice"]).describe("Contexto atual da conversa"),
  customerAddress: z.object({
    street: z.string(),
    neighborhood: z.string(), 
    cep: z.string(),
    complement: z.string().optional(),
    fullAddress: z.string()
  }).describe("Endereço do cliente"),
  problemTag: z.string().describe("Tag do problema"),
  customerData: z.object({
    name: z.string().optional(),
    orderNumber: z.string().optional(),
    equipmentModel: z.string().optional(),
  }).optional(),
});

export const analyzeCustomerResponseTool = tool(
  async ({ threadId, customerResponse, currentContext, customerAddress, problemTag, customerData }) => {
    console.log(`[TOOL] Analisando resposta do cliente: "${customerResponse}"`);
    console.log(`[TOOL] Contexto: ${currentContext}`);
    
    try {
      const ticketId = extractTicketId(threadId);
      const analysis = analyzeCustomerIntent(customerResponse, currentContext);
      
      if (currentContext === "joinville_store_choice") {
        // Analisar escolha para Joinville (loja física vs coleta)
        if (analysis.acceptsPhysicalStore) {
          console.log(`[TOOL] Cliente de Joinville aceita loja física`);
          
          // Processar loja física
          const problemSummary = generateProblemSummary(problemTag);
          const freshdeskUpdate = await updateFreshdeskForPhysicalStore(
            ticketId, customerAddress, customerData, problemTag, problemSummary
          );

          return JSON.stringify({
            success: true,
            action: "physical_store_confirmed",
            choice: "physical_store",
            message: `✅ **PERFEITO! LOJA FÍSICA CONFIRMADA**

Seu atendimento na loja está organizado! 

📋 **RESUMO DO SEU PROBLEMA:**
${problemSummary}

🏪 **LOJA PICHAU JOINVILLE**
📍 Rua Visconde de Taunay, 380 - Atiradores
⏰ Segunda a Sexta: 8h às 18h  
📞 (47) 3422-1234

**O que levar:**
✅ Seu equipamento
✅ Documento com foto
✅ Nota fiscal (se tiver)

**Próximos passos:**
• Compareça na loja no horário de funcionamento
• Nossa equipe fará o diagnóstico presencial
• Você receberá orientações diretas sobre o reparo

Um técnico da loja será notificado sobre seu caso para agilizar o atendimento! 

**Alguma dúvida sobre a loja?**`,
            ticketId: ticketId,
            status: 'transferred_to_physical_store',
            freshdeskUpdated: freshdeskUpdate.success
          });
          
        } else {
          console.log(`[TOOL] Cliente de Joinville prefere coleta`);
          
          // Processar coleta para Joinville
          const problemSummary = generateProblemSummary(problemTag);
          const freshdeskUpdate = await updateFreshdeskForCollectionChoice(
            ticketId, customerAddress, customerData, problemTag, problemSummary
          );

          return JSON.stringify({
            success: true,
            action: "collection_confirmed",
            choice: "collection",
            message: `📦 **COLETA GRATUITA CONFIRMADA**

Sem problemas! Organizaremos a coleta em sua residência.

**Confirme seus dados:**
📍 **Endereço:** ${customerAddress.fullAddress}

**Cronograma da coleta:**
• **Contato:** Nossa logística ligará em até 24h
• **Coleta:** Realizada em até 3 dias úteis
• **Horário:** 8h às 18h (segunda a sexta)
• **Diagnóstico:** 1-2 dias úteis após recebimento
• **Reparo:** 3-5 dias úteis
• **Retorno:** Frete grátis para sua casa

**Preparação:**
✅ Mantenha equipamento embalado/protegido
✅ Retire cabos desnecessários
✅ Tenha documento com foto em mãos

Um especialista entrará em contato para organizar todos os detalhes! 🚚`,
            ticketId: ticketId,
            status: 'transferred_to_human_collection',
            freshdeskUpdated: freshdeskUpdate.success
          });
        }
        
      } else if (currentContext === "other_region_choice") {
        // Analisar escolha para outras regiões (voucher vs coleta)
        const problemSummary = generateProblemSummary(problemTag);
        
        if (analysis.prefersVoucher) {
          console.log(`[TOOL] Cliente de outra região escolhe voucher`);
          
          const freshdeskUpdate = await updateFreshdeskForVoucherChoice(
            ticketId, customerAddress, customerData, problemTag, problemSummary
          );

          return JSON.stringify({
            success: true,
            action: "voucher_requested",
            choice: "voucher",
            message: `🎫 **VOUCHER DE R$ 150,00 CONFIRMADO**

**Detalhes do voucher:**
💰 **Valor:** R$ 150,00
📄 **Processo:** Reembolso após apresentação da nota fiscal
🏥 **Onde usar:** Qualquer assistência técnica credenciada

**Próximos passos:**
• Nossa equipe entrará em contato em até 2 horas
• Você receberá lista de assistências credenciadas na sua região
• Orientações completas sobre o processo de reembolso
• Suporte durante todo o processo

**Como funciona o reembolso:**
1. Leve seu equipamento na assistência escolhida
2. Apresente seu documento e explique o problema
3. Após o reparo, solicite nota fiscal em seu nome
4. Envie a nota para reembolso

Um especialista cuidará do atendimento a partir de agora.`,
            ticketId: ticketId,
            status: 'transferred_to_human_voucher',
            freshdeskUpdated: freshdeskUpdate.success
          });
          
        } else {
          console.log(`[TOOL] Cliente de outra região escolhe coleta`);
          
          const freshdeskUpdate = await updateFreshdeskForCollectionChoice(
            ticketId, customerAddress, customerData, problemTag, problemSummary
          );

          return JSON.stringify({
            success: true,
            action: "collection_requested",
            choice: "collection",
            message: `📦 **COLETA GRATUITA CONFIRMADA**

Perfeita escolha! Coleta gratuita organizada.

**Confirme seus dados:**
📍 **Endereço:** ${customerAddress.fullAddress}

**Está correto?** Se sim, nossa logística entrará em contato em até 24h.

**Cronograma completo:**
• **Contato:** 24h para agendar
• **Coleta:** 3 dias úteis após agendamento
• **Diagnóstico:** 1-2 dias úteis
• **Reparo:** 3-5 dias úteis
• **Retorno:** Frete grátis

**Preparação:**
✅ Embalar/proteger o equipamento
✅ Retirar cabos desnecessários
✅ Ter documento com foto disponível

**Total:** 7-10 dias úteis do início ao fim

Um especialista humano organizará todos os detalhes da sua coleta! 🚚💙`,
            ticketId: ticketId,
            status: 'transferred_to_human_collection',
            freshdeskUpdated: freshdeskUpdate.success
          });
        }
      }
      
    } catch (error) {
      console.error("[TOOL] Erro ao analisar resposta:", error);
      
      return JSON.stringify({
        success: false,
        message: "Erro interno. Transferindo para especialista.",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  },
  {
    name: "analyzeCustomerResponse", 
    description: "Analisa resposta natural do cliente para determinar sua escolha entre as opções oferecidas",
    schema: analyzeCustomerResponseSchema,
  }
);