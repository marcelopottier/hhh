import { FreshDeskService } from './freshDeskService';
import { LangGraphAgent } from './langGraphAgent';
import { ConversationService } from './conversationService';

export interface FreshDeskTicket {
  id: number;
  subject: string;
  description: string;
  description_text: string;
  priority: number;
  status: number;
  requester_id: number;
  responder_id: number;
  group_id: number;
  source: number;
  type: string;
  due_by: string;
  fr_due_by: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  attachments: Array<{
    id: number;
    name: string;
    content_type: string;
    size: number;
    created_at: string;
    updated_at: string;
    attachment_url: string;
  }>;
  custom_fields: {
    pedido?: number;
    cf_situao_atendimento?: string;
    cf_fsm_contact_name?: string;
    cf_fsm_phone_number?: string;
    cf_fsm_service_location?: string;
    cf_fsm_appointment_start_time?: string;
    cf_fsm_appointment_end_time?: string;
  };
  cc_emails: string[];
  fwd_emails: string[];
  reply_cc_emails: string[];
  company_id?: number;
  fr_escalated: boolean;
  spam: boolean;
  is_escalated: boolean;
  nr_due_by: string;
  nr_escalated: boolean;
}

export class FreshDeskWebhookService {
  private static instance: FreshDeskWebhookService;
  private freshDeskService: FreshDeskService;
  private agent: LangGraphAgent;
  private conversationService: ConversationService;
  private processingTickets: Set<number> = new Set();

  private constructor() {
    this.freshDeskService = FreshDeskService.getInstance();
    this.agent = LangGraphAgent.getInstance();
    this.conversationService = ConversationService.getInstance();
  }

  public static getInstance(): FreshDeskWebhookService {
    if (!FreshDeskWebhookService.instance) {
      FreshDeskWebhookService.instance = new FreshDeskWebhookService();
    }
    return FreshDeskWebhookService.instance;
  }

  /**
   * Processa webhook recebido com ID do ticket
   */
  public async processWebhook(ticketId: number): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    
    try {
      // Verificar se já está processando este ticket
      if (this.processingTickets.has(ticketId)) {
        console.log(`[WEBHOOK] ⏭️ Ticket ${ticketId} já está sendo processado, ignorando duplicata`);
        return {
          success: true,
          message: `Ticket ${ticketId} já está sendo processado`
        };
      }

      // Marcar como processando
      this.processingTickets.add(ticketId);

      console.log(`[WEBHOOK] 🔄 Processando ticket ID: ${ticketId}`);

      // ETAPA 1: Buscar informações do ticket no FreshDesk
      const ticketData = await this.getTicketData(ticketId);
      
      if (!ticketData) {
        throw new Error(`Não foi possível obter dados do ticket ${ticketId}`);
      }

      // ETAPA 2: Verificar se já existe uma sessão para este ticket
      const threadId = `ticket_${ticketId}`;
      const existingSession = await this.conversationService.getSession(threadId);
      
      if (existingSession) {
        console.log(`[WEBHOOK] 📋 Conversa existente encontrada - ${existingSession.totalMessages} mensagens`);
        return await this.handleFollowUp(ticketData, existingSession);
      } else {
        console.log(`[WEBHOOK] 🆕 Nova conversa - primeiro contato`);
        return await this.handleFirstContact(ticketData);
      }

    } catch (error) {
      console.error(`[WEBHOOK] ❌ Erro ao processar ticket ${ticketId}:`, error);
      
      return {
        success: false,
        message: `Erro ao processar ticket: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    } finally {
      const processingTime = Date.now() - startTime;
      console.log(`[WEBHOOK] ⏱️ Processamento do ticket ${ticketId} finalizado em ${processingTime}ms`);
      
      // Remover da lista de processamento após 5 segundos
      setTimeout(() => {
        this.processingTickets.delete(ticketId);
      }, 5000);
    }
  }

  /**
   * Lidar com primeiro contato
   */
  private async handleFirstContact(ticket: FreshDeskTicket): Promise<{ success: boolean; message: string }> {
    try {
      // Analisar problema
      const problemAnalysis = this.analyzeTicketProblem(ticket);
      const hasAttachments = ticket.attachments && ticket.attachments.length > 0;

      const threadId = `ticket_${ticket.id}`;
      
      // Criar nova sessão de conversa
      const session = await this.conversationService.createSession({
        threadId,
        customerId: ticket.requester_id.toString(),
        primaryIssueCategory: problemAnalysis.category,
        primaryIssueDescription: ticket.description_text,
        tags: [
          ...ticket.tags,
          problemAnalysis.category,
          hasAttachments ? 'with_attachments' : 'text_only',
          `priority_${ticket.priority}`
        ],
        userAgent: `FreshDesk-Ticket-${ticket.id}`,
        deviceType: 'freshdesk_integration'
      });

      console.log(`[WEBHOOK] ✅ Sessão criada: ${session.threadId}`);

      // Construir contexto de primeiro contato
      const agentContext = this.buildFirstContactContext(ticket, problemAnalysis, hasAttachments);
      
      // Processar com agent LangGraph
      const agentResponse = await this.agent.processQuery(
        agentContext,
        threadId
      );

      // Atualizar sessão com resultado
      await this.conversationService.updateSession(threadId, {
        status: 'active',
        issueResolved: false
      });

      // Enviar resposta
      await this.sendFirstResponse(ticket, agentResponse.response);

      console.log(`[WEBHOOK] ✅ Primeiro contato processado com sucesso para ticket ${ticket.id}`);
      
      return {
        success: true,
        message: `Primeiro contato realizado para ticket ${ticket.id}`
      };

    } catch (error) {
      console.error(`[WEBHOOK] ❌ Erro no primeiro contato:`, error);
      throw error;
    }
  }

  /**
   * Lidar com follow-up de conversa existente
   */
  private async handleFollowUp(
    ticket: FreshDeskTicket, 
    session: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`[WEBHOOK] 🔄 Processando follow-up - Status: ${session.status}`);

      // Verificar se conversa já foi fechada
      if (['resolved', 'escalated', 'archived'].includes(session.status)) {
        console.log(`[WEBHOOK] ⏭️ Conversa já ${session.status}, ignorando webhook`);
        return {
          success: true,
          message: `Conversa já finalizada (${session.status})`
        };
      }

      const threadId = `ticket_${ticket.id}`;

      // Obter mensagens existentes para construir contexto
      const existingMessages = await this.conversationService.getMessages(threadId);
      
      // Construir contexto de follow-up baseado no histórico
      const followUpContext = this.buildFollowUpContext(ticket, session, existingMessages);
              
      // Processar com agent
      const agentResponse = await this.agent.processQuery(
        followUpContext,
        threadId
      );

      // Atualizar sessão baseado na resposta
      let newStatus = session.status;
      let issueResolved = false;
      
      // Analisar resposta para determinar status
      if (agentResponse.response.toLowerCase().includes('escalado') || 
          agentResponse.response.toLowerCase().includes('especialista')) {
        newStatus = 'escalated';
      } else if (agentResponse.response.toLowerCase().includes('resolvido') ||
                 agentResponse.response.toLowerCase().includes('problema resolvido')) {
        newStatus = 'resolved';
        issueResolved = true;
      }

      await this.conversationService.updateSession(threadId, {
        status: newStatus,
        issueResolved
      });

      // Enviar resposta
      await this.sendFollowUpResponse(ticket, agentResponse.response);

      console.log(`[WEBHOOK] ✅ Follow-up processado com sucesso para ticket ${ticket.id}`);
      
      return {
        success: true,
        message: `Follow-up processado para ticket ${ticket.id} (${existingMessages.length + 1} mensagens)`
      };

    } catch (error) {
      console.error(`[WEBHOOK] ❌ Erro no follow-up:`, error);
      throw error;
    }
  }

  /**
   * Construir contexto de primeiro contato
   */
  private buildFirstContactContext(
    ticket: FreshDeskTicket,
    analysis: ReturnType<typeof this.analyzeTicketProblem>,
    hasAttachments: boolean
  ): string {
    return `NOVO TICKET FRESHDESK - PRIMEIRO CONTATO

INSTRUÇÕES:
1. Este é o PRIMEIRO CONTATO com o cliente via FreshDesk
2. Use "searchProcedures" para buscar solução técnica específica
3. Forneça resposta completa e profissional para ticket de suporte
4. ${hasAttachments ? 'Reconheça que cliente anexou arquivos/fotos' : 'Baseie-se na descrição textual'}

DADOS DO TICKET:
- ID: ${ticket.id}
- Assunto: ${ticket.subject}
- Prioridade: ${ticket.priority} (1=baixa, 4=urgente)
- Tipo: ${ticket.type}
${analysis.orderNumber ? `- Pedido: ${analysis.orderNumber}` : ''}

PROBLEMA RELATADO PELO CLIENTE:
${ticket.description_text}

ANÁLISE AUTOMÁTICA:
- Categoria: ${analysis.category}
- Palavras-chave: ${analysis.keywords.join(', ')}
- Urgência: ${analysis.urgency}
${hasAttachments ? '- Cliente anexou arquivos/fotos' : '- Sem anexos'}

AÇÃO REQUERIDA:
1. Use searchProcedures para buscar solução específica
2. Gere resposta de primeiro contato profissional
3. Inclua procedimentos detalhados se encontrados`;
  }

  /**
   * Construir contexto de follow-up
   */
  private buildFollowUpContext(
    ticket: FreshDeskTicket,
    session: any,
    existingMessages: any[]
  ): string {
    // Construir resumo do histórico
    const messagesSummary = existingMessages
      .filter(msg => msg.role !== 'system')
      .map((msg, index) => `${index + 1}. ${msg.role.toUpperCase()}: ${msg.content.substring(0, 200)}...`)
      .join('\n');

    return `FOLLOW-UP TICKET FRESHDESK

HISTÓRICO DA CONVERSA:
${messagesSummary}

NOVA MENSAGEM DO CLIENTE:
"${ticket.description_text}"

CONTEXTO DA SESSÃO:
- Ticket ID: ${ticket.id}
- Total de mensagens: ${session.totalMessages}
- Status atual: ${session.status}
- Cliente: ${session.customerId}

INSTRUÇÕES PARA FOLLOW-UP:
1. O cliente acabou de responder com a mensagem acima
2. Analise o histórico completo da conversa
3. Responda de forma contextualizada baseada nas tentativas anteriores
4. Se cliente diz que não funcionou, considere próxima solução ou escalação
5. Use ferramentas adequadas (searchProcedures, collectEquipment, finalizeTicket, escalateToHuman)

${session.totalMessages >= 6 ? 
  '⚠️ ATENÇÃO: Conversa longa. Considere escalação se cliente não conseguir resolver.' : 
  'Continue com próxima solução adequada.'}

Responda ao cliente de forma natural e contextualizada.`;
  }

  /**
   * Buscar dados do ticket no FreshDesk (simulado)
   */
  private async getTicketData(ticketId: number): Promise<FreshDeskTicket | null> {
    try {
      // TODO: Implementar chamada real para FreshDesk API
      
      // Simulação baseada nos exemplos fornecidos
      const mockTickets: { [key: number]: Partial<FreshDeskTicket> } = {
        5314149: {
          id: 5314149,
          subject: "Garantia PC - pedido: 1011121324",
          description_text: "1011121324 numero do pedido. Bom, o problema é que o ssd está oscilando, desativei alguns serviços da microsoft para tentar ver se isso parava, mas não resolveu. Vou explicar melhor, no gerenciador de tarefas fica de 0% e do nada fica a 50% 70% causando travamentos no sistema, isso com nada aberto, apenas o google. Verifiquei oq era mais ou menos, e a única coisa que está no topo em disco no gerenciador de tarefas é o 'system'.",
          attachments: []
        },
        5314150: {
          id: 5314150,
          subject: "PC não liga - Urgent",
          description_text: "meu pc nao liga",
        },
        5314151: {
          id: 5314151,
          subject: "Tela azul constante",
          description_text: "Meu computador está dando tela azul constantemente. O código que aparece é MEMORY_MANAGEMENT. Acontece principalmente quando estou jogando ou usando programas pesados.",
          attachments: []
        }
      };

      const baseTicket = mockTickets[ticketId];
      if (!baseTicket) {
        console.log(`[FRESHDESK] ❌ Ticket ${ticketId} não encontrado na simulação`);
        return null;
      }

      // Retornar ticket completo
      return {
        ...baseTicket,
        priority: 1,
        status: 5,
        requester_id: 22029460711,
        responder_id: 22027927524,
        group_id: 22000164842,
        source: 3,
        type: "Com analista",
        due_by: "2025-07-21T11:23:54Z",
        fr_due_by: "2025-07-16T16:49:08Z",
        created_at: "2025-07-16T15:40:30Z",
        updated_at: new Date().toISOString(), // Data atual para simular follow-up
        tags: ["Criado pelo bot", "RMA PC"],
        custom_fields: {
          pedido: 1011121324,
          cf_situao_atendimento: "1° Resposta"
        },
        cc_emails: [],
        fwd_emails: [],
        reply_cc_emails: [],
        company_id: undefined,
        fr_escalated: false,
        spam: false,
        is_escalated: false,
        nr_due_by: "2025-07-16T18:18:54Z",
        nr_escalated: false,
        description: baseTicket.description_text || '',
        attachments: baseTicket.attachments || []
      } as FreshDeskTicket;
      
    } catch (error) {
      console.error(`[FRESHDESK] ❌ Erro ao buscar ticket ${ticketId}:`, error);
      return null;
    }
  }

  /**
   * Analisar problema do ticket
   */
  private analyzeTicketProblem(ticket: FreshDeskTicket): {
    category: string;
    keywords: string[];
    urgency: 'low' | 'medium' | 'high';
    hasOrderNumber: boolean;
    orderNumber?: string;
  } {
    const description = ticket.description_text.toLowerCase();
    const subject = ticket.subject.toLowerCase();
    
    // Extrair número do pedido
    const orderMatch = ticket.description_text.match(/(\d{10})/);
    const orderNumber = orderMatch ? orderMatch[1] : ticket.custom_fields.pedido?.toString();
    
    // Categorizar problema
    let category = 'hardware';
    const keywords: string[] = [];
    
    if (description.includes('não liga') || description.includes('não inicia')) {
      category = 'power_issues';
      keywords.push('não liga', 'energia', 'fonte');
    } else if (description.includes('ssd') || description.includes('disco')) {
      category = 'storage';
      keywords.push('SSD', 'disco', 'armazenamento', 'alta utilização');
    } else if (description.includes('tela azul') || description.includes('bsod')) {
      category = 'system_errors';
      keywords.push('tela azul', 'BSOD', 'erro sistema');
    } else if (description.includes('memória') || description.includes('ram')) {
      category = 'memory_issues';
      keywords.push('memória', 'RAM', 'memory_management');
    } else if (description.includes('travamento') || description.includes('trava')) {
      category = 'performance';
      keywords.push('travamento', 'freeze', 'sistema travando');
    }
    
    // Determinar urgência
    let urgency: 'low' | 'medium' | 'high' = 'medium';
    
    if (ticket.priority >= 3 || description.includes('urgente') || description.includes('não funciona')) {
      urgency = 'high';
    } else if (ticket.priority === 1) {
      urgency = 'low';
    }
    
    return {
      category,
      keywords,
      urgency,
      hasOrderNumber: !!orderNumber,
      orderNumber
    };
  }

  /**
   * Enviar primeira resposta para o FreshDesk
   */
  private async sendFirstResponse(ticket: FreshDeskTicket, response: string): Promise<void> {
    try {
      console.log(`[FRESHDESK] 📤 Enviando primeira resposta para ticket ${ticket.id}`);
      
      // TODO: Implementar envio real para FreshDesk
      // await this.freshDeskService.addNoteToTicket(
      //   ticket.id.toString(),
      //   response,
      //   false // resposta pública
      // );
      
      // Log da resposta completa
      console.log(`[RESPOSTA] 📋 Ticket ${ticket.id} - PRIMEIRO CONTATO:`);
      console.log('='.repeat(60));
      console.log(response);
      console.log('='.repeat(60));
      
    } catch (error) {
      console.error(`[FRESHDESK] ❌ Erro ao enviar primeira resposta:`, error);
      throw error;
    }
  }

  /**
   * Enviar resposta de follow-up
   */
  private async sendFollowUpResponse(ticket: FreshDeskTicket, response: string): Promise<void> {
    try {
      console.log(`[FRESHDESK] 📤 Enviando follow-up para ticket ${ticket.id}`);
      
      console.log(`[RESPOSTA] 📋 Ticket ${ticket.id} - FOLLOW-UP:`);
      console.log('='.repeat(60));
      console.log(response);
      console.log('='.repeat(60));
      
    } catch (error) {
      console.error(`[FRESHDESK] ❌ Erro ao enviar follow-up:`, error);
      throw error;
    }
  }

  /**
   * Simular diferentes tipos de tickets para testes
   */
  public async simulateTicketTypes(): Promise<void> {
    console.log('🧪 SIMULANDO DIFERENTES TIPOS DE TICKETS COM LANGGRAPH\n');

    const testScenarios = [
      {
        id: 5314149,
        description: "SSD oscilando - primeiro contato",
        action: 'first_contact'
      },
      {
        id: 5314149,
        description: "SSD oscilando - cliente responde que tentou",
        action: 'follow_up'
      },
      {
        id: 5314150, 
        description: "PC não liga - primeiro contato",
        action: 'first_contact'
      },
      {
        id: 5314151,
        description: "Tela azul MEMORY_MANAGEMENT - primeiro contato",
        action: 'first_contact'
      }
    ];

    for (const scenario of testScenarios) {
      console.log(`\n📋 Cenário: ${scenario.description}`);
      console.log(`Ticket ID: ${scenario.id} | Ação: ${scenario.action}`);
      
      const result = await this.processWebhook(scenario.id);
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.log(`❌ ${result.message}`);
      }
      
      console.log('-'.repeat(70));
      
      // Delay entre processamentos
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Mostrar estatísticas finais
    console.log('\n📊 ESTATÍSTICAS DAS CONVERSAS:');
    await this.showConversationStats();
  }

  /**
   * Mostrar estatísticas das conversas
   */
  private async showConversationStats(): Promise<void> {
    try {
      // Obter estatísticas usando ConversationService
      const dailyMetrics = await this.conversationService.getDailyMetrics(7);
      
      console.log(`\n📈 Estatísticas dos últimos 7 dias:`);
      
      for (const metric of dailyMetrics) {
        console.log(`\n📋 ${metric.date}:`);
        console.log(`   Total de sessões: ${metric.total_sessions}`);
        console.log(`   Resolvidas: ${metric.resolved_sessions}`);
        console.log(`   Escaladas: ${metric.escalated_sessions}`);
        console.log(`   Média de mensagens: ${metric.avg_messages_per_session}`);
        console.log(`   Tempo médio de resolução: ${metric.avg_resolution_time_minutes} min`);
      }

    } catch (error) {
      console.error('[STATS] ❌ Erro ao mostrar estatísticas:', error);
    }
  }

  /**
   * Processar mensagem de cliente diretamente
   */
  public async processCustomerMessage(
    ticketId: string,
    customerMessage: string,
    attachments: any[] = []
  ): Promise<{ success: boolean; response: string }> {
    try {
      console.log(`[WEBHOOK] 💬 Nova mensagem do cliente - Ticket ${ticketId}`);

      const threadId = `ticket_${ticketId}`;
      
      // Verificar se sessão existe
      const session = await this.conversationService.getSession(threadId);
      
      if (!session) {
        throw new Error(`Sessão não encontrada para ticket ${ticketId}`);
      }

      // Processar mensagem com o agent
      const agentResponse = await this.agent.processQuery(
        customerMessage,
        threadId
      );

      console.log(`[WEBHOOK] ✅ Mensagem processada para ticket ${ticketId}`);

      return {
        success: true,
        response: agentResponse.response
      };

    } catch (error) {
      console.error(`[WEBHOOK] ❌ Erro ao processar mensagem do cliente:`, error);
      return {
        success: false,
        response: 'Erro interno ao processar sua mensagem. Um técnico entrará em contato.'
      };
    }
  }

  /**
   * Obter dashboard de conversas ativas
   */
  public async getConversationsDashboard(): Promise<{
    active_conversations: number;
    needs_attention: number;
    avg_messages: number;
    total_conversations: number;
    recent_conversations: any[];
  }> {
    try {
      const dailyMetrics = await this.conversationService.getDailyMetrics(1);
      const todayMetric = dailyMetrics[0] || {
        total_sessions: 0,
        resolved_sessions: 0,
        escalated_sessions: 0,
        avg_messages_per_session: 0
      };

      // Buscar conversas recentes
      const recentConversations = await this.conversationService.searchConversations({
        limit: 10,
        offset: 0
      });
      
      return {
        active_conversations: recentConversations.conversations.filter(c => c.status === 'active').length,
        needs_attention: recentConversations.conversations.filter(c => c.status === 'escalated').length,
        avg_messages: parseFloat(todayMetric.avg_messages_per_session) || 0,
        total_conversations: todayMetric.total_sessions,
        recent_conversations: recentConversations.conversations.slice(0, 5)
      };

    } catch (error) {
      console.error('[DASHBOARD] ❌ Erro ao obter dashboard:', error);
      return {
        active_conversations: 0,
        needs_attention: 0,
        avg_messages: 0,
        total_conversations: 0,
        recent_conversations: []
      };
    }
  }
}