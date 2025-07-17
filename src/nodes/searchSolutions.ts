import { SupportStateType } from "../state";
import { createSystemMessage } from "../types/conversation";
import { EmbeddingService } from "../services/embeddingService";

export async function searchSolutions(state: SupportStateType): Promise<Partial<SupportStateType>> {
  const { currentQuery, conversationContext, threadId } = state;
  
  console.log(`[SEARCH] Buscando soluções...`);
  
  try {
    const embeddingService = EmbeddingService.getInstance();
    
    const enrichedQuery = buildEnrichedQuery(currentQuery, conversationContext);
    
    const solutions = await embeddingService.buscarSolucoesSimilares(enrichedQuery, {
      max_results: 3,
      similarity_threshold: 0.6,
    });
    
    const searchMessage = createSystemMessage(
      `Busca concluída. Encontradas ${solutions.length} soluções.`,
      threadId || '',
      'search_complete',
      {
        originalQuery: currentQuery,
        enrichedQuery,
        solutionsFound: solutions.length,
        topScore: solutions[0]?.similarity_score || 0
      }
    );
    
    const updatedContext = {
      ...conversationContext,
      threadId: threadId || '',
      solutionsAttempted: [
        ...(conversationContext?.solutionsAttempted || []),
        ...solutions.map(s => s.id)
      ]
    };
    
    return {
      foundSolutions: solutions,
      messages: [searchMessage],
      conversationContext: updatedContext,
      context: {
        ...state.context,
        searchComplete: true,
        solutionsFound: solutions.length > 0,
        enrichedQuery,
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
        ...state.context,
        searchComplete: true,
        solutionsFound: false,
        searchError: true,
      },
    };
  }
}

function buildEnrichedQuery(originalQuery: string, context?: any): string {
  let enrichedQuery = originalQuery;
  
  if (context?.extractedKeywords?.length > 0) {
    const relevantKeywords = context.extractedKeywords.slice(0, 3);
    enrichedQuery += ' ' + relevantKeywords.join(' ');
  }
  
  if (context?.problemsDiscussed?.length > 0) {
    const latestProblem = context.problemsDiscussed[context.problemsDiscussed.length - 1];
    if (latestProblem !== 'general_issue') {
      enrichedQuery += ' ' + latestProblem.replace('_', ' ');
    }
  }
  
  return enrichedQuery;
}