import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { Tool } from "langchain/tools";
import { EscalateToHumanTool } from "../tools/escalateToHumanTool";
import { CollectEquipmentTool } from "../tools/collectEquipmentTool";
import { ProcessVoucherTool } from "../tools/processVoucherTool";
import { FinalizeTicketTool } from "../tools/finalizeTicketTool";
import { ConfigService } from "../config/config";
import { SearchProceduresTool } from "../tools/searchProcedureTool";
import { Pool } from "pg";

export class LangGraphAgent {
  private static instance: LangGraphAgent;
  private graph: any;
  private checkpointer: MemorySaver;
  private llm: ChatOpenAI;
  private tools: Tool[];
  private config: ConfigService;

  private constructor() {
    this.config = ConfigService.getInstance();
    this.checkpointer = new MemorySaver();
    this.llm = new ChatOpenAI({
      openAIApiKey: this.config.openaiApiKey,
      modelName: this.config.agentConfig.modelName,
      temperature: this.config.agentConfig.temperature,
      maxTokens: this.config.agentConfig.maxTokens,
    });

    this.tools = [
      new SearchProceduresTool(),
      new EscalateToHumanTool(),
      new CollectEquipmentTool(),
      new ProcessVoucherTool(),
      new FinalizeTicketTool(),
    ];
  }

  public static getInstance(): LangGraphAgent {
    if (!LangGraphAgent.instance) {
      LangGraphAgent.instance = new LangGraphAgent();
    }
    return LangGraphAgent.instance;
  }

  public async initialize(): Promise<void> {
    this.graph = createReactAgent({
      llm: this.llm,
      tools: this.tools,
      checkpointSaver: this.checkpointer,
      prompt: this.config.agentConfig.systemPrompt,
    });
  }

  public async processQuery(
    message: string, 
    threadId: string
  ): Promise<{ response: string; messages: any[] }> {
    
    const config = { 
      configurable: { 
        thread_id: threadId 
      } 
    };

    const result = await this.graph.invoke(
      { messages: [{ role: "user", content: message }] },
      config
    );

    return {
      response: result.messages[result.messages.length - 1].content,
      messages: result.messages
    };
  }

  public async streamQuery(
    message: string,
    threadId: string
  ): Promise<AsyncGenerator<any, void, unknown>> {
    
    const config = { 
      configurable: { 
        thread_id: threadId 
      } 
    };

    return this.graph.stream(
      { messages: [{ role: "user", content: message }] },
      config
    );
  }
}