export interface CustomerInfo {
  name?: string;
  customerId: string;
  email?: string;
  preferredGreeting?: string;
}

export interface FormattingOptions {
  includeGreeting: boolean;
  convertToHtml: boolean;
  emailFormat: boolean;
  customerInfo?: CustomerInfo;
}

export class ResponseFormatter {
  private static instance: ResponseFormatter;

  private constructor() {}

  public static getInstance(): ResponseFormatter {
    if (!ResponseFormatter.instance) {
      ResponseFormatter.instance = new ResponseFormatter();
    }
    return ResponseFormatter.instance;
  }

  /**
   * Formatar resposta completa com cumprimento e conversão HTML
   */
  public formatResponse(
    response: string, 
    customerInfo: CustomerInfo, 
    options: Partial<FormattingOptions> = {}
  ): string {
    const config: FormattingOptions = {
      includeGreeting: true,
      convertToHtml: true,
      emailFormat: true,
      ...options,
      customerInfo
    };

    let formattedResponse = response;

    // 1. Adicionar cumprimento
    if (config.includeGreeting) {
      formattedResponse = this.addGreeting(formattedResponse, customerInfo);
    }

    // 2. Converter markdown para HTML
    if (config.convertToHtml) {
      formattedResponse = this.markdownToHtml(formattedResponse);
    }

    // 3. Aplicar formatação para email
    if (config.emailFormat) {
      formattedResponse = this.applyEmailFormatting(formattedResponse);
    }

    return formattedResponse;
  }

  /**
   * Adicionar cumprimento personalizado
   */
  private addGreeting(response: string, customerInfo: CustomerInfo): string {
    const customerName = this.extractCustomerName(customerInfo);
    const greeting = this.generateGreeting(customerName);
    
    // Verificar se já tem cumprimento
    const hasGreeting = response.toLowerCase().match(/^(olá|oi|bom dia|boa tarde|boa noite)/);
    
    if (hasGreeting) {
      // Substituir cumprimento existente
      return response.replace(/^(olá|oi|bom dia|boa tarde|boa noite)[^,!.]*[,!.]?\s*/i, `${greeting} `);
    } else {
      // Adicionar cumprimento no início
      return `${greeting}\n\n${response}`;
    }
  }

  /**
   * Extrair nome do cliente de várias fontes
   */
  private extractCustomerName(customerInfo: CustomerInfo): string {
    // Prioridade: nome fornecido > extrair do email > usar customerId
    if (customerInfo.name && customerInfo.name.trim()) {
      return this.formatName(customerInfo.name);
    }

    if (customerInfo.email) {
      const nameFromEmail = this.extractNameFromEmail(customerInfo.email);
      if (nameFromEmail) {
        return nameFromEmail;
      }
    }

    // Fallback para customerId mais amigável
    return this.formatCustomerId(customerInfo.customerId);
  }

  /**
   * Formatar nome do cliente
   */
  private formatName(name: string): string {
    return name
      .trim()
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .slice(0, 2) // Usar apenas primeiro e segundo nome
      .join(' ');
  }

  /**
   * Extrair nome do email
   */
  private extractNameFromEmail(email: string): string | null {
    const localPart = email.split('@')[0];
    
    // Substituir separadores comuns
    const cleanName = localPart
      .replace(/[._-]/g, ' ')
      .replace(/\d+/g, '') // Remover números
      .trim();

    // Se tem pelo menos 2 caracteres e não é genérico
    if (cleanName.length >= 2 && !this.isGenericEmail(cleanName)) {
      return this.formatName(cleanName);
    }

    return null;
  }

  /**
   * Verificar se é email genérico
   */
  private isGenericEmail(name: string): boolean {
    const genericPatterns = [
      'admin', 'test', 'user', 'cliente', 'support', 'info', 'contact',
      'vendas', 'compras', 'atendimento', 'suporte'
    ];
    
    return genericPatterns.some(pattern => 
      name.toLowerCase().includes(pattern)
    );
  }

  /**
   * Formatar customerId para ser mais amigável
   */
  private formatCustomerId(customerId: string): string {
    // Se é numérico, usar apenas "Cliente"
    if (/^\d+$/.test(customerId)) {
      return 'Cliente';
    }
    
    // Se tem letras, tentar formatar
    return customerId.charAt(0).toUpperCase() + customerId.slice(1).toLowerCase();
  }

  /**
   * Gerar cumprimento baseado no horário
   */
  private generateGreeting(customerName: string): string {
    const hour = new Date().getHours();
    let timeGreeting: string;

    if (hour >= 5 && hour < 12) {
      timeGreeting = 'Bom dia';
    } else if (hour >= 12 && hour < 18) {
      timeGreeting = 'Boa tarde';
    } else {
      timeGreeting = 'Boa noite';
    }

    return `${timeGreeting}, ${customerName}!`;
  }

  /**
   * Converter Markdown para HTML
   */
  private markdownToHtml(markdown: string): string {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Code inline
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Listas não ordenadas
    html = html.replace(/^\• (.*)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.*)$/gm, '<li>$1</li>');
    html = html.replace(/^\* (.*)$/gm, '<li>$1</li>');

    // Listas numeradas
    html = html.replace(/^\d+\. (.*)$/gm, '<li>$1</li>');

    // Agrupar listas
    html = this.groupLists(html);

    // Quebras de linha
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Emojis e símbolos especiais
    html = html.replace(/✅/g, '<span style="color: #28a745;">✅</span>');
    html = html.replace(/❌/g, '<span style="color: #dc3545;">❌</span>');
    html = html.replace(/⚠️/g, '<span style="color: #ffc107;">⚠️</span>');
    html = html.replace(/📋/g, '<span style="color: #007bff;">📋</span>');
    html = html.replace(/🔧/g, '<span style="color: #6c757d;">🔧</span>');

    // Envolver em parágrafos se não estiver
    if (!html.startsWith('<')) {
      html = `<p>${html}</p>`;
    }

    return html;
  }

  /**
   * Agrupar itens de lista em tags ul/ol
   */
  private groupLists(html: string): string {
    // Agrupar listas não ordenadas
    html = html.replace(/(<li>.*<\/li>\s*)+/g, (match) => {
      return `<ul>${match}</ul>`;
    });

    // Se há números, converter para lista ordenada
    html = html.replace(/<ul>(<li>\d+\..*<\/li>\s*)+<\/ul>/g, (match) => {
      const items = match.replace(/<ul>|<\/ul>/g, '').replace(/\d+\./g, '');
      return `<ol>${items}</ol>`;
    });

    return html;
  }

  /**
   * Aplicar formatação específica para email
   */
  private applyEmailFormatting(html: string): string {
    // Adicionar estilos inline para melhor compatibilidade com email
    html = html.replace(/<h1>/g, '<h1 style="color: #2c3e50; font-size: 24px; margin: 20px 0 10px 0;">');
    html = html.replace(/<h2>/g, '<h2 style="color: #34495e; font-size: 20px; margin: 15px 0 8px 0;">');
    html = html.replace(/<h3>/g, '<h3 style="color: #34495e; font-size: 18px; margin: 12px 0 6px 0;">');
    
    html = html.replace(/<p>/g, '<p style="margin: 10px 0; line-height: 1.6;">');
    html = html.replace(/<strong>/g, '<strong style="color: #2c3e50;">');
    html = html.replace(/<code>/g, '<code style="background: #f8f9fa; padding: 2px 4px; border-radius: 3px; font-family: monospace;">');
    
    html = html.replace(/<ul>/g, '<ul style="margin: 10px 0; padding-left: 20px;">');
    html = html.replace(/<ol>/g, '<ol style="margin: 10px 0; padding-left: 20px;">');
    html = html.replace(/<li>/g, '<li style="margin: 5px 0; line-height: 1.4;">');
    
    html = html.replace(/<a href="/g, '<a style="color: #007bff; text-decoration: none;" href="');

    // Adicionar estrutura de email
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        ${html}
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 14px; color: #666; text-align: center;">
          <strong>Pichau Suporte Técnico</strong><br>
        </p>
      </div>
    `;
  }

  /**
   * Método público para conversão simples markdown→HTML
   */
  public simpleMarkdownToHtml(markdown: string): string {
    return this.markdownToHtml(markdown);
  }

  /**
   * Método público para adicionar apenas cumprimento
   */
  public addGreetingOnly(response: string, customerInfo: CustomerInfo): string {
    return this.addGreeting(response, customerInfo);
  }
}