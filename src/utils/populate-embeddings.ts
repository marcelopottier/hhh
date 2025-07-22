#!/usr/bin/env node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Interface para tipagem
interface SolutionData {
  id: string;
  problem_tag: string;
  step: number;
  title: string;
  introduction?: string;
  problem_description?: string;
  content: string;
  procedures?: any;
  resources?: any;
  keywords?: string[];
  content_hash: string;
  created_by?: string;
}

interface EmbeddingResult {
  data: [
    {
      object: string;
      embedding: number[];
      index: number;
    }
  ]
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// Função para criar embedding usando OpenAI
async function createEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
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

    const data = await response.json() as EmbeddingResult;
    
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

// Verificar conexões
async function verificarConexoes(): Promise<boolean> {
  console.log('🔍 Verificando conexões...');
  
  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL conectado!');
    
    // Verificar extensão pgvector
    const vectorCheck = await pool.query(`
      SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector
    `);
    
    if (!vectorCheck.rows[0].has_vector) {
      throw new Error('Extensão pgvector não está instalada');
    }
    console.log('✅ pgvector disponível!');
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não encontrada no .env');
    }
    console.log('✅ OpenAI API configurada!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro na verificação:', error instanceof Error ? error.message : error);
    return false;
  }
}

// Verificar estrutura do banco
async function verificarEstruturaBanco(): Promise<boolean> {
  console.log('\n🔍 Verificando estrutura do banco...');
  
  try {
    const tabelas = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('support_solutions', 'solution_embeddings', 'solution_interactions', 'search_cache')
      ORDER BY table_name
    `);
    
    const tabelasEncontradas = tabelas.rows.map(r => r.table_name);
    console.log(`📋 Tabelas encontradas: ${tabelasEncontradas.join(', ')}`);
    
    // Verificar se tem as tabelas essenciais
    const tabelasEssenciais = ['support_solutions', 'solution_embeddings'];
    const temTodasTabelas = tabelasEssenciais.every(t => tabelasEncontradas.includes(t));
    
    if (!temTodasTabelas) {
      throw new Error('Tabelas essenciais não encontradas. Execute os scripts de inicialização primeiro.');
    }
    
    // Verificar dados com foco nos procedimentos Pichau
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_solutions,
        COUNT(CASE WHEN approval_status = 'approved' AND is_active = true THEN 1 END) as approved_solutions,
        COUNT(CASE WHEN created_by = 'pichau_official' THEN 1 END) as pichau_solutions
      FROM support_solutions
    `);
    
    const embeddingStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT e.solution_id) as solutions_with_embeddings,
        COUNT(*) as total_embeddings,
        COUNT(DISTINCT e.embedding_type) as embedding_types,
        COUNT(CASE WHEN s.created_by = 'pichau_official' THEN 1 END) as pichau_embeddings
      FROM solution_embeddings e
      LEFT JOIN support_solutions s ON e.solution_id = s.id
    `);
    
    const stat = stats.rows[0];
    const embStat = embeddingStats.rows[0];
    
    console.log(`📊 Soluções totais: ${stat.total_solutions}`);
    console.log(`📊 Soluções aprovadas: ${stat.approved_solutions}`);
    console.log(`🏷️  Soluções Pichau: ${stat.pichau_solutions}`);
    console.log(`📊 Soluções com embeddings: ${embStat.solutions_with_embeddings}`);
    console.log(`📊 Total de embeddings: ${embStat.total_embeddings}`);
    console.log(`🏷️  Embeddings Pichau: ${embStat.pichau_embeddings}`);
    console.log(`📊 Tipos de embedding: ${embStat.embedding_types}`);
    
    return parseInt(stat.total_solutions) > 0;
  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error instanceof Error ? error.message : error);
    return false;
  }
}

// Função para criar e armazenar embedding
async function createAndStoreEmbedding(
  solutionId: string, 
  embeddingType: string, 
  text: string, 
  contentHash: string
): Promise<boolean> {
  if (!text.trim()) {
    console.log(`⚠️  Texto vazio para ${embeddingType}, pulando...`);
    return true;
  }

  try {
    // Verificar se já existe
    const existing = await pool.query(`
      SELECT id FROM solution_embeddings 
      WHERE solution_id = $1 AND embedding_type = $2 AND content_hash = $3
    `, [solutionId, embeddingType, contentHash]);

    if (existing.rows.length > 0) {
      console.log(`⚡ Embedding ${embeddingType} já existe para esta versão`);
      return true;
    }

    // Criar embedding
    console.log(`🧠 Criando embedding ${embeddingType}... (${text.length} chars)`);
    const embedding = await createEmbedding(text);
    
    if (!embedding) {
      throw new Error(`Falha ao criar embedding para ${embeddingType}`);
    }

    // Armazenar no banco
    await pool.query(`
      INSERT INTO solution_embeddings (
        solution_id, embedding_type, content_hash, embedding_model,
        embedding, source_text, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (solution_id, embedding_type, content_hash) DO UPDATE SET
        embedding = EXCLUDED.embedding,
        source_text = EXCLUDED.source_text,
        updated_at = NOW()
    `, [
      solutionId,
      embeddingType,
      contentHash,
      'text-embedding-3-small',
      `[${embedding.join(',')}]`, // PostgreSQL format for vector
      text.substring(0, 5000), // Limitar tamanho do source_text
      JSON.stringify({ 
        length: text.length, 
        created_at: new Date().toISOString(),
        truncated: text.length > 5000 
      })
    ]);

    console.log(`✅ Embedding ${embeddingType} armazenado com sucesso`);
    return true;

  } catch (error) {
    console.error(`❌ Erro ao criar embedding ${embeddingType}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

// Popular embeddings para uma solução
async function processarSolucao(solution: SolutionData): Promise<boolean> {
  console.log(`\n📝 Processando: ${solution.title}`);
  console.log(`🏷️  Tag: ${solution.problem_tag}, Step: ${solution.step}`);
  if (solution.created_by) {
    console.log(`👤 Criado por: ${solution.created_by}`);
  }

  try {
    const tasks: Promise<boolean>[] = [];

    // 1. Embedding do conteúdo completo
    tasks.push(createAndStoreEmbedding(
      solution.id, 
      'full_content', 
      solution.content, 
      solution.content_hash
    ));

    // 2. Embedding do título
    tasks.push(createAndStoreEmbedding(
      solution.id, 
      'title', 
      solution.title, 
      solution.content_hash
    ));

    // 3. Embedding da descrição do problema (se existir)
    if (solution.problem_description) {
      tasks.push(createAndStoreEmbedding(
        solution.id, 
        'problem_description', 
        solution.problem_description, 
        solution.content_hash
      ));
    }

    // 4. Embedding das palavras-chave (se existirem)
    if (solution.keywords && solution.keywords.length > 0) {
      const keywordsText = solution.keywords.join(' ');
      tasks.push(createAndStoreEmbedding(
        solution.id, 
        'keywords', 
        keywordsText, 
        solution.content_hash
      ));
    }

    // 5. Embedding dos procedimentos (se existirem) - MELHORADO
    if (solution.procedures) {
      let proceduresText = '';
      
      try {
        // Se procedures é string, fazer parse
        let proceduresArray = solution.procedures;
        if (typeof solution.procedures === 'string') {
          proceduresArray = JSON.parse(solution.procedures);
        }
        
        if (Array.isArray(proceduresArray)) {
          proceduresText = proceduresArray
            .map((proc: any) => {
              const parts = [];
              if (proc.instruction) parts.push(proc.instruction);
              if (proc.safety_warning) parts.push(`ATENÇÃO: ${proc.safety_warning}`);
              if (proc.category) parts.push(`Categoria: ${proc.category}`);
              return parts.join(' ');
            })
            .filter(Boolean)
            .join(' ');
        }
      } catch (error) {
        console.log(`⚠️  Erro ao processar procedures: ${error}`);
      }
      
      if (proceduresText.trim()) {
        tasks.push(createAndStoreEmbedding(
          solution.id, 
          'procedures', 
          proceduresText, 
          solution.content_hash
        ));
      }
    }

    // 6. Embedding da introdução (se existir)
    if (solution.introduction) {
      tasks.push(createAndStoreEmbedding(
        solution.id, 
        'introduction', 
        solution.introduction, 
        solution.content_hash
      ));
    }

    // 7. Embedding combinado para busca geral
    const combinedText = [
      solution.title,
      solution.problem_description,
      solution.introduction,
      solution.content,
      solution.keywords?.join(' ')
    ].filter(Boolean).join(' ');

    if (combinedText.trim()) {
      tasks.push(createAndStoreEmbedding(
        solution.id, 
        'combined', 
        combinedText, 
        solution.content_hash
      ));
    }

    // Executar todas as tarefas
    const results = await Promise.all(tasks);
    const sucessos = results.filter(Boolean).length;
    const total = results.length;

    console.log(`📊 Embeddings criados: ${sucessos}/${total}`);
    return sucessos === total;

  } catch (error) {
    console.error(`❌ Erro ao processar solução ${solution.id}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

// Popular embeddings - MELHORADO
async function popularEmbeddings(): Promise<boolean> {
  console.log('\n🚀 Iniciando população de embeddings...');
  
  const args = process.argv.slice(2);
  const apenasNovasSolucoes = args.includes('--new-only');
  const apenasPichau = args.includes('--pichau-only');
  
  try {
    let whereClause = `s.approval_status = 'approved' AND s.is_active = true`;
    
    if (apenasPichau) {
      whereClause += ` AND s.created_by = 'pichau_official'`;
    }
    
    // Buscar soluções que precisam de embeddings
    const solutionsQuery = await pool.query(`
      SELECT DISTINCT s.id, s.problem_tag, s.step, s.title, s.introduction, 
             s.problem_description, s.content, s.procedures, s.resources, 
             s.keywords, s.content_hash, s.created_by
      FROM support_solutions s
      LEFT JOIN solution_embeddings e ON s.id = e.solution_id 
        AND e.content_hash = s.content_hash
      WHERE ${whereClause}
        AND e.id IS NULL
      ORDER BY s.created_by DESC, s.problem_tag, s.step
    `);

    const solutions: SolutionData[] = solutionsQuery.rows;
    console.log(`📋 Encontradas ${solutions.length} soluções para processar`);

    if (solutions.length === 0) {
      console.log('✅ Todas as soluções já possuem embeddings atualizados!');
      return true;
    }

    // Mostrar breakdown por tipo
    const breakdown = solutions.reduce((acc, sol) => {
      const key = sol.created_by || 'outros';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 Breakdown por criador:');
    Object.entries(breakdown).forEach(([creator, count]) => {
      console.log(`   ${creator}: ${count} soluções`);
    });

    let sucessos = 0;
    let falhas = 0;

    // Processar cada solução
    for (let i = 0; i < solutions.length; i++) {
      const solution = solutions[i];
      console.log(`\n[${i + 1}/${solutions.length}] ==================`);
      
      const sucesso = await processarSolucao(solution);
      
      if (sucesso) {
        sucessos++;
        console.log('✅ Solução processada com sucesso');
      } else {
        falhas++;
        console.log('❌ Falha ao processar solução');
      }

      // Rate limiting para OpenAI API - mais conservador
      if (i < solutions.length - 1) {
        const delay = solution.created_by === 'pichau_official' ? 1500 : 1000;
        console.log(`⏳ Aguardando ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log(`\n📊 RESUMO: ${sucessos} sucessos, ${falhas} falhas`);
    return falhas === 0;

  } catch (error) {
    console.error('❌ Erro geral na população:', error instanceof Error ? error.message : error);
    return false;
  }
}

// Testar busca semântica - MELHORADO
async function testarBusca(): Promise<void> {
  console.log('\n🔍 TESTANDO BUSCA SEMÂNTICA...\n');
  
  const testCases = [
    // Casos específicos da Pichau
    'computador não dá vídeo',
    'pc não liga',
    'tela azul erro',
    'memória RAM problema',
    'reset BIOS',
    'teste da fonte',
    'botão power não funciona',
    'formatação Windows',
    
    // Casos gerais
    'tela preta', 
    'problema boot',
    'erro sistema',
    'hardware defeito'
  ];
  
  for (const query of testCases) {
    console.log(`🔎 Buscando: "${query}"`);
    
    try {
      // Criar embedding da query
      const queryEmbedding = await createEmbedding(query);
      
      if (!queryEmbedding) {
        console.log('❌ Erro ao criar embedding da query');
        continue;
      }

      // Buscar soluções similares usando função do banco
      const results = await pool.query(`
        SELECT 
          s.id,
          s.problem_tag,
          s.step,
          s.title,
          s.created_by,
          (1 - (e.embedding <=> $1::vector)) as similarity_score
        FROM support_solutions s
        JOIN solution_embeddings e ON s.id = e.solution_id
        WHERE s.approval_status = 'approved' 
          AND s.is_active = true
          AND e.embedding_type IN ('combined', 'full_content')
          AND (1 - (e.embedding <=> $1::vector)) > 0.7
        ORDER BY similarity_score DESC
        LIMIT 3
      `, [`[${queryEmbedding.join(',')}]`]);

      if (results.rows.length > 0) {
        results.rows.forEach((result: any, idx: number) => {
          const score = parseFloat(result.similarity_score);
          const creator = result.created_by === 'pichau_official' ? '🏷️ Pichau' : '📝 Outros';
          console.log(`  ${idx + 1}. ${result.title} (${score.toFixed(3)}) ${creator}`);
          console.log(`     Tag: ${result.problem_tag}, Step: ${result.step}`);
        });
      } else {
        console.log('   ❌ Nenhum resultado encontrado');
      }
      
    } catch (error) {
      console.error(`❌ Erro na busca: ${error instanceof Error ? error.message : error}`);
    }
    
    console.log('');
  }
}

// Mostrar estatísticas finais - MELHORADO
async function mostrarEstatisticas(): Promise<void> {
  console.log('\n📊 ESTATÍSTICAS FINAIS:');
  console.log('==========================================');
  
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_solutions,
        COUNT(DISTINCT s.id) FILTER (WHERE s.approval_status = 'approved' AND s.is_active = true) as active_solutions,
        COUNT(DISTINCT s.id) FILTER (WHERE s.created_by = 'pichau_official') as pichau_solutions,
        COUNT(DISTINCT e.solution_id) as solutions_with_embeddings,
        COUNT(DISTINCT e.solution_id) FILTER (WHERE s.created_by = 'pichau_official') as pichau_with_embeddings,
        COUNT(e.id) as total_embeddings,
        COUNT(DISTINCT e.embedding_type) as embedding_types,
        ROUND(
          COUNT(DISTINCT e.solution_id)::FLOAT / 
          NULLIF(COUNT(DISTINCT s.id) FILTER (WHERE s.approval_status = 'approved' AND s.is_active = true), 0) * 100, 
          1
        ) as completion_percentage
      FROM support_solutions s
      LEFT JOIN solution_embeddings e ON s.id = e.solution_id
    `);
    
    const embeddingTypes = await pool.query(`
      SELECT embedding_type, COUNT(*) as count
      FROM solution_embeddings
      GROUP BY embedding_type
      ORDER BY count DESC
    `);

    const pichauBreakdown = await pool.query(`
      SELECT 
        s.problem_tag,
        s.step,
        s.title,
        COUNT(e.id) as embedding_count
      FROM support_solutions s
      LEFT JOIN solution_embeddings e ON s.id = e.solution_id
      WHERE s.created_by = 'pichau_official'
      GROUP BY s.id, s.problem_tag, s.step, s.title
      ORDER BY s.problem_tag, s.step
    `);

    const stat = stats.rows[0];
    console.log(`📋 Total de soluções: ${stat.total_solutions}`);
    console.log(`✅ Soluções ativas: ${stat.active_solutions}`);
    console.log(`🏷️  Soluções Pichau: ${stat.pichau_solutions}`);
    console.log(`🧠 Soluções com embeddings: ${stat.solutions_with_embeddings}/${stat.active_solutions}`);
    console.log(`🏷️  Pichau com embeddings: ${stat.pichau_with_embeddings}/${stat.pichau_solutions}`);
    console.log(`📊 Total de embeddings: ${stat.total_embeddings}`);
    console.log(`🏷️  Tipos de embedding: ${stat.embedding_types}`);
    console.log(`📈 Percentual completo: ${stat.completion_percentage || 0}%`);

    if (embeddingTypes.rows.length > 0) {
      console.log('\n📋 Breakdown por tipo de embedding:');
      embeddingTypes.rows.forEach((type: any) => {
        console.log(`   ${type.embedding_type}: ${type.count}`);
      });
    }

    if (pichauBreakdown.rows.length > 0) {
      console.log('\n🏷️  Procedimentos Pichau:');
      pichauBreakdown.rows.forEach((proc: any) => {
        console.log(`   ${proc.problem_tag} (${proc.step}): ${proc.embedding_count} embeddings`);
      });
    }
    
    if (stat.completion_percentage == '100.0') {
      console.log('\n🎉 SUCESSO! Todas as soluções ativas têm embeddings!');
    }
    
  } catch (error) {
    console.error('❌ Erro nas estatísticas:', error instanceof Error ? error.message : error);
  }
}

// Função para limpar embeddings antigos
async function limparEmbeddingsAntigos(): Promise<void> {
  const shouldClean = process.argv.includes('--clean-old');
  
  if (!shouldClean) {
    console.log('💡 Para limpar embeddings antigos, use: --clean-old');
    return;
  }

  try {
    console.log('🗑️  Limpando embeddings antigos...');
    
    // Remover embeddings órfãos
    const orphansResult = await pool.query(`
      DELETE FROM solution_embeddings 
      WHERE solution_id NOT IN (SELECT id FROM support_solutions)
    `);
    
    console.log(`🗑️  Removidos ${orphansResult.rowCount} embeddings órfãos`);
    
    // Remover embeddings de soluções inativas
    const inactiveResult = await pool.query(`
      DELETE FROM solution_embeddings 
      WHERE solution_id IN (
        SELECT id FROM support_solutions 
        WHERE approval_status != 'approved' OR is_active = false
      )
    `);
    
    console.log(`🗑️  Removidos ${inactiveResult.rowCount} embeddings de soluções inativas`);
    
  } catch (error) {
    console.error('❌ Erro ao limpar embeddings antigos:', error);
  }
}

// Função principal
async function main(): Promise<void> {
  console.log('🚀 POPULATE EMBEDDINGS PICHAU - SUPPORT AGENT v2.0\n');
  
  const args = process.argv.slice(2);
  const apenasTestar = args.includes('--test-only');
  const testarApoPopular = args.includes('--test');
  const forcarReprocessamento = args.includes('--force');
  const apenasStats = args.includes('--stats-only');
  const apenasPichau = args.includes('--pichau-only');
  
  // Mostrar opções disponíveis
  if (args.includes('--help')) {
    console.log('Opções disponíveis:');
    console.log('  --test-only       Apenas testar busca semântica');
    console.log('  --test            Popular embeddings E testar busca');
    console.log('  --force           Forçar reprocessamento (apagar tudo)');
    console.log('  --stats-only      Apenas mostrar estatísticas');
    console.log('  --pichau-only     Processar apenas soluções da Pichau');
    console.log('  --clean-old       Limpar embeddings órfãos/antigos');
    console.log('  --help            Mostrar esta ajuda');
    return;
  }
  
  try {
    // 1. Verificar conexões
    const conexoesOk = await verificarConexoes();
    if (!conexoesOk) {
      console.log('\n❌ Erro nas conexões. Verifique:');
      console.log('- Docker PostgreSQL está rodando: docker-compose ps');
      console.log('- OPENAI_API_KEY está no .env');
      console.log('- DATABASE_URL está correto no .env');
      return;
    }
    
    // 2. Verificar estrutura do banco
    const bancoOk = await verificarEstruturaBanco();
    if (!bancoOk) {
      console.log('\n❌ Banco sem dados. Execute primeiro:');
      console.log('docker-compose up -d');
      console.log('npm run migration:auto');
      return;
    }
    
    // 3. Apenas estatísticas
    if (apenasStats) {
      await mostrarEstatisticas();
      return;
    }
    
    // 4. Limpar embeddings antigos
    await limparEmbeddingsAntigos();
    
    // 5. Forçar reprocessamento se solicitado
    if (forcarReprocessamento) {
      console.log('\n🔄 Forçando reprocessamento - removendo embeddings existentes...');
      
      if (apenasPichau) {
        await pool.query(`
          DELETE FROM solution_embeddings 
          WHERE solution_id IN (
            SELECT id FROM support_solutions 
            WHERE created_by = 'pichau_official'
          )
        `);
        console.log('✅ Embeddings da Pichau removidos');
      } else {
        await pool.query('DELETE FROM solution_embeddings');
        console.log('✅ Todos os embeddings removidos');
      }
    }
    
    // 6. Popular embeddings (se não for apenas teste)
    if (!apenasTestar) {
      const populadoOk = await popularEmbeddings();
      if (!populadoOk) {
        console.log('\n❌ Erro ao popular embeddings');
        return;
      }
    }
    
    // 7. Mostrar estatísticas
    await mostrarEstatisticas();
    
    // 8. Testar busca (se solicitado)
    if (testarApoPopular || apenasTestar) {
      await testarBusca();
    }
    
    console.log('\n✅ Script finalizado com sucesso!');
    console.log('\n💡 Próximos passos:');
    console.log('• Testar API: npm start');
    console.log('• Verificar busca: npm run test:search');
    console.log('• Ver estatísticas: npm run embeddings:populate --stats-only');
    
  } catch (error) {
    console.error('\n❌ ERRO GERAL:', error instanceof Error ? error.message : String(error));
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

export { main, createEmbedding, popularEmbeddings, testarBusca };