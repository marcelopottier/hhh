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
}

interface SearchOptions {
  similarity_threshold?: number;
  max_results?: number;
  filter_category?: string;
  filter_problem_tag?: string;
  filter_difficulty?: number;
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
      embedding_types = ['full_content', 'keywords', 'title', 'problem_description']
    } = options;

    try {
      // Criar embedding da query
      const queryEmbedding = await this.createEmbedding(query);
      if (!queryEmbedding) {
        throw new Error('Falha ao criar embedding da query');
      }

      // Buscar no banco usando função SQL
      const results = await this.pool.query(`
        SELECT * FROM semantic_search(
          $1::vector, 
          $2::text[], 
          $3::decimal, 
          $4::integer, 
          $5::text, 
          $6::text,
          $7::integer
        )
      `, [
        `[${queryEmbedding.join(',')}]`,
        embedding_types,
        similarity_threshold,
        max_results,
        filter_category,
        filter_problem_tag,
        filter_difficulty
      ]);

      return results.rows.map(row => ({
        id: row.solution_id,
        problem_tag: row.problem_tag,
        step: row.step,
        title: row.title,
        content: row.content,
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
}