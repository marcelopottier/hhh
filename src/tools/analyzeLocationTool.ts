import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { extractTicketId } from "./freshdeskUpdateTool";
import { analyzeCustomerLocationRefined } from "../helpers/generalHelper";

const analyzeLocationRefinedSchema = z.object({
  threadId: z.string().describe("ID da thread/conversa"),
  customerAddress: z.object({
    street: z.string().describe("Rua e número"),
    neighborhood: z.string().describe("Bairro"),
    cep: z.string().describe("CEP"),
    complement: z.string().optional().describe("Complemento"),
    fullAddress: z.string().describe("Endereço completo como fornecido pelo cliente")
  }).describe("Endereço estruturado do cliente"),
  problemTag: z.string().describe("Tag do problema"),
  customerData: z.object({
    name: z.string().optional(),
    orderNumber: z.string().optional(),
    equipmentModel: z.string().optional(),
  }).optional(),
});

export const analyzeLocationTool = tool(
  async ({ threadId, customerAddress, problemTag, customerData }) => {
    console.log(`[TOOL] Analisando localização refinada: ${customerAddress.fullAddress}`);
    
    try {
      const ticketId = extractTicketId(threadId);
      const locationAnalysis = analyzeCustomerLocationRefined(customerAddress);
      
      if (locationAnalysis.isJoinville) {
        console.log(`[TOOL] Cliente de Joinville - Oferecendo loja física`);
        
        return JSON.stringify({
          success: true,
          action: "offer_physical_store",
          region: "joinville",
          customerAddress: customerAddress,
          locationAnalysis: locationAnalysis,
          ticketId: ticketId,
          problemTag: problemTag,
          customerData: customerData,
          message: `Identifiquei que você está em Joinville.

Como você está em nossa cidade, temos uma **opção mais rápida** para você:

**LOJA FÍSICA PICHAU - JOINVILLE**
**Endereço:** Rua Visconde de Taunay, 380 - Atiradores, Joinville - SC
**Horário:** Segunda a Sexta, 8h às 18h
**Telefone:** (47) 3422-1234

**Vantagens de levar na loja:**
Atendimento presencial
Sem custos de envio
Resolução mais rápida

**Você gostaria de levar seu equipamento na nossa loja física?** 

Caso prefira, também podemos organizar a coleta gratuita em sua residência.`,
        });
        
      } else {
        console.log(`[TOOL] Cliente de outra região - Oferecendo voucher ou coleta`);
        
        return JSON.stringify({
          success: true,
          action: "offer_voucher_or_collection",
          region: "other",
          customerAddress: customerAddress,
          locationAnalysis: locationAnalysis,
          ticketId: ticketId,
          problemTag: problemTag,
          customerData: customerData,
          message: `

Como não conseguimos resolver remotamente, para prosseguir temos duas opções:

**OPÇÃO 1: VOUCHER DE REEMBOLSO TÉCNICO**
• Valor: R$ 150,00 para assistência técnica local
• Você escolhe a assistência de sua preferência na sua cidade
• Reembolso após apresentação da nota fiscal
• Flexibilidade total para você

**OPÇÃO 2: COLETA GRATUITA**
• Coletamos seu equipamento em sua residência (sem custo)
• Reparo em nosso laboratório especializado
• Retorno também gratuito para sua casa
• Prazo total: 7-10 dias úteis

**Qual das duas opções você prefere?** 

Ambas são gratuitas e eficazes para resolver seu problema.`,
        });
      }
      
    } catch (error) {
      console.error("[TOOL] Erro na análise refinada:", error);
      
      return JSON.stringify({
        success: false,
        message: "Erro ao analisar localização",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  },
  {
    name: "analyzeLocationRefined",
    description: "Analisa endereço do cliente e oferece opções específicas: loja física (Joinville) ou voucher/coleta (outras regiões)",
    schema: analyzeLocationRefinedSchema,
  }
);