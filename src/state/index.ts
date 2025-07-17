export { SupportState, SupportStateType } from './supportState';

// Re-exportar tipos unificados
export type {
  ChatMessage,
  ConversationSession,
  ConversationContext
} from '../types/conversation';

export {
  createUserMessage,
  createAssistantMessage,
  createSystemMessage
} from '../types/conversation';