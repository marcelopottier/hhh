import { SupportStateType } from "../state/supportState";

export async function checkProgress(state: SupportStateType): Promise<Partial<SupportStateType>> {
  const { currentQuery, attemptCount } = state;
  
  console.log(`[PROGRESS] Verificando progresso (tentativa ${attemptCount})`);
  
  // Analisar resposta do cliente
  const queryLower = currentQuery.toLowerCase();
  
  // Verificar se cliente indicou sucesso
  const successIndicators = [
    'funcionou', 'resolveu', 'consegui', 'deu certo', 'obrigado',
    'perfeito', 'sucesso', 'resolve', 'ok', 'certo'
  ];
  
  // Verificar se cliente indicou problema persistente
  const failureIndicators = [
    'não funcionou', 'não resolveu', 'ainda', 'continua', 'mesmo problema',
    'não deu certo', 'persiste', 'não consegui'
  ];
  
  const hasSuccess = successIndicators.some(indicator => 
    queryLower.includes(indicator)
  );
  
  const hasFailure = failureIndicators.some(indicator => 
    queryLower.includes(indicator)
  );
  
  let status: "success" | "failed" | "pending" = "pending";
  let progressMessage = "";
  
  if (hasSuccess) {
    status = "success";
    progressMessage = "Cliente confirmou que problema foi resolvido.";
  } else if (hasFailure || attemptCount >= 3) {
    status = "failed";
    progressMessage = attemptCount >= 3 
      ? "Atingido limite de tentativas. Preparando próxima ação."
      : "Cliente informou que problema persiste.";
  } else {
    progressMessage = "Aguardando retorno do cliente ou nova tentativa.";
  }
  
  const checkMessage = {
    id: `system-${Date.now()}`,
    role: "system" as const,
    content: progressMessage,
    timestamp: new Date(),
    threadId: state.context?.threadId ?? "", // Add threadId from context or fallback to empty string
  };
  
  return {
    currentAttemptStatus: status,
    messages: [checkMessage],
    context: {
      ...state.context,
      progressChecked: true,
      lastProgressCheck: new Date().toISOString(),
    },
  };
}