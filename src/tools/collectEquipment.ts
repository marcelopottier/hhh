//@ts-nocheck
/* tslint:disable */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const collectEquipmentSchema = z.object({
  customerId: z.string().describe("ID do cliente"),
  customerLocation: z.string().describe("Localização do cliente (cidade, estado)"),
  customerName: z.string().optional().describe("Nome do cliente"),
  equipmentDescription: z.string().optional().describe("Descrição do equipamento"),
});

export const collectEquipmentTool = tool(
  async ({ customerId, customerLocation, customerName, equipmentDescription }) => {
    console.log(`[TOOL] Organizando coleta - Cliente: ${customerId} em ${customerLocation}`);
    
    try {
      const isRemoteLocation = checkIfRemoteLocation(customerLocation);
      
      if (isRemoteLocation) {
        // Oferecer voucher para localizações distantes
        return generateVoucherResponse(customerId, customerLocation, customerName);
      } else {
        // Organizar coleta para localizações próximas
        return generateCollectionResponse(customerId, customerLocation, customerName, equipmentDescription);
      }
      
    } catch (error) {
      console.error("[TOOL] Erro na coleta:", error);
      return {
        success: false,
        message: "Erro interno. Transferindo para especialista organizar a coleta.",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  },
  {
    name: "collectEquipment", 
    description: "Organiza coleta do equipamento ou oferece voucher baseado na localização",
    schema: collectEquipmentSchema,
  }
);

function checkIfRemoteLocation(location: string): boolean {
  const locationLower = location.toLowerCase();
  
  // Estados do Norte e Nordeste (distantes de Joinville-SC)
  const remoteStates = [
    'acre', 'ac', 'amapá', 'ap', 'amazonas', 'am', 'pará', 'pa',
    'rondônia', 'ro', 'roraima', 'rr', 'tocantins', 'to',
    'alagoas', 'al', 'bahia', 'ba', 'ceará', 'ce', 'maranhão', 'ma',
    'paraíba', 'pb', 'pernambuco', 'pe', 'piauí', 'pi',
    'rio grande do norte', 'rn', 'sergipe', 'se'
  ];
  
  return remoteStates.some(state => locationLower.includes(state));
}

function generateVoucherResponse(customerId: string, location: string, customerName?: string) {
  const voucherCode = `PICH-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  
  return {
    success: true,
    type: "voucher",
    message: `🎫 **VOUCHER DE ASSISTÊNCIA TÉCNICA**

Como você está em ${location}, que fica distante de nossa base em Joinville-SC, disponibilizei um voucher para assistência técnica local.

**Código:** ${voucherCode}
**Valor:** R$ 150,00
**Válido por:** 30 dias
**Cliente:** ${customerName || customerId}

**Como usar:**
1. Procure uma assistência técnica credenciada em sua região
2. Informe que possui voucher da Pichau  
3. Apresente este código: **${voucherCode}**
4. A assistência cobrará diretamente de nós até R$ 150,00

**Próximo passo:** Um técnico entrará em contato para finalizar os detalhes do voucher.

Lamentamos não conseguir resolver remotamente! 💙`,
    voucherCode,
    location,
  };
}

function generateCollectionResponse(customerId: string, location: string, customerName?: string, equipmentDescription?: string) {
  const collectId = `COL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  return {
    success: true,
    type: "collection",
    message: `📦 **COLETA AGENDADA**

**Protocolo:** ${collectId}
**Cliente:** ${customerName || customerId}
**Localização:** ${location}
**Equipamento:** ${equipmentDescription || 'Computador'}

**Agendamento:**
• Nossa transportadora entrará em contato em até 24 horas
• Coleta realizada em até 3 dias úteis
• Horário: 8h às 18h (segunda a sexta)

**Preparação:**
• Mantenha o equipamento embalado/protegido
• Retire cabos desnecessários
• Tenha documento com foto em mãos

**Processo:**
• Diagnóstico: 1-2 dias úteis
• Reparo: 3-5 dias úteis  
• Retorno: Frete grátis

**Acompanhamento:** Protocolo ${collectId}

Cuidaremos do seu equipamento com carinho! 🔧💙`,
    collectId,
    location,
  };
}