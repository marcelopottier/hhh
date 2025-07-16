import * as dotenv from 'dotenv';

dotenv.config();

interface FreshDeskTicketUpdate {
  status?: number;
  priority?: number;
  tags?: string[];
  custom_fields?: Record<string, any>;
  internal_note?: {
    body: string;
    private: boolean;
  };
  public_note?: {
    body: string;
    private: boolean;
  };
}

interface FreshDeskConfig {
  domain: string;
  apiKey: string;
  baseUrl: string;
  headers: Record<string, string>;
}

export class FreshDeskService {
  private static instance: FreshDeskService;
  private config: FreshDeskConfig;

  private constructor() {
    const domain = process.env.FRESHDESK_DOMAIN;
    const apiKey = process.env.FRESHDESK_API_KEY;

    if (!domain || !apiKey) {
      throw new Error('FRESHDESK_DOMAIN e FRESHDESK_API_KEY devem estar configurados no .env');
    }

    this.config = {
      domain,
      apiKey,
      baseUrl: `https://${domain}.freshdesk.com/api/v2`,
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':X').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    };
  }

  public static getInstance(): FreshDeskService {
    if (!FreshDeskService.instance) {
      FreshDeskService.instance = new FreshDeskService();
    }
    return FreshDeskService.instance;
  }

  /**
   * Atualiza um ticket no FreshDesk
   */
  public async updateTicket(ticketId: string, updates: FreshDeskTicketUpdate): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/tickets/${ticketId}`, {
        method: 'PUT',
        headers: this.config.headers,
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`FreshDesk API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`[FRESHDESK] Ticket ${ticketId} atualizado com sucesso`);
      return result;

    } catch (error) {
      console.error(`[FRESHDESK] Erro ao atualizar ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Adiciona nota ao ticket
   */
  public async addNoteToTicket(ticketId: string, message: string, isPrivate: boolean = false): Promise<any> {
    try {
      const noteData = {
        body: message,
        private: isPrivate
      };

      const response = await fetch(`${this.config.baseUrl}/tickets/${ticketId}/notes`, {
        method: 'POST',
        headers: this.config.headers,
        body: JSON.stringify(noteData)
      });

      if (!response.ok) {
        throw new Error(`FreshDesk API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`[FRESHDESK] Nota adicionada ao ticket ${ticketId}`);
      return result;

    } catch (error) {
      console.error(`[FRESHDESK] Erro ao adicionar nota ao ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Finaliza ticket como resolvido
   */
  public async resolveTicket(ticketId: string, resolution: string, rating?: number): Promise<any> {
    const updates: FreshDeskTicketUpdate = {
      status: 4, // Status "Resolved"
      tags: ['resolved_by_ai', 'technical_support'],
      internal_note: {
        body: `Ticket resolvido pelo agente AI.\n\nSolução aplicada: ${resolution}${rating ? `\nAvaliação do cliente: ${rating}/5` : ''}`,
        private: true
      }
    };

    return this.updateTicket(ticketId, updates);
  }

  /**
   * Escala ticket para humano
   */
  public async escalateToHuman(ticketId: string, reason: string, urgency: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): Promise<any> {
    const priorityMap = { low: 1, medium: 2, high: 3, urgent: 4 };
    
    const updates: FreshDeskTicketUpdate = {
      status: 2, // Status "Open"
      priority: priorityMap[urgency],
      tags: ['escalated_from_ai', 'requires_human_support'],
      internal_note: {
        body: `Ticket escalado do agente AI para atendimento humano.\n\nMotivo: ${reason}\n\nPróximos passos necessários: Análise técnica especializada.`,
        private: true
      }
    };

    return this.updateTicket(ticketId, updates);
  }

  /**
   * Processa voucher no FreshDesk
   */
  public async processVoucher(ticketId: string, voucherCode: string, customerLocation: string, customerId: string): Promise<any> {
    const updates: FreshDeskTicketUpdate = {
      status: 6, // Status customizado para "Voucher Processado"
      tags: ['voucher_approved', 'remote_location', 'awaiting_human_finalization'],
      custom_fields: {
        voucher_code: voucherCode,
        customer_location: customerLocation,
        voucher_value: 150.00
      },
      internal_note: {
        body: `Voucher gerado pelo agente AI:\n\n• Código: ${voucherCode}\n• Valor: R$ 150,00\n• Cliente: ${customerId}\n• Localização: ${customerLocation}\n\nAção necessária: Técnico deve entrar em contato para finalizar processo do voucher.`,
        private: true
      },
      public_note: {
        body: `Seu voucher foi aprovado! Código: ${voucherCode}. Um técnico entrará em contato em breve para finalizar os detalhes.`,
        private: false
      }
    };

    return this.updateTicket(ticketId, updates);
  }

  /**
   * Agenda coleta no FreshDesk
   */
  public async scheduleCollection(ticketId: string, collectId: string, customerLocation: string, customerId: string): Promise<any> {
    const updates: FreshDeskTicketUpdate = {
      status: 7, // Status customizado para "Coleta Agendada"
      tags: ['collection_scheduled', 'equipment_pickup', 'awaiting_logistics'],
      custom_fields: {
        collection_id: collectId,
        customer_location: customerLocation,
        collection_status: 'scheduled'
      },
      internal_note: {
        body: `Coleta agendada pelo agente AI:\n\n• Protocolo: ${collectId}\n• Cliente: ${customerId}\n• Localização: ${customerLocation}\n\nAção necessária: Logística deve entrar em contato em até 24h para agendar coleta.`,
        private: true
      }
    };

    return this.updateTicket(ticketId, updates);
  }

  /**
   * Obtém informações do ticket
   */
  public async getTicket(ticketId: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/tickets/${ticketId}`, {
        method: 'GET',
        headers: this.config.headers
      });

      if (!response.ok) {
        throw new Error(`FreshDesk API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error(`[FRESHDESK] Erro ao buscar ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Testa conexão com FreshDesk
   */
  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/tickets?per_page=1`, {
        method: 'GET',
        headers: this.config.headers
      });

      return response.ok;
    } catch (error) {
      console.error('[FRESHDESK] Erro na conexão:', error);
      return false;
    }
  }
}