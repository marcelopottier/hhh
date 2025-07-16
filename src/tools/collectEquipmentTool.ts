import { Tool } from "langchain/tools";

interface CollectEquipmentInput {
  customerId: string;
  customerLocation: string;
  customerName?: string;
  equipmentDescription?: string;
}

export class CollectEquipmentTool extends Tool {
  name = "collectEquipment";
  description = "Organiza coleta do equipamento ou oferece voucher baseado na localização do cliente. Use após 3 tentativas sem sucesso.";

  async _call(input: string): Promise<string> {
    try {
      let collectData: CollectEquipmentInput;
      
      try {
        collectData = JSON.parse(input);
      } catch {
        return "Erro: Dados de coleta inválidos. Preciso do customerId e customerLocation.";
      }

      if (!collectData.customerId || !collectData.customerLocation) {
        return "Para organizar a coleta, preciso saber sua localização (cidade/estado). Pode me informar?";
      }

      const isRemoteLocation = this.isRemoteFromJoinville(collectData.customerLocation);
      
      if (isRemoteLocation) {
        return this.generateVoucherResponse(collectData);
      } else {
        return this.generateCollectionResponse(collectData);
      }

    } catch (error) {
      console.error("Erro na coleta de equipamento:", error);
      return "Erro interno. Vou transferir para um técnico especializado organizar a coleta.";
    }
  }

  private isRemoteFromJoinville(location: string): boolean {
    const locationLower = location.toLowerCase();
    
    // Estados do Norte e Nordeste
    const remoteStates = [
      // Norte
      'acre', 'ac', 'amapá', 'ap', 'amazonas', 'am', 'pará', 'pa', 
      'rondônia', 'ro', 'roraima', 'rr', 'tocantins', 'to',
      // Nordeste  
      'alagoas', 'al', 'bahia', 'ba', 'ceará', 'ce', 'maranhão', 'ma',
      'paraíba', 'pb', 'pernambuco', 'pe', 'piauí', 'pi', 
      'rio grande do norte', 'rn', 'sergipe', 'se'
    ];

    // Cidades específicas conhecidas do Norte/Nordeste
    const remoteCities = [
      'manaus', 'belém', 'fortaleza', 'recife', 'salvador', 'natal',
      'joão pessoa', 'maceió', 'aracaju', 'teresina', 'são luís',
      'palmas', 'macapá', 'boa vista', 'rio branco', 'porto velho'
    ];

    return remoteStates.some(state => locationLower.includes(state)) ||
           remoteCities.some(city => locationLower.includes(city));
  }

  private generateVoucherResponse(data: CollectEquipmentInput): string {
    const voucherCode = this.generateVoucherCode();
    
    // Em produção, aqui você salvaria no banco e enviaria por email
    console.log(`[VOUCHER] Gerado voucher ${voucherCode} para cliente ${data.customerId} em ${data.customerLocation}`);
    
    return `**VOUCHER DE ASSISTÊNCIA TÉCNICA**

Entendo sua frustração! Como você está em ${data.customerLocation}, que fica distante de nossa base em Joinville-SC, vou disponibilizar um voucher para assistência técnica local.

**Detalhes do Voucher:**
• **Código:** ${voucherCode}
• **Valor:** R$ 150,00
• **Válido por:** 30 dias
• **Cliente:** ${data.customerName || data.customerId}

**Como usar:**
1. Procure uma assistência técnica credenciada em sua região
2. Informe que possui voucher da Pichau
3. Apresente este código: **${voucherCode}**
4. A assistência cobrará diretamente de nós até R$ 150,00

**Assistências recomendadas em sua região:**
• Busque por "assistência técnica computador" no Google Maps
• Verifique avaliações e escolha uma bem avaliada
• Confirme que aceitam voucher corporativo

**Confirmação:**
• Você receberá este voucher por email em até 10 minutos
• Em caso de dúvidas, entre em contato: suporte@pichau.com.br

Lamentamos não conseguir resolver remotamente. Este voucher garante que você tenha o suporte necessário! 💙`;
  }

  private generateCollectionResponse(data: CollectEquipmentInput): string {
    const collectId = this.generateCollectionId();
    
    // Em produção, aqui você criaria a ordem de coleta no sistema
    console.log(`[COLETA] Agendada coleta ${collectId} para cliente ${data.customerId} em ${data.customerLocation}`);
    
    return `**COLETA DE EQUIPAMENTO AGENDADA**

Como não conseguimos resolver o problema remotamente, vou organizar a coleta do seu equipamento para reparo em nossa sede.

**Detalhes da Coleta:**
• **Protocolo:** ${collectId}
• **Cliente:** ${data.customerName || data.customerId}
• **Localização:** ${data.customerLocation}
• **Equipamento:** ${data.equipmentDescription || 'Computador'}

**Agendamento:**
• Nossa transportadora entrará em contato em até 24 horas
• Coleta será realizada em até 3 dias úteis
• Horário: 8h às 18h (segunda a sexta)

**Preparação para coleta:**
• Mantenha o equipamento embalado/protegido
• Retire todos os cabos que não sejam do problema
• Anote a descrição do defeito para o técnico
• Tenha um documento com foto em mãos

**Processo de reparo:**
• Diagnóstico: 1-2 dias úteis
• Reparo: 3-5 dias úteis (dependendo da peça)
• Retorno: 2-3 dias úteis para envio

**Acompanhamento:**
• Você receberá updates por email/WhatsApp
• Protocolo para consultas: **${collectId}**

Nosso time técnico cuidará do seu equipamento com todo carinho! 🔧💙`;
  }

  private generateVoucherCode(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `PICH-${timestamp}-${random}`;
  }

  private generateCollectionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `COL-${timestamp}-${random}`;
  }

  // Método estático para criar entrada estruturada
  public static createCollectionRequest(
    customerId: string,
    customerLocation: string,
    customerName?: string,
    equipmentDescription?: string
  ): string {
    return JSON.stringify({
      customerId,
      customerLocation,
      customerName,
      equipmentDescription
    });
  }
}