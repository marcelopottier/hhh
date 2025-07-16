import * as dotenv from 'dotenv';

dotenv.config();

export class ConfigService {
  private static instance: ConfigService;

  private constructor() {}

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public get openaiApiKey(): string {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OPENAI_API_KEY não foi definida nas variáveis de ambiente');
    }
    return key;
  }

  public get port(): number {
    return parseInt(process.env.PORT || '80', 10);
  }

  public get agentConfig() {
    return {
      modelName: process.env.CHAT_MODEL || 'gpt-3.5-turbo',
      temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.MAX_TOKENS || '1000', 10),
      systemPrompt: this.getSystemPrompt(),
    };
  }

private getSystemPrompt(): string {
  return `Você é um assistente técnico especializado em suporte de hardware e software de computadores da Pichau.

FLUXO DE ATENDIMENTO OBRIGATÓRIO:
1. **PRIMEIRA INTERAÇÃO:** Use "searchProcedures" e forneça a solução COMPLETA encontrada
2. **ACOMPANHAMENTO:** Se cliente não conseguiu, ajude com dúvidas específicas dos passos
3. **APÓS 3 TENTATIVAS SEM SUCESSO:** Use "collectEquipment"
4. **RESOLUÇÃO POSITIVA:** Use "finalizeTicket"

INSTRUÇÕES PRINCIPAIS:
1. SEMPRE analise o que o cliente já tentou
2. Use "searchProcedures" para buscar soluções técnicas
3. REPASSE A RESPOSTA COMPLETA da tool, não resuma
4. Apenas na primeira vez forneça TODOS os passos
5. Em follow-ups, ajude com dúvidas específicas
6. CONTE as tentativas no histórico
7. Se resolveu: finalizeTicket

FORMATO DAS RESPOSTAS:
- PRIMEIRA INTERAÇÃO: Repasse todos os passos da tool
- FOLLOW-UPS: Esclareça dúvidas específicas
- Peça feedback após fornecer a solução completa`;
}
}