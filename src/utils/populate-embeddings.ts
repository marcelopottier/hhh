import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { buscarProcedimentosSimilares, processarProcedimentoPichau } from '../services/embeddingService';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const textoProcedimentoPichau = `
Vou te passar alguns testes para que possamos descartar algumas possíveis causas. Ao final da Listagem estou te enviando alguns links de vídeos que podem auxiliar no processo ok?

Por gentileza,
- Remova as memórias e utilize uma borracha branca ou folha de papel para realizar a limpeza dos contatos da memória (parte dourada/amarela).
- Verifique o encaixe da(s) memória(s) e troque-as de slot para verificar se o computador passa a funcionar.
- Se o seu computador tiver 2 módulos de memória, utilize apenas uma de cada vez para testes.
- Verifique se os cabos da fonte estão bem encaixados nos componentes e na placa-mãe: conector de 24 pinos e conector de alimentação do processador.
- Verifique se o dissipador de calor do processador está bem encaixado.
- Tente ligar com outro cabo de energia ou em outra tomada/filtro de linha. Evite utilizar adaptadores.
- Tente estar utilizando em outro monitor/televisor.
- Tente utilizar outro cabo em sua conexão de vídeo do pc/monitor.
- Evite utilizar adaptadores ou conversores em cabos de vídeo.

Se estiver tudo certo tente resetar a BIOS; Por gentileza, siga as seguintes etapas:
1 - Primeiramente desligue o computador e desconecte todos os cabos da parte traseira, incluindo o cabo de alimentação.
2 - Após isso localize a bateria da Placa mãe. Ela tem um formato circular e normalmente fica próxima ao SLOT PCI da placa de vídeo conforme a imagem abaixo:
3 - Uma vez localizada a bateria, empurre a trava que prende a bateria para remove-la da placa mãe.
4 - Uma vez removida a bateria, pressione o botão LIGAR do gabinete por 15 segundos pelo menos e solte.
5 - Após isso recoloque a bateria do computador e tente ligar o PC novamente.

Lembre-se de desconectar o computador da tomada antes de trabalhar em sua placa-mãe e manusear a bateria com cuidado.

Retirando a memória RAM: https://youtu.be/UU_KTI3IjQY
Limpando a memória RAM: https://youtu.be/ds0Dz957rJo

Estarei aguardando seu retorno com os resultados dos procedimentos.
Qualquer dúvida estou a disposição!
`;

async function verificarConexoes() {
  console.log(' Verificando conexões...');
  
  try {
    await pool.query('SELECT 1');
    console.log(' PostgreSQL conectado!');
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não encontrada no .env');
    }
    console.log(' OpenAI API configurada!');
    
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error(' Erro na verificação:', error.message);
    } else {
      console.error(' Erro na verificação:', error);
    }
    return false;
  }
}

async function verificarEstruturaBanco() {
  console.log('\n Verificando estrutura do banco...');
  
  try {
    const tabelas = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('procedimentos', 'categorias_problema')
      ORDER BY table_name
    `);
    
    console.log(` Tabelas encontradas: ${tabelas.rows.map(r => r.table_name).join(', ')}`);
    
    // Verificar dados
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM categorias_problema) as categorias,
        (SELECT COUNT(*) FROM procedimentos) as procedimentos,
        (SELECT COUNT(*) FROM procedimentos WHERE embedding IS NOT NULL) as com_embeddings
    `);
    
    const stat = stats.rows[0];
    console.log(`Categorias: ${stat.categorias}, Procedimentos: ${stat.procedimentos}, Com embeddings: ${stat.com_embeddings}`);
    
    return parseInt(stat.procedimentos) > 0;
  } catch (error) {
    if (error instanceof Error) {
      console.error(' Erro ao verificar banco:', error.message);
    } else {
      console.error(' Erro ao verificar banco:', error);
    }
    return false;
  }
}

async function popularEmbeddings() {
  console.log('\n Iniciando população de embeddings...');
  
  try {
    // Buscar procedimentos específicos
    const procedimentos = await pool.query(`
      SELECT id, titulo, descricao_problema, solucao_completa 
      FROM procedimentos 
      WHERE embedding IS NULL
      ORDER BY id
    `);
    
    console.log(` Encontrados ${procedimentos.rows.length} procedimentos para processar`);
    
    if (procedimentos.rows.length === 0) {
      console.log(' Todos os procedimentos já possuem embeddings!');
      return true;
    }
    
    // Processar cada procedimento
    for (let i = 0; i < procedimentos.rows.length; i++) {
      const proc = procedimentos.rows[i];
      console.log(`\n[${i + 1}/${procedimentos.rows.length}] Processando: ${proc.titulo}`);
      
      try {
        // Para o procedimento ID 1, usar o texto completo da Pichau
        let textoCompleto = proc.id === 1 
          ? textoProcedimentoPichau 
          : `${proc.titulo}\n\n${proc.descricao_problema}\n\n${proc.solucao_completa}`;
        
        await processarProcedimentoPichau(proc.id, textoCompleto, pool);
        
        // Delay para rate limit
        if (i < procedimentos.rows.length - 1) {
          console.log(' Aguardando 1 segundo...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Erro no procedimento ${proc.id}:`, error.message);
        } else {
          console.error(`Erro no procedimento ${proc.id}:`, error);
        }
        // Continua com o próximo
      }
    }
    
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Erro geral:', error.message);
    } else {
      console.error('Erro geral:', error);
    }
    return false;
  }
}

async function testarBusca() {
  console.log('\n TESTANDO BUSCA...\n');
  
  const testCases = [
    'computador não liga',
    'tela preta', 
    'problema de memória',
    'reset BIOS'
  ];
  
  for (const query of testCases) {
    try {
      const resultados = await buscarProcedimentosSimilares(
        query,
        'hibrida',
        pool,
        2
      );
      
      if (resultados.length > 0) {
        resultados.forEach((proc, idx) => {
          const score = proc.score_final || 0;
          console.log(`  ${idx + 1}. ${proc.titulo} (Score: ${score.toFixed(3)}) [${proc.metodo}]`);
        });
      } else {
        console.log('Nenhum resultado encontrado');
      }
      
    } catch (error) {
      if (error instanceof Error) {
        console.error(` Erro na busca: ${error.message}`);
      } else {
        console.error(` Erro na busca: ${String(error)}`);
      }
    }
    
    console.log('');
  }
}

async function mostrarEstatisticas() {
  console.log('\n ESTATÍSTICAS FINAIS:');
  
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(embedding) as com_embedding_geral,
        COUNT(embedding_problema) as com_embedding_problema,
        COUNT(embedding_solucao) as com_embedding_solucao,
        ROUND(COUNT(embedding)::FLOAT / COUNT(*) * 100, 1) as percentual
      FROM procedimentos
    `);
    
    const stat = stats.rows[0];
    console.log(`Total de procedimentos: ${stat.total}`);
    console.log(`Com embedding geral: ${stat.com_embedding_geral}/${stat.total}`);
    console.log(`Com embedding problema: ${stat.com_embedding_problema}/${stat.total}`);
    console.log(`Com embedding solução: ${stat.com_embedding_solucao}/${stat.total}`);
    console.log(`Percentual completo: ${stat.percentual}%`);
    
    if (stat.percentual == '100.0') {
      console.log('\n🎉 SUCESSO! Todos os procedimentos têm embeddings!');
    }
    
  } catch (error) {
    if (error instanceof Error) {
      console.error(' Erro nas estatísticas:', error.message);
    } else {
      console.error(' Erro nas estatísticas:', error);
    }
  }
}

// Função principal
async function main() {
  console.log(' POPULATE EMBEDDINGS - PICHAU\n');
  
  const args = process.argv.slice(2);
  const apenasTestar = args.includes('--test-only');
  const testarApoPopular = args.includes('--test');
  
  try {
    // 1. Verificar conexões
    const conexoesOk = await verificarConexoes();
    if (!conexoesOk) {
      console.log('\n Erro nas conexões. Verifique:');
      console.log('- Docker PostgreSQL está rodando: docker-compose ps');
      console.log('- OPENAI_API_KEY está no .env');
      console.log('- DATABASE_URL está correto no .env');
      return;
    }
    
    // 2. Verificar estrutura do banco
    const bancoOk = await verificarEstruturaBanco();
    if (!bancoOk) {
      console.log('\n Banco sem dados. Execute primeiro:');
      console.log('docker-compose up -d');
      console.log('# Aguarde a inicialização dos scripts');
      return;
    }
    
    // 3. Popular embeddings (se não for apenas teste)
    if (!apenasTestar) {
      const populadoOk = await popularEmbeddings();
      if (!populadoOk) {
        console.log('\n Erro ao popular embeddings');
        return;
      }
    }
    
    // 4. Mostrar estatísticas
    await mostrarEstatisticas();
    
    // 5. Testar busca (se solicitado)
    if (testarApoPopular || apenasTestar) {
      await testarBusca();
    }
    
    console.log('\n✅ Script finalizado com sucesso!');
    
  } catch (error) {
    if (error instanceof Error) {
      console.error('\n ERRO GERAL:', error.message);
    } else {
      console.error('\n ERRO GERAL:', String(error));
    }
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}