import { OpenAIEmbeddings } from '@langchain/openai';
import pgvector from 'pgvector';
import { queryWithRetry } from '../config/database';

interface ProcedureResult {
  id: number;
  titulo: string;
  descricao_problema: string;
  solucao_completa: string;
  similarity_score: number;
  categoria: string;
  tags: string[];
  passos?: any[];
}

class VectorStoreService {
  private embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
  });

  public async embeddedQuery(query: string): Promise<number[]> {
    return await this.embeddings.embedQuery(query);
  }

  private async queryDatabase(sql: string, params: any[] = []): Promise<any[]> {
    try {
      const result = await queryWithRetry(sql, params);
      return result.rows;
    } catch (error) {
      console.error('[VECTOR STORE] Erro na query:', error);
      if (error instanceof Error) {
        throw new Error(`Erro na busca: ${error.message}`);
      } else {
        throw new Error('Erro na busca: erro desconhecido');
      }
    }
  }

  public async retrieveProcedures(query: string): Promise<ProcedureResult[]> {
    const embedding = await this.embeddedQuery(query);
    const queryVector = pgvector.toSql(embedding);
    
    const procedures = await this.queryDatabase(`
      SELECT 
        p.id,
        p.titulo,
        p.descricao_problema,
        p.solucao_completa,
        (1 - (p.embedding <=> $1::vector))::FLOAT as similarity_score,
        c.nome as categoria,
        p.tags,
        -- Buscar os passos do procedimento
        COALESCE(
          array_agg(
            json_build_object(
              'numero', pp.numero_passo,
              'titulo', pp.titulo_passo,
              'descricao', pp.descricao_passo,
              'tipo', pp.tipo_passo,
              'obrigatorio', pp.obrigatorio
            ) ORDER BY pp.numero_passo
          ) FILTER (WHERE pp.id IS NOT NULL),
          ARRAY[]::json[]
        ) as passos
      FROM procedimentos p
      LEFT JOIN categorias_problema c ON p.categoria_id = c.id
      LEFT JOIN passos_procedimento pp ON p.id = pp.procedimento_id
      WHERE 
        p.ativo = TRUE
        AND (1 - (p.embedding <=> $1::vector)) > 0.7
      GROUP BY p.id, p.titulo, p.descricao_problema, p.solucao_completa, 
               c.nome, p.tags, p.embedding
      ORDER BY similarity_score DESC
      LIMIT 3;
    `, [queryVector]);
    
    return procedures;
  }

  public async searchProceduresHybrid(query: string): Promise<ProcedureResult[]> {
    const embedding = await this.embeddedQuery(query);
    const queryVector = pgvector.toSql(embedding);
    
    // Buscar procedimentos com threshold baixo já que os embeddings parecem ser de modelo diferente
    const procedures = await this.queryDatabase(`
      SELECT 
        p.id,
        p.titulo,
        p.descricao_problema,
        p.solucao_completa,
        (1 - (p.embedding <=> $1::vector))::FLOAT as similarity_score,
        c.nome as categoria,
        p.tags
      FROM procedimentos p
      LEFT JOIN categorias_problema c ON p.categoria_id = c.id
      WHERE 
        p.ativo = TRUE
        AND p.embedding IS NOT NULL
        AND (1 - (p.embedding <=> $1::vector)) > 0.005
      ORDER BY similarity_score DESC
      LIMIT 3
    `, [queryVector]);
    
    // Buscar passos para cada procedimento
    for (const proc of procedures) {
      const passos = await this.queryDatabase(`
        SELECT 
          numero_passo,
          titulo_passo,
          descricao_passo,
          tipo_passo,
          obrigatorio
        FROM passos_procedimento
        WHERE procedimento_id = $1
        ORDER BY numero_passo
      `, [proc.id]);
      
      proc.passos = passos;
    }
    
    return procedures;
  }
}

export default new VectorStoreService();