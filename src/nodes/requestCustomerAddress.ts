import { SupportStateType } from "../state";
import { ExtendedContext } from "../types/extendedContext";
import { requestAddressTool } from "../tools/requestAddress";

export async function requestCustomerAddress(state: SupportStateType): Promise<Partial<SupportStateType>> {
  console.log(`[NODE] Solicitando endereço do cliente`);
  
  const context = state.context as ExtendedContext;
  
  try {
    const customerData = {
      name: context.customerName,
      orderNumber: context.orderNumber,
      equipmentModel: context.equipmentModel
    };
    
    const lastSolution = state.foundSolutions?.[0];
    const problemTag = context.currentProblemTag || lastSolution?.problem_tag || 'unknown';
    
    const result = await requestAddressTool.invoke({
      threadId: state.threadId,
      problemTag: problemTag,
      stepsAttempted: state.attemptCount,
      ...customerData
    });
    
    const response = JSON.parse(result);
    
    return {
      ...state,
      finalResponse: response.message,
      context: {
        ...context,
        waitingFor: "customer_address",
        addressRequested: true
      }
    };
    
  } catch (error) {
    console.error("[NODE] Erro ao solicitar endereço:", error);
    
    return {
      ...state,
      finalResponse: "Erro interno. Transferindo para especialista.",
      ticketStatus: "escalated"
    };
  }
}