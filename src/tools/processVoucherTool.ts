import { Tool } from "langchain/tools";

interface VoucherData {
  customerId: string;
  customerLocation: string;
  customerName?: string;
  ticketId?: string;
}

export class ProcessVoucherTool extends Tool {
  name = "processVoucher";
  description = "Processa a aceitação do voucher pelo cliente e escala para humano finalizar no FreshDesk.";

  async _call(input: string): Promise<string> {
    try {
      let voucherData: VoucherData;
      
      try {
        voucherData = JSON.parse(input);
      } catch {
        return "Erro ao processar voucher. Dados inválidos.";
      }

      if (!voucherData.customerId) {
        return "Erro: ID do cliente é obrigatório para processar voucher.";
      }

      const voucherCode = this.generateVoucherCode();
      
      // Aqui você chamaria a API do FreshDesk para atualizar o ticket
      await this.updateFreshDeskTicket(voucherData, voucherCode);
      
      // Log para auditoria
      console.log(`[VOUCHER] Processado voucher ${voucherCode} para cliente ${voucherData.customerId}`);
      
      return this.generateVoucherConfirmation(voucherData, voucherCode);

    } catch (error) {
      console.error("Erro ao processar voucher:", error);
      return "Erro interno ao processar voucher. Um técnico entrará em contato.";
    }
  }

  private generateVoucherCode(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `PICH-${timestamp}-${random}`;
  }

  private async updateFreshDeskTicket(data: VoucherData, voucherCode: string): Promise<void> {
    // Simulação da chamada para FreshDesk API
    // Em produção, implementar a integração real
    
    console.log(`[FRESHDESK] Atualizando ticket para voucher:`, {
      customerId: data.customerId,
      voucherCode: voucherCode,
      status: 'voucher_approved',
      location: data.customerLocation
    });

    // Exemplo de implementação real:
    /*
    const freshDeskAPI = {
      url: process.env.FRESHDESK_URL,
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.FRESHDESK_API_KEY + ':X').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    };

    await fetch(`${freshDeskAPI.url}/tickets/${data.ticketId}`, {
      method: 'PUT',
      headers: freshDeskAPI.headers,
      body: JSON.stringify({
        status: 7, // Custom status para voucher
        custom_fields: {
          voucher_code: voucherCode,
          customer_location: data.customerLocation
        },
        tags: ['voucher_approved', 'remote_support']
      })
    });
    */
  }

  private generateVoucherConfirmation(data: VoucherData, voucherCode: string): string {
    return `✅ **VOUCHER APROVADO E PROCESSADO!**

Perfeito! Seu voucher foi gerado com sucesso.

**🎫 Detalhes do Voucher:**
• **Código:** ${voucherCode}
• **Valor:** R$ 150,00
• **Válido por:** 30 dias
• **Cliente:** ${data.customerName || data.customerId}
• **Localização:** ${data.customerLocation}

**🔧 Como usar:**
1. Procure uma assistência técnica credenciada em sua região
2. Informe que possui voucher da Pichau
3. Apresente este código: **${voucherCode}**
4. A assistência cobrará diretamente de nós até R$ 150,00

**📍 Assistências recomendadas:**
• Busque por "assistência técnica computador" no Google Maps
• Verifique avaliações (4+ estrelas)
• Confirme que aceitam voucher corporativo
• Ligue antes para confirmar disponibilidade

**📧 Confirmação:**
• Voucher enviado por email em até 10 minutos
• Guarde este código em local seguro
• Contato: suporte@pichau.com.br

**🤝 Um técnico especializado entrará em contato para:**
• Finalizar os detalhes do voucher
• Orientar sobre assistências credenciadas
• Acompanhar o processo de reparo

Obrigado pela compreensão! Garantiremos que você tenha o melhor suporte! 💙`;
  }

  // Método estático para criar solicitação estruturada
  public static createVoucherRequest(
    customerId: string,
    customerLocation: string,
    customerName?: string,
    ticketId?: string
  ): string {
    return JSON.stringify({
      customerId,
      customerLocation,
      customerName,
      ticketId
    });
  }
}