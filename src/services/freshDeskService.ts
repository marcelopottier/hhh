export class FreshDeskService {
  private static instance: FreshDeskService;
  private config: {
    domain: string;
    apiKey: string;
    baseUrl: string;
    headers: Record<string, string>;
  };

  private constructor() {
    const domain = process.env.FRESHDESK_DOMAIN;
    const apiKey = process.env.FRESHDESK_API_KEY;

    if (!domain || !apiKey) {
      throw new Error('FRESHDESK_DOMAIN e FRESHDESK_API_KEY devem estar configurados');
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

  public async escalateToHuman(ticketId: string, reason: string, urgency: string = 'medium'): Promise<any> {
    try {
      const priorityMap = { low: 1, medium: 2, high: 3, urgent: 4 };
      
      const updates = {
        status: 2, // Open
        priority: priorityMap[urgency as keyof typeof priorityMap] || 2,
        tags: ['escalated_from_ai', 'requires_human_support'],
        internal_note: {
          body: `Ticket escalado do agente AI.\n\nMotivo: ${reason}`,
          private: true
        }
      };

      const response = await fetch(`${this.config.baseUrl}/tickets/${ticketId}`, {
        method: 'PUT',
        headers: this.config.headers,
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`FreshDesk API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao escalar no FreshDesk:', error);
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/tickets?per_page=1`, {
        method: 'GET',
        headers: this.config.headers
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}