import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as dotenv from 'dotenv';
import { ConfigService } from './config/config';
import { getSystemStats, healthCheck, testConnection } from './config/database';
import { SupportAgent } from './agent';
import { FreshDeskWebhookService } from './services/freshDeskWebhookService';
import { setupLangGraphRoutes } from './api/langGraphRoute';
import { basicAuthMiddleware } from './middleware/basicAuth';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const config = ConfigService.getInstance();

// Middlewares globais
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para logging de todas as requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2).substring(0, 200) + '...');
  }
  next();
});

// =============================================
// ROTAS PÚBLICAS (SEM AUTH)
// =============================================

// Health check básico
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await testConnection();
    const health = await healthCheck();
    const stats = await getSystemStats();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealth,
        healthy: health.healthy,
        details: health.details
      },
      stats: stats || {},
      version: '2.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Status do sistema
app.get('/status', async (req, res) => {
  try {
    const agent = SupportAgent.getInstance();
    const metrics = await agent.getDashboardMetrics();
    
    res.json({
      success: true,
      data: {
        system: 'Support Agent v2.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        metrics: metrics || {}
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter status',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});


// Status do sistema
app.get('/api/webhook', async (req, res) => {
  try {
    const agent = SupportAgent.getInstance();
    const metrics = await agent.getDashboardMetrics();
    const webhookService = FreshDeskWebhookService.getInstance();
    console.log(await webhookService.getTicketData(123));
    res.json({
      success: true,
      data: {
        system: 'Support Agent v2.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        metrics: metrics || {}
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter status',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Simulação de diferentes tipos de tickets
app.post('/freshdesk/simulate', async (req, res) => {
  try {
    console.log('[FRESHDESK] Iniciando simulação de tickets...');
    
    const webhookService = FreshDeskWebhookService.getInstance();
    
    // Executar em background para não travar a resposta
    webhookService.simulateTicketTypes().catch(error => {
      console.error('[FRESHDESK] Erro na simulação:', error);
    });
    
    res.json({
      success: true,
      message: 'Simulação iniciada em background. Verifique os logs para acompanhar o progresso.',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[FRESHDESK] Erro na simulação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na simulação',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});


// Configurar rotas do LangGraph (v2)
setupLangGraphRoutes(app);


// =============================================
// INICIALIZAÇÃO DO SERVIDOR
// =============================================

async function startServer() {
  console.log('🚀 INICIANDO SUPPORT AGENT SERVER v2.0\n');
  
  try {
    // 1. Validar configurações
    const validation = config.validateConfig();
    if (!validation.valid) {
      console.error('❌ Configuração inválida:');
      validation.errors.forEach((error: any) => console.error(`   - ${error}`));
      process.exit(1);
    }
    console.log('✅ Configurações validadas');
    
    // 2. Testar banco de dados
    const dbOk = await testConnection();
    if (!dbOk) {
      console.error('❌ Falha na conexão com o banco');
      console.error('💡 Verifique se o PostgreSQL está rodando:');
      console.error('   docker-compose up -d pichau-db');
      process.exit(1);
    }
    
    // 3. Verificar saúde do sistema
    const health = await healthCheck();
    if (!health.healthy) {
      console.warn('⚠️ Sistema com problemas de saúde:');
      console.warn(JSON.stringify(health.details, null, 2));
    }
    
    // 4. Inicializar agentes
    console.log('🤖 Inicializando Support Agent...');
    const agent = SupportAgent.getInstance();
    console.log('✅ Support Agent inicializado');
    
    // 5. Iniciar servidor
    const port = config.port;
    app.listen(port, () => {
      console.log(`\n🌟 SERVIDOR INICIADO COM SUCESSO!`);
      console.log(`📍 Porta: ${port}`);
      console.log(`🔗 URL: http://localhost:${port}`);
      console.log('\n📋 ROTAS DISPONÍVEIS:');
      console.log('   GET  /health              - Health check básico');
      console.log('   GET  /status              - Status do sistema');
      console.log('   POST /test                - Teste rápido do agente');
      console.log('   POST /api/v1/search       - Busca semântica (auth)');
      console.log('   GET  /api/v1/stats        - Estatísticas (auth)');
      console.log('   POST /v2/tech-support     - Suporte técnico completo');
      console.log('\n💡 EXEMPLOS:');
      console.log('   Teste: curl -X POST http://localhost:' + port + '/test \\');
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -d \'{"customerId":"teste123","message":"meu pc não liga"}\'');
      console.log('\n   Health: curl http://localhost:' + port + '/health');
      console.log('\n🔐 Rotas /api/v1/* requerem Basic Auth (WEBHOOK_USERNAME:WEBHOOK_PASSWORD)');
      console.log('🆕 Rota /v2/* usa novo sistema com histórico persistente');
      console.log('\n🎯 Sistema pronto para receber requisições!');
    });
    
  } catch (error) {
    console.error('❌ ERRO AO INICIAR SERVIDOR:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📴 Recebido SIGINT. Parando sservidor graciosamente...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n📴 Recebido SIGTERM. Parando servidor graciosamente...');
  process.exit(0);
});

// Iniciar servidor
if (require.main === module) {
  startServer().catch(console.error);
}

export { app, startServer };