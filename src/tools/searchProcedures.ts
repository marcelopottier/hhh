import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "../config/database";
import { getEmbedding, embeddingParaPostgres } from "../services/embeddingService";

const searchProceduresTool = new DynamicStructuredTool({
  name: "buscar_procedimentos",
  description: "Busca procedimentos semelhantes ao problema informado",
  schema: z.object({
    problema: z.string().describe("Descrição do problema"),
    limite: z.number().default(3).describe("Número máximo de resultados"),
  }),
  func: async ({ problema, limite }: { problema: string; limite: number }) => {
    const { embedding } = await getEmbedding(problema);
    const embeddingStr = embeddingParaPostgres(embedding);
    const query = `
      SELECT id, titulo, descricao_problema,
             1 - (embedding <=> $1::vector) AS score
      FROM procedimentos
      ORDER BY embedding <-> $1::vector
      LIMIT $2
    `;
    const { rows } = await db.query(query, [embeddingStr, limite]);
    if (rows.length === 0) return "Nenhum procedimento encontrado";
    return JSON.stringify(rows);
  },
});

export default searchProceduresTool;
