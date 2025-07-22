export function extractMagentoId(ticket: any): string | null {
    if (ticket.custom_fields && ticket.custom_fields.pedido) {
      console.log(`🔍 Magento ID encontrado no custom_fields: ${ticket.custom_fields.pedido}`);
      return ticket.custom_fields.pedido.toString();
    }
    
    const fullText = `${ticket.subject} ${ticket.description_text}`;
    const regex = /(?:Pedido Magento|pedido)\s*:?\s*(\d+)/i;
    const match = fullText.match(regex);
    
    if (match) {
      console.log(`🔍 Magento ID encontrado no texto: ${match[1]}`);
      return match[1];
    }
    
    console.log(`❌ Magento ID não encontrado nem no custom_fields nem no texto`);
    return null;
  }