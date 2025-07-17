import { StateGraph } from "@langchain/langgraph";
import { SupportState, SupportStateType } from "../state";
import {
  analyzeQuery,
  searchSolutions,
  provideSupport,
  finalizeTicket,
} from "../nodes";

export function createSupportGraph() {
  const graph = new StateGraph(SupportState)
    // Adicionar nós
    .addNode("analyze_query", analyzeQuery)
    .addNode("search_solutions", searchSolutions)
    .addNode("provide_support", provideSupport)
    .addNode("finalize_ticket", finalizeTicket)
    
    // Fluxo inicial
    .addEdge("__start__", "analyze_query")
    .addEdge("analyze_query", "search_solutions")
    
    // Após search_solutions, decidir se vai fornecer suporte ou escalar
    .addConditionalEdges(
      "search_solutions",
      (state: SupportStateType) => {
        // Se não encontrou soluções, escalar diretamente
        if (!state.foundSolutions || state.foundSolutions.length === 0) {
          return "finalize"; // Vai direto para finalização/escalação
        }
        return "support"; // Vai fornecer suporte
      },
      {
        finalize: "finalize_ticket",
        support: "provide_support",
      }
    )
    
    // Após fornecer suporte, finalizar (sem loop por agora)
    .addEdge("provide_support", "finalize_ticket")
    
    // Finalizar sempre vai para o end
    .addEdge("finalize_ticket", "__end__");

  return graph.compile();
}