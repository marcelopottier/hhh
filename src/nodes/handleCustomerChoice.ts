import { SupportStateType } from "../state";
import { analyzeCustomerResponseTool } from "../tools/analyzeCustomerResponseTool";
import { ExtendedContext } from "../types/extendedContext";

export async function handleCustomerChoice(state: SupportStateType): Promise<Partial<SupportStateType>> {
  console.log(`[NODE] Processando escolha do cliente`);
  
  const context = state.context as ExtendedContext;
  
  try {
    // Determinar contexto baseado na localização
    const isJoinville = context.locationAnalysis?.isJoinville || false;
    const currentContext = isJoinville ? "joinville_store_choice" : "other_region_choice";
    
    const customerData = {
      name: context.customerName,
      orderNumber: context.orderNumber,
      equipmentModel: context.equipmentModel
    };
    
    const lastSolution = state.foundSolutions?.[0];
    const problemTag = context.currentProblemTag || lastSolution?.problem_tag || 'unknown';
    
    const result = await analyzeCustomerResponseTool.invoke({
      threadId: state.threadId,
      customerResponse: state.currentQuery || '',
      currentContext: currentContext,
      customerAddress: context.customerAddress ?? {
        street: "",
        neighborhood: "",
        cep: "",
        fullAddress: "",
        complement: ""
      },
      problemTag: problemTag,
      customerData
    });
    
    const response = JSON.parse(result ?? "{}");
    
    // Determinar status final baseado na resposta
    let finalStatus: "open" | "resolved" | "escalated" | "collected" = "escalated";
    
    if (response.status?.includes('transferred')) {
      finalStatus = "escalated"; // Transferido para humano
    } else if (response.choice === 'collection') {
      finalStatus = "collected"; // Coleta agendada
    }
    
    return {
      ...state,
      finalResponse: response.message,
      ticketStatus: finalStatus,
      context: {
        ...context,
        serviceChoice: response.choice,
        processed: true
      }
    };
    
  } catch (error) {
    console.error("[NODE] Erro ao processar escolha:", error);
    
    return {
      ...state,
      finalResponse: "Erro interno. Transferindo para especialista.",
      ticketStatus: "escalated"
    };
  }
}