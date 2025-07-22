import { Annotation } from "@langchain/langgraph";

// Adicionar estas extensões ao seu SupportState existente:

export const SupportStateExtended = Annotation.Root({
  // ... todos os campos existentes do seu SupportState ...
  
  // Solução atual sendo processada (ADICIONAR)
  currentSolution: Annotation<{
    id: string;
    title: string;
    content: string;
    problem_tag: string;
    step: number;
    similarity_score: number;
    procedures?: any[];
    category?: string;
    difficulty?: number;
    estimated_time_minutes?: number;
  }>({
    reducer: (x, y) => y ?? x,
  }),
  
  // Se há próximo step disponível (ADICIONAR)
  hasNextStep: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
  
  // Próximo step a ser tentado (ADICIONAR)
  nextStep: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 1,
  }),
  
  // Tag do problema atual (ADICIONAR)
  currentProblemTag: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  
  // Dados do endereço do cliente (ADICIONAR)
  customerAddress: Annotation<{
    street: string;
    neighborhood: string;
    cep: string;
    complement?: string;
    fullAddress: string;
    isComplete: boolean;
  }>({
    reducer: (x, y) => y ?? x,
  }),
  
  // Análise da localização (ADICIONAR)
  locationAnalysis: Annotation<{
    isJoinville: boolean;
    region: string;
    state?: string;
    details: string;
  }>({
    reducer: (x, y) => y ?? x,
  }),
  
  // Opções de serviço oferecidas (ADICIONAR)
  serviceOptions: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  
  // Escolha do cliente (ADICIONAR)
  serviceChoice: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  
  // Tipo de feedback detectado (ADICIONAR)
  feedbackType: Annotation<'positive' | 'negative' | 'unclear'>({
    reducer: (x, y) => y ?? x,
  }),
  
  // Para que está aguardando (ADICIONAR)
  waitingFor: Annotation<'customer_address' | 'service_choice' | 'clarification'>({
    reducer: (x, y) => y ?? x,
  }),
});

export type SupportStateExtendedType = typeof SupportStateExtended.State;

// Estrutura recomendada para state.context:
interface ExtendedContext {
  // Dados do cliente
  customerName?: string;
  orderNumber?: string;
  equipmentModel?: string;
  
  // Controle de fluxo
  currentProblemTag?: string;
  nextStep?: number;
  feedbackType?: 'positive' | 'negative' | 'unclear';
  waitingFor?: 'customer_address' | 'service_choice' | 'clarification';
  
  // Dados de endereço
  customerAddress?: {
    street: string;
    neighborhood: string;
    cep: string;
    complement?: string;
    fullAddress: string;
    isComplete: boolean;
  };
  
  // Análise de localização
  locationAnalysis?: {
    isJoinville: boolean;
    region: string;
    state?: string;
    details: string;
  };
  
  // Opções e escolhas
  serviceOptions?: string;
  serviceChoice?: string;
  
  // Estados de controle
  addressRequested?: boolean;
  addressIncomplete?: boolean;
  needsNextStep?: boolean;
  readyToResolve?: boolean;
  processed?: boolean;
}