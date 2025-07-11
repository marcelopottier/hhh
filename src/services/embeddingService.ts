import OpenAI from 'openai';

// Configuração do cliente OpenAI
const openai = new OpenAI({
  apiKey: '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',
});

// Interfaces para tipagem
interface EmbeddingResponse {
  embedding: number[];
  tokens_used: number;
}

interface ProcedimentoEmbeddings {
  embedding_problema: number[];
  embedding_solucao: number[];
  embedding_geral: number[];
}

interface TextoProcedimento {
  problema: string;
  solucao: string;
  completo: string;
}

// Função principal para gerar embedding
export async function getEmbedding(
  texto: string,
  model: string = "text-embedding-ada-002"
): Promise<EmbeddingResponse> {
  try {
    // Limpar e preprocessar o texto
    const textoLimpo = preprocessarTexto(texto);
    
    const response = await openai.embeddings.create({
      model: model,
      input: textoLimpo,
      encoding_format: "float",
    });

    return {
      embedding: response.data[0].embedding,
      tokens_used: response.usage.total_tokens
    };
  } catch (error) {
    console.error('Erro ao gerar embedding:', error);
    throw new Error(`Falha ao gerar embedding: ${error}`);
  }
}

// Função para gerar múltiplos embeddings de uma vez
export async function getEmbeddingsBatch(
  textos: string[],
  model: string = "text-embedding-ada-002"
): Promise<EmbeddingResponse[]> {
  try {
    // Limitar a 100 textos por batch (limite da OpenAI)
    if (textos.length > 100) {
      throw new Error('Máximo 100 textos por batch');
    }

    const textosLimpos = textos.map(preprocessarTexto);
    
    const response = await openai.embeddings.create({
      model: model,
      input: textosLimpos,
      encoding_format: "float",
    });

    return response.data.map((item, index) => ({
      embedding: item.embedding,
      tokens_used: Math.ceil(response.usage.total_tokens / textos.length) // Estimativa
    }));
  } catch (error) {
    console.error('Erro ao gerar embeddings em batch:', error);
    throw new Error(`Falha ao gerar embeddings em batch: ${error}`);
  }
}

// Função especializada para procedimentos da Pichau
export async function gerarEmbeddingsProcedimento(
  textoCompleto: string
): Promise<ProcedimentoEmbeddings> {
  try {
    // Separar o texto em partes
    const textos = separarTextoProcedimento(textoCompleto);
    
    // Gerar embeddings para cada parte
    const [embeddingProblema, embeddingSolucao, embeddingGeral] = await Promise.all([
      getEmbedding(textos.problema),
      getEmbedding(textos.solucao),
      getEmbedding(textos.completo)
    ]);

    return {
      embedding_problema: embeddingProblema.embedding,
      embedding_solucao: embeddingSolucao.embedding,
      embedding_geral: embeddingGeral.embedding,
    };
  } catch (error) {
    console.error('Erro ao gerar embeddings do procedimento:', error);
    throw error;
  }
}

// Função para separar texto do procedimento
function separarTextoProcedimento(textoCompleto: string): TextoProcedimento {
  // Identificar seções do texto
  const linhas = textoCompleto.split('\n').filter(linha => linha.trim());
  
  let problema = '';
  let solucao = '';
  
  // Extrair descrição do problema (primeiras linhas antes dos passos)
  const indicePrimeiroPasso = linhas.findIndex(linha => 
    linha.includes('- ') || linha.includes('1 -') || linha.includes('•')
  );
  
  if (indicePrimeiroPasso > 0) {
    problema = linhas.slice(0, indicePrimeiroPasso).join(' ');
  }
  
  // Extrair soluções (passos do procedimento)
  const passosInicio = indicePrimeiroPasso >= 0 ? indicePrimeiroPasso : 0;
  const indiceLinks = linhas.findIndex(linha => 
    linha.includes('http') || linha.includes('youtu.be')
  );
  
  const passosFim = indiceLinks >= 0 ? indiceLinks : linhas.length;
  solucao = linhas.slice(passosInicio, passosFim)
    .map(linha => linha.replace(/^- |^\d+ - |^• /, '')) // Remove marcadores
    .join(' ');
  
  return {
    problema: problema || 'Problema de hardware ou software',
    solucao: solucao || textoCompleto,
    completo: textoCompleto
  };
}

// Função para preprocessar texto antes do embedding
function preprocessarTexto(texto: string): string {
  return texto
    // Remover URLs
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/youtu\.be\/[^\s]+/g, '')
    
    // Remover caracteres especiais excessivos
    .replace(/[^\w\s\-.,!?()]/g, ' ')
    
    // Normalizar espaços
    .replace(/\s+/g, ' ')
    
    // Remover cortesias desnecessárias
    .replace(/por gentileza,?/gi, '')
    .replace(/qualquer dúvida estou a disposição!?/gi, '')
    .replace(/estarei aguardando seu retorno/gi, '')
    
    // Padronizar termos técnicos
    .replace(/\bpc\b/gi, 'computador')
    .replace(/\bmemórias?\b/gi, 'memória RAM')
    .replace(/\bcabo de energia\b/gi, 'cabo de alimentação')
    
    .trim();
}

// Função utilitária para converter embedding para formato PostgreSQL
export function embeddingParaPostgres(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

// Função para salvar embeddings no banco
export async function salvarEmbeddingsNoBanco(
  procedimentoId: number,
  embeddings: ProcedimentoEmbeddings,
  dbClient: any // Use seu cliente de DB (pg, prisma, etc.)
): Promise<void> {
  try {
    const query = `
      UPDATE procedimentos 
      SET 
        embedding_problema = $1::vector(1536),
        embedding_solucao = $2::vector(1536),
        embedding = $3::vector(1536),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `;
    
    await dbClient.query(query, [
      embeddingParaPostgres(embeddings.embedding_problema),
      embeddingParaPostgres(embeddings.embedding_solucao),
      embeddingParaPostgres(embeddings.embedding_geral),
      procedimentoId
    ]);
    
    console.log(`Embeddings salvos para procedimento ${procedimentoId}`);
  } catch (error) {
    console.error('Erro ao salvar embeddings:', error);
    throw error;
  }
}

// Exemplo de uso completo
export async function processarProcedimentoPichau(
  procedimentoId: number,
  textoCompleto: string,
  dbClient: any
): Promise<void> {
  try {
    console.log(`Processando procedimento ${procedimentoId}...`);
    
    // Gerar embeddings
    const embeddings = await gerarEmbeddingsProcedimento(textoCompleto);
    
    // Salvar no banco
    await salvarEmbeddingsNoBanco(procedimentoId, embeddings, dbClient);
    
    console.log(`✅ Procedimento ${procedimentoId} processado com sucesso!`);
  } catch (error) {
    console.error(`❌ Erro ao processar procedimento ${procedimentoId}:`, error);
    throw error;
  }
}

// Função para processar todos os procedimentos em lote
export async function processarTodosProcedimentos(dbClient: any): Promise<void> {
  try {
    // Buscar procedimentos sem embeddings
    const procedimentos = await dbClient.query(`
      SELECT id, titulo, descricao_problema, solucao_completa 
      FROM procedimentos 
      WHERE embedding IS NULL
    `);
    
    console.log(`Encontrados ${procedimentos.rows.length} procedimentos para processar`);
    
    for (const proc of procedimentos.rows) {
      const textoCompleto = `${proc.titulo}\n${proc.descricao_problema}\n${proc.solucao_completa}`;
      
      await processarProcedimentoPichau(proc.id, textoCompleto, dbClient);
      
      // Delay para respeitar rate limits da OpenAI
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Todos os procedimentos foram processados!');
  } catch (error) {
    console.error('❌ Erro ao processar procedimentos:', error);
    throw error;
  }
}

// Exemplo de uso para busca
export async function buscarProcedimentosSimilares(
  queryTexto: string,
  tipoBusca: 'problema' | 'solucao' | 'hibrida' = 'hibrida',
  dbClient: any,
  limite: number = 5
): Promise<any[]> {
  try {
    // Gerar embedding da query
    const { embedding } = await getEmbedding(queryTexto);
    const embeddingStr = embeddingParaPostgres(embedding);
    
    // Executar busca no banco
    const resultado = await dbClient.query(`
      SELECT * FROM buscar_procedimentos_avancado(
        $1, $2::vector(1536), $3, $4, 0.7
      )
    `, [queryTexto, embeddingStr, tipoBusca, limite]);
    
    return resultado.rows;
  } catch (error) {
    console.error('Erro na busca semântica:', error);
    throw error;
  }
}