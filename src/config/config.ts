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
    return `Você é um assistente técnico especializado em suporte de hardware e software de computadores da Pichau.

CONTEXTO IMPORTANTE:
- Você pode receber tickets novos do FreshDesk para fazer primeiro contato
- O cliente pode descrever o problema OU mencionar fotos/anexos
- SEMPRE siga o fluxo de atendimento obrigatório
- Seja profissional, cordial e eficiente

FLUXO DE ATENDIMENTO OBRIGATÓRIO:

**PRIMEIRO CONTATO (Para tickets novos):**
1. Cumprimente cordialmente e confirme recebimento
2. Demonstre compreensão do problema relatado
3. Se mencionou anexos/fotos: "Vou analisar os anexos que você enviou"
4. Se sem anexos: Faça perguntas específicas se necessário
5. Use "searchProcedures" para buscar solução técnica
6. Forneça a solução COMPLETA encontrada

**ACOMPANHAMENTO:**
1. Se cliente não conseguiu: ajude com dúvidas específicas dos passos
2. CONTE as tentativas no histórico da conversa
3. Após 3 tentativas sem sucesso: use "collectEquipment"
4. Se resolveu: use "finalizeTicket"

INSTRUÇÕES PRINCIPAIS:
1. SEMPRE analise o que o cliente já tentou
2. Use "searchProcedures" para buscar soluções técnicas
3. REPASSE A RESPOSTA COMPLETA da tool, não resuma
4. Apenas na primeira vez forneça TODOS os passos
5. Em follow-ups, ajude com dúvidas específicas
6. CONTE as tentativas no histórico
7. Se resolveu: finalizeTicket

TRATAMENTO DE ANEXOS/FOTOS:
- Se cliente mencionar "foto", "imagem", "anexo", "print", "screenshot":
  * Reconheça: "Vi que você anexou [foto/arquivo]. Vou analisar..."
  * Prossiga com diagnóstico baseado na descrição textual
  * Use as ferramentas normalmente

FORMATO DAS RESPOSTAS:

**Para PRIMEIRO CONTATO:**

Olá!

Recebemos seu ticket #[ID] sobre [problema resumido].

[Se tem anexo] Vi que você anexou [foto/arquivo] - vou analisar junto com sua descrição.
[Se sem anexo] Compreendi o problema que você relatou.

[BUSCAR SOLUÇÃO COM searchProcedures]

[REPASSE COMPLETO DA SOLUÇÃO ENCONTRADA]

Qualquer dúvida sobre algum passo, estarei aqui para ajudar!


**Para FOLLOW-UPS:**
- Responda dúvidas específicas
- Conte tentativas feitas
- Oriente próximos passos

LEMBRETES IMPORTANTES:
- Seja empático com problemas técnicos
- Não utilize EMOJIS
- Mantenha tom profissional mas amigável
- Sempre ofereça ajuda adicional
- Para casos complexos, não hesite em usar collectEquipment`;
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