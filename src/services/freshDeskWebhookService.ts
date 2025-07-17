// src/services/freshDeskWebhookService.ts (ATUALIZADO COM CHAT HISTORY)
import { FreshDeskService } from './freshDeskService';
import { LangGraphAgent } from './langGraphAgent';
import { ChatHistoryService } from './chatHistoryService';

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
  private chatHistory: ChatHistoryService;
  private processingTickets: Set<number> = new Set();

  private constructor() {
    this.freshDeskService = FreshDeskService.getInstance();
    this.agent = LangGraphAgent.getInstance();
    this.chatHistory = ChatHistoryService.getInstance();
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

      // ETAPA 2: Verificar histórico da conversa
      const existingContext = await this.chatHistory.getConversationContext(ticketId.toString());
      
      if (existingContext) {
        console.log(`[WEBHOOK] 📋 Conversa existente encontrada - ${existingContext.attempts.length} tentativas anteriores`);
        return await this.handleFollowUp(ticketData, existingContext);
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

      // Criar conversa no histórico
      const conversation = await this.chatHistory.getOrCreateConversation(
        ticket.id.toString(),
        {
          customerId: ticket.requester_id.toString(),
          subject: ticket.subject,
          initialProblem: ticket.description_text,
          category: problemAnalysis.category,
          priority: ticket.priority,
          hasAttachments: hasAttachments,
          orderNumber: problemAnalysis.orderNumber,
          customFields: {
            freshdesk_id: ticket.id,
            type: ticket.type,
            source: ticket.source,
            tags: ticket.tags
          }
        }
      );

      // Registrar webhook como primeira mensagem
      await this.chatHistory.addMessage(conversation.id, {
        messageType: 'webhook',
        sender: 'webhook_service',
        content: `Novo ticket recebido: ${ticket.subject}\n\nProblema: ${ticket.description_text}`,
        intent: 'ticket_created',
        metadata: {
          ticket_id: ticket.id,
          problem_analysis: problemAnalysis,
          has_attachments: hasAttachments
        }
      });

      // Gerar primeiro contato usando agent
      const agentContext = this.buildFirstContactContext(ticket, problemAnalysis, hasAttachments);
      const agentResponse = await this.agent.processQuery(
        agentContext,
        `ticket_${ticket.id}` // threadId único por ticket
      , []);

      // Registrar resposta do agent
      const agentMessage = await this.chatHistory.addMessage(conversation.id, {
        messageType: 'agent',
        sender: 'ai_agent',
        content: agentResponse.response,
        intent: 'first_contact',
        toolUsed: 'searchProcedures', // Assumindo que usou busca
        metadata: {
          thread_id: `ticket_${ticket.id}`,
          message_count: agentResponse.messages.length
        }
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
    context: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`[WEBHOOK] 🔄 Processando follow-up - Status: ${context.conversation.status}`);

      // Verificar se conversa já foi fechada
      if (['resolved', 'escalated', 'closed'].includes(context.conversation.status)) {
        console.log(`[WEBHOOK] ⏭️ Conversa já ${context.conversation.status}, ignorando webhook`);
        return {
          success: true,
          message: `Conversa já finalizada (${context.conversation.status})`
        };
      }

      // 🆕 SALVAR MENSAGEM DO CLIENTE PRIMEIRO
      console.log(`[WEBHOOK] 💬 Salvando nova mensagem do cliente...`);
      await this.chatHistory.addMessageWithAnalysis(context.conversation.id, {
        messageType: 'user',
        sender: 'customer',
        content: ticket.description_text,
        intent: 'follow_up_response',
        attachments: ticket.attachments || [],
        metadata: {
          source: 'freshdesk_webhook',
          ticket_updated_at: ticket.updated_at,
          has_attachments: (ticket.attachments?.length || 0) > 0
        }
      });

      // Obter resumo ATUALIZADO do histórico para o agent (agora incluindo mensagem do cliente)
      const historySummary = await this.chatHistory.getAgentSummary(ticket.id.toString());
      console.log(`[WEBHOOK] 📋 Resumo atualizado: ${historySummary.substring(0, 500)}...`);
              
      // Construir contexto de follow-up
      const followUpContext = this.buildFollowUpContext(ticket, context, historySummary);
              
      // Processar com agent
      const agentResponse = await this.agent.processQuery(
        followUpContext,
        `ticket_${ticket.id}` // Mesmo threadId para manter contexto
      , []);

      // Registrar resposta do agent
      await this.chatHistory.addMessage(context.conversation.id, {
        messageType: 'agent',
        sender: 'ai_agent',
        content: agentResponse.response,
        intent: 'follow_up',
        metadata: {
          attempt_count: context.conversation.attempt_count,
          next_action: context.next_action,
          message_count: agentResponse.messages.length,
          responding_to: 'customer_follow_up'
        }
      });

      // Verificar se precisa de ação especial baseada no histórico
      await this.handleSpecialActions(context, ticket.id.toString());

      // Enviar resposta
      await this.sendFollowUpResponse(ticket, agentResponse.response);

      console.log(`[WEBHOOK] ✅ Follow-up processado com sucesso para ticket ${ticket.id}`);
      
      return {
        success: true,
        message: `Follow-up processado para ticket ${ticket.id} (tentativa ${context.conversation.attempt_count + 1})`
      };

    } catch (error) {
      console.error(`[WEBHOOK] ❌ Erro no follow-up:`, error);
      throw error;
    }
  }

  /**
   * Ações especiais baseadas no histórico
   */
  private async handleSpecialActions(context: any, ticketId: string): Promise<void> {
    try {
      const { conversation, next_action } = context;

      switch (next_action) {
        case 'escalate':
          console.log(`[WEBHOOK] 🚨 Marcando ticket ${ticketId} para escalonamento`);
          await this.chatHistory.markRequiresHuman(
            ticketId, 
            `Múltiplas tentativas falharam (${conversation.attempt_count} tentativas)`
          );
          break;

        case 'collect':
          console.log(`[WEBHOOK] 📦 Ticket ${ticketId} elegível para coleta`);
          // Aqui poderia automaticamente triggerar collectEquipment
          break;

        case 'finalize':
          console.log(`[WEBHOOK] ✅ Ticket ${ticketId} pode ser finalizado`);
          // Aqui poderia automaticamente triggerar finalizeTicket
          break;

        default:
          // Continue normalmente
          break;
      }

    } catch (error) {
      console.error(`[WEBHOOK] ❌ Erro nas ações especiais:`, error);
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
    return `NOVO TICKET - PRIMEIRO CONTATO

INSTRUÇÕES:
1. Este é o PRIMEIRO CONTATO com o cliente
2. Use "searchProcedures" para buscar solução técnica
3. Forneça resposta completa e profissional
4. ${hasAttachments ? 'Reconheça os anexos enviados' : 'Baseie-se na descrição textual'}

DADOS DO TICKET:
- ID: ${ticket.id}
- Assunto: ${ticket.subject}
- Prioridade: ${ticket.priority}
${analysis.orderNumber ? `- Pedido: ${analysis.orderNumber}` : ''}

PROBLEMA RELATADO:
${ticket.description_text}

ANÁLISE AUTOMÁTICA:
- Categoria: ${analysis.category}
- Palavras-chave: ${analysis.keywords.join(', ')}
- Urgência: ${analysis.urgency}
${hasAttachments ? '- Cliente anexou arquivos/fotos' : '- Sem anexos'}

AÇÃO: Use searchProcedures para buscar solução e gere resposta de primeiro contato.`;
  }

  /**
   * Construir contexto de follow-up
   */
  private buildFollowUpContext(
    ticket: FreshDeskTicket,
    context: any,
    historySummary: string
  ): string {
    return `FOLLOW-UP DE CONVERSA EXISTENTE

${historySummary}

NOVA MENSAGEM DO CLIENTE:
"${ticket.description_text}"

INSTRUÇÕES PARA FOLLOW-UP:
1. O cliente acabou de responder com a mensagem acima
2. Analise o histórico completo da conversa
3. Responda de forma contextualizada baseada nas tentativas anteriores
4. Se o cliente diz que não funcionou, considere próxima solução ou escalação
5. Use ferramentas adequadas (searchProcedures, collectEquipment, finalizeTicket)
6. Próxima ação recomendada: ${context.next_action}

${context.conversation.attempt_count >= 2 ? 
  '⚠️ ATENÇÃO: Cliente já teve múltiplas tentativas. Considere escalação ou coleta.' : 
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
        updated_at: "2025-07-16T16:20:08Z",
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
    console.log('🧪 SIMULANDO DIFERENTES TIPOS DE TICKETS COM HISTÓRICO\n');

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
        description: "PC não liga com foto - primeiro contato",
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
      const activeConversations = await this.chatHistory.getConversationsNeedingAttention();
      
      console.log(`\n📈 Conversas ativas que precisam atenção: ${activeConversations.length}`);
      
      for (const conv of activeConversations) {
        const stats = await this.chatHistory.getConversationStats(conv.ticket_id);
        console.log(`\n📋 Ticket ${conv.ticket_id}:`);
        console.log(`   Status: ${conv.status}`);
        console.log(`   Tentativas: ${conv.attempt_count}`);
        console.log(`   Mensagens: ${stats.messageCount}`);
        console.log(`   Duração: ${Math.round(stats.duration)} minutos`);
        console.log(`   Sentimento: ${stats.sentiment}`);
        console.log(`   Requer humano: ${conv.requires_human ? 'SIM' : 'NÃO'}`);
      }

    } catch (error) {
      console.error('[STATS] ❌ Erro ao mostrar estatísticas:', error);
    }
  }

  /**
   * Processar mensagem de cliente (para uso futuro com webhook real)
   */
  public async processCustomerMessage(
    ticketId: string,
    customerMessage: string,
    attachments: any[] = []
  ): Promise<{ success: boolean; response: string }> {
    try {
      console.log(`[WEBHOOK] 💬 Nova mensagem do cliente - Ticket ${ticketId}`);

      // Obter contexto da conversa
      const context = await this.chatHistory.getConversationContext(ticketId);
      
      if (!context) {
        throw new Error(`Conversa não encontrada para ticket ${ticketId}`);
      }

      // 🆕 SALVAR MENSAGEM DO CLIENTE COM ANÁLISE
      const customerMessageRecord = await this.chatHistory.addMessageWithAnalysis(context.conversation.id, {
        messageType: 'user',
        sender: 'customer',
        content: customerMessage,
        attachments: attachments,
        intent: this.detectMessageIntent(customerMessage),
        metadata: {
          source: 'direct_customer_message',
          attachment_count: attachments.length
        }
      });

      console.log(`[WEBHOOK] 💾 Mensagem do cliente salva: ${customerMessageRecord.id}`);

      // Verificar se precisa incrementar tentativas baseado na mensagem
      await this.updateConversationAttempts(context.conversation.id, customerMessage);

      // Obter resumo atualizado
      const historySummary = await this.chatHistory.getAgentSummary(ticketId);

      // Processar resposta do agent
      const agentContext = `NOVA MENSAGEM DO CLIENTE

${historySummary}

MENSAGEM ATUAL DO CLIENTE:
"${customerMessage}"
${attachments.length > 0 ? `\n[Cliente anexou ${attachments.length} arquivo(s)]` : ''}

INSTRUÇÕES:
- Responda baseado no histórico completo da conversa
- Considere todas as tentativas anteriores
- Use ferramentas adequadas conforme necessário
- Seja empático e contextualizado`;

      const agentResponse = await this.agent.processQuery(
        agentContext,
        `ticket_${ticketId}`
      , []);

      // Registrar resposta do agent
      await this.chatHistory.addMessage(context.conversation.id, {
        messageType: 'agent',
        sender: 'ai_agent',
        content: agentResponse.response,
        intent: 'customer_response',
        metadata: {
          customer_message_id: customerMessageRecord.id,
          customer_message_length: customerMessage.length,
          conversation_turn: context.messages.length + 2 // +2 porque acabamos de adicionar 2 mensagens
        }
      });

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

  private detectMessageIntent(message: string): string {
    const msgLower = message.toLowerCase();
    
    if (msgLower.includes('não funcionou') || msgLower.includes('não deu certo') || msgLower.includes('ainda não')) {
      return 'solution_failed';
    } else if (msgLower.includes('funcionou') || msgLower.includes('resolvido') || msgLower.includes('obrigado')) {
      return 'solution_success';
    } else if (msgLower.includes('como') || msgLower.includes('onde') || msgLower.includes('?')) {
      return 'clarification_request';
    } else if (msgLower.includes('urgente') || msgLower.includes('rápido') || msgLower.includes('preciso')) {
      return 'urgent_request';
    } else if (msgLower.includes('frustrado') || msgLower.includes('irritado') || msgLower.includes('cansado')) {
      return 'frustration';
    } else {
      return 'follow_up_response';
    }
  }

  private async updateConversationAttempts(conversationId: string, customerMessage: string): Promise<void> {
    try {
      const intent = this.detectMessageIntent(customerMessage);
      
      // Se cliente diz que não funcionou, pode indicar uma tentativa falhada
      if (intent === 'solution_failed') {
        console.log(`[WEBHOOK] 📊 Cliente reportou falha - atualizando contador de tentativas`);
        
        // Aqui podemos atualizar a última tentativa como falhada
        const lastAttempt = await this.pool.query(`
          SELECT id FROM solution_attempts 
          WHERE conversation_id = $1 
          ORDER BY started_at DESC 
          LIMIT 1
        `, [conversationId]);

        if (lastAttempt.rows.length > 0) {
          await this.chatHistory.updateSolutionAttempt(lastAttempt.rows[0].id, {
            status: 'failed',
            success: false,
            customerFeedback: customerMessage
          });
          
          console.log(`[WEBHOOK] 📊 Tentativa marcada como falhada baseada no feedback do cliente`);
        }
      }
    } catch (error) {
      console.error(`[WEBHOOK] ❌ Erro ao atualizar tentativas:`, error);
    }
  }

  /**
   * Obter dashboard de conversas ativas
   */
  public async getConversationsDashboard(): Promise<{
    active_conversations: number;
    needs_attention: number;
    avg_attempts: number;
    escalation_rate: number;
    conversations: any[];
  }> {
    try {
      const needsAttention = await this.chatHistory.getConversationsNeedingAttention();
      
      // Obter todas as conversas ativas
      const allActive = await this.pool.query(`
        SELECT 
          COUNT(*) as total_active,
          AVG(attempt_count) as avg_attempts,
          COUNT(CASE WHEN requires_human = true THEN 1 END)::FLOAT / COUNT(*) * 100 as escalation_rate
        FROM chat_conversations 
        WHERE status = 'active'
      `);

      const stats = allActive.rows[0];
      
      return {
        active_conversations: parseInt(stats.total_active) || 0,
        needs_attention: needsAttention.length,
        avg_attempts: parseFloat(stats.avg_attempts) || 0,
        escalation_rate: parseFloat(stats.escalation_rate) || 0,
        conversations: needsAttention.slice(0, 10) // Primeiras 10
      };

    } catch (error) {
      console.error('[DASHBOARD] ❌ Erro ao obter dashboard:', error);
      return {
        active_conversations: 0,
        needs_attention: 0,
        avg_attempts: 0,
        escalation_rate: 0,
        conversations: []
      };
    }
  }

  // Getter para acessar pool do chat history (usado no dashboard)
  private get pool() {
    return (this.chatHistory as any).pool;
  }
}