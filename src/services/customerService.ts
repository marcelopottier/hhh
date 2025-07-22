import { Pool } from 'pg';
import db from '../config/database';

export interface CustomerData {
  customerId: string;
  name?: string;
  email?: string;
  phone?: string;
  preferredName?: string;
  lastInteraction?: Date;
  totalInteractions?: number;
}

export class CustomerService {
  private static instance: CustomerService;
  private pool: Pool;
  private customerCache: Map<string, CustomerData> = new Map();

  private constructor() {
    this.pool = db.getPool();
  }

  public static getInstance(): CustomerService {
    if (!CustomerService.instance) {
      CustomerService.instance = new CustomerService();
    }
    return CustomerService.instance;
  }

  /**
   * Obter informações do cliente (com cache)
   */
  public async getCustomerInfo(customerId: string): Promise<CustomerData> {
    // Verificar cache primeiro
    if (this.customerCache.has(customerId)) {
      const cached = this.customerCache.get(customerId)!;
      // Cache válido por 1 hora
      if (cached.lastInteraction && (Date.now() - cached.lastInteraction.getTime()) < 3600000) {
        return cached;
      }
    }

    try {
      // Buscar no banco de dados
      const customerData = await this.fetchCustomerFromDatabase(customerId);
      
      // Atualizar cache
      this.customerCache.set(customerId, customerData);
      
      return customerData;
    } catch (error) {
      console.error(`Erro ao buscar cliente ${customerId}:`, error);
      
      // Retornar dados mínimos
      return {
        customerId,
        lastInteraction: new Date()
      };
    }
  }

  /**
   * Buscar cliente no banco de dados
   */
  private async fetchCustomerFromDatabase(customerId: string): Promise<CustomerData> {
    try {
      // Buscar nas sessões de conversa para extrair informações
      const sessionQuery = await this.pool.query(`
        SELECT 
          customer_id,
          COUNT(*) as total_interactions,
          MAX(last_active_at) as last_interaction,
          -- Tentar extrair nome de metadados das mensagens
          (
            SELECT metadata->>'customerName'
            FROM conversation_messages 
            WHERE thread_id IN (
              SELECT thread_id FROM conversation_sessions WHERE customer_id = $1
            )
            AND metadata ? 'customerName'
            LIMIT 1
          ) as extracted_name
        FROM conversation_sessions
        WHERE customer_id = $1
        GROUP BY customer_id
      `, [customerId]);

      if (sessionQuery.rows.length > 0) {
        const row = sessionQuery.rows[0];
        return {
          customerId,
          name: row.extracted_name,
          totalInteractions: parseInt(row.total_interactions),
          lastInteraction: new Date(row.last_interaction)
        };
      }

      // Se não encontrou no banco, retornar dados mínimos
      return {
        customerId,
        lastInteraction: new Date()
      };

    } catch (error) {
      console.error('Erro ao buscar no banco:', error);
      return {
        customerId,
        lastInteraction: new Date()
      };
    }
  }

  /**
   * Atualizar informações do cliente
   */
  public async updateCustomerInfo(customerId: string, updates: Partial<CustomerData>): Promise<void> {
    try {
      const existing = await this.getCustomerInfo(customerId);
      const updated = { ...existing, ...updates, lastInteraction: new Date() };
      
      // Atualizar cache
      this.customerCache.set(customerId, updated);
      
      // Aqui você pode implementar persistência no banco se necessário
      console.log(`[CUSTOMER] Informações atualizadas para ${customerId}:`, updates);
      
    } catch (error) {
      console.error(`Erro ao atualizar cliente ${customerId}:`, error);
    }
  }

  /**
   * Extrair nome de uma mensagem (se mencionado)
   */
  public extractNameFromMessage(message: string): string | null {
    // Padrões comuns onde o cliente menciona o nome
    const patterns = [
      /meu nome é ([a-záàâãéèêíìîóòôõúùûç\s]+)/i,
      /me chamo ([a-záàâãéèêíìîóòôõúùûç\s]+)/i,
      /sou (?:a|o) ([a-záàâãéèêíìîóòôõúùûç\s]+)/i,
      /(?:eu sou|sou) ([a-záàâãéèêíìîóòôõúùûç\s]+)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Validar se parece um nome real (2-30 caracteres, sem números)
        if (name.length >= 2 && name.length <= 30 && !/\d/.test(name)) {
          return name;
        }
      }
    }

    return null;
  }

  /**
   * Limpar cache (manutenção)
   */
  public clearCache(): void {
    this.customerCache.clear();
    console.log('[CUSTOMER] Cache limpo');
  }
}