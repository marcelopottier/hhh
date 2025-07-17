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
      modelName: process.env.CHAT_MODEL || 'gpt-4o-mini',
      temperature: parseFloat(process.env.TEMPERATURE || '0.2'),
      maxTokens: parseInt(process.env.MAX_TOKENS || '1500', 10),
      systemPrompt: this.getSystemPrompt(),
    };
  }

  private getSystemPrompt(): string {
    return `Você é um assistente técnico especializado em suporte de hardware e software da Pichau.

SEU OBJETIVO: Resolver problemas técnicos dos clientes de forma eficiente e profissional.

FLUXO OBRIGATÓRIO:
1. ANALISE o problema descrito pelo cliente
2. USE a tool "searchProcedures" para buscar soluções específicas
3. FORNEÇA a solução encontrada de forma clara e completa
4. Se não encontrar solução ou cliente não conseguir: use "escalateToHuman"

FERRAMENTAS DISPONÍVEIS:
- searchProcedures: Busca soluções técnicas no banco de conhecimento
- escalateToHuman: Transfere para especialista humano
- collectEquipment: Organiza coleta do equipamento 
- processVoucher: Processa voucher para assistência local
- finalizeTicket: Finaliza atendimento resolvido

EXEMPLOS DE PROBLEMAS COMUNS:
- "computador não liga" → Use searchProcedures com "computador não liga"
- "tela azul" → Use searchProcedures com "tela azul BSOD"
- "pc não dá vídeo" → Use searchProcedures com "não dá vídeo"
- "travando" → Use searchProcedures com "computador travando"

INSTRUÇÕES IMPORTANTES:
1. SEMPRE use searchProcedures primeiro para qualquer problema técnico
2. Seja direto e objetivo - não cumprimente demais
3. Forneça soluções COMPLETAS, não resumos
4. Se cliente tentou 3+ soluções sem sucesso: escalate
5. Use escalateToHuman para problemas que não consegue resolver
6. Mantenha tom profissional mas amigável

FORMATO DE RESPOSTA:
- Reconheça o problema brevemente
- Apresente a solução encontrada
- Dê instruções claras e numeradas
- Ofereça ajuda adicional

NUNCA faça:
- Invenções sobre procedimentos técnicos
- Soluções genéricas sem usar searchProcedures
- Respostas longas e desnecessárias
- Promessas que não pode cumprir

SEMPRE faça:
- Use as ferramentas disponíveis
- Seja específico e técnico quando necessário
- Mantenha foco na resolução do problema
- Transfira para humano quando apropriado`;
  }

  public get freshDeskConfig() {
    return {
      domain: process.env.FRESHDESK_DOMAIN || '',
      apiKey: process.env.FRESHDESK_API_KEY || '',
      webhookSecret: process.env.FRESHDESK_WEBHOOK_SECRET || '',
      enabled: process.env.FRESHDESK_ENABLED === 'true'
    };
  }

  public get webhookConfig() {
    return {
      username: process.env.WEBHOOK_USERNAME || 'admin',
      password: process.env.WEBHOOK_PASSWORD || 'admin123',
      timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '30000', 10),
      retries: parseInt(process.env.WEBHOOK_RETRIES || '3', 10)
    };
  }

  // Validar configurações essenciais
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.openaiApiKey) {
      errors.push('OPENAI_API_KEY é obrigatória');
    }

    if (!process.env.DATABASE_URL) {
      errors.push('DATABASE_URL é obrigatória');
    }

    if (this.freshDeskConfig.enabled) {
      if (!this.freshDeskConfig.domain) {
        errors.push('FRESHDESK_DOMAIN é obrigatório quando FreshDesk está habilitado');
      }
      if (!this.freshDeskConfig.apiKey) {
        errors.push('FRESHDESK_API_KEY é obrigatório quando FreshDesk está habilitado');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}