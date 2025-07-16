import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function executeSqlFile(filePath: string): Promise<boolean> {
  try {
    console.log(`📄 Executando: ${path.basename(filePath)}`);
    
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    // Dividir por comandos (separados por ;)
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (command.trim().length === 0) continue;
      
      try {
        await pool.query(command);
      } catch (error) {
        // Ignorar alguns erros esperados
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (
          errorMessage.includes('already exists') ||
          errorMessage.includes('duplicate key') ||
          errorMessage.includes('does not exist')
        ) {
          console.log(`⚠️  Aviso ignorado: ${errorMessage.split('\n')[0]}`);
          continue;
        }
        
        console.error(`❌ Erro no comando ${i + 1}:`, errorMessage);
        return false;
      }
    }
    
    console.log(`✅ ${path.basename(filePath)} executado com sucesso`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erro ao executar ${filePath}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function checkDatabase(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Conexão com banco estabelecida');
    return true;
  } catch (error) {
    console.error('❌ Erro de conexão:', error instanceof Error ? error.message : error);
    return false;
  }
}

async function checkTablesExist(): Promise<string[]> {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('support_solutions', 'solution_embeddings', 'solution_interactions', 'search_cache')
      ORDER BY table_name
    `);
    
    return result.rows.map(row => row.table_name);
  } catch (error) {
    console.error('Erro ao verificar tabelas:', error);
    return [];
  }
}

async function backupOldStructure(): Promise<boolean> {
  try {
    console.log('💾 Verificando estrutura antiga para backup...');
    
    const oldTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('procedimentos', 'categorias_problema', 'passos_procedimento', 'recursos_apoio', 'historico_uso')
    `);
    
    if (oldTables.rows.length === 0) {
      console.log('ℹ️  Nenhuma estrutura antiga encontrada');
      return true;
    }
    
    console.log(`📋 Encontradas ${oldTables.rows.length} tabelas antigas`);
    
    // Criar tabelas de backup
    for (const table of oldTables.rows) {
      const tableName = table.table_name;
      const backupName = `backup_${tableName}_${Date.now()}`;
      
      try {
        await pool.query(`CREATE TABLE ${backupName} AS SELECT * FROM ${tableName}`);
        console.log(`✅ Backup criado: ${backupName}`);
      } catch (error) {
        console.log(`⚠️  Erro no backup de ${tableName}:`, error instanceof Error ? error.message : 'Erro desconhecido');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro no backup:', error);
    return false;
  }
}

async function runMigration(): Promise<void> {
  console.log('🚀 MIGRAÇÃO MANUAL - SUPPORT AGENT v2.0\n');
  
  const args = process.argv.slice(2);
  const skipBackup = args.includes('--skip-backup');
  const forceExecute = args.includes('--force');
  
  try {
    // 1. Verificar conexão
    const dbOk = await checkDatabase();
    if (!dbOk) {
      console.log('\n❌ Falha na conexão. Verifique se o PostgreSQL está rodando:');
      console.log('docker-compose up -d pichau-db');
      return;
    }
    
    // 2. Verificar se scripts existem
    const scriptsDir = path.join(process.cwd(), 'init-scripts');
    const scriptFiles = [
      '01-init-pgvector.sql',
      '02-views-functions.sql', 
      '03-dados-iniciais.sql',
      '04-cleanup-config.sql'
    ];
    
    const missingFiles = [];
    for (const file of scriptFiles) {
      const fullPath = path.join(scriptsDir, file);
      if (!fs.existsSync(fullPath)) {
        missingFiles.push(file);
      }
    }
    
    if (missingFiles.length > 0) {
      console.log('❌ Arquivos de script não encontrados:');
      missingFiles.forEach(file => console.log(`   - init-scripts/${file}`));
      console.log('\nCertifique-se de que os arquivos estão na pasta init-scripts/');
      return;
    }
    
    console.log('✅ Todos os scripts encontrados');
    
    // 3. Verificar se nova estrutura já existe
    const existingTables = await checkTablesExist();
    if (existingTables.length > 0 && !forceExecute) {
      console.log('\n⚠️  Nova estrutura já existe:');
      existingTables.forEach(table => console.log(`   - ${table}`));
      console.log('\nPara forçar execução use: --force');
      console.log('Para verificar dados: npm run stats');
      return;
    }
    
    // 4. Fazer backup da estrutura antiga
    if (!skipBackup) {
      await backupOldStructure();
    }
    
    // 5. Executar scripts de migração
    console.log('\n🔧 Executando scripts de migração...\n');
    
    let allSuccess = true;
    
    for (const file of scriptFiles) {
      const fullPath = path.join(scriptsDir, file);
      const success = await executeSqlFile(fullPath);
      
      if (!success) {
        allSuccess = false;
        console.log(`\n❌ Falha em ${file} - interrompendo migração`);
        break;
      }
      
      // Pequeno delay entre scripts
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (allSuccess) {
      console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!\n');
      
      // Verificar resultado
      const newTables = await checkTablesExist();
      console.log('📋 Tabelas criadas:');
      newTables.forEach(table => console.log(`   ✅ ${table}`));
      
      // Verificar dados básicos
      try {
        const solutionCount = await pool.query('SELECT COUNT(*) FROM support_solutions');
        const embeddingCount = await pool.query('SELECT COUNT(*) FROM solution_embeddings');
        
        console.log('\n📊 Dados básicos:');
        console.log(`   Soluções: ${solutionCount.rows[0].count}`);
        console.log(`   Embeddings: ${embeddingCount.rows[0].count}`);
        
        console.log('\n🚀 Próximos passos:');
        console.log('1. Popular embeddings: npm run embeddings:populate');
        console.log('2. Testar busca: npm run test:search');
        console.log('3. Ver estatísticas: npm run stats');
        
      } catch (error) {
        console.log('⚠️  Erro ao verificar dados básicos:', error instanceof Error ? error.message : error);
      }
      
    } else {
      console.log('\n❌ MIGRAÇÃO FALHOU');
      console.log('Verifique os logs acima para detalhes do erro');
    }
    
  } catch (error) {
    console.error('\n❌ ERRO GERAL:', error instanceof Error ? error.message : String(error));
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigration().catch(console.error);
}

export { runMigration };