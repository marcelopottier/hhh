import { SupportStateType } from "../state";
import { createSystemMessage } from "../utils/messageHelpers";
import { ExtendedContext } from "../types/extendedContext";

export async function searchSolutions(state: SupportStateType): Promise<Partial<SupportStateType>> {
  const { currentQuery, conversationContext, threadId } = state;
  const context = state.context as ExtendedContext;
  
  console.log(`[SEARCH] Buscando soluções...`);
  
  // IMPORTAÇÃO DINÂMICA DA TOOL
  const { searchProceduresTool } = await import("../tools/searchProcedures");
  
  try {
    // Determinar se é busca inicial ou próximo step
    const isNextStep = context.needsNextStep && context.nextStep && context.currentProblemTag;
    
    const searchParams = {
      query: currentQuery,
      currentStep: isNextStep ? context.nextStep || 1 : 1,
      problemTag: isNextStep ? context.currentProblemTag : undefined,
      maxResults: 3
    };
    
    console.log(`[SEARCH] Parâmetros:`, searchParams);
    
    // USAR A TOOL DE BUSCA
    const result = await searchProceduresTool.invoke(searchParams);
    const searchResponse = JSON.parse(result);
    
    if (!searchResponse.success) {
      console.log(`[SEARCH] Nenhuma solução encontrada`);
      
      if (searchResponse.endOfProcedure) {
        // Não há mais steps - solicitar endereço
        console.log(`[SEARCH] 🔍 Fim de procedimento - setando shouldRequestAddress`);
        return {
          ...state,
          foundSolutions: [],
          context: {
            ...context,
            needsNextStep: false,
            endOfProcedure: true,
            shouldRequestAddress: true
          }
        };
      }
      
      // Nenhuma solução encontrada - escalar
      console.log(`[SEARCH] ⚠️ Nenhuma solução encontrada - setando requiresEscalation`);
      return {
        ...state,
        foundSolutions: [],
        context: {
          ...context,
          searchComplete: true,
          solutionsFound: false,
          requiresEscalation: true
        }
      };
    }
    
    // Solução encontrada
    const solution = searchResponse.solution;
    
    const searchMessage = createSystemMessage(
      `Solução encontrada: ${solution.title}`,
      threadId || '',
      'search_complete',
      {
        solutionId: solution.id,
        step: solution.step,
        hasNextStep: searchResponse.hasNextStep
      }
    );
    
    const updatedContext = {
      ...conversationContext,
      threadId: threadId || '',
      solutionsAttempted: [
        ...(conversationContext?.solutionsAttempted || []),
        solution.id
      ]
    };
    
    console.log(`[SEARCH] ✅ Solução encontrada: ${solution.title}`);
    
    return {
      foundSolutions: [solution],
      messages: [searchMessage],
      conversationContext: updatedContext,
      context: {
        ...context,
        searchComplete: true,
        solutionsFound: true,
        hasNextStep: searchResponse.hasNextStep,
        currentSolutionStep: solution.step,
        currentProblemTag: solution.problem_tag,
        needsNextStep: false // Reset flag
      },
    };
    
  } catch (error) {
    console.error("[SEARCH] Erro:", error);
    
    const errorMessage = createSystemMessage(
      "Erro na busca. Preparando escalação.",
      threadId || '',
      'search_error',
      {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    );
    
    return {
      foundSolutions: [],
      messages: [errorMessage],
      context: {
        ...context,
        searchComplete: true,
        solutionsFound: false,
        searchError: true,
        requiresEscalation: true
      },
    };
  }
}