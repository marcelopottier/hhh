#!/usr/bin/env node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { main as populateEmbeddings } from './populate-embeddings';
import { EmbeddingService } from '../services/embeddingService';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface MigrationStep {
  name: string;
  description: string;
  check: () => Promise<boolean>;
  execute: () => Promise<boolean>;
  required: boolean;
}

class MigrationManager {
  private pool: Pool;
  private service: EmbeddingService;

  constructor(pool: Pool) {
    this.pool = pool;
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY é obrigatória');
    }
    
    this.service = new EmbeddingService(pool, apiKey);
  }

  // Verificar se a nova estrutura existe
  async checkNewStructure(): Promise<boolean> {
    try {
      const result = await this.pool.query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('support_solutions', 'solution_embeddings')
      `);
      
      return parseInt(result.rows[0].count) === 2;
    } catch (error) {
      return false;
    }
  }

  // Verificar se a estrutura antiga existe
  async checkOldStructure(): Promise<boolean> {
    try {
      const result = await this.pool.query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('procedimentos', 'categorias_problema')
      `);
      
      return parseInt(result.rows[0].count) >= 1;
    } catch (error) {
      return false;
    }
  }

  // Verificar se há dados na estrutura antiga
  async checkOldData(): Promise<boolean> {
    try {
      const result = await this.pool.query(`
        SELECT COUNT(*) as count FROM procedimentos WHERE ativo = true
      `);
      
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      return false;
    }
  }

  // Verificar se há dados na nova estrutura
  async checkNewData(): Promise<boolean> {
    try {
      const result = await this.pool.query(`
        SELECT COUNT(*) as count FROM support_solutions WHERE is_active = true
      `);
      
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      return false;
    }
  }

  // Verificar se há embeddings
  async checkEmbeddings(): Promise<boolean> {
    try {
      const result = await this.pool.query(`
        SELECT COUNT(*) as count FROM solution_embeddings
      `);
      
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      return false;
    }
  }


  // Executar população de embeddings
  async populateEmbeddings(): Promise<boolean> {
    console.log('🧠 Populando embeddings...');
    try {
      await populateEmbeddings();
      return true;
    } catch (error) {
      console.error('Erro ao popular embeddings:', error);
      return false;
    }
  }

  // Criar dados de exemplo se não existirem
  async createSampleData(): Promise<boolean> {
    console.log('📝 Criando dados de exemplo...');
    
    try {
      // Verificar se já existem dados
      const existing = await this.pool.query(`
        SELECT COUNT(*) as count FROM support_solutions
      `);

      if (parseInt(existing.rows[0].count) > 0) {
        console.log('✅ Dados já existem, pulando criação de exemplos');
        return true;
      }

      await this.pool.query(`
        INSERT INTO support_solutions (
          problem_tag, step, title, introduction, problem_description, content,
          keywords, tags, category, subcategory, difficulty, estimated_time_minutes,
          created_by, approval_status, is_active
        ) VALUES 
        (
          'computador_nao_liga', 1, 
          'Computador não liga - Verificações básicas',
          'Vamos fazer algumas verificações básicas para identificar o problema.',
          'Computador não responde ao pressionar o botão de energia ou não exibe imagem',
          'Verifique se o cabo de energia está conectado corretamente. Teste em outra tomada. Verifique se a fonte está ligada (chave 110/220V). Observe se há LEDs acesos na placa-mãe.',
          ARRAY['não liga', 'sem energia', 'botão power', 'fonte'],
          ARRAY['hardware', 'energia', 'troubleshooting'],
          'hardware', 'power_issues', 2, 15,
          'system', 'approved', true
        ),
        (
          'tela_azul', 1,
          'Tela Azul (BSOD) - Diagnóstico inicial',
          'Vamos identificar a causa da tela azul e tomar as primeiras medidas.',
          'Sistema apresenta tela azul da morte com códigos de erro',
          'Anote o código de erro exibido. Reinicie em modo seguro. Execute sfc /scannow no prompt de comando. Verifique drivers recentemente instalados.',
          ARRAY['tela azul', 'BSOD', 'erro sistema', 'crash'],
          ARRAY['software', 'sistema', 'drivers'],
          'software', 'system_errors', 4, 45,
          'system', 'approved', true
        )
      `);

      console.log('✅ Dados de exemplo criados');
      return true;
    } catch (error) {
      console.error('Erro ao criar dados de exemplo:', error);
      return false;
    }
  }

  // Limpar estrutura antiga (após migração)
  async cleanOldStructure(): Promise<boolean> {
    console.log('🗑️  Limpando estrutura antiga...');
    
    try {
      const confirmCleanup = process.argv.includes('--cleanup-old');
      
      if (!confirmCleanup) {
        console.log('⚠️  Para limpar a estrutura antiga, use: --cleanup-old');
        return true;
      }

      await this.pool.query(`DROP TABLE IF EXISTS historico_uso CASCADE`);
      await this.pool.query(`DROP TABLE IF EXISTS recursos_apoio CASCADE`);
      await this.pool.query(`DROP TABLE IF EXISTS passos_procedimento CASCADE`);
      await this.pool.query(`DROP TABLE IF EXISTS procedimentos CASCADE`);
      await this.pool.query(`DROP TABLE IF EXISTS categorias_problema CASCADE`);

      console.log('✅ Estrutura antiga removida');
      return true;
    } catch (error) {
      console.error('Erro ao limpar estrutura antiga:', error);
      return false;
    }
  }

  // Verificar saúde do sistema
  async checkSystemHealth(): Promise<void> {
    console.log('\n🏥 VERIFICAÇÃO DE SAÚDE DO SISTEMA\n');
    
    try {
      const health = await this.service.verificarSaudeDoSistema();
      
      health.forEach((check: { status: string; metric: string; value: string; recommendation?: string }) => {
        const icon = check.status === 'OK' ? '✅' : check.status === 'WARNING' ? '⚠️' : '❌';
        console.log(`${icon} ${check.metric}: ${check.value}`);
        if (check.recommendation && check.status !== 'OK') {
          console.log(`   💡 ${check.recommendation}`);
        }
      });
    } catch (error) {
      console.error('❌ Erro ao verificar saúde:', error);
    }
  }

  // Executar migração completa
  async runFullMigration(): Promise<boolean> {
    console.log('🚀 INICIANDO MIGRAÇÃO COMPLETA\n');

    const steps: MigrationStep[] = [
      {
        name: 'nova_estrutura',
        description: 'Verificar se nova estrutura existe',
        check: () => this.checkNewStructure(),
        execute: async () => {
          console.log('❌ Nova estrutura não encontrada!');
          console.log('Execute primeiro os scripts de inicialização:');
          console.log('docker-compose down && docker-compose up -d');
          return false;
        },
        required: true
      },
      {
        name: 'migrar_dados_antigos',
        description: 'Migrar dados da estrutura antiga (se existir)',
        check: async () => {
          const hasOld = await this.checkOldStructure();
          const hasOldData = hasOld ? await this.checkOldData() : false;
          return !hasOldData; // Step é necessário apenas se há dados antigos
        },
        execute: () => this.migrateOldData(),
        required: false
      },
      {
        name: 'dados_exemplo',
        description: 'Criar dados de exemplo se necessário',
        check: () => this.checkNewData(),
        execute: () => this.createSampleData(),
        required: false
      },
      {
        name: 'embeddings',
        description: 'Popular embeddings',
        check: () => this.checkEmbeddings(),
        execute: () => this.populateEmbeddings(),
        required: true
      }
    ];

    let success = true;

    for (const step of steps) {
      console.log(`\n📋 ${step.description}...`);
      
      const checkResult = await step.check();
      
      if (checkResult) {
        console.log(`✅ ${step.name}: OK`);
        continue;
      }

      if (step.required) {
        console.log(`🔧 Executando: ${step.name}...`);
        const executeResult = await step.execute();
        
        if (!executeResult) {
          console.log(`❌ Falha em: ${step.name}`);
          success = false;
          break;
        }
        
        console.log(`✅ ${step.name}: Concluído`);
      } else {
        console.log(`⏭️  ${step.name}: Pulando (opcional)`);
      }
    }

    if (success) {
      console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
      await this.checkSystemHealth();
    } else {
      console.log('\n❌ MIGRAÇÃO FALHOU');
    }

    return success;
  }
}

// Função principal
async function main(): Promise<void> {
  console.log('🔧 MIGRATION HELPER - SUPPORT AGENT v2.0\n');
  
  const args = process.argv.slice(2);
  
  try {
    const manager = new MigrationManager(pool);
    
    if (args.includes('--health-check')) {
      await manager.checkSystemHealth();
      return;
    }
    
    if (args.includes('--migrate-only')) {
      const hasOld = await manager.checkOldStructure();
      if (hasOld) {
        await manager.migrateOldData();
      } else {
        console.log('📋 Nenhuma estrutura antiga encontrada');
      }
      return;
    }
    
    if (args.includes('--embeddings-only')) {
      await manager.populateEmbeddings();
      return;
    }
    
    if (args.includes('--sample-data')) {
      await manager.createSampleData();
      return;
    }

    // Migração completa por padrão
    await manager.runFullMigration();
    
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

export { MigrationManager, main };