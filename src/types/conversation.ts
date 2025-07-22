export type {
  ChatMessage,
  ConversationSession,
  ConversationContext
} from './base';

// Re-exportar utilitários
export {
  createUserMessage,
  createAssistantMessage,
  createSystemMessage
} from '../utils/messageHelpers';