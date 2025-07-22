import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { EmbeddingService } from "../services/embeddingService";
import { BaseSolution, FormattedSolution, SolutionProcedure, SolutionResource } from "../types/solution";

const searchProceduresSchema = z.object({
  query: z.string().describe("A consulta do cliente sobre o problema técnico"),
  currentStep: z.number().optional().default(1).describe("Step atual do procedimento (1 para primeira busca)"),
  problemTag: z.string().optional().describe("Tag do problema já identificado (para buscar próximo step)"),
  maxResults: z.number().optional().default(3).describe("Número máximo de resultados"),
});

export const searchProceduresTool = tool(
  async ({ query, currentStep = 1, problemTag, maxResults = 3 }) => {
    console.log(`[TOOL] Buscando procedimentos: "${query}" - Step: ${currentStep}${problemTag ? `, Tag: ${problemTag}` : ''}`);
    
    try {
      const embeddingService = EmbeddingService.getInstance();
      
      let solutions: BaseSolution[];
      
      if (problemTag && currentStep > 1) {
        console.log(`[TOOL] Buscando step ${currentStep} para problema: ${problemTag}`);
        solutions = await embeddingService.buscarSolucoesPorStep(problemTag, currentStep);
        
        if (solutions.length === 0) {
          console.log(`[TOOL] Nenhum step ${currentStep} encontrado para ${problemTag}`);
          return JSON.stringify({
            success: false,
            message: `Não encontrei mais passos para este procedimento. Para prosseguir, preciso do seu endereço completo.`,
            needsAddress: true,
            endOfProcedure: true,
            currentProblemTag: problemTag,
            currentStep: currentStep,
            solutions: [],
            nextAction: "request_address"
          });
        }
      } else {
        console.log(`[TOOL] Busca inicial por similaridade: "${query}"`);
        solutions = await embeddingService.buscarSolucoesSimilares(query, {
          max_results: maxResults,
          similarity_threshold: 0.6,
          filter_step: 1
        });
      }
      
      if (solutions.length === 0) {
        console.log(`[TOOL] Nenhuma solução encontrada para: "${query}"`);
        return JSON.stringify({
          success: false,
          message: "Nenhuma solução específica encontrada no banco de conhecimento",
          requiresEscalation: true,
          escalationReason: `Consulta sem procedimento conhecido: "${query}"`,
          solutions: [],
        });
      }
      
      const bestSolution = solutions[0];
      const hasNextStep = await embeddingService.hasNextStep(bestSolution.problem_tag, bestSolution.step);
      
      console.log(`[TOOL] ✅ Solução encontrada: ${bestSolution.title}`);
      console.log(`[TOOL] 📋 Procedimentos: ${bestSolution.procedures?.length || 0} passos`);
      
      // Construir resposta formatada completa
      const formattedResponse = formatCompleteProcedure(bestSolution);
      
      // Criar objeto FormattedSolution
      const formattedSolution: FormattedSolution = {
        ...bestSolution,
        formattedResponse: formattedResponse,
        score: bestSolution.similarity_score
      };
      
      return JSON.stringify({
        success: true,
        message: "PROCEDURE_FOUND",
        solution: formattedSolution, // ← Agora com tipo correto
        currentStep: bestSolution.step,
        hasNextStep: hasNextStep,
        nextStep: hasNextStep ? bestSolution.step + 1 : null,
        problemTag: bestSolution.problem_tag,
        requiresFreshdeskUpdate: true,
        useFormattedResponse: true
      });
      
    } catch (error) {
      console.error("[TOOL] Erro na busca:", error);
      return JSON.stringify({
        success: false,
        message: "Erro interno na busca de soluções",
        requiresEscalation: true,
        escalationReason: `Erro técnico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        solutions: [],
      });
    }
  },
  {
    name: "searchProcedures",
    description: "Busca procedimentos técnicos detalhados no banco. SEMPRE retorna procedimento COMPLETO quando encontrado.",
    schema: searchProceduresSchema,
  }
);

// Função para formatar procedimento completo (MELHORADA)
function formatCompleteProcedure(solution: BaseSolution): string {
  let response = `**${solution.title}**\n\n`;
  
  // Adicionar introdução se houver
  if (solution.introduction && solution.introduction.trim()) {
    response += `${solution.introduction}\n\n`;
  }
  
  // Adicionar descrição do problema se houver
  if (solution.problem_description && solution.problem_description.trim()) {
    response += `**Problema:** ${solution.problem_description}\n\n`;
  }
  
  response += `**Procedimento completo:**\n\n`;
  
  // Adicionar procedimentos detalhados
  if (solution.procedures && solution.procedures.length > 0) {
    // Ordenar por ordem
    const sortedProcedures = solution.procedures.sort((a: SolutionProcedure, b: SolutionProcedure) => a.order - b.order);
    
    sortedProcedures.forEach((proc: SolutionProcedure, index: number) => {
      response += `${index + 1}. ${proc.instruction}\n`;
      
      // Adicionar aviso de segurança se houver
      if (proc.safety_warning && proc.safety_warning.trim()) {
        response += `   ⚠️ **Atenção:** ${proc.safety_warning}\n`;
      }
      
      // Adicionar tempo estimado se houver
      if (proc.estimated_minutes && proc.estimated_minutes > 0) {
        response += `   ⏱️ Tempo estimado: ${proc.estimated_minutes} minutos\n`;
      }
      
      response += `\n`;
    });
  } else if (solution.content && solution.content.trim()) {
    // Fallback para content se não houver procedures estruturados
    // Tentar quebrar o content em passos se possível
    const contentLines = solution.content.split('\n').filter(line => line.trim());
    let stepNumber = 1;
    
    contentLines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        // Se a linha já começa com número, manter
        if (/^\d+\./.test(trimmedLine)) {
          response += `${trimmedLine}\n`;
        } 
        // Se parece um passo (começou com •, -, ou similar)
        else if (/^[•\-\*]/.test(trimmedLine)) {
          response += `${stepNumber}. ${trimmedLine.substring(1).trim()}\n`;
          stepNumber++;
        }
        // Linha normal de conteúdo
        else {
          response += `${stepNumber}. ${trimmedLine}\n`;
          stepNumber++;
        }
      }
    });
    response += `\n`;
  }
  
  // Adicionar recursos de apoio
  if (solution.resources && solution.resources.length > 0) {
    response += `**Recursos de apoio:**\n`;
    solution.resources.forEach((resource: SolutionResource) => {
      response += `• **${resource.title}**`;
      if (resource.url && resource.url.trim()) {
        response += `: ${resource.url}`;
      }
      if (resource.description && resource.description.trim()) {
        response += ` - ${resource.description}`;
      }
      response += `\n`;
    });
    response += `\n`;
  }
  
  // Adicionar mensagem de fechamento
  if (solution.closing_message && solution.closing_message.trim()) {
    response += `${solution.closing_message}\n`;
  } else {
    response += `**Execute todos esses passos e me informe o resultado!**\n`;
  }
  
  return response;
}