import { Pool } from 'pg';
import db from '../config/database';

interface SolutionResult {
  id: string;
  problem_tag: string;
  step: number;
  title: string;
  content: string;
  similarity_score: number;
  category?: string;
  difficulty?: number;
  estimated_time_minutes?: number;
  procedures?: any[];
  resources?: any[];
  keywords?: string[];
  tags?: string[];
  introduction?: string;
  problem_description?: string;
  closing_message?: string;
}

interface SearchOptions {
  similarity_threshold?: number;
  max_results?: number;
  filter_category?: string;
  filter_problem_tag?: string;
  filter_difficulty?: number;
  filter_step?: number;
  embedding_types?: string[];
}

export class EmbeddingService {
  private static instance: EmbeddingService;
  private pool: Pool;
  private openaiApiKey: string;

  private constructor() {
    this.pool = db.getPool();
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY não encontrada');
    }
  }

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  // Criar embedding usando OpenAI
  async createEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API Error: ${response.status} - ${error}`);
      }

      const data = await response.json() as { data: { embedding: number[] }[] };
      return data.data[0].embedding;
      
    } catch (error) {
      console.error('Erro ao criar embedding:', error);
      return null;
    }
  }

  // Busca semântica principal
  async buscarSolucoesSimilares(
    query: string,
    options: SearchOptions = {}
  ): Promise<SolutionResult[]> {
    const {
      similarity_threshold = 0.7,
      max_results = 5,
      filter_category,
      filter_problem_tag,
      filter_difficulty,
      filter_step,
      embedding_types = ['full_content', 'keywords', 'title', 'problem_description']
    } = options;

    try {
      // Criar embedding da query
      const queryEmbedding = await this.createEmbedding(query);
      if (!queryEmbedding) {
        throw new Error('Falha ao criar embedding da query');
      }

      // Construir query SQL com filtros
      let whereConditions = [
        's.approval_status = $3',
        's.is_active = $4',
        'e.embedding_type = ANY($5)',
        '(1 - (e.embedding <=> $1::vector)) >= $2'
      ];
      
      let params: any[] = [
        `[${queryEmbedding.join(',')}]`,
        similarity_threshold,
        'approved',
        true,
        embedding_types
      ];
      
      let paramIndex = 6;
      
      if (filter_category) {
        whereConditions.push(`s.category = $${paramIndex}`);
        params.push(filter_category);
        paramIndex++;
      }
      
      if (filter_problem_tag) {
        whereConditions.push(`s.problem_tag = $${paramIndex}`);
        params.push(filter_problem_tag);
        paramIndex++;
      }
      
      if (filter_difficulty) {
        whereConditions.push(`s.difficulty = $${paramIndex}`);
        params.push(filter_difficulty);
        paramIndex++;
      }
      
      if (filter_step) {
        whereConditions.push(`s.step = $${paramIndex}`);
        params.push(filter_step);
        paramIndex++;
      }

      const query_sql = `
        SELECT DISTINCT
          s.id,
          s.problem_tag,
          s.step,
          s.title,
          s.introduction,
          s.problem_description,
          s.content,
          s.closing_message,
          (1 - (e.embedding <=> $1::vector))::DECIMAL as similarity_score,
          s.category,
          s.difficulty,
          s.estimated_time_minutes,
          s.procedures,
          s.resources,
          s.keywords,
          s.tags
        FROM support_solutions s
        JOIN solution_embeddings e ON s.id = e.solution_id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY similarity_score DESC
        LIMIT ${max_results}
      `;

      const results = await this.pool.query(query_sql, params);

      return results.rows.map(row => ({
        id: row.id,
        problem_tag: row.problem_tag,
        step: row.step,
        title: row.title,
        introduction: row.introduction,
        problem_description: row.problem_description,
        content: row.content,
        closing_message: row.closing_message,
        similarity_score: parseFloat(row.similarity_score),
        category: row.category,
        difficulty: row.difficulty,
        estimated_time_minutes: row.estimated_time_minutes,
        procedures: row.procedures,
        resources: row.resources,
        keywords: row.keywords,
        tags: row.tags
      }));

    } catch (error) {
      console.error('Erro na busca semântica:', error);
      return [];
    }
  }

  // NOVA: Buscar step específico de um problema já identificado
  async buscarSolucoesPorStep(
    problemTag: string,
    step: number
  ): Promise<SolutionResult[]> {
    console.log(`[EMBEDDING] Buscando ${problemTag} step ${step}`);
    
    try {
      const query = `
        SELECT 
          s.id,
          s.problem_tag,
          s.step,
          s.title,
          s.introduction,
          s.problem_description,
          s.content,
          s.closing_message,
          1.0 as similarity_score,
          s.category,
          s.difficulty,
          s.estimated_time_minutes,
          s.procedures,
          s.resources,
          s.keywords,
          s.tags
        FROM support_solutions s
        WHERE 
          s.problem_tag = $1 
          AND s.step = $2
          AND s.approval_status = 'approved' 
          AND s.is_active = true
        ORDER BY s.step
      `;

      const results = await this.pool.query(query, [problemTag, step]);
      
      console.log(`[EMBEDDING] Encontrados ${results.rows.length} resultados para ${problemTag} step ${step}`);

      return results.rows.map(row => ({
        id: row.id,
        problem_tag: row.problem_tag,
        step: row.step,
        title: row.title,
        introduction: row.introduction,
        problem_description: row.problem_description,
        content: row.content,
        closing_message: row.closing_message,
        similarity_score: parseFloat(row.similarity_score),
        category: row.category,
        difficulty: row.difficulty,
        estimated_time_minutes: row.estimated_time_minutes,
        procedures: row.procedures,
        resources: row.resources,
        keywords: row.keywords,
        tags: row.tags
      }));

    } catch (error) {
      console.error('Erro na busca por step:', error);
      return [];
    }
  }

  // NOVA: Verificar se existe próximo step
  async hasNextStep(problemTag: string, currentStep: number): Promise<boolean> {
    try {
      const nextStep = currentStep + 1;
      
      const result = await this.pool.query(`
        SELECT COUNT(*) as count 
        FROM support_solutions 
        WHERE 
          problem_tag = $1 
          AND step = $2
          AND approval_status = 'approved' 
          AND is_active = true
      `, [problemTag, nextStep]);

      const hasNext = parseInt(result.rows[0].count) > 0;
      
      console.log(`[EMBEDDING] Próximo step (${nextStep}) para ${problemTag}: ${hasNext ? 'Existe' : 'Não existe'}`);
      
      return hasNext;

    } catch (error) {
      console.error('Erro ao verificar próximo step:', error);
      return false;
    }
  }

  // NOVA: Obter todos os steps disponíveis para um problema
  async getAllStepsForProblem(problemTag: string): Promise<number[]> {
    try {
      const result = await this.pool.query(`
        SELECT DISTINCT step 
        FROM support_solutions 
        WHERE 
          problem_tag = $1
          AND approval_status = 'approved' 
          AND is_active = true
        ORDER BY step
      `, [problemTag]);

      return result.rows.map(row => row.step);

    } catch (error) {
      console.error('Erro ao obter steps:', error);
      return [];
    }
  }

  // NOVA: Buscar últimos steps tentados para uma tag de problema
  async getLastAttemptedStep(problemTag: string): Promise<number> {
    try {
      const result = await this.pool.query(`
        SELECT MAX(step) as max_step 
        FROM support_solutions 
        WHERE 
          problem_tag = $1
          AND approval_status = 'approved' 
          AND is_active = true
      `, [problemTag]);

      return result.rows[0].max_step || 1;

    } catch (error) {
      console.error('Erro ao obter último step:', error);
      return 1;
    }
  }

  // NOVA: Verificar se acabaram os steps para um problema
  async isEndOfProcedure(problemTag: string, currentStep: number): Promise<boolean> {
    const lastStep = await this.getLastAttemptedStep(problemTag);
    return currentStep >= lastStep;
  }

  // Registrar interação do usuário
  async registrarInteracao(
    solutionId: string,
    userQuery: string,
    similarityScore: number,
    sessionId?: string,
    userId?: string
  ): Promise<string | null> {
    try {
      const result = await this.pool.query(`
        INSERT INTO solution_interactions (
          solution_id, user_query, user_query_hash, similarity_score,
          session_id, user_id
        ) VALUES ($1, $2, encode(digest($2, 'sha256'), 'hex'), $3, $4, $5)
        RETURNING id
      `, [solutionId, userQuery, similarityScore, sessionId, userId]);

      // Incrementar contador de uso
      await this.pool.query(`
        UPDATE support_solutions 
        SET usage_count = usage_count + 1 
        WHERE id = $1
      `, [solutionId]);

      return result.rows[0].id;
    } catch (error) {
      console.error('Erro ao registrar interação:', error);
      return null;
    }
  }

  // NOVA: Analisar feedback do cliente para determinar se foi positivo ou negativo
  async analyzeCustomerFeedback(feedback: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    keywords: string[];
  }> {
    const feedbackLower = feedback.toLowerCase();
    
    const positiveKeywords = [
      'funcionou', 'resolveu', 'deu certo', 'consegui', 'obrigado', 'obrigada',
      'perfeito', 'excelente', 'ótimo', 'sucesso', 'resolvido', 'solucionou'
    ];
    
    const negativeKeywords = [
      'não funcionou', 'não deu certo', 'não resolveu', 'ainda', 'continua',
      'persiste', 'mesmo problema', 'não consegui', 'erro', 'falhou'
    ];
    
    const neutralKeywords = [
      'tentei', 'testei', 'fiz', 'executei', 'segui', 'como', 'onde', 'quando'
    ];
    
    let positiveScore = 0;
    let negativeScore = 0;
    let neutralScore = 0;
    
    const foundKeywords: string[] = [];
    
    positiveKeywords.forEach(keyword => {
      if (feedbackLower.includes(keyword)) {
        positiveScore++;
        foundKeywords.push(keyword);
      }
    });
    
    negativeKeywords.forEach(keyword => {
      if (feedbackLower.includes(keyword)) {
        negativeScore++;
        foundKeywords.push(keyword);
      }
    });
    
    neutralKeywords.forEach(keyword => {
      if (feedbackLower.includes(keyword)) {
        neutralScore++;
        foundKeywords.push(keyword);
      }
    });
    
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let confidence = 0.5;
    
    if (positiveScore > negativeScore && positiveScore > neutralScore) {
      sentiment = 'positive';
      confidence = Math.min(0.9, 0.6 + (positiveScore * 0.1));
    } else if (negativeScore > positiveScore && negativeScore > neutralScore) {
      sentiment = 'negative';
      confidence = Math.min(0.9, 0.6 + (negativeScore * 0.1));
    } else {
      confidence = 0.4;
    }
    
    return {
      sentiment,
      confidence,
      keywords: foundKeywords
    };
  }

  // NOVA: Obter estatísticas de uso das soluções
  async getSolutionStats(problemTag?: string): Promise<any> {
    try {
      let query = `
        SELECT 
          s.problem_tag,
          s.step,
          s.title,
          s.usage_count,
          COUNT(si.id) as total_interactions,
          AVG(si.similarity_score) as avg_similarity,
          COUNT(CASE WHEN si.was_helpful = true THEN 1 END) as helpful_count,
          s.created_at
        FROM support_solutions s
        LEFT JOIN solution_interactions si ON s.id = si.solution_id
        WHERE s.approval_status = 'approved' AND s.is_active = true
      `;
      
      const params: any[] = [];
      
      if (problemTag) {
        query += ` AND s.problem_tag = $1`;
        params.push(problemTag);
      }
      
      query += `
        GROUP BY s.id, s.problem_tag, s.step, s.title, s.usage_count, s.created_at
        ORDER BY s.problem_tag, s.step
      `;
      
      const result = await this.pool.query(query, params);
      return result.rows;
      
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return [];
    }
  }
}