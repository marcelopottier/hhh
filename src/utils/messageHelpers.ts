import type { ChatMessage } from '../types/base';

export function createUserMessage(
  content: string, 
  threadId: string,
  customerId: string,
  metadata?: Record<string, any>
): ChatMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_user`,
    threadId,
    role: 'user',
    content,
    timestamp: new Date(),
    metadata: {
      customerId,
      ...metadata
    }
  };
}

export function createAssistantMessage(
  content: string,
  threadId: string,
  metadata?: Record<string, any>
): ChatMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_assistant`,
    threadId,
    role: 'assistant',
    content,
    timestamp: new Date(),
    responseType: 'solution',
    metadata: metadata || {}
  };
}

export function createSystemMessage(
  content: string,
  threadId: string,
  eventType?: string,
  metadata?: Record<string, any>
): ChatMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_system`,
    threadId,
    role: 'system',
    content,
    timestamp: new Date(),
    systemEventType: eventType,
    metadata: metadata || {}
  };
}