import { Tool } from "langchain/tools";
import { EmbeddingService, SolutionResult } from "../services/embeddingService";
import db from "../config/database";

export class SearchProceduresTool extends Tool {
  name = "searchProcedures";
  description = "Busca soluções técnicas e cria uma resposta simplificada e direta para o cliente. Use quando o cliente reportar um problema técnico.";

  private embeddingService: EmbeddingService;
  private openaiApiKey: string;

  constructor() {
    super();
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    
    const pool = db.getPool();
    this.embeddingService = new EmbeddingService(pool, this.openaiApiKey);
  }

  async _call(input: string): Promise<string> {
    try {
      // Buscar soluções usando busca semântica
      const solutions = await this.embeddingService.buscarSolucoesSimilares(input, {
        max_results: 2,
        similarity_threshold: 0.6
      });
      
      if (solutions.length === 0) {
        return "Não encontrei uma solução específica para este problema. Vou conectar você com um técnico especializado para uma análise mais detalhada.";
      }

      const bestSolution = solutions[0];
      
      // Analisar o que o cliente já tentou
      const clienteTentou = this.analisarTentativasCliente(input);
      
      // Compilar todas as informações da solução
      const solutionData = this.compilarDadosSolucao(bestSolution, clienteTentou);
      
      // Usar LLM para criar uma resposta simplificada
      const simplifiedResponse = await this.simplificarComLLM(input, solutionData, clienteTentou);
      
      return simplifiedResponse;
      
    } catch (error) {
      console.error("Erro ao buscar soluções:", error);
      return "Ocorreu um erro ao buscar a solução. Vou conectar você com um técnico especializado imediatamente.";
    }
  }

  // ... resto dos métodos iguais ...
  private compilarDadosSolucao(solution: SolutionResult, tentativasCliente: string[]): string {
    let compiledData = `SOLUÇÃO ENCONTRADA: ${solution.title}\n`;
    compiledData += `CATEGORIA: ${solution.category}\n`;
    compiledData += `RELEVÂNCIA: ${(solution.similarity_score * 100).toFixed(1)}%\n`;
    
    if (solution.difficulty) {
      compiledData += `DIFICULDADE: ${solution.difficulty}/5\n`;
    }
    
    if (solution.estimated_time_minutes) {
      compiledData += `TEMPO ESTIMADO: ${solution.estimated_time_minutes} minutos\n`;
    }
    
    compiledData += `\n`;

    // Introdução
    if (solution.introduction) {
      compiledData += `INTRODUÇÃO:\n${solution.introduction}\n\n`;
    }

    // Descrição do problema
    if (solution.problem_description) {
      compiledData += `DESCRIÇÃO DO PROBLEMA:\n${solution.problem_description}\n\n`;
    }

    // Procedimentos detalhados
    if (solution.procedures && solution.procedures.length > 0) {
      compiledData += `PROCEDIMENTOS DETALHADOS:\n`;
      
      const sortedProcedures = [...solution.procedures].sort((a, b) => a.order - b.order);
      
      sortedProcedures.forEach(proc => {
        compiledData += `\nPASSO ${proc.order} (${proc.category?.toUpperCase() || 'GERAL'}):\n`;
        compiledData += `${proc.instruction}\n`;
        
        if (proc.safety_warning) {
          compiledData += `⚠️ ATENÇÃO: ${proc.safety_warning}\n`;
        }
        
        if (proc.estimated_minutes) {
          compiledData += `Tempo: ${proc.estimated_minutes} minutos\n`;
        }
      });
    } else {
      // Usar conteúdo completo se não houver procedimentos estruturados
      compiledData += `SOLUÇÃO COMPLETA:\n${solution.content}\n`;
    }

    // Ferramentas necessárias
    if (solution.tools_required && solution.tools_required.length > 0) {
      compiledData += `\nFERRAMENTAS NECESSÁRIAS:\n${solution.tools_required.join(', ')}\n`;
    }

    // Recursos de apoio
    if (solution.resources && solution.resources.length > 0) {
      compiledData += `\nRECURSOS DE APOIO:\n`;
      solution.resources.forEach(resource => {
        compiledData += `- ${resource.title}`;
        if (resource.url) {
          compiledData += `: ${resource.url}`;
        }
        if (resource.description) {
          compiledData += ` (${resource.description})`;
        }
        compiledData += `\n`;
      });
    }

    // Mensagem de encerramento
    if (solution.closing_message) {
      compiledData += `\nMENSAGEM FINAL:\n${solution.closing_message}\n`;
    }

    // Próximos passos
    if (solution.next_steps && solution.next_steps.length > 0) {
      compiledData += `\nPRÓXIMOS PASSOS DISPONÍVEIS:\n${solution.next_steps.join(', ')}\n`;
    }

    return compiledData;
  }

  private async simplificarComLLM(
    userInput: string, 
    solutionData: string, 
    tentativasCliente: string[]
  ): Promise<string> {
    const prompt = `Você é um assistente técnico especialista. Sua tarefa é criar uma resposta COMPLETA com TODOS os passos necessários para resolver o problema.

PROBLEMA DO CLIENTE:
"${userInput}"

${tentativasCliente.length > 0 ? `O CLIENTE JÁ TENTOU: ${tentativasCliente.join(', ')}` : ''}

DADOS TÉCNICOS DA SOLUÇÃO:
${solutionData}

INSTRUÇÕES CRÍTICAS:
1. INCLUA TODOS OS PASSOS da solução - não apenas o primeiro
2. Use linguagem simples e direta
3. Numere os passos de 1 até o final
4. Mantenha cada passo conciso mas completo
5. Se o cliente já tentou algo, mencione e pule esses passos
6. Inclua avisos de segurança importantes com ⚠️
7. Termine pedindo para testar e informar o resultado
8. NÃO limite a 300 palavras - inclua TUDO que é necessário
9. Organize logicamente: preparação → testes → soluções avançadas

FORMATO OBRIGATÓRIO:
- Reconhecimento do problema
- Lista COMPLETA numerada (1, 2, 3... até o fim)
- Todos os avisos de segurança
- Pedido de feedback final
- Links se houver

IMPORTANTE: O cliente precisa de TODOS os passos de uma vez, não apenas o primeiro. Inclua toda a sequência de troubleshooting.

Resposta COMPLETA:`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Você é um assistente técnico que fornece soluções COMPLETAS com todos os passos necessários. Nunca forneça apenas parte da solução.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1500,  // Aumentado para permitir resposta completa
          temperature: 0.2   // Mais determinístico
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API Error: ${response.status}`);
      }

      const data = await response.json() as {
        choices: { message: { content: string } }[]
      };
      console.log(`Resposta do LLM: ${data.choices[0].message.content}`);
      
      return data.choices[0].message.content.trim();
      
    } catch (error) {
      console.error('Erro ao simplificar com LLM:', error);
      
      return this.criarRespostaBasica(userInput, solutionData, tentativasCliente);
    }
  }

  private criarRespostaBasica(
    userInput: string, 
    solutionData: string, 
    tentativasCliente: string[]
  ): string {
    let response = `Vou te ajudar a resolver: "${userInput}"\n\n`;
    
    if (tentativasCliente.length > 0) {
      response += `Vi que você já tentou: ${tentativasCliente.join(', ')}\n\n`;
    }
    
    response += `Siga TODOS estes passos:\n\n`;
    
    // Extrair e incluir TODOS os passos do solutionData
    const lines = solutionData.split('\n');
    let stepNumber = 1;
    let inProcedures = false;
    
    for (const line of lines) {
      if (line.includes('PROCEDIMENTOS DETALHADOS:')) {
        inProcedures = true;
        continue;
      }
      
      if (line.includes('SOLUÇÃO COMPLETA:')) {
        inProcedures = true;
        continue;
      }
      
      if (inProcedures) {
        if (line.trim().startsWith('PASSO')) {
          const instruction = lines[lines.indexOf(line) + 1];
          if (instruction && instruction.trim()) {
            response += `${stepNumber}. ${instruction.trim()}\n\n`;
            stepNumber++;
          }
        } else if (line.includes('⚠️')) {
          response += `${line.trim()}\n\n`;
        } else if (line.trim() && 
                   !line.includes('Tempo:') && 
                   !line.includes('FERRAMENTAS') &&
                   !line.includes('RECURSOS') &&
                   !line.startsWith('PASSO') &&
                   line.length > 20) {
          // Incluir instruções completas
          response += `${stepNumber}. ${line.trim()}\n\n`;
          stepNumber++;
        }
      }
    }
    
    // Se não conseguiu extrair passos estruturados, usar o conteúdo completo
    if (stepNumber === 1) {
      const contentMatch = solutionData.match(/SOLUÇÃO COMPLETA:\n(.*?)(?:\n\n|$)/s);
      if (contentMatch) {
        const content = contentMatch[1].trim();
        const sentences = content.split(/[.!]\s+/).filter(s => s.length > 10);
        sentences.forEach((sentence, index) => {
          if (sentence.trim()) {
            response += `${index + 1}. ${sentence.trim()}.\n\n`;
          }
        });
      }
    }
    
    response += `⚠️ Desligue sempre o computador da tomada antes de mexer internamente.\n\n`;
    response += `Execute todos esses passos e me informe qual foi o resultado! 😊`;
    
    return response;
  }

  private analisarTentativasCliente(input: string): string[] {
    const tentativas: string[] = [];
    const inputLower = input.toLowerCase();
    
    const mapeamentoTentativas = {
      'trocar cabo': ['trocar cabo', 'troquei cabo', 'mudei cabo', 'testei cabo', 'cabo diferente'],
      'reiniciar': ['reiniciei', 'reiniciar', 'resetei', 'restart', 'reboot', 'religei'],
      'trocar memória': ['trocar memória', 'troquei memória', 'mudei memória', 'testei memória'],
      'limpar memória': ['limpar memória', 'limpei memória', 'limpeza', 'borracha'],
      'trocar slot': ['trocar slot', 'troquei slot', 'mudei slot'],
      'verificar fonte': ['verificar fonte', 'testei fonte', 'trocar fonte'],
      'outro monitor': ['outro monitor', 'testei monitor', 'trocar monitor'],
      'reset bios': ['reset bios', 'resetar bios', 'limpar bios', 'bateria'],
      'verificar cabos': ['verificar cabos', 'cabos', 'conexões'],
      'modo seguro': ['modo seguro', 'safe mode'],
      'atualizar driver': ['driver', 'atualizar'],
      'verificar temperatura': ['temperatura', 'cooler', 'ventilador', 'superaquecimento']
    };

    for (const [acao, palavrasChave] of Object.entries(mapeamentoTentativas)) {
      if (palavrasChave.some(palavra => inputLower.includes(palavra))) {
        tentativas.push(acao);
      }
    }

    return tentativas;
  }
}