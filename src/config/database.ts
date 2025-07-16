import { Pool, PoolConfig, PoolClient } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Interface para health check
interface HealthCheckResult {
  healthy: boolean;
  details: {
    connectivity?: boolean;
    tables?: number;
    solutions?: number;
    embeddings?: number;
    interactions?: number;
    cache_entries?: number;
    version?: string;
    extensions?: string[];
    error?: string;
    code?: string;
  };
}

// Interface para estatísticas do sistema
interface SystemStats {
  total_solutions: number;
  active_solutions: number;
  total_embeddings: number;
  solutions_with_embeddings: number;
  total_interactions: number;
  cache_entries: number;
  database_size: string;
}

const getDatabaseConfig = (): PoolConfig => {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://solanis:solanis@127.0.0.1:3024/pichau';
  
  console.log('🔗 Configurando conexão com:', dbUrl.replace(/password=[^&\s]+/gi, 'password=***'));
  
  return {
    connectionString: dbUrl,
    // Configurações otimizadas para produção
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
};

const config = getDatabaseConfig();

// Pool de conexões otimizado
const pool = new Pool({
  ...config,
  max: process.env.NODE_ENV === 'production' ? 10 : 5,        // Conexões máximas
  min: 2,                                                      // Conexões mínimas
  idleTimeoutMillis: 30000,                                   // 30s timeout idle
  connectionTimeoutMillis: 10000,                             // 10s timeout conexão
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Event listeners para monitoramento
pool.on('connect', (client: PoolClient) => {
  console.log('✅ Nova conexão PostgreSQL estabelecida');
  
  // Registrar extensão pgvector em novas conexões
  client.query('SELECT 1').catch(() => {
    // Silenciar erros de conexões que são fechadas rapidamente
  });
});

pool.on('error', (err: Error, client: PoolClient) => {
  console.error('❌ Erro no pool de conexões PostgreSQL:', err.message);
  if (err.message.includes('server closed the connection unexpectedly')) {
    console.log('🔄 Tentando reconectar...');
  }
});

pool.on('acquire', (client: PoolClient) => {
  // Log silencioso para debug se necessário
  // console.log('📥 Conexão adquirida do pool');
});

pool.on('release', (err: Error | undefined, client: PoolClient) => {
  if (err) {
    console.error('⚠️ Erro ao liberar conexão:', err.message);
  }
  // console.log('📤 Conexão liberada para o pool');
});

// Função para testar conexão
export async function testConnection(): Promise<boolean> {
  let client: PoolClient | undefined;
  try {
    console.log('🔍 Testando conexão com PostgreSQL...');
    client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        NOW() as connected_at,
        current_database() as database_name,
        current_user as user_name,
        version() as pg_version
    `);
    
    const row = result.rows[0];
    
    console.log('✅ Conectado ao PostgreSQL!');
    console.log(`📊 Database: ${row.database_name}`);
    console.log(`👤 User: ${row.user_name}`);
    console.log(`📅 Connected at: ${row.connected_at}`);
    
    // Verificar extensões necessárias
    const extensions = await client.query(`
      SELECT extname FROM pg_extension 
      WHERE extname IN ('vector', 'pgcrypto')
      ORDER BY extname
    `);
    
    const installedExts = extensions.rows.map(row => row.extname);
    console.log(`🔌 Extensões instaladas: ${installedExts.join(', ') || 'nenhuma'}`);
    
    if (!installedExts.includes('vector')) {
      console.warn('⚠️ Extensão pgvector não encontrada');
    }
    
    if (!installedExts.includes('pgcrypto')) {
      console.warn('⚠️ Extensão pgcrypto não encontrada');
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Erro de conexão:', error.message);
    console.error('💡 Verifique se o PostgreSQL está rodando e as credenciais estão corretas');
    
    if (error.code) {
      console.error(`🔧 Código do erro: ${error.code}`);
    }
    
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Função para query com retry automático
export async function queryWithRetry(
  text: string, 
  params?: any[], 
  retries: number = 3
): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const start = Date.now();
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        console.warn(`⏱️ Query lenta (${duration}ms): ${text.substring(0, 100)}...`);
      }
      
      return result;
    } catch (error: any) {
      console.error(`❌ Tentativa ${attempt}/${retries} falhou:`, error.message);
      
      if (attempt === retries) {
        console.error(`🔥 Query final falhou: ${text.substring(0, 200)}...`);
        throw error;
      }
      
      // Esperar antes da próxima tentativa (exponential backoff)
      const delay = Math.min(attempt * 1000, 5000);
      console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Health check completo para nova estrutura
export async function healthCheck(): Promise<HealthCheckResult> {
  let client: PoolClient | undefined;
  
  try {
    client = await pool.connect();
    
    // Executar verificações em paralelo
    const checks = await Promise.allSettled([
      // 1. Conectividade básica
      client.query('SELECT 1 as connectivity'),
      
      // 2. Contar tabelas da nova estrutura
      client.query(`
        SELECT COUNT(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('support_solutions', 'solution_embeddings', 'solution_interactions', 'search_cache')
      `),
      
      // 3. Estatísticas das soluções
      client.query(`
        SELECT 
          COUNT(*) as total_solutions,
          COUNT(CASE WHEN is_active = true AND approval_status = 'approved' THEN 1 END) as active_solutions
        FROM support_solutions
      `),
      
      // 4. Estatísticas dos embeddings
      client.query('SELECT COUNT(*) as embedding_count FROM solution_embeddings'),
      
      // 5. Estatísticas das interações
      client.query('SELECT COUNT(*) as interaction_count FROM solution_interactions'),
      
      // 6. Versão do PostgreSQL
      client.query('SELECT version() as version'),
      
      // 7. Extensões instaladas
      client.query(`
        SELECT array_agg(extname) as extensions 
        FROM pg_extension 
        WHERE extname IN ('vector', 'pgcrypto')
      `)
    ]);
    
    // Processar resultados
    const results: any = {};
    
    if (checks[0].status === 'fulfilled') {
      results.connectivity = checks[0].value.rows[0].connectivity === 1;
    }
    
    if (checks[1].status === 'fulfilled') {
      results.tables = parseInt(checks[1].value.rows[0].table_count);
    }
    
    if (checks[2].status === 'fulfilled') {
      const solutionStats = checks[2].value.rows[0];
      results.solutions = parseInt(solutionStats.total_solutions);
      results.active_solutions = parseInt(solutionStats.active_solutions);
    }
    
    if (checks[3].status === 'fulfilled') {
      results.embeddings = parseInt(checks[3].value.rows[0].embedding_count);
    }
    
    if (checks[4].status === 'fulfilled') {
      results.interactions = parseInt(checks[4].value.rows[0].interaction_count);
    }
    
    if (checks[5].status === 'fulfilled') {
      results.version = checks[5].value.rows[0].version;
    }
    
    if (checks[6].status === 'fulfilled') {
      results.extensions = checks[6].value.rows[0].extensions || [];
    }
    
    // Determinar se está saudável
    const isHealthy = results.connectivity && 
                     results.tables >= 4 && 
                     results.extensions?.includes('vector') &&
                     results.extensions?.includes('pgcrypto');
    
    return {
      healthy: isHealthy,
      details: results
    };
    
  } catch (error: any) {
    console.error('❌ Erro no health check:', error.message);
    
    return {
      healthy: false,
      details: {
        error: error.message,
        code: error.code
      }
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Função para obter estatísticas detalhadas
export async function getSystemStats(): Promise<SystemStats | null> {
  try {
    const result = await queryWithRetry(`
      SELECT 
        (SELECT COUNT(*) FROM support_solutions) as total_solutions,
        (SELECT COUNT(*) FROM support_solutions WHERE is_active = true AND approval_status = 'approved') as active_solutions,
        (SELECT COUNT(*) FROM solution_embeddings) as total_embeddings,
        (SELECT COUNT(DISTINCT solution_id) FROM solution_embeddings) as solutions_with_embeddings,
        (SELECT COUNT(*) FROM solution_interactions) as total_interactions,
        (SELECT COUNT(*) FROM search_cache) as cache_entries,
        (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size
    `);
    
    return result.rows[0] as SystemStats;
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
    return null;
  }
}

// Função para limpar recursos
export async function cleanup(): Promise<void> {
  console.log('🧹 Executando limpeza de recursos...');
  
  try {
    // Limpar cache expirado
    await queryWithRetry('DELETE FROM search_cache WHERE expires_at < NOW()');
    
    // Limpar interações muito antigas (opcional)
    const oldInteractionsDate = new Date();
    oldInteractionsDate.setDate(oldInteractionsDate.getDate() - 90); // 90 dias
    
    const cleanupResult = await queryWithRetry(
      'DELETE FROM solution_interactions WHERE created_at < $1',
      [oldInteractionsDate]
    );
    
    console.log(`🗑️ ${cleanupResult.rowCount} interações antigas removidas`);
    
    // Atualizar estatísticas das tabelas
    await queryWithRetry('ANALYZE support_solutions, solution_embeddings, solution_interactions');
    
    console.log('✅ Limpeza concluída');
  } catch (error) {
    console.error('❌ Erro durante limpeza:', error);
  }
}

// Função para verificar e criar índices se necessário
export async function ensureIndexes(): Promise<void> {
  const indexes = [
    'idx_support_solutions_problem_tag',
    'idx_solution_embeddings_vector',
    'idx_solution_interactions_created_at'
  ];
  
  try {
    for (const indexName of indexes) {
      const exists = await queryWithRetry(`
        SELECT 1 FROM pg_indexes 
        WHERE indexname = $1
      `, [indexName]);
      
      if (exists.rows.length === 0) {
        console.warn(`⚠️ Índice ${indexName} não encontrado`);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar índices:', error);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`📴 Recebido sinal ${signal}. Fechando pool de conexões...`);
  
  try {
    await pool.end();
    console.log('✅ Pool de conexões fechado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao fechar pool:', error);
  }
  
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Objeto principal de exportação
export const db = {
  // Métodos de query
  query: (text: string, params?: any[]) => pool.query(text, params),
  queryWithRetry,
  
  // Pool e conexões
  getPool: () => pool,
  getClient: () => pool.connect(),
  
  // Diagnósticos
  testConnection,
  healthCheck,
  getSystemStats,
  
  // Manutenção
  cleanup,
  ensureIndexes,
  
  // Encerramento
  end: () => pool.end()
};

// Executar teste de conexão na inicialização (exceto em testes)
if (process.env.NODE_ENV !== 'test') {
  setTimeout(async () => {
    try {
      const isConnected = await testConnection();
      
      if (isConnected) {
        const health = await healthCheck();
        
        if (health.healthy) {
          console.log('🎉 Sistema de banco inicializado com sucesso!');
          
          // Executar verificações de manutenção
          await ensureIndexes();
          
          // Agendar limpeza automática (a cada 24 horas)
          if (process.env.NODE_ENV === 'production') {
            setInterval(cleanup, 24 * 60 * 60 * 1000);
          }
        } else {
          console.warn('⚠️ Banco conectado mas com problemas na estrutura');
          console.log('💡 Execute: npm run migration:auto');
        }
      }
    } catch (error) {
      console.error('❌ Erro na inicialização do banco:', error);
    }
  }, 2000);
}

export default db;