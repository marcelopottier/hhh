//@ts-nocheck
/* tslint:disable */
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { EmbeddingService } from "../services/embeddingService";

const searchProceduresSchema = z.object({
  query: z.string().describe("A consulta do cliente sobre o problema técnico"),
  maxResults: z.number().optional().default(3).describe("Número máximo de resultados"),
});

export const searchProceduresTool = tool(
  async ({ query, maxResults = 3 }) => {
    console.log(`[TOOL] Buscando procedimentos: "${query}"`);
    
    try {
      const embeddingService = EmbeddingService.getInstance();
      
      const solutions = await embeddingService.buscarSolucoesSimilares(query, {
        max_results: maxResults,
        similarity_threshold: 0.6,
      });
      
      if (solutions.length === 0) {
        return JSON.stringify({
          success: false,
          message: "Nenhuma solução específica encontrada",
          solutions: [],
        });
      }
      
      // Formatar soluções para o agent
      const formattedSolutions = solutions.map(solution => ({
        id: solution.id,
        title: solution.title,
        content: solution.content,
        score: solution.similarity_score,
        procedures: solution.procedures || [],
        category: solution.category,
        difficulty: solution.difficulty,
        estimated_time: solution.estimated_time_minutes,
      }));
      
      return JSON.stringify({
        success: true,
        message: `Encontradas ${solutions.length} soluções relevantes`,
        solutions: formattedSolutions,
      });
      
    } catch (error) {
      console.error("[TOOL] Erro na busca:", error);
      return JSON.stringify({
        success: false,
        message: "Erro interno na busca de soluções",
        solutions: [],
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  },
  {
    name: "searchProcedures",
    description: "Busca procedimentos técnicos baseado na consulta do cliente sobre problemas de hardware ou software",
    schema: searchProceduresSchema,
  }
);