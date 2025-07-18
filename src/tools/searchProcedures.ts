//@ts-nocheck
/* tslint:disable */
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { EmbeddingService } from "../services/embeddingService";

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
      
      let solutions;
      
      if (problemTag && currentStep > 1) {
        // Buscar step específico de um problema já identificado
        console.log(`[TOOL] Buscando step ${currentStep} para problema: ${problemTag}`);
        
        solutions = await embeddingService.buscarSolucoesPorStep(problemTag, currentStep);
        
        if (solutions.length === 0) {
          console.log(`[TOOL] Nenhum step ${currentStep} encontrado para ${problemTag}`);
          return JSON.stringify({
            success: false,
            message: `Não há mais passos disponíveis para este procedimento`,
            nextStep: null,
            endOfProcedure: true,
            currentProblemTag: problemTag,
            solutions: [],
          });
        }
      } else {
        // Busca inicial por similaridade (sempre step 1)
        solutions = await embeddingService.buscarSolucoesSimilares(query, {
          max_results: maxResults,
          similarity_threshold: 0.6,
          filter_step: 1 // Sempre buscar step 1 na primeira vez
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
      
      // Pegar a melhor solução (primeira)
      const bestSolution = solutions[0];
      
      // Verificar se existe próximo step
      const hasNextStep = await embeddingService.hasNextStep(bestSolution.problem_tag, bestSolution.step);
      
      console.log(`[TOOL] Melhor solução encontrada: ${bestSolution.title} (Score: ${bestSolution.similarity_score.toFixed(3)})`);
      console.log(`[TOOL] Próximo step disponível: ${hasNextStep ? 'Sim' : 'Não'}`);
      
      // Formatar solução para o agent
      const formattedSolution = {
        id: bestSolution.id,
        problem_tag: bestSolution.problem_tag,
        step: bestSolution.step,
        title: bestSolution.title,
        content: bestSolution.content,
        score: bestSolution.similarity_score,
        procedures: bestSolution.procedures || [],
        category: bestSolution.category,
        difficulty: bestSolution.difficulty,
        estimated_time: bestSolution.estimated_time_minutes,
        introduction: bestSolution.introduction,
        closing_message: bestSolution.closing_message,
        resources: bestSolution.resources || []
      };
      
      return JSON.stringify({
        success: true,
        message: `Procedimento encontrado: ${bestSolution.title}`,
        solution: formattedSolution,
        currentStep: bestSolution.step,
        hasNextStep: hasNextStep,
        nextStep: hasNextStep ? bestSolution.step + 1 : null,
        problemTag: bestSolution.problem_tag,
        requiresFreshdeskUpdate: true,
        solutions: [formattedSolution], // Para compatibilidade
      });
      
    } catch (error) {
      console.error("[TOOL] Erro na busca:", error);
      return JSON.stringify({
        success: false,
        message: "Erro interno na busca de soluções",
        requiresEscalation: true,
        escalationReason: `Erro técnico na busca: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        solutions: [],
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  },
  {
    name: "searchProcedures",
    description: "Busca procedimentos técnicos no banco de conhecimento. Use currentStep > 1 e problemTag quando cliente voltar com feedback negativo.",
    schema: searchProceduresSchema,
  }
);