import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { BufferMemory } from "langchain/memory";
import searchProceduresTool from "../tools/searchProcedures";
import getProcedureDetailsTool from "../tools/getProcedureDetails";
import { openaiConfig } from "../config/openai";

export class BasicSupportAgent {
  private executor: any;
  private memory = new BufferMemory({
    memoryKey: "chat_history",
    returnMessages: true,
  });

  private async init() {
    if (!this.executor) {
      const tools = [searchProceduresTool, getProcedureDetailsTool];
      this.executor = await initializeAgentExecutorWithOptions(tools, openaiConfig.getLLM(), {
        agentType: "openai-functions",
        memory: this.memory,
        verbose: true,
      });
    }
  }

  public async processMessage(message: string) {
    await this.init();
    const result = await this.executor.call({ input: message });
    return result.output as string;
  }
}
