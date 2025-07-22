import { tool } from "@langchain/core/tools";
import { z } from "zod";

const requestAddressSchema = z.object({
  threadId: z.string().describe("ID da thread/conversa"),
  problemTag: z.string().describe("Tag do problema que não pode ser resolvido remotamente"),
  stepsAttempted: z.number().describe("Número de steps já tentados"),
  reason: z.string().optional().describe("Motivo pelo qual precisa do endereço")
});

export const requestAddressTool = tool(
  async ({ threadId, problemTag, stepsAttempted, reason }) => {
    console.log(`[TOOL] Solicitando endereço do cliente`);
    console.log(`[TOOL] Problema: ${problemTag} (${stepsAttempted} steps tentados)`);
    
    try {
      const message = `Como não conseguimos resolver o problema remotamente após ${stepsAttempted} tentativas, vou verificar opções de atendimento para você.

**Preciso do seu endereço completo** para oferecer a melhor solução:

📍 **Por favor, informe:**
• Rua
• Número
• Cidade
• Estado
• CEP

Com essas informações, posso verificar se há:
• Loja física próxima para atendimento presencial
• Voucher para assistência técnica local
• Coleta gratuita do equipamento

**Qual é o seu endereço?**`;

      return JSON.stringify({
        success: true,
        message: message,
        action: "request_address",
        problemTag: problemTag,
        stepsAttempted: stepsAttempted,
        waitingForAddress: true,
      });
      
    } catch (error) {
      console.error("[TOOL] Erro ao solicitar endereço:", error);
      
      return JSON.stringify({
        success: false,
        message: "Erro interno. Um técnico entrará em contato para resolver.",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  },
  {
    name: "requestAddress",
    description: "Solicita endereço do cliente quando procedimentos remotos não resolveram o problema",
    schema: requestAddressSchema,
  }
);