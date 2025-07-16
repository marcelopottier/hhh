import { Request, Response, NextFunction } from 'express';

// Interfaces para tipagem
interface SolutionBody {
  problem_tag: string;
  step?: number;
  title: string;
  introduction?: string;
  problem_description: string;
  content: string;
  procedures?: Array<{
    order: number;
    category: string;
    instruction: string;
    type?: string;
    safety_warning?: string;
    estimated_minutes?: number;
  }>;
  resources?: Array<{
    type: string;
    title: string;
    url?: string;
    description?: string;
    category?: string;
    duration_seconds?: number;
  }>;
  closing_message?: string;
  next_steps?: string[];
  tools_required?: string[];
  keywords?: string[];
  tags?: string[];
  category?: string;
  subcategory?: string;
  difficulty?: number;
  estimated_time_minutes?: number;
  approval_status?: string;
}

interface SearchBody {
  query: string;
  max_results?: number;
  similarity_threshold?: number;
  filter_category?: string;
  filter_problem_tag?: string;
  filter_difficulty?: number;
  embedding_types?: string[];
}

// Validação principal para soluções
export const validateSolution = (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      problem_tag,
      step = 1,
      title,
      introduction,
      problem_description,
      content,
      procedures = [],
      resources = [],
      closing_message,
      next_steps = [],
      tools_required = [],
      keywords = [],
      tags = [],
      category,
      subcategory,
      difficulty = 3,
      estimated_time_minutes,
      approval_status = 'approved'
    }: SolutionBody = req.body;

    const errors: string[] = [];

    // Validações obrigatórias
    if (!problem_tag || typeof problem_tag !== 'string' || problem_tag.trim().length < 3) {
      errors.push('problem_tag é obrigatório e deve ter pelo menos 3 caracteres');
    }

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      errors.push('Título é obrigatório e deve ter pelo menos 3 caracteres');
    }

    if (!problem_description || typeof problem_description !== 'string' || problem_description.trim().length < 10) {
      errors.push('Descrição do problema é obrigatória e deve ter pelo menos 10 caracteres');
    }

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      errors.push('Conteúdo da solução é obrigatório e deve ter pelo menos 10 caracteres');
    }

    // Validações opcionais
    if (step && (!Number.isInteger(step) || step < 1)) {
      errors.push('step deve ser um número inteiro positivo');
    }

    if (!Array.isArray(keywords)) {
      errors.push('keywords deve ser um array');
    }

    if (!Array.isArray(tags)) {
      errors.push('tags deve ser um array');
    }

    if (!Array.isArray(next_steps)) {
      errors.push('next_steps deve ser um array');
    }

    if (!Array.isArray(tools_required)) {
      errors.push('tools_required deve ser um array');
    }

    if (difficulty && (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5)) {
      errors.push('difficulty deve ser um número inteiro entre 1 e 5');
    }

    if (estimated_time_minutes && (!Number.isInteger(estimated_time_minutes) || estimated_time_minutes < 1)) {
      errors.push('estimated_time_minutes deve ser um número inteiro positivo');
    }

    if (approval_status && !['draft', 'review', 'approved', 'deprecated'].includes(approval_status)) {
      errors.push('approval_status deve ser: draft, review, approved ou deprecated');
    }

    // Validação de problem_tag (sem caracteres especiais, lowercase)
    if (problem_tag && !/^[a-z0-9_]+$/.test(problem_tag.trim())) {
      errors.push('problem_tag deve conter apenas letras minúsculas, números e underscore');
    }

    // Validação dos procedimentos
    if (!Array.isArray(procedures)) {
      errors.push('procedures deve ser um array');
    } else {
      procedures.forEach((procedure, index) => {
        if (!procedure.order || !Number.isInteger(procedure.order) || procedure.order < 1) {
          errors.push(`Procedimento ${index + 1}: order é obrigatório e deve ser um inteiro positivo`);
        }

        if (!procedure.category || typeof procedure.category !== 'string') {
          errors.push(`Procedimento ${index + 1}: category é obrigatória`);
        }

        if (!procedure.instruction || typeof procedure.instruction !== 'string' || procedure.instruction.trim().length < 5) {
          errors.push(`Procedimento ${index + 1}: instruction é obrigatória e deve ter pelo menos 5 caracteres`);
        }

        if (procedure.type && !['acao', 'verificacao', 'observacao', 'aviso', 'preparacao', 'finalizacao', 'localizacao'].includes(procedure.type)) {
          errors.push(`Procedimento ${index + 1}: type deve ser um dos tipos válidos`);
        }

        if (procedure.estimated_minutes && (!Number.isInteger(procedure.estimated_minutes) || procedure.estimated_minutes < 1)) {
          errors.push(`Procedimento ${index + 1}: estimated_minutes deve ser um número inteiro positivo`);
        }
      });

      // Verificar se as ordens são únicas e sequenciais
      if (procedures.length > 0) {
        const orders = procedures.map(p => p.order).sort((a, b) => a - b);
        const uniqueOrders = [...new Set(orders)];
        
        if (orders.length !== uniqueOrders.length) {
          errors.push('As ordens dos procedimentos devem ser únicas');
        }

        const expected = Array.from({length: orders.length}, (_, i) => i + 1);
        const isSequential = orders.every((num, index) => num === expected[index]);
        
        if (!isSequential) {
          errors.push('As ordens dos procedimentos devem ser sequenciais começando do 1');
        }
      }
    }

    // Validação dos recursos
    if (!Array.isArray(resources)) {
      errors.push('resources deve ser um array');
    } else {
      resources.forEach((resource, index) => {
        if (!resource.type || !['video', 'image', 'link', 'document', 'software', 'guide'].includes(resource.type)) {
          errors.push(`Recurso ${index + 1}: type é obrigatório e deve ser um dos tipos válidos`);
        }

        if (!resource.title || typeof resource.title !== 'string' || resource.title.trim().length < 3) {
          errors.push(`Recurso ${index + 1}: title é obrigatório e deve ter pelo menos 3 caracteres`);
        }

        if (resource.url && (typeof resource.url !== 'string' || !isValidUrl(resource.url))) {
          errors.push(`Recurso ${index + 1}: url deve ser uma URL válida`);
        }

        if (resource.duration_seconds && (!Number.isInteger(resource.duration_seconds) || resource.duration_seconds < 1)) {
          errors.push(`Recurso ${index + 1}: duration_seconds deve ser um número inteiro positivo`);
        }
      });
    }

    // Se há erros, retornar resposta de erro
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors
      });
    }

    // Limpar e padronizar dados
    req.body = {
      problem_tag: problem_tag.trim().toLowerCase(),
      step,
      title: title.trim(),
      introduction: introduction?.trim() || null,
      problem_description: problem_description.trim(),
      content: content.trim(),
      procedures: procedures.map(proc => ({
        order: proc.order,
        category: proc.category.trim(),
        instruction: proc.instruction.trim(),
        type: proc.type || 'acao',
        safety_warning: proc.safety_warning?.trim() || null,
        estimated_minutes: proc.estimated_minutes || null
      })),
      resources: resources.map(resource => ({
        type: resource.type,
        title: resource.title.trim(),
        url: resource.url?.trim() || null,
        description: resource.description?.trim() || null,
        category: resource.category?.trim() || null,
        duration_seconds: resource.duration_seconds || null
      })),
      closing_message: closing_message?.trim() || null,
      next_steps: next_steps.filter(step => step && step.trim().length > 0),
      tools_required: tools_required.filter(tool => tool && tool.trim().length > 0),
      keywords: keywords.map(k => k.toString().trim().toLowerCase()).filter(k => k.length > 0),
      tags: tags.map(t => t.toString().trim().toLowerCase()).filter(t => t.length > 0),
      category: category?.trim() || null,
      subcategory: subcategory?.trim() || null,
      difficulty,
      estimated_time_minutes,
      approval_status
    };

    next();

  } catch (error) {
    console.error('[Validation] Erro na validação de solução:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na validação',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Validação para busca semântica
export const validateSearch = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      query, 
      max_results = 5, 
      similarity_threshold = 0.7,
      filter_category,
      filter_problem_tag,
      filter_difficulty,
      embedding_types = ['full_content', 'keywords', 'title']
    }: SearchBody = req.body;

    const errors: string[] = [];

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      errors.push('Query de busca é obrigatória e deve ter pelo menos 2 caracteres');
    }

    if (max_results && (!Number.isInteger(max_results) || max_results < 1 || max_results > 50)) {
      errors.push('max_results deve ser um número inteiro entre 1 e 50');
    }

    if (similarity_threshold && (typeof similarity_threshold !== 'number' || similarity_threshold < 0 || similarity_threshold > 1)) {
      errors.push('similarity_threshold deve ser um número entre 0 e 1');
    }

    if (filter_difficulty && (!Number.isInteger(filter_difficulty) || filter_difficulty < 1 || filter_difficulty > 5)) {
      errors.push('filter_difficulty deve ser um número inteiro entre 1 e 5');
    }

    if (!Array.isArray(embedding_types)) {
      errors.push('embedding_types deve ser um array');
    } else {
      const validTypes = ['full_content', 'keywords', 'title', 'problem_description', 'procedures'];
      const invalidTypes = embedding_types.filter(type => !validTypes.includes(type));
      if (invalidTypes.length > 0) {
        errors.push(`embedding_types inválidos: ${invalidTypes.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetros de busca inválidos',
        errors: errors
      });
    }

    req.body = {
      query: query.trim(),
      max_results,
      similarity_threshold,
      filter_category: filter_category?.trim() || null,
      filter_problem_tag: filter_problem_tag?.trim() || null,
      filter_difficulty,
      embedding_types
    };

    next();

  } catch (error: any) {
    console.error('[Validation] Erro na validação de busca:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na validação',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Validação para feedback de interação
export const validateFeedback = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      interaction_id, 
      was_helpful, 
      feedback, 
      escalated_to_human = false 
    } = req.body;

    const errors: string[] = [];

    if (!interaction_id || typeof interaction_id !== 'string') {
      errors.push('interaction_id é obrigatório');
    }

    if (typeof was_helpful !== 'boolean') {
      errors.push('was_helpful deve ser true ou false');
    }

    if (feedback && (typeof feedback !== 'string' || feedback.trim().length < 3)) {
      errors.push('feedback deve ter pelo menos 3 caracteres se fornecido');
    }

    if (typeof escalated_to_human !== 'boolean') {
      errors.push('escalated_to_human deve ser true ou false');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados de feedback inválidos',
        errors: errors
      });
    }

    req.body = {
      interaction_id: interaction_id.trim(),
      was_helpful,
      feedback: feedback?.trim() || null,
      escalated_to_human
    };

    next();

  } catch (error) {
    console.error('[Validation] Erro na validação de feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na validação',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Validação para importação em massa
export const validateBulkImport = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { solutions } = req.body;

    if (!Array.isArray(solutions) || solutions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Array de soluções é obrigatório e deve conter pelo menos um item'
      });
    }

    if (solutions.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Máximo de 100 soluções por vez para evitar timeout'
      });
    }

    // Validação básica de cada solução
    const errors: string[] = [];
    solutions.forEach((solution, index) => {
      if (!solution.problem_tag || typeof solution.problem_tag !== 'string') {
        errors.push(`Solução ${index + 1}: problem_tag é obrigatório`);
      }
      if (!solution.title || typeof solution.title !== 'string') {
        errors.push(`Solução ${index + 1}: title é obrigatório`);
      }
      if (!solution.problem_description || typeof solution.problem_description !== 'string') {
        errors.push(`Solução ${index + 1}: problem_description é obrigatório`);
      }
      if (!solution.content || typeof solution.content !== 'string') {
        errors.push(`Solução ${index + 1}: content é obrigatório`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Erros nos dados das soluções',
        errors: errors.slice(0, 10) // Limitar número de erros mostrados
      });
    }

    next();

  } catch (error: any) {
    console.error('[Validation] Erro na validação em massa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na validação',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Validação para atualização de solução
export const validateSolutionUpdate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      introduction,
      problem_description,
      content,
      procedures,
      resources,
      closing_message,
      next_steps,
      tools_required,
      keywords,
      tags,
      category,
      subcategory,
      difficulty,
      estimated_time_minutes,
      approval_status
    } = req.body;

    const errors: string[] = [];

    // Para update, os campos são opcionais, mas se fornecidos devem ser válidos
    if (title !== undefined && (typeof title !== 'string' || title.trim().length < 3)) {
      errors.push('title deve ter pelo menos 3 caracteres se fornecido');
    }

    if (problem_description !== undefined && (typeof problem_description !== 'string' || problem_description.trim().length < 10)) {
      errors.push('problem_description deve ter pelo menos 10 caracteres se fornecido');
    }

    if (content !== undefined && (typeof content !== 'string' || content.trim().length < 10)) {
      errors.push('content deve ter pelo menos 10 caracteres se fornecido');
    }

    if (difficulty !== undefined && (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5)) {
      errors.push('difficulty deve ser um número inteiro entre 1 e 5');
    }

    if (estimated_time_minutes !== undefined && (!Number.isInteger(estimated_time_minutes) || estimated_time_minutes < 1)) {
      errors.push('estimated_time_minutes deve ser um número inteiro positivo');
    }

    if (approval_status !== undefined && !['draft', 'review', 'approved', 'deprecated'].includes(approval_status)) {
      errors.push('approval_status deve ser: draft, review, approved ou deprecated');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados de atualização inválidos',
        errors: errors
      });
    }

    // Limpar dados fornecidos
    const cleanedBody: any = {};

    if (title !== undefined) cleanedBody.title = title.trim();
    if (introduction !== undefined) cleanedBody.introduction = introduction?.trim() || null;
    if (problem_description !== undefined) cleanedBody.problem_description = problem_description.trim();
    if (content !== undefined) cleanedBody.content = content.trim();
    if (procedures !== undefined) cleanedBody.procedures = procedures;
    if (resources !== undefined) cleanedBody.resources = resources;
    if (closing_message !== undefined) cleanedBody.closing_message = closing_message?.trim() || null;
    if (next_steps !== undefined) cleanedBody.next_steps = next_steps;
    if (tools_required !== undefined) cleanedBody.tools_required = tools_required;
    if (keywords !== undefined) cleanedBody.keywords = keywords;
    if (tags !== undefined) cleanedBody.tags = tags;
    if (category !== undefined) cleanedBody.category = category?.trim() || null;
    if (subcategory !== undefined) cleanedBody.subcategory = subcategory?.trim() || null;
    if (difficulty !== undefined) cleanedBody.difficulty = difficulty;
    if (estimated_time_minutes !== undefined) cleanedBody.estimated_time_minutes = estimated_time_minutes;
    if (approval_status !== undefined) cleanedBody.approval_status = approval_status;

    req.body = cleanedBody;
    next();

  } catch (error) {
    console.error('[Validation] Erro na validação de atualização:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na validação',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Função auxiliar para validar URLs
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Middleware para logging de requests
export const logRequest = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url, ip } = req;
  
  console.log(`[API] ${method} ${url} - IP: ${ip}`);
  
  // Override do método res.json para capturar response
  const originalJson = res.json.bind(res);
  res.json = function(data: any) {
    const duration = Date.now() - start;
    console.log(`[API] ${method} ${url} - ${res.statusCode} - ${duration}ms`);
    return originalJson(data);
  };
  
  next();
};

// Middleware para tratamento de erros globais
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[API] Erro não tratado:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });

  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
  });
};

// Middleware para validar UUID
export const validateUUID = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID deve ser um UUID válido'
    });
  }
  
  next();
};

// Middleware para paginação
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  if (page < 1) {
    return res.status(400).json({
      success: false,
      message: 'Página deve ser maior que 0'
    });
  }
  
  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limit deve ser entre 1 e 100'
    });
  }
  
  req.pagination = { page, limit, offset: (page - 1) * limit };
  next();
};

// Declaração de tipos para req.pagination
declare global {
  namespace Express {
    interface Request {
      pagination?: {
        page: number;
        limit: number;
        offset: number;
      };
    }
  }
}