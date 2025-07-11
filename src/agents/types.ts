export interface AgentConfig {
  maxIterations: number;
  timeout: number;
  enableMemory: boolean;
  verboseMode: boolean;
  tools: string[];
}

export interface ConversationContext {
  clienteId: string;
  sessionId: string;
  ticketId?: string;
  historico: ChatMessage[];
  metadata: Record<string, any>;
}

export interface AgentMetrics {
  totalInteractions: number;
  successRate: number;
  averageResponseTime: number;
  escalationRate: number;
  customerSatisfaction: number;
  toolUsageStats: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  confidence?: number;
  tools_used?: string[];
  metadata?: Record<string, any>;
}

export interface TicketInfo {
  id: string;
  cliente_id: string;
  problema: string;
  categoria: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'aberto' | 'em_andamento' | 'resolvido' | 'escalado';
  assignedAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum AgentAction {
  CONTINUE = 'continue',
  ESCALATE = 'escalate', 
  SOLVED = 'solved',
  NEED_INFO = 'need_info',
  TRANSFER = 'transfer'
}