export interface ChatMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  contentType?: string;
  timestamp: Date;
  sequenceNumber?: number;
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