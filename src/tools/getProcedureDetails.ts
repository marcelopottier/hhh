import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "../config/database";

const getProcedureDetailsTool = new DynamicStructuredTool({
  name: "obter_detalhes",
  description: "Obtém detalhes completos de um procedimento pelo ID",
  schema: z.object({
    procedimento_id: z.number().describe("ID do procedimento"),
  }),
  func: async ({ procedimento_id }: { procedimento_id: number }) => {
    const { rows } = await db.query(
      "SELECT id, titulo, descricao_problema, solucao_completa FROM procedimentos WHERE id = $1",
      [procedimento_id]
    );
    if (rows.length === 0) return "Procedimento não encontrado";
    return JSON.stringify(rows[0]);
  },
});

export default getProcedureDetailsTool;
