export interface SolutionProcedure {
  order: number;
  category: string;
  instruction: string;
  type?: string;
  safety_warning?: string;
  estimated_minutes?: number;
}

export interface SolutionResource {
  type: string;
  title: string;
  url?: string;
  description?: string;
  category?: string;
  duration_seconds?: number;
}

export interface BaseSolution {
  id: string;
  problem_tag: string;
  step: number;
  title: string;
  content: string;
  similarity_score: number;
  category?: string;
  difficulty?: number;
  estimated_time_minutes?: number;
  introduction?: string;
  problem_description?: string;
  closing_message?: string;
  procedures?: SolutionProcedure[];
  resources?: SolutionResource[];
  keywords?: string[];
  tags?: string[];
}

export interface FormattedSolution extends BaseSolution {
  formattedResponse: string; // ← ADICIONAR ESTA PROPRIEDADE
  score: number;
}