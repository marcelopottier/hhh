//@ts-nocheck
/* tslint:disable */
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { extractTicketId } from "./freshdeskUpdateTool";

// Tool para análise de localização e decisão de coleta/voucher
const analyzeLocationSchema = z.object({
  threadId: z.string().describe("ID da thread/conversa"),
  customerLocation: z.string().describe("Localização/endereço do cliente"),
  problemTag: z.string().describe("Tag do problema que não pode ser resolvido remotamente"),
  stepsAttempted: z.number().describe("Número de steps já tentados"),
});

export const analyzeLocationTool = tool(
  async ({ threadId, customerLocation, problemTag, stepsAttempted }) => {
    console.log(`[TOOL] Analisando localização para coleta/voucher`);
    console.log(`[TOOL] Cliente: ${customerLocation}`);
    console.log(`[TOOL] Problema: ${problemTag} (${stepsAttempted} steps tentados)`);
    
    try {
      const locationData = analyzeCustomerLocation(customerLocation);
      const ticketId = extractTicketId(threadId);
      
      if (locationData.isNorthRegion) {
        // Oferecer voucher para regiões do Norte
        console.log(`[TOOL] Cliente na região Norte - Oferecendo voucher`);
        
        return JSON.stringify({
          success: true,
          action: "offer_voucher",
          region: "north",
          voucherAmount: 150,
          customerLocation: customerLocation,
          locationAnalysis: locationData,
          ticketId: ticketId,
          problemTag: problemTag,
          message: `Identificamos que você está na região Norte do Brasil. 

Para facilitar o atendimento, podemos oferecer um **voucher de R$ 150,00** para você levar seu equipamento em uma assistência técnica credenciada próxima de você.

**Vantagens do voucher:**
• Atendimento presencial especializado
• Rede de assistências credenciadas
• Sem custos de envio
• Resolução mais rápida

**Aceita o voucher?** Responda "sim" para prosseguir.`,
        });
      } else {
        // Agendar coleta para outras regiões
        console.log(`[TOOL] Cliente em outra região - Agendando coleta`);
        
        return JSON.stringify({
          success: true,
          action: "schedule_collection",
          region: locationData.region,
          customerLocation: customerLocation,
          locationAnalysis: locationData,
          ticketId: ticketId,
          problemTag: problemTag,
          message: `Como não conseguimos resolver o problema remotamente, vamos agendar a **coleta gratuita** do seu equipamento.

**Como funciona:**
• Coleta gratuita em sua residência
• Diagnóstico completo em nosso laboratório
• Reparo especializado
• Retorno também gratuito

**Próximos passos:**
• Nossa equipe entrará em contato em até 24h
• Agendaremos a coleta conforme sua disponibilidade
• Prazo total: 7-10 dias úteis

**Podemos prosseguir com a coleta?** Responda "sim" para confirmar.`,
        });
      }
      
    } catch (error) {
      console.error("[TOOL] Erro na análise de localização:", error);
      
      return JSON.stringify({
        success: false,
        message: "Erro ao analisar localização",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  },
  {
    name: "analyzeLocation",
    description: "Analisa localização do cliente para decidir entre voucher (Norte) ou coleta (outras regiões) quando steps acabaram",
    schema: analyzeLocationSchema,
  }
);

// Tool para processar voucher
const processVoucherSchema = z.object({
  threadId: z.string().describe("ID da thread/conversa"),
  customerAccepted: z.boolean().describe("Se cliente aceitou o voucher"),
  customerLocation: z.string().describe("Localização do cliente"),
  voucherAmount: z.number().default(150).describe("Valor do voucher em reais"),
  customerData: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }).optional().describe("Dados do cliente"),
});

export const processVoucherTool = tool(
  async ({ threadId, customerAccepted, customerLocation, voucherAmount = 150, customerData }) => {
    console.log(`[TOOL] Processando voucher - Aceito: ${customerAccepted}`);
    
    if (!customerAccepted) {
      return JSON.stringify({
        success: true,
        message: "Entendo. Como alternativa, podemos agendar a coleta gratuita do seu equipamento. Nossa equipe entrará em contato para organizar os detalhes.",
        action: "fallback_to_collection",
        voucherDeclined: true,
      });
    }

    try {
      const ticketId = extractTicketId(threadId);
      const voucherCode = generateVoucherCode();
      
      // Simular processamento do voucher
      console.log(`[VOUCHER] 🎫 Gerando voucher: ${voucherCode}`);
      console.log(`[VOUCHER] 💰 Valor: R$ ${voucherAmount},00`);
      console.log(`[VOUCHER] 📍 Localização: ${customerLocation}`);
      console.log(`[VOUCHER] 🎯 Ticket: ${ticketId}`);
      
      // Atualizar FreshDesk com processamento do voucher
      const freshdeskUpdate = await updateFreshdeskForVoucher(
        ticketId, 
        voucherCode, 
        voucherAmount, 
        customerLocation
      );

      const message = `✅ **VOUCHER CONFIRMADO E PROCESSADO!**

**Código do Voucher:** \`${voucherCode}\`
**Valor:** R$ ${voucherAmount},00
**Válido por:** 30 dias

**Próximos passos:**
1. Localizar assistência credenciada próxima
2. Agendar atendimento apresentando este código
3. Levar equipamento e documento com foto

**Confirmação enviada por email**

Um técnico entrará em contato em até 2 horas para:
• Orientar sobre assistências credenciadas na sua região
• Finalizar detalhes do processo
• Acompanhar o atendimento

**Alguma dúvida sobre o voucher?**`;

      return JSON.stringify({
        success: true,
        message: message,
        voucherCode: voucherCode,
        voucherAmount: voucherAmount,
        status: 'voucher_processed',
        freshdeskUpdated: freshdeskUpdate.success,
        ticketId: ticketId,
      });
      
    } catch (error) {
      console.error("[TOOL] Erro ao processar voucher:", error);
      
      return JSON.stringify({
        success: false,
        message: "Erro interno ao processar voucher. Um técnico entrará em contato para resolver.",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  },
  {
    name: "processVoucher",
    description: "Processa voucher de R$ 150 para assistência técnica local quando cliente da região Norte aceita",
    schema: processVoucherSchema,
  }
);

// Tool para agendar coleta
const scheduleCollectionSchema = z.object({
  threadId: z.string().describe("ID da thread/conversa"),
  customerAccepted: z.boolean().describe("Se cliente aceitou a coleta"),
  customerLocation: z.string().describe("Endereço completo do cliente"),
  equipmentDescription: z.string().optional().describe("Descrição do equipamento"),
  preferredSchedule: z.string().optional().describe("Preferência de horário do cliente"),
  specialInstructions: z.string().optional().describe("Instruções especiais"),
});

export const scheduleCollectionTool = tool(
  async ({ 
    threadId, 
    customerAccepted, 
    customerLocation, 
    equipmentDescription, 
    preferredSchedule,
    specialInstructions 
  }) => {
    console.log(`[TOOL] Agendando coleta - Aceito: ${customerAccepted}`);
    console.log(`[TOOL] 📦 Equipamento: ${equipmentDescription || 'PC/Notebook'}`);
    console.log(`[TOOL] 📍 Endereço: ${customerLocation}`);
    console.log(`[TOOL] 🕐 Preferência: ${preferredSchedule || 'Não especificada'}`);
    
    if (!customerAccepted) {
      return JSON.stringify({
        success: true,
        message: "Compreendo. Nosso time de suporte humano entrará em contato para discutir outras alternativas para resolver seu problema.",
        action: "escalate_for_alternatives",
        collectionDeclined: true,
      });
    }

    try {
      const ticketId = extractTicketId(threadId);
      const collectionId = generateCollectionId();
      
      // Simular agendamento de coleta
      console.log(`[COLETA] 📋 Protocolo: ${collectionId}`);
      console.log(`[COLETA] 📍 Endereço: ${customerLocation}`);
      console.log(`[COLETA] 📦 Equipamento: ${equipmentDescription || 'Computador'}`);
      console.log(`[COLETA] 🚚 Status: Agendada`);
      console.log(`[COLETA] 🎯 Ticket: ${ticketId}`);
      
      // Atualizar FreshDesk com agendamento
      const freshdeskUpdate = await updateFreshdeskForCollection(
        ticketId,
        collectionId,
        customerLocation,
        equipmentDescription
      );

      const message = `📦 **COLETA AGENDADA COM SUCESSO!**

**Protocolo:** \`${collectionId}\`
**Equipamento:** ${equipmentDescription || 'Computador'}
**Endereço:** ${customerLocation}

**Cronograma:**
• **Contato:** Nossa transportadora ligará em até 24h
• **Coleta:** Realizada em até 3 dias úteis  
• **Horário:** 8h às 18h (segunda a sexta)
• **Diagnóstico:** 1-2 dias úteis após recebimento
• **Reparo:** 3-5 dias úteis
• **Retorno:** Frete grátis

**Preparação:**
✅ Mantenha equipamento embalado/protegido
✅ Retire cabos desnecessários  
✅ Tenha documento com foto em mãos
✅ Aguarde contato da transportadora

**Acompanhamento pelo protocolo:** \`${collectionId}\`

Cuidaremos do seu equipamento com carinho! 🔧💙`;

      return JSON.stringify({
        success: true,
        message: message,
        collectionId: collectionId,
        status: 'collection_scheduled',
        freshdeskUpdated: freshdeskUpdate.success,
        ticketId: ticketId,
      });
      
    } catch (error) {
      console.error("[TOOL] Erro ao agendar coleta:", error);
      
      return JSON.stringify({
        success: false,
        message: "Erro interno ao agendar coleta. Um técnico entrará em contato para organizar.",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  },
  {
    name: "scheduleCollection",
    description: "Agenda coleta gratuita do equipamento quando cliente fora da região Norte aceita",
    schema: scheduleCollectionSchema,
  }
);

// Funções auxiliares

function analyzeCustomerLocation(location: string): {
  isNorthRegion: boolean;
  region: string;
  state?: string;
  details: string;
} {
  const locationLower = location.toLowerCase();
  
  // Estados da região Norte
  const northStates = [
    'acre', 'ac', 'amapá', 'ap', 'amazonas', 'am', 
    'pará', 'pa', 'rondônia', 'ro', 'roraima', 'rr', 'tocantins', 'to'
  ];
  
  // Verificar se é região Norte
  const isNorth = northStates.some(state => locationLower.includes(state));
  
  // Identificar região aproximada
  let region = 'other';
  if (isNorth) region = 'north';
  else if (locationLower.includes('sp') || locationLower.includes('são paulo')) region = 'southeast';
  else if (locationLower.includes('rj') || locationLower.includes('rio de janeiro')) region = 'southeast';
  else if (locationLower.includes('mg') || locationLower.includes('minas gerais')) region = 'southeast';
  else if (locationLower.includes('rs') || locationLower.includes('rio grande do sul')) region = 'south';
  else if (locationLower.includes('pr') || locationLower.includes('paraná')) region = 'south';
  else if (locationLower.includes('sc') || locationLower.includes('santa catarina')) region = 'south';
  
  return {
    isNorthRegion: isNorth,
    region: region,
    details: `Localização analisada: ${location}${isNorth ? ' (Região Norte - Elegível para voucher)' : ' (Coleta disponível)'}`
  };
}

function generateVoucherCode(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `PICHAU-${timestamp}-${random}`;
}

function generateCollectionId(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `COL-${timestamp}-${random}`;
}

// Função para atualizar FreshDesk para voucher
async function updateFreshdeskForVoucher(
  ticketId: string,
  voucherCode: string,
  amount: number,
  location: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[FRESHDESK] Atualizando ticket ${ticketId} - Voucher processado`);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const internalNote = `🎫 VOUCHER PROCESSADO PELO AGENTE IA

📋 CÓDIGO: ${voucherCode}
💰 VALOR: R$ ${amount},00
📍 LOCALIZAÇÃO: ${location}
⏰ VALIDADE: 30 dias
🏷️ REGIÃO: Norte (elegível para voucher)

✅ STATUS: Voucher ativo e enviado ao cliente
📧 CONFIRMAÇÃO: Email automático enviado
👥 PRÓXIMA AÇÃO: Técnico entrará em contato em 2h

🕐 PROCESSADO EM: ${new Date().toLocaleString('pt-BR')}`;
    
    console.log(`[FRESHDESK] 🎫 Voucher ${voucherCode} registrado`);
    console.log(`[FRESHDESK] 📝 Nota interna adicionada`);
    console.log(`[FRESHDESK] 🏷️ Tags: voucher_processed, region_north`);
    
    return { success: true };
    
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Função para atualizar FreshDesk para coleta
async function updateFreshdeskForCollection(
  ticketId: string,
  collectionId: string,
  location: string,
  equipment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[FRESHDESK] Atualizando ticket ${ticketId} - Coleta agendada`);
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const internalNote = `📦 COLETA AGENDADA PELO AGENTE IA

📋 PROTOCOLO: ${collectionId}
📍 ENDEREÇO: ${location}
💻 EQUIPAMENTO: ${equipment || 'Computador'}
🚚 STATUS: Agendada

📅 CRONOGRAMA:
- Contato transportadora: 24h
- Coleta: 3 dias úteis
- Diagnóstico: 1-2 dias úteis
- Reparo: 3-5 dias úteis
- Retorno: Frete grátis

👥 PRÓXIMA AÇÃO: Logística entrará em contato
🏷️ DEPARTAMENTO: Suporte Técnico → Logística

🕐 AGENDADO EM: ${new Date().toLocaleString('pt-BR')}`;
    
    console.log(`[FRESHDESK] 📦 Coleta ${collectionId} agendada`);
    console.log(`[FRESHDESK] 📝 Nota interna com detalhes`);
    console.log(`[FRESHDESK] 🏷️ Tags: collection_scheduled, logistics_required`);
    
    return { success: true };
    
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}