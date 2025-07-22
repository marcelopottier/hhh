import { SupportStateType } from "../state";
import { extractAddressFromQuery } from "../helpers/generalHelper";
import { analyzeLocationTool } from "../tools/analyzeLocationTool";
import { ExtendedContext } from "../types/extendedContext";

export async function analyzeCustomerLocation(state: SupportStateType): Promise<Partial<SupportStateType>> {
  console.log(`[NODE] Analisando localização do cliente`);
  
  const context = state.context as ExtendedContext;
  
  try {
    // Extrair endereço da query do cliente
    const addressData = extractAddressFromQuery(state.currentQuery || '');
    
    if (!addressData.isComplete) {
      return {
        ...state,
        finalResponse: "Por favor, forneça o endereço completo no formato solicitado:\n\n **Rua:**\n **Bairro:**\n **CEP:**\n **Complemento:**",
        context: {
          ...context,
          addressIncomplete: true
        }
      };
    }
    
    const customerData = {
      name: context.customerName,
      orderNumber: context.orderNumber,
      equipmentModel: context.equipmentModel
    };
    
    const lastSolution = state.foundSolutions?.[0];
    const problemTag = context.currentProblemTag || lastSolution?.problem_tag || 'unknown';
    
    const result = await analyzeLocationTool.invoke({
      threadId: state.threadId,
      customerAddress: addressData,
      problemTag: problemTag,
      customerData
    });
    
    const response = JSON.parse(result);
    
    return {
      ...state,
      finalResponse: response.message,
      context: {
        ...context,
        customerAddress: addressData,
        locationAnalysis: response.locationAnalysis,
        serviceOptions: response.action,
        waitingFor: "service_choice"
      }
    };
    
  } catch (error) {
    console.error("[NODE] Erro ao analisar localização:", error);
    
    return {
      ...state,
      finalResponse: "Erro interno. Transferindo para especialista.",
      ticketStatus: "escalated"
    };
  }
}