export interface ExtendedContext {
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
  
  endOfProcedure?: boolean;
  shouldRequestAddress?: boolean;
  requiresEscalation?: boolean;
  searchComplete?: boolean;
  solutionsFound?: boolean;
  searchError?: boolean;
  hasNextStep?: boolean;
  currentSolutionStep?: number;
}