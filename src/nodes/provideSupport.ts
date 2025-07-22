import { SupportStateType } from "../state";
import { createAssistantMessage, createSystemMessage } from "../types/conversation";
import { FormattedSolution } from "../types/solution";

export async function provideSupport(state: SupportStateType): Promise<Partial<SupportStateType>> {
  const { foundSolutions, clientAttempts, currentQuery, attemptCount, conversationContext, threadId } = state;
  
  console.log(`[SUPPORT] Fornecendo suporte...`);
  
  if (!foundSolutions || foundSolutions.length === 0) {
    const escalationResponse = `Não encontrei uma solução específica para "${currentQuery}". Vou conectar você com um técnico especializado.`;
    
    const escalationMessage = createAssistantMessage(
      escalationResponse,
      threadId || '',
      {
        responseType: 'escalation',
        reason: 'no_solutions_found'
      }
    );
    
    const systemMessage = createSystemMessage(
      "Escalação necessária - nenhuma solução encontrada",
      threadId || '',
      'escalation_required'
    );
    
    const updatedContext = {
      ...conversationContext,
      threadId: threadId || '',
      escalationHistory: [
        ...(conversationContext?.escalationHistory || []),
        {
          reason: 'no_solutions_found',
          timestamp: new Date()
        }
      ]
    };
    
    return {
      finalResponse: escalationResponse,
      messages: [systemMessage, escalationMessage],
      ticketStatus: "escalated",
      attemptCount: (attemptCount || 0) + 1,
      conversationContext: updatedContext,
    };
  }
  
  const bestSolution: any = foundSolutions[0];
  
  // Usar resposta formatada se disponível
  let response: string;
  
  if (bestSolution.formattedResponse) { // ← AGORA VAI FUNCIONAR
    console.log(`[SUPPORT] ✅ Usando resposta formatada completa`);
    response = bestSolution.formattedResponse;
  } else {
    console.log(`[SUPPORT] ⚠️ Gerando resposta básica (fallback)`);
    response = await generateSupportResponse(
      bestSolution,
      clientAttempts || [],
      currentQuery,
      attemptCount || 0,
      conversationContext
    );
  }
  
  const supportMessage = createAssistantMessage(
    response,
    threadId || '',
    {
      responseType: 'solution',
      solutionId: bestSolution.id,
      similarityScore: bestSolution.similarity_score,
      attemptNumber: (attemptCount || 0) + 1
    }
  );
  
  const systemMessage = createSystemMessage(
    `Solução fornecida: ${bestSolution.title}`,
    threadId || '',
    'solution_provided',
    {
      solutionId: bestSolution.id,
      score: bestSolution.similarity_score
    }
  );
  
  return {
    finalResponse: response,
    messages: [systemMessage, supportMessage],
    attemptCount: (attemptCount || 0) + 1,
    currentAttemptStatus: "pending",
    ticketStatus: "resolved",
    context: {
      ...state.context,
      supportProvided: true,
      solutionUsed: bestSolution.id,
    },
  };
}

// Função generateSupportResponse atualizada para usar tipos corretos
async function generateSupportResponse(
  solution: FormattedSolution, // ← TIPO CORRETO
  clientAttempts: string[],
  query: string,
  attemptCount: number,
  context?: any
): Promise<string> {
  // Se tem formattedResponse, usar ela
  if (solution.formattedResponse) {
    return solution.formattedResponse;
  }
  
  // Fallback para o formato antigo
  let response = `Vou te ajudar com: "${query}"\n\n`;
  
  if (clientAttempts.length > 0) {
    const attemptsText = clientAttempts
      .map(attempt => attempt.replace('_', ' '))
      .join(', ');
    response += `Vi que você já tentou: ${attemptsText}\n\n`;
  }
  
  if (attemptCount > 1) {
    response += `Como esta é a ${attemptCount}ª tentativa, vou fornecer uma solução mais detalhada.\n\n`;
  }
  
  response += `**${solution.title}**\n\n`;
  
  if (solution.procedures && solution.procedures.length > 0) {
    response += "Siga estes passos:\n\n";
    
    solution.procedures
      .sort((a: any, b: any) => a.order - b.order)
      .forEach((proc: any, index: number) => {
        response += `${index + 1}. ${proc.instruction}\n`;
        if (proc.safety_warning) {
          response += `   ⚠️ ${proc.safety_warning}\n`;
        }
        if (proc.estimated_minutes) {
          response += `   ⏱️ Tempo estimado: ${proc.estimated_minutes} minutos\n`;
        }
        response += "\n";
      });
  } else {
    response += solution.content + "\n\n";
  }
  
  if (solution.resources && solution.resources.length > 0) {
    response += "**Recursos de apoio:**\n";
    solution.resources.forEach((resource: any) => {
      response += `• ${resource.title}`;
      if (resource.url) {
        response += `: ${resource.url}`;
      }
      response += "\n";
    });
    response += "\n";
  }
  
  response += "Execute estes passos e me informe o resultado! 😊";
  
  return response;
}
