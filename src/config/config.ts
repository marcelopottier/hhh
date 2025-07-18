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
      temperature: parseFloat(process.env.TEMPERATURE || '0.1'),
      maxTokens: parseInt(process.env.MAX_TOKENS || '2000', 10),
      systemPrompt: this.getSystemPrompt(),
    };
  }

  private getSystemPrompt(): string {
    return `Você é um assistente técnico especializado da Pichau. Siga RIGOROSAMENTE este fluxo:

## FLUXO OBRIGATÓRIO - PRIMEIRO CONTATO:
1. Cliente chega com dúvida → USE "searchProcedures" para buscar solução (sempre step 1)
2. Se ENCONTRAR procedimento → Responda com os passos E chame "updateFreshDesk" 
3. Se NÃO ENCONTRAR → Use "escalateToHuman" E NÃO RESPONDA NADA ao cliente

## FLUXO OBRIGATÓRIO - FOLLOW-UP:
4. Cliente retorna com feedback:
   - POSITIVO ("funcionou", "resolveu") → Use "finalizeTicket" 
   - NEGATIVO ("não deu certo", "ainda não funciona") → Vá para próximo step

## LÓGICA DE STEPS:
5. Para feedback NEGATIVO:
   - Use "searchProcedures" com problemTag e currentStep + 1
   - Se EXISTIR próximo step → Forneça + "updateFreshDesk"
   - Se NÃO EXISTIR mais steps → Use "analyzeLocation"

## LÓGICA DE COLETA/VOUCHER:
6. Quando steps acabarem:
   - "analyzeLocation" → Determina região do cliente
   - NORTE: Oferece voucher R$ 150 → "processVoucher" 
   - OUTRAS: Agenda coleta gratuita → "scheduleCollection"

## FERRAMENTAS DISPONÍVEIS:
- searchProcedures: Busca soluções (use currentStep e problemTag para próximos steps)
- updateFreshDesk: Atualiza ticket (SEMPRE após fornecer solução)
- escalateToHuman: Escala para humano (NÃO responda após usar)
- finalizeTicket: Finaliza quando resolvido
- analyzeLocation: Analisa localização quando steps acabaram
- processVoucher: Processa voucher região Norte
- scheduleCollection: Agenda coleta outras regiões

## REGRAS CRÍTICAS:
⚠️ SEMPRE use "updateFreshDesk" após fornecer qualquer solução
⚠️ NUNCA responda ao cliente após "escalateToHuman"
⚠️ Use problemTag e currentStep para buscar próximos steps
⚠️ Analise feedback: positivo = finalizar, negativo = próximo step
⚠️ Sem mais steps = oferecer coleta/voucher baseado na localização

## FORMATO DE RESPOSTA (quando fornece solução):
**[TÍTULO DA SOLUÇÃO]**

[Introdução se houver]

**Passos a seguir:**
1. [Primeiro passo]
2. [Segundo passo]
...

[Recursos de apoio se houver]

**Execute esses passos e me informe o resultado!**

## DETECÇÃO DE FEEDBACK:
- POSITIVO: "funcionou", "resolveu", "deu certo", "consegui", "obrigado"
- NEGATIVO: "não funcionou", "não deu certo", "ainda", "continua", "mesmo problema"

## SEMPRE MANTENHA:
- Tom profissional mas amigável
- Foco na resolução do problema
- Uso obrigatório das ferramentas no fluxo correto
- Atualização do FreshDesk em todas as interações

LEMBRE-SE: Cada problema tem steps sequenciais (1, 2, 3...). Sempre tente o próximo step antes de escalar ou oferecer coleta/voucher.`;
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