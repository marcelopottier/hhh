import { Pool } from 'pg';
import { createHash } from 'crypto';

// Interfaces
interface SolutionResult {
  // Identificação
  id: string;                       // UUID da solução
  problem_tag: string;              // Tag identificadora do problema
  step: number;                     // Número da etapa

  // Conteúdo principal
  title: string;                    // Título da solução
  introduction?: string;            // Texto de introdução
  problem_description?: string;     // Descrição do problema
  content: string;                  // Conteúdo completo da solução
  closing_message?: string;         // Mensagem de encerramento

  // Estruturas complexas (JSONB)
  procedures?: SolutionProcedure[]; // Array de procedimentos estruturados
  resources?: SolutionResource[];   // Array de recursos de apoio

  // Metadados de fluxo
  next_steps?: string[];            // Próximos passos possíveis
  tools_required?: string[];        // Ferramentas necessárias
  keywords?: string[];              // Palavras-chave para busca
  tags?: string[];                  // Tags de categorização

  // Classificação e organização
  category?: string;                // Categoria principal
  subcategory?: string;             // Subcategoria
  difficulty?: 1 | 2 | 3 | 4 | 5;  // Nível de dificuldade
  estimated_time_minutes?: number;  // Tempo total estimado

  // Metadados de busca e qualidade
  similarity_score: number;         // Score de similaridade (0-1)
  approval_status?: 'draft' | 'review' | 'approved' | 'deprecated';
  is_active?: boolean;             // Se a solução está ativa
  usage_count?: number;            // Quantas vezes foi usada
  success_rate?: number;           // Taxa de sucesso (0-100)

  // Auditoria
  created_at?: Date;               // Data de criação
  updated_at?: Date;               // Data de atualização
  created_by?: string;             // Quem criou
  updated_by?: string;             // Quem atualizou
}

interface SolutionProcedure {
  order: number;                    // Ordem do procedimento (1, 2, 3...)
  category: string;                 // Categoria: 'memory', 'power', 'display', 'bios', etc.
  instruction: string;              // Instrução detalhada do procedimento
  type?: 'acao' | 'verificacao' | 'observacao' | 'aviso' | 'preparacao' | 'finalizacao' | 'localizacao';
  safety_warning?: string;          // Aviso de segurança se necessário
  estimated_minutes?: number;       // Tempo estimado em minutos
  tools_needed?: string[];          // Ferramentas específicas para este passo
  expected_result?: string;         // Resultado esperado após execução
}

/**
 * Interface para recursos de apoio (vídeos, links, documentos)
 */
interface SolutionResource {
  type: 'video' | 'image' | 'link' | 'document' | 'software' | 'guide';
  title: string;                    // Título do recurso
  url?: string;                     // URL do recurso
  description?: string;             // Descrição detalhada
  category?: string;                // Categoria do recurso
  duration_seconds?: number;        // Duração em segundos (para vídeos)
  file_size?: string;              // Tamanho do arquivo
  language?: string;               // Idioma do recurso
}

interface SearchOptions {
  similarity_threshold?: number;
  max_results?: number;
  filter_category?: string;
  filter_problem_tag?: string;
  filter_difficulty?: number;
  embedding_types?: string[];
}

interface CachedSearchResult {
  query_hash: string;
  results: SolutionResult[];
  created_at: Date;
}

// Classe principal para serviços de embedding
export class EmbeddingService {
  private pool: Pool;
  private openaiApiKey: string;

  constructor(pool: Pool, openaiApiKey: string) {
    this.pool = pool;
    this.openaiApiKey = openaiApiKey;
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
    
    // Acessar o embedding corretamente
    if (data.data && data.data.length > 0 && data.data[0].embedding) {
      return data.data[0].embedding;
    } else {
      throw new Error('Estrutura de resposta inesperada da API OpenAI');
    }
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
      // Verificar cache primeiro
      const cachedResult = await this.getCachedSearch(query);
      if (cachedResult) {
        console.log('🚀 Resultado encontrado no cache');
        return cachedResult.results.slice(0, max_results);
      }

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

      const solutions: SolutionResult[] = results.rows.map(row => ({
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

      // Armazenar no cache
      await this.cacheSearchResult(query, solutions);
      
      return solutions;

    } catch (error) {
      console.error('Erro na busca semântica:', error);
      return [];
    }
  }

  // Busca híbrida (semântica + texto)
  async buscarHibrido(
    query: string,
    options: SearchOptions = {}
  ): Promise<SolutionResult[]> {
    const {
      similarity_threshold = 0.7,
      max_results = 5
    } = options;

    try {
      // Criar embedding da query
      const queryEmbedding = await this.createEmbedding(query);

      // Usar função híbrida (compatibilidade com estrutura antiga)
      const results = await this.pool.query(`
        SELECT 
          s.id::text,
          s.problem_tag,
          s.step,
          s.title,
          s.problem_description,
          s.content,
          CASE 
            WHEN $2::vector IS NOT NULL THEN 
              (1 - (e.embedding <=> $2::vector))::FLOAT
            ELSE 0.0
          END as similarity_score,
          s.category,
          s.tags
        FROM support_solutions s
        LEFT JOIN solution_embeddings e ON s.id = e.solution_id 
          AND e.embedding_type = 'full_content'
        WHERE 
          s.approval_status = 'approved'
          AND s.is_active = true
          AND (
            -- Busca vetorial (se embedding fornecido)
            ($2::vector IS NOT NULL AND 
             (1 - (e.embedding <=> $2::vector)) > $3)
            OR
            -- Busca por texto em palavras-chave e tags
            (EXISTS(
              SELECT 1 FROM unnest(s.keywords) keyword 
              WHERE $1 ILIKE '%' || keyword || '%'
            ))
            OR
            (s.tags && string_to_array(lower($1), ' '))
            OR
            -- Busca full-text na descrição do problema
            (to_tsvector('portuguese', COALESCE(s.problem_description, '')) @@ 
             plainto_tsquery('portuguese', $1))
            OR
            -- Busca full-text no conteúdo
            (to_tsvector('portuguese', s.content) @@ 
             plainto_tsquery('portuguese', $1))
            OR
            -- Busca no título
            (s.title ILIKE '%' || $1 || '%')
          )
        ORDER BY similarity_score DESC
        LIMIT $4
      `, [
        query,
        queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
        similarity_threshold,
        max_results
      ]);

      return results.rows.map(row => ({
        id: row.id,
        problem_tag: row.problem_tag,
        step: row.step,
        title: row.title,
        content: row.content,
        similarity_score: parseFloat(row.similarity_score || 0),
        category: row.category,
        tags: row.tags
      }));

    } catch (error) {
      console.error('Erro na busca híbrida:', error);
      return [];
    }
  }

  // Obter solução completa por ID
  async obterSolucaoCompleta(solutionId: string): Promise<any | null> {
    try {
      const result = await this.pool.query(`
        SELECT * FROM get_complete_solution($1::uuid)
      `, [solutionId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Erro ao obter solução completa:', error);
      return null;
    }
  }

  // Buscar por tag e step específicos
  async buscarPorTagStep(problemTag: string, step: number = 1): Promise<any | null> {
    try {
      const result = await this.pool.query(`
        SELECT * FROM get_solution_by_tag_step($1, $2)
      `, [problemTag, step]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Erro ao buscar por tag/step:', error);
      return null;
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
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        solutionId,
        userQuery,
        createHash('sha256').update(userQuery).digest('hex'),
        similarityScore,
        sessionId,
        userId
      ]);

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

  // Atualizar feedback da interação
  async atualizarFeedback(
    interactionId: string,
    wasHelpful: boolean,
    feedback?: string,
    escalated: boolean = false
  ): Promise<boolean> {
    try {
      await this.pool.query(`
        UPDATE solution_interactions 
        SET was_helpful = $1, user_feedback = $2, escalated_to_human = $3
        WHERE id = $4
      `, [wasHelpful, feedback, escalated, interactionId]);

      return true;
    } catch (error) {
      console.error('Erro ao atualizar feedback:', error);
      return false;
    }
  }

  // Verificar cache de busca
  private async getCachedSearch(query: string): Promise<CachedSearchResult | null> {
    try {
      const queryHash = createHash('sha256').update(query.toLowerCase().trim()).digest('hex');
      
      const result = await this.pool.query(`
        SELECT results, created_at FROM search_cache 
        WHERE query_hash = $1 AND expires_at > NOW()
      `, [queryHash]);

      if (result.rows.length > 0) {
        // Atualizar hit count
        await this.pool.query(`
          UPDATE search_cache 
          SET hit_count = hit_count + 1, last_hit_at = NOW()
          WHERE query_hash = $1
        `, [queryHash]);

        return {
          query_hash: queryHash,
          results: result.rows[0].results,
          created_at: result.rows[0].created_at
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar cache:', error);
      return null;
    }
  }

  // Armazenar resultado no cache
  private async cacheSearchResult(query: string, results: SolutionResult[]): Promise<void> {
    try {
      const queryHash = createHash('sha256').update(query.toLowerCase().trim()).digest('hex');
      const queryNormalized = query.toLowerCase().trim();

      await this.pool.query(`
        INSERT INTO search_cache (
          query_normalized, query_hash, results, embedding_model
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (query_hash) DO UPDATE SET
          results = EXCLUDED.results,
          hit_count = search_cache.hit_count + 1,
          last_hit_at = NOW(),
          expires_at = NOW() + INTERVAL '24 hours'
      `, [
        queryNormalized,
        queryHash,
        JSON.stringify(results),
        'text-embedding-3-small'
      ]);
    } catch (error) {
      console.error('Erro ao armazenar no cache:', error);
    }
  }

  // Limpar cache expirado
  async limparCacheExpirado(): Promise<number> {
    try {
      const result = await this.pool.query(`
        DELETE FROM search_cache WHERE expires_at < NOW()
      `);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      return 0;
    }
  }

  // Obter estatísticas de uso
  async obterEstatisticas(
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias atrás
      const end = endDate || new Date();

      const result = await this.pool.query(`
        SELECT * FROM get_usage_stats($1, $2)
      `, [start, end]);

      return result.rows;
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return [];
    }
  }

  // Encontrar soluções que precisam de reembedding
  async encontrarSolucoesParaReembedding(): Promise<any[]> {
    try {
      const result = await this.pool.query(`
        SELECT * FROM find_solutions_needing_reembedding()
      `);

      return result.rows;
    } catch (error) {
      console.error('Erro ao encontrar soluções para reembedding:', error);
      return [];
    }
  }

  // Verificar saúde do sistema
  async verificarSaudeDoSistema(): Promise<any[]> {
    try {
      const result = await this.pool.query(`
        SELECT * FROM check_system_health()
      `);

      return result.rows;
    } catch (error) {
      console.error('Erro ao verificar saúde do sistema:', error);
      return [];
    }
  }
}

// Funções de conveniência (compatibilidade com código existente)

// Instância global do serviço (será inicializada quando necessário)
let globalService: EmbeddingService | null = null;

function getService(pool: Pool): EmbeddingService {
  if (!globalService) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não encontrada no ambiente');
    }
    globalService = new EmbeddingService(pool, apiKey);
  }
  return globalService;
}

// Função de compatibilidade com código existente
export async function buscarProcedimentosSimilares(
  query: string,
  tipo: 'semantica' | 'hibrida' | 'texto' = 'hibrida',
  pool: Pool,
  maxResults: number = 5
): Promise<any[]> {
  const service = getService(pool);
  
  const options: SearchOptions = {
    max_results: maxResults,
    similarity_threshold: 0.7
  };

  try {
    let results: SolutionResult[] = [];

    switch (tipo) {
      case 'semantica':
        results = await service.buscarSolucoesSimilares(query, options);
        break;
      case 'hibrida':
        results = await service.buscarHibrido(query, options);
        break;
      case 'texto':
        // Busca apenas textual (sem embeddings)
        results = await service.buscarHibrido(query, { 
          ...options, 
          similarity_threshold: 0 
        });
        break;
    }

    // Converter para formato esperado pelo código existente
    return results.map(result => ({
      id: parseInt(result.id) || 0, // Converter UUID para number para compatibilidade
      titulo: result.title,
      descricao_problema: result.content,
      solucao_completa: result.content,
      score_final: result.similarity_score,
      metodo: tipo,
      similarity_score: result.similarity_score,
      categoria: result.category,
      tags: result.tags,
      // Novos campos
      problem_tag: result.problem_tag,
      step: result.step,
      procedures: result.procedures,
      resources: result.resources,
      difficulty: result.difficulty,
      estimated_time_minutes: result.estimated_time_minutes
    }));

  } catch (error) {
    console.error('Erro na busca de procedimentos:', error);
    return [];
  }
}

// Função de compatibilidade para processar procedimento
export async function processarProcedimentoPichau(
  procedimentoId: number,
  textoCompleto: string,
  pool: Pool
): Promise<boolean> {
  console.log('⚠️  Função processarProcedimentoPichau está deprecated.');
  console.log('   Use o novo script de população de embeddings.');
  console.log('   A estrutura antiga não é mais suportada.');
  
  // Para compatibilidade, retorna true mas não faz nada
  return true;
}

// Função para migrar dados da estrutura antiga para nova
export async function migrarEstrutulaAntiga(pool: Pool): Promise<boolean> {
  console.log('🔄 Iniciando migração da estrutura antiga...');
  
  try {
    // Verificar se a estrutura antiga existe
    const tabelasAntigas = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('procedimentos', 'categorias_problema', 'passos_procedimento', 'recursos_apoio')
    `);

    if (tabelasAntigas.rows.length === 0) {
      console.log('✅ Estrutura antiga não encontrada, migração desnecessária');
      return true;
    }

    console.log(`📋 Encontradas ${tabelasAntigas.rows.length} tabelas antigas para migrar`);

    // Migrar categorias para tags/categorias
    const procedimentosAntigos = await pool.query(`
      SELECT 
        p.id,
        p.titulo,
        p.descricao_problema,
        p.solucao_completa,
        p.palavras_chave,
        p.tags,
        p.dificuldade,
        p.tempo_estimado,
        c.nome as categoria_nome
      FROM procedimentos p
      LEFT JOIN categorias_problema c ON p.categoria_id = c.id
      WHERE p.ativo = true
    `);

    console.log(`📊 Migrando ${procedimentosAntigos.rows.length} procedimentos...`);

    for (const proc of procedimentosAntigos.rows) {
      // Criar problem_tag baseado no título
      const problemTag = proc.titulo
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);

      // Inserir na nova estrutura
      await pool.query(`
        INSERT INTO support_solutions (
          problem_tag, step, title, problem_description, content,
          keywords, tags, category, difficulty, estimated_time_minutes,
          created_by, approval_status, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (problem_tag, step) DO NOTHING
      `, [
        problemTag,
        1, // step padrão
        proc.titulo,
        proc.descricao_problema,
        proc.solucao_completa,
        proc.palavras_chave || [],
        proc.tags || [],
        proc.categoria_nome || 'geral',
        proc.dificuldade || 3,
        proc.tempo_estimado || 30,
        'migration',
        'approved',
        true
      ]);
    }

    console.log('✅ Migração concluída com sucesso');
    console.log('💡 Execute o script de população de embeddings para completar a migração');
    
    return true;
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return false;
  }
}

// Exportações principais
export {
  SolutionResult,
  SearchOptions
};