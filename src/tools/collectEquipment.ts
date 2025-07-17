//@ts-nocheck
/* tslint:disable */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

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
      const collectId = `COL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      return JSON.stringify({
        success: true,
        type: "collection",
        message: `📦 **COLETA AGENDADA**

**Protocolo:** ${collectId}
**Cliente:** ${customerName || customerId}
**Localização:** ${customerLocation}
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
        location: customerLocation,
      });
      
    } catch (error) {
      console.error("[TOOL] Erro na coleta:", error);
      return JSON.stringify({
        success: false,
        message: "Erro interno. Transferindo para especialista organizar a coleta.",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  },
  {
    name: "collectEquipment", 
    description: "Organiza coleta do equipamento do cliente baseado na localização quando não é possível resolver remotamente",
    schema: collectEquipmentSchema,
  }
);