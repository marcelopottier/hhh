import { Annotation } from "@langchain/langgraph";
import { ChatMessage, ConversationContext, ConversationSession } from "../types";

export const SupportState = Annotation.Root({
  // Identificação da conversa
  threadId: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  
  customerId: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  
  // Histórico completo de mensagens usando interface unificada
  messages: Annotation<ChatMessage[]>({
    reducer: (x, y) => {
      // Evitar duplicatas baseado no ID
      const existing = x || [];
      const newMessages = y || [];
      
      // Validar que todas as mensagens têm threadId
      const processedNewMessages = newMessages.map(msg => {
        if (!msg.threadId) {
          console.warn(`Mensagem ${msg.id} sem threadId, adicionando...`);
          return {
            ...msg,
            threadId: existing[0]?.threadId || 'unknown',
            timestamp: msg.timestamp || new Date()
          };
        }
        return msg;
      });
      
      const existingIds = new Set(existing.map(m => m.id));
      const uniqueNew = processedNewMessages.filter(m => !existingIds.has(m.id));
      
      return [...existing, ...uniqueNew];
    },
    default: () => [],
  }),
  
  // Sessão da conversa
  session: Annotation<ConversationSession>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({
      threadId: '',
      customerId: '',
      startedAt: new Date(),
      lastActiveAt: new Date(),
      status: 'active',
      totalMessages: 0,
      userMessages: 0,
      assistantMessages: 0,
      systemMessages: 0,
      issueResolved: false,
    }),
  }),
  
  // Query atual (pode mudar durante a conversa)
  currentQuery: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  
  // Contexto acumulado da conversa
  conversationContext: Annotation<ConversationContext>({
    reducer: (x, y) => ({
      threadId: y?.threadId || x?.threadId || '',
      problemsDiscussed: [...(x?.problemsDiscussed || []), ...(y?.problemsDiscussed || [])],
      solutionsAttempted: [...(x?.solutionsAttempted || []), ...(y?.solutionsAttempted || [])],
      clientAttempts: [...(x?.clientAttempts || []), ...(y?.clientAttempts || [])],
      feedbackHistory: [...(x?.feedbackHistory || []), ...(y?.feedbackHistory || [])],
      escalationHistory: [...(x?.escalationHistory || []), ...(y?.escalationHistory || [])],
      frustrationLevel: y?.frustrationLevel ?? x?.frustrationLevel ?? 0,
      extractedKeywords: [...(x?.extractedKeywords || []), ...(y?.extractedKeywords || [])],
      topicEvolution: [...(x?.topicEvolution || []), ...(y?.topicEvolution || [])],
    }),
    default: () => ({
      threadId: '',
      problemsDiscussed: [],
      solutionsAttempted: [],
      clientAttempts: [],
      feedbackHistory: [],
      escalationHistory: [],
      frustrationLevel: 0,
      extractedKeywords: [],
      topicEvolution: [],
    }),
  }),
  
  // Soluções encontradas na busca atual
  foundSolutions: Annotation<Array<{
    id: string;
    title: string;
    content: string;
    similarity_score: number;
    procedures?: any[];
    category?: string;
    difficulty?: number;
    estimated_time_minutes?: number;
  }>>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  
  // Contador de tentativas na sessão atual
  attemptCount: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0,
  }),
  
  // Status da tentativa atual
  currentAttemptStatus: Annotation<"pending" | "success" | "failed">({
    reducer: (x, y) => y ?? x,
    default: () => "pending",
  }),
  
  // Tentativas já realizadas pelo cliente (extraídas da query atual)
  clientAttempts: Annotation<string[]>({
    reducer: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  
  // Status final do ticket
  ticketStatus: Annotation<"open" | "resolved" | "escalated" | "collected">({
    reducer: (x, y) => y ?? x,
    default: () => "open",
  }),
  
  // Resposta final gerada
  finalResponse: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  
  // Contexto adicional para processamento
  context: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
});

export type SupportStateType = typeof SupportState.State;

// Re-exportar tipos para compatibilidade
export type { ChatMessage, ConversationSession, ConversationContext };