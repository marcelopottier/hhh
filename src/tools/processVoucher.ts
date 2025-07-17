//@ts-nocheck
/* tslint:disable */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const processVoucherSchema = z.object({
  customerId: z.string().describe("ID do cliente"),
  voucherCode: z.string().describe("Código do voucher gerado"),
  customerLocation: z.string().describe("Localização do cliente"),
  customerName: z.string().optional().describe("Nome do cliente"),
});

export const processVoucherTool = tool(
  async ({ customerId, voucherCode, customerLocation, customerName }) => {
    console.log(`[TOOL] Processando voucher ${voucherCode} para cliente ${customerId}`);
    
    try {
      return JSON.stringify({
        success: true,
        message: `✅ **VOUCHER CONFIRMADO**

Seu voucher foi processado com sucesso!

**Código:** ${voucherCode}
**Status:** Ativo
**Valor:** R$ 150,00
**Expira em:** 30 dias

**Confirmação enviada por email**

Um técnico entrará em contato em breve para:
• Orientar sobre assistências credenciadas
• Finalizar detalhes do processo
• Acompanhar o reparo

Obrigado pela compreensão! 💙`,
        voucherCode,
        status: 'processed',
      });
      
    } catch (error) {
      console.error("[TOOL] Erro ao processar voucher:", error);
      return JSON.stringify({
        success: false,
        message: "Erro interno ao processar voucher. Um técnico entrará em contato.",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  },
  {
    name: "processVoucher",
    description: "Processa a confirmação do voucher pelo cliente para assistência técnica local",
    schema: processVoucherSchema,
  }
);