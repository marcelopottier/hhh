import { SupportStateType } from "../state";
import { createSystemMessage } from "../utils/messageHelpers";

export async function analyzeQuery(state: SupportStateType): Promise<Partial<SupportStateType>> {
  const { currentQuery, threadId } = state;
  
  console.log(`[ANALYZE] Analisando: "${currentQuery}"`);
  
  // Extrair tentativas do cliente
  const clientAttempts = extractClientAttempts(currentQuery);
  
  // Identificar tipo de problema
  const problemType = identifyProblemType(currentQuery);
  
  // Extrair palavras-chave
  const keywords = extractKeywords(currentQuery);
  
  // Criar mensagem de sistema para log usando função auxiliar
  const analysisMessage = createSystemMessage(
    `Análise: ${problemType}. Tentativas: ${clientAttempts.join(", ") || "nenhuma"}. Keywords: ${keywords.join(", ")}`,
    threadId || '', // garantir que threadId não é undefined
    'analysis_complete',
    {
      problemType,
      clientAttempts,
      keywords,
      queryLength: currentQuery.length
    }
  );
  
  return {
    clientAttempts,
    messages: [analysisMessage],
    conversationContext: {
      threadId: threadId || '',
      problemsDiscussed: [problemType],
      solutionsAttempted: [],
      clientAttempts,
      feedbackHistory: [],
      escalationHistory: [],
      frustrationLevel: detectFrustrationLevel(currentQuery),
      extractedKeywords: keywords,
      topicEvolution: [{
        topic: problemType,
        timestamp: new Date(),
        confidence: 0.8
      }],
    },
    context: {
      problemType,
      analysisComplete: true,
      keywords,
    },
  };
}

// Funções auxiliares (mantém igual)
function extractClientAttempts(query: string): string[] {
  const attempts: string[] = [];
  const queryLower = query.toLowerCase();
  
  const patterns = {
    'reiniciar': ['reiniciei', 'reiniciar', 'restart', 'reboot'],
    'trocar_cabo': ['trocar cabo', 'troquei cabo', 'mudei cabo'],
    'limpar_memoria': ['limpar memória', 'limpei memória', 'borracha'],
    'outro_monitor': ['outro monitor', 'testei monitor', 'monitor diferente'],
    'verificar_cabos': ['verificar cabos', 'cabos', 'conexões'],
    'reset_bios': ['reset bios', 'bateria', 'cmos', 'resetar bios'],
    'trocar_fonte': ['trocar fonte', 'testei fonte', 'fonte diferente'],
  };
  
  for (const [attempt, words] of Object.entries(patterns)) {
    if (words.some(word => queryLower.includes(word))) {
      attempts.push(attempt);
    }
  }
  
  return attempts;
}

function identifyProblemType(query: string): string {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('não liga') || queryLower.includes('não ligar')) {
    return 'boot_issue';
  } else if (queryLower.includes('tela azul') || queryLower.includes('bsod')) {
    return 'system_crash';
  } else if (queryLower.includes('desliga sozinho') || queryLower.includes('desligando')) {
    return 'power_issue';
  } else if (queryLower.includes('tela preta') || queryLower.includes('sem imagem')) {
    return 'display_issue';
  } else if (queryLower.includes('lento') || queryLower.includes('travando')) {
    return 'performance_issue';
  } else if (queryLower.includes('internet') || queryLower.includes('wifi')) {
    return 'network_issue';
  }
  
  return 'general_issue';
}

function extractKeywords(query: string): string[] {
  const keywords: string[] = [];
  const queryLower = query.toLowerCase();
  
  const technicalTerms = [
    'computador', 'pc', 'notebook', 'desktop',
    'windows', 'linux', 'mac',
    'memória', 'ram', 'hd', 'ssd',
    'placa', 'vídeo', 'som', 'rede',
    'driver', 'update', 'atualização',
    'erro', 'problema', 'falha',
    'ligar', 'desligar', 'reiniciar',
    'tela', 'monitor', 'display',
    'cabo', 'fonte', 'energia'
  ];
  
  for (const term of technicalTerms) {
    if (queryLower.includes(term)) {
      keywords.push(term);
    }
  }
  
  return keywords;
}

function detectFrustrationLevel(query: string): number {
  const queryLower = query.toLowerCase();
  let frustration = 0;
  
  const frustratedWords = [
    'não funciona', 'não consegui', 'impossível', 
    'horrível', 'péssimo', 'terrível',
    'já tentei tudo', 'nada funciona'
  ];
  
  const urgentWords = [
    'urgente', 'rápido', 'imediato', 'preciso agora'
  ];
  
  const repeatedWords = [
    'novamente', 'de novo', 'outra vez', 'ainda'
  ];
  
  for (const word of frustratedWords) {
    if (queryLower.includes(word)) frustration += 2;
  }
  
  for (const word of urgentWords) {
    if (queryLower.includes(word)) frustration += 1;
  }
  
  for (const word of repeatedWords) {
    if (queryLower.includes(word)) frustration += 1;
  }
  
  return Math.min(frustration, 5);
}