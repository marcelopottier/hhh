import { SupportStateType } from "../state";
import { createSystemMessage } from "../types/conversation";

export async function finalizeTicket(state: SupportStateType): Promise<Partial<SupportStateType>> {
  const { currentAttemptStatus, finalResponse, threadId, conversationContext } = state;
  
  console.log(`[FINALIZE] Status: ${currentAttemptStatus}`);
  
  const finalizeMessage = createSystemMessage(
    `Ticket finalizado com status: ${currentAttemptStatus}`,
    threadId || '',
    'ticket_finalized',
    {
      finalStatus: currentAttemptStatus,
      hasResponse: !!finalResponse
    }
  );
  
  if (finalResponse) {
    return {
      ticketStatus: currentAttemptStatus === "success" ? "resolved" : "escalated",
      messages: [finalizeMessage],
      conversationContext: {
        ...conversationContext,
        threadId: threadId || '',
      }
    };
  }
  
  return {
    finalResponse: "Atendimento finalizado.",
    ticketStatus: "resolved",
    messages: [finalizeMessage],
  };
}