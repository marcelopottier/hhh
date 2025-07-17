export interface ChatMessage {
  id: string;
  threadId: string; // SEMPRE obrigatório para evitar conflitos
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  contentType?: string;
  timestamp: Date;
  sequenceNumber?: number; // Opcional, será calculado automaticamente
  metadata?: Record<string, any>;
  
  // Campos específicos por tipo
  userIntent?: string;
  userSentiment?: string;
  responseType?: string;
  solutionId?: string;
  confidenceScore?: number;
  systemEventType?: string;
  
  // Feedback
  userFeedback?: 'helpful' | 'not_helpful' | 'unclear';
  feedbackComment?: string;
  feedbackTimestamp?: Date;
}

export interface ConversationSession {
  threadId: string;
  customerId: string;
  startedAt: Date;
  lastActiveAt: Date;
  endedAt?: Date;
  status: 'active' | 'resolved' | 'escalated' | 'abandoned' | 'archived';
  
  // Métricas
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  systemMessages: number;
  
  // Resultado
  issueResolved: boolean;
  resolutionType?: string;
  satisfactionRating?: number;
  
  // Problema
  primaryIssueCategory?: string;
  primaryIssueDescription?: string;
  tags?: string[];
  
  // Soluções
  solutionsAttempted?: string[];
  successfulSolutionId?: string;
  
  // Métricas de tempo
  firstResponseTimeSeconds?: number;
  resolutionTimeSeconds?: number;
  escalationTimeSeconds?: number;
  
  // Contexto técnico
  userAgent?: string;
  ipAddress?: string;
  deviceType?: string;
}

export interface ConversationContext {
  threadId: string;
  problemsDiscussed: string[];
  solutionsAttempted: string[];
  clientAttempts: string[];
  feedbackHistory: Array<{
    solutionId: string;
    helpful: boolean;
    comment?: string;
    timestamp: Date;
  }>;
  escalationHistory: Array<{
    reason: string;
    timestamp: Date;
  }>;
  
  // Análise comportamental
  preferredCommunicationStyle?: string;
  technicalLevel?: string;
  frustrationLevel: number;
  
  // Contexto técnico
  deviceInfo?: Record<string, any>;
  softwareEnvironment?: Record<string, any>;
  
  // Palavras-chave e tópicos
  extractedKeywords: string[];
  topicEvolution: Array<{
    topic: string;
    timestamp: Date;
    confidence: number;
  }>;
}

// Funções auxiliares para criar mensagens (garantindo threadId sempre presente)
export function createUserMessage(
  content: string, 
  threadId: string,
  customerId: string,
  metadata?: Record<string, any>
): ChatMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_user`,
    threadId, // SEMPRE obrigatório
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
    threadId, // SEMPRE obrigatório
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
    threadId, // SEMPRE obrigatório
    role: 'system',
    content,
    timestamp: new Date(),
    systemEventType: eventType,
    metadata: metadata || {}
  };
}