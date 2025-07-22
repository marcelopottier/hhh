import { SupportStateType } from "../state";
import { ExtendedContext } from "../types/extendedContext";

export async function handleFeedback(state: SupportStateType): Promise<Partial<SupportStateType>> {
  console.log(`[NODE] Analisando feedback do cliente`);
  
  const query = state.currentQuery?.toLowerCase() || '';
  const context = state.context as ExtendedContext;
  
  // Analisar tipo de feedback
  let feedbackType: 'positive' | 'negative' | 'unclear' = 'unclear';
  
  // Palavras indicativas de sucesso
  const positiveWords = ['funcionou', 'resolveu', 'deu certo', 'consegui', 'obrigado', 'valeu', 'perfeito'];
  // Palavras indicativas de problema
  const negativeWords = ['não funcionou', 'não deu certo', 'ainda', 'continua', 'mesmo problema', 'não resolveu'];
  
  if (positiveWords.some(word => query.includes(word))) {
    feedbackType = 'positive';
  } else if (negativeWords.some(word => query.includes(word))) {
    feedbackType = 'negative';
  }
  
  // Atualizar contexto da conversa
  const updatedConversationContext = {
    ...state.conversationContext,
    feedbackHistory: [
      ...state.conversationContext.feedbackHistory,
      {
        solutionId: `attempt-${state.attemptCount}`,
        helpful: feedbackType === 'positive',
        comment: state.currentQuery || '',
        timestamp: new Date()
      }
    ]
  };
  
  // Se feedback positivo, preparar para resolução
  if (feedbackType === 'positive') {
    console.log(`[NODE] Feedback positivo detectado - preparando resolução`);
    return {
      ...state,
      conversationContext: updatedConversationContext,
      ticketStatus: "resolved",
      context: {
        ...context,
        feedbackType: 'positive',
        readyToResolve: true
      }
    };
  }
  
  // Se feedback negativo, verificar próximo step
  if (feedbackType === 'negative') {
    console.log(`[NODE] Feedback negativo - verificando próximo step`);
    
    // Extrair informações da última solução tentada
    const lastSolution = state.foundSolutions?.[0];
    const currentStep = lastSolution?.step || 1;
    const problemTag = lastSolution?.problem_tag;
    
    return {
      ...state,
      conversationContext: updatedConversationContext,
      context: {
        ...context,
        feedbackType: 'negative',
        nextStep: currentStep + 1,
        currentProblemTag: problemTag,
        needsNextStep: true
      }
    };
  }
  
  // Feedback unclear - pedir esclarecimento
  console.log(`[NODE] Feedback não claro - solicitando esclarecimento`);
  return {
    ...state,
    conversationContext: updatedConversationContext,
    finalResponse: "Não consegui entender se a solução funcionou. Pode me dizer se o problema foi resolvido ou ainda persiste?",
    context: {
      ...context,
      feedbackType: 'unclear',
      waitingFor: 'clarification'
    }
  };
}