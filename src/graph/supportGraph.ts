import { StateGraph } from "@langchain/langgraph";
import { SupportState, SupportStateType } from "../state";
import {
  analyzeQuery,
  searchSolutions,
  provideSupport,
  finalizeTicket,
} from "../nodes";
import { handleFeedback } from "../nodes/handleFeedback";
import { requestCustomerAddress } from "../nodes/requestCustomerAddress";
import { analyzeCustomerLocation } from "../nodes/analyzeCustomerLocation";
import { handleCustomerChoice } from "../nodes/handleCustomerChoice";
import { ExtendedContext } from "../types/extendedContext";

export function createSupportGraph() {
  const graph = new StateGraph(SupportState)
    // Nós existentes
    .addNode("analyze_query", analyzeQuery)
    .addNode("search_solutions", searchSolutions)
    .addNode("provide_support", provideSupport)
    .addNode("finalize_ticket", finalizeTicket)
    
    // Novos nós para lógica refinada
    .addNode("handle_feedback", handleFeedback)
    .addNode("request_address", requestCustomerAddress)
    .addNode("analyze_location", analyzeCustomerLocation)
    .addNode("handle_choice", handleCustomerChoice)
    
    // Fluxo inicial
    .addEdge("__start__", "analyze_query")
    
    // Análise de query decide próximo passo
    .addConditionalEdges(
      "analyze_query",
      (state: SupportStateType) => {
        const context = state.context as ExtendedContext;
        
        // Verificar se é feedback baseado no contexto
        const hasPreviousSolution = state.foundSolutions && state.foundSolutions.length > 0;
        const isFollowUp = state.attemptCount > 0;
        
        // Se está aguardando endereço
        if (context?.waitingFor === "customer_address") {
          return "address_analysis";
        }
        
        // Se está aguardando escolha de serviço
        if (context?.waitingFor === "service_choice") {
          return "choice_handling";
        }
        
        // Se tem solução anterior e é follow-up, analisar feedback
        if (hasPreviousSolution && isFollowUp) {
          return "feedback";
        }
        
        // Caso contrário, buscar soluções
        return "search";
      },
      {
        search: "search_solutions",
        feedback: "handle_feedback",
        address_analysis: "analyze_location", 
        choice_handling: "handle_choice"
      }
    )
    
    // Após buscar soluções
    .addConditionalEdges(
    "search_solutions", 
    (state: SupportStateType) => {
    const context = state.context as ExtendedContext;
    
    // 1. Se deve solicitar endereço (fim de procedimento)
    if (context?.shouldRequestAddress) {
      return "request_address";
    }
    
    // 2. Se deve escalar (erro ou sem soluções)
    if (context?.requiresEscalation || !state.foundSolutions || state.foundSolutions.length === 0) {
      return "escalate";
    }
    
    // 3. Se encontrou soluções, fornecer suporte
    return "provide";
  },
  {
    provide: "provide_support",
    escalate: "finalize_ticket",
    request_address: "request_address" // *** NOVA ROTA ***
  }
)
    
    // Após fornecer suporte, aguardar feedback
    .addEdge("provide_support", "__end__")
    
    // Lógica de feedback
    .addConditionalEdges(
      "handle_feedback",
      (state: SupportStateType) => {
        const context = state.context as ExtendedContext;
        const feedbackType = context?.feedbackType;
        
        if (feedbackType === 'positive') {
          return "resolve"; // Resolver ticket
        } else if (feedbackType === 'negative') {
          // Verificar se precisa de próximo step
          if (context?.needsNextStep) {
            return "next_step"; // Buscar próximo step
          } else {
            return "request_address"; // Solicitar endereço
          }
        }
        
        return "clarify"; // Pedir esclarecimento
      },
      {
        resolve: "finalize_ticket",
        next_step: "search_solutions", 
        request_address: "request_address",
        clarify: "__end__" // Mensagem de esclarecimento já foi enviada
      }
    )
    
    // Após solicitar endereço, aguardar resposta do cliente
    .addEdge("request_address", "__end__")
    
    // Análise de localização oferece opções
    .addEdge("analyze_location", "__end__")
    
    // Tratamento de escolhas finaliza processo
    .addEdge("handle_choice", "__end__")
    
    // Finalização sempre termina
    .addEdge("finalize_ticket", "__end__");

  return graph.compile();
}