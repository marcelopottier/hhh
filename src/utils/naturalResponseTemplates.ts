// src/utils/naturalResponseTemplates.ts

export interface ResponseTemplate {
  openings: string[];
  transitions: string[];
  closings: string[];
  acknowledgments: string[];
}

export const naturalResponseTemplates = {
  primeira_vez: {
    openings: [
      "Entendi o problema.",
      "Certo, vamos resolver isso.",
      "Compreendo a situação.",
      "Pelo que você descreveu",
      "Vamos trabalhar nisso."
    ],
    transitions: [
      "Primeiro, vamos fazer alguns testes:",
      "Vamos começar com as verificações básicas:",
      "Iniciando pelos procedimentos padrão:",
      "Preciso que você teste algumas coisas:",
      "Vamos seguir esta sequência:"
    ],
    closings: [
      "Execute esses passos e me informe o resultado.",
      "Faça esses testes e me retorne com o feedback.",
      "Teste essas soluções e me conte como foi.",
      "Realize esses procedimentos e me dê um retorno.",
      "Após executar, me informe se resolveu."
    ],
    acknowledgments: []
  },

  follow_up: {
    openings: [
      "Entendi.",
      "Certo, vamos continuar.",
      "Perfeito, próximo passo.",
      "Ok, vamos prosseguir.",
      "Compreendo."
    ],
    transitions: [
      "Agora vamos testar:",
      "Próximo procedimento:",
      "Vamos avançar para:",
      "Agora preciso que você:",
      "Vamos prosseguir com:"
    ],
    closings: [
      "Verifique se isso resolve.",
      "Teste e me informe.",
      "Como foi esse procedimento?",
      "Funcionou?",
      "Me conte o resultado."
    ],
    acknowledgments: [
      "Vi que você já tentou {tentativas}.",
      "Entendi que você executou {tentativas}.",
      "Como você já fez {tentativas},"
    ]
  },

  problema_persiste: {
    openings: [
      "Se ainda não resolveu",
      "Compreendo que persiste.",
      "Vejo que ainda há o problema.",
      "Entendo que ainda não funcionou.",
      "Se o problema continua"
    ],
    transitions: [
      "Vamos tentar um procedimento mais específico:",
      "Vamos partir para uma abordagem mais avançada:",
      "Agora vamos fazer uma verificação mais detalhada:",
      "Vamos tentar outra estratégia:",
      "Precisamos testar algo diferente:"
    ],
    closings: [
      "Se não resolver, vamos considerar outras opções.",
      "Me informe se isso soluciona.",
      "Vamos ver se agora funciona.",
      "Esperamos que isso resolva.",
      "Teste e me retorne."
    ],
    acknowledgments: [
      "Sei que pode ser frustrante quando não resolve imediatamente.",
      "Entendo, alguns problemas requerem mais tentativas.",
      "Normal, certas situações são mais complexas."
    ]
  },

  novo_problema: {
    openings: [
      "Vejo que o problema mudou.",
      "Ah, agora é uma situação diferente.",
      "Entendi, temos um novo problema.",
      "Compreendo, houve uma mudança.",
      "Ok, então agora é outra questão."
    ],
    transitions: [
      "Vamos focar neste novo problema:",
      "Vamos resolver esta nova situação:",
      "Agora vamos trabalhar nisso:",
      "Vamos abordar esta questão:",
      "Vamos resolver esta mudança:"
    ],
    closings: [
      "Vamos ver se resolve esta nova situação.",
      "Teste e me informe se há mudanças.",
      "Me conte como ficou.",
      "Verifique se isso resolve o novo problema.",
      "Espero que agora normalize."
    ],
    acknowledgments: [
      "Pelo menos não é mais {problema_anterior}.",
      "Interessante que evoluiu de {problema_anterior}.",
      "Ok, progresso! Antes era {problema_anterior}."
    ]
  }
};

export class NaturalResponseGenerator {
  private templates = naturalResponseTemplates;

  generateResponse(
    context: keyof typeof naturalResponseTemplates,
    solutionSteps: string[],
    tentativasCliente: string[] = [],
    problemaAnterior?: string
  ): string {
    const template = this.templates[context];
    
    // Selecionar elementos aleatórios
    const opening = this.getRandomElement(template.openings);
    const transition = this.getRandomElement(template.transitions);
    const closing = this.getRandomElement(template.closings);
    
    let response = opening;
    
    // Adicionar reconhecimento se necessário
    if (tentativasCliente.length > 0 && template.acknowledgments.length > 0) {
      const acknowledgment = this.getRandomElement(template.acknowledgments);
      response += ` ${acknowledgment.replace('{tentativas}', tentativasCliente.join(', '))}`;
    }
    
    if (problemaAnterior && context === 'novo_problema') {
      const acknowledgment = this.getRandomElement(template.acknowledgments);
      response += ` ${acknowledgment.replace('{problema_anterior}', problemaAnterior)}`;
    }
    
    response += `\n\n${transition}\n\n`;
    
    // Adicionar passos
    solutionSteps.forEach((step, index) => {
      response += `${index + 1}. ${step}\n`;
    });
    
    response += `\n${closing}`;
    
    return response;
  }

  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}

// Função para processar linguagem técnica para natural (versão formal)
export function processarLinguagemTecnica(texto: string): string {
  const substituicoes = {
    'Pressione o botão': 'Pressione o botão',
    'Execute o comando': 'Execute o comando',
    'Verifique se': 'Verifique se',
    'Certifique-se': 'Certifique-se',
    'Realize': 'Realize',
    'Efetue': 'Execute',
    'Conecte': 'Conecte',
    'Desconecte': 'Desconecte',
    'Reinicie o sistema': 'Reinicie o computador',
    'Reinicie o computador': 'Reinicie o computador',
    'Aguarde': 'Aguarde',
    'Observe': 'Observe',
    'Localize': 'Localize',
    'Identifique': 'Identifique',
    'Proceda': 'Proceda',
    'Acesse': 'Acesse',
    'Navegue': 'Navegue',
    'Selecione': 'Selecione',
    'Clique': 'Clique',
    'Digite': 'Digite',
    'Insira': 'Insira',
    'Remova': 'Remova',
    'Instale': 'Instale',
    'Desinstale': 'Desinstale',
    'Configure': 'Configure',
    'Ative': 'Ative',
    'Desative': 'Desative',
    'Habilite': 'Habilite',
    'Desabilite': 'Desabilite',
    'Atualize': 'Atualize',
    'Baixe': 'Baixe',
    'Faça o download': 'Baixe',
    'Salve': 'Salve',
    'Feche': 'Feche',
    'Abra': 'Abra',
    'Minimize': 'Minimize',
    'Maximize': 'Maximize',
    'Restaure': 'Restaure',
    'Cancele': 'Cancele',
    'Confirme': 'Confirme',
    'Aceite': 'Aceite',
    'Rejeite': 'Rejeite',
    'Ignore': 'Ignore',
    'Prossiga': 'Prossiga',
    'Interrompa': 'Interrompa',
    'Finalize': 'Finalize',
    'Conclua': 'Conclua',
    'Utilize': 'Utilize',
    'Empregue': 'Utilize',
    'Aplique': 'Aplique',
    'Implemente': 'Implemente',
    'Estabeleça': 'Estabeleça',
    'Determine': 'Determine',
    'Mantenha': 'Mantenha',
    'Preserve': 'Preserve',
    'Substitua': 'Substitua',
    'Substitui': 'Substitua',
    'Altere': 'Altere',
    'Modifique': 'Modifique',
    'Ajuste': 'Ajuste',
    'Corrija': 'Corrija',
    'Repare': 'Repare',
    'Solucione': 'Solucione',
    'Resolva': 'Resolva',
    'Teste': 'Teste',
    'Experimente': 'Experimente',
    'Tente': 'Tente'
  };

  let textoProcessado = texto;
  
  // Aplicar apenas limpezas sutis, mantendo formalidade
  for (const [formal, melhorado] of Object.entries(substituicoes)) {
    const regex = new RegExp(`\\b${formal}\\b`, 'gi');
    textoProcessado = textoProcessado.replace(regex, melhorado);
  }

  // Processar frases específicas técnicas de forma mais elegante
  const frasesEspecificas = [
    {
      pattern: /Prompt de Comando como Administrador/gi,
      replacement: 'Prompt de Comando como Administrador'
    },
    {
      pattern: /Gerenciador de Dispositivos/gi,
      replacement: 'Gerenciador de Dispositivos'
    },
    {
      pattern: /Painel de Controle/gi,
      replacement: 'Painel de Controle'
    },
    {
      pattern: /Configurações do Sistema/gi,
      replacement: 'Configurações do Sistema'
    },
    {
      pattern: /Propriedades do Sistema/gi,
      replacement: 'Propriedades do Sistema'
    },
    {
      pattern: /Reinicie o computador e/gi,
      replacement: 'Reinicie o computador e'
    },
    {
      pattern: /Desligue o computador/gi,
      replacement: 'Desligue o computador'
    },
    {
      pattern: /Ligue o computador/gi,
      replacement: 'Ligue o computador'
    }
  ];

  frasesEspecificas.forEach(({ pattern, replacement }) => {
    textoProcessado = textoProcessado.replace(pattern, replacement);
  });

  return textoProcessado;
}

// Função para detectar e humanizar avisos de segurança (versão formal)
export function humanizarAvisoSeguranca(aviso: string): string {
  const avisosComuns = {
    'Desligue o computador antes de manusear componentes internos': 'Importante: desligue o computador da tomada antes de manusear componentes internos',
    'Certifique-se de que o computador está completamente desligado': 'Certifique-se de que o computador está completamente desligado da tomada',
    'Manuseie a bateria com cuidado': 'Manuseie a bateria com cuidado',
    'Não toque em componentes eletrônicos com as mãos molhadas': 'Nunca manuseie componentes eletrônicos com as mãos molhadas',
    'Use uma pulseira antiestática': 'Recomendo usar pulseira antiestática ou tocar no gabinete antes de manusear',
    'Desconecte o cabo de alimentação': 'Desconecte o cabo de alimentação da tomada',
    'Não force conexões': 'Não force conexões - se não encaixar naturalmente, verifique a orientação',
    'Mantenha o ambiente limpo': 'Trabalhe em ambiente limpo e livre de poeira'
  };

  let avisoHumanizado = aviso;
  
  for (const [original, humanizado] of Object.entries(avisosComuns)) {
    if (aviso.toLowerCase().includes(original.toLowerCase())) {
      avisoHumanizado = humanizado;
      break;
    }
  }
  
  return avisoHumanizado;
}

// Função para detectar expressões de tempo de forma natural mas formal
export function humanizarTempo(minutos: number): string {
  if (minutos <= 2) return 'cerca de 2 minutos';
  if (minutos <= 5) return 'aproximadamente 5 minutos';
  if (minutos <= 10) return 'cerca de 10 minutos';
  if (minutos <= 15) return 'aproximadamente 15 minutos';
  if (minutos <= 30) return 'cerca de 30 minutos';
  if (minutos <= 60) return 'aproximadamente 1 hora';
  return 'mais de 1 hora';
}

// Função para criar variações naturais de confirmação (versão formal)
export function gerarConfirmacaoNatural(): string {
  const confirmacoes = [
    'Consegue realizar esses procedimentos?',
    'Pode executar esses passos?',
    'Tem alguma dúvida sobre esses procedimentos?',
    'Está claro?',
    'Consegue seguir essas instruções?',
    'Alguma questão sobre esses passos?',
    'Pode testar essas soluções?',
    'Está tudo compreensível?',
    'Consegue executar essas verificações?',
    'Tem alguma pergunta sobre o procedimento?'
  ];
  
  return confirmacoes[Math.floor(Math.random() * confirmacoes.length)];
}

// Função para adicionar expressões de apoio (versão formal)
export function adicionarApoioEmocional(contexto: string): string {
  const apoios = {
    problema_dificil: [
      'Entendo que pode ser frustrante, mas vamos resolver isso.',
      'Sei que é uma situação chata, mas vamos encontrar a solução.',
      'Compreendo a situação, vamos trabalhar juntos nisso.',
      'Entendo sua preocupação, vamos resolver passo a passo.',
      'Sei que é inconveniente, mas vamos solucionar isso.'
    ],
    progresso: [
      'Excelente, vamos continuar.',
      'Perfeito, vamos ao próximo passo.',
      'Ótimo progresso, vamos prosseguir.',
      'Muito bem, vamos avançar.',
      'Perfeito, está no caminho certo.'
    ],
    tentativa_falhou: [
      'Sem problemas, vamos tentar outra abordagem.',
      'Entendo, vamos testar uma alternativa.',
      'Compreendo, temos outras opções.',
      'Tudo bem, vamos por outro caminho.',
      'Sem problemas, vamos testar algo diferente.'
    ],
    sucesso: [
      'Excelente! Problema resolvido.',
      'Perfeito! Funcionou como esperado.',
      'Ótimo! Tudo funcionando normalmente.',
      'Muito bem! Situação resolvida.',
      'Excelente! Tudo normalizado.'
    ]
  };

  const opcoesContexto = apoios[contexto as keyof typeof apoios];
  if (!opcoesContexto) return '';
  
  return opcoesContexto[Math.floor(Math.random() * opcoesContexto.length)];
}