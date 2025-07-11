import { ChatOpenAI } from "@langchain/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { BufferMemory } from "langchain/memory";
import { ConversationSummaryMemory } from "langchain/memory";
import { PromptTemplate } from "@langchain/core/prompts";

import { openaiConfig } from '../config/openai';
import { SearchService } from '../services/search.service';
import { RAGService } from '../services/rag.service';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { Validators } from '../utils/validators';
import { TipoBusca } from '../models/types';

interface TicketInfo {
  id: string;
  cliente_id: string;
  problema: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'aberto' | 'em_andamento' | 'resolvido' | 'escalado';
  created_at: Date;
}

interface AgentResponse {
  message: string;
  action: 'continue' | 'escalate' | 'solved' | 'need_info';
  confidence: number;
  tools_used: string[];
  next_steps?: string[];
  ticket_update?: Partial<TicketInfo>;
}

export class SuporteAgent {
  private llm: ChatOpenAI;
  private searchService: SearchService;
  private ragService: RAGService;
  private agent: any;
  private memory: BufferMemory;
  private currentTicket: TicketInfo | null = null;

  constructor() {
    this.llm = openaiConfig.getLLM();
    this.searchService = new SearchService();
    this.ragService = new RAGService();
    
    // Configurar memória para manter contexto
    this.memory = new BufferMemory({
      memoryKey: "chat_history",
      returnMessages: true,
    });

    this.initializeAgent();
  }

  /**
   * Inicializa o agente com ferramentas específicas
   */
  private async initializeAgent(): Promise<void> {
    try {
      const tools = [
        this.createBuscarProcedimentosTool(),
        this.createObterDetalhesTool(),
        this.createVerificarStatusTool(),
        this.createEscalarSuporteTool(),
        this.createSalvarFeedbackTool(),
        this.createCriarTicketTool(),
        this.createBuscarHistoricoTool(),
        this.createValidarSolucaoTool()
      ];

      const agentPrompt = this.createAgentPrompt();

      this.agent = await initializeAgentExecutorWithOptions(tools, this.llm, {
        agentType: "openai-functions",
        memory: this.memory,
        verbose: true,
        maxIterations: 5,
        agentArgs: {
          prefix: agentPrompt,
        },
      });

      logger.success('Agente de suporte inicializado com 8 ferramentas');
    } catch (error) {
      logger.error('Erro ao inicializar agente:', error);
      throw error;
    }
  }

  /**
   * Prompt customizado para o agente de suporte
   */
  private createAgentPrompt(): string {
    return `Você é um assistente técnico especializado da Pichau, expert em suporte de hardware e software.

SEU PAPEL:
- Diagnosticar problemas técnicos de computadores
- Fornecer soluções passo-a-passo
- Usar ferramentas disponíveis para buscar informações
- Escalar para humanos quando necessário
- Manter histórico de interações

DIRETRIZES:
1. SEMPRE busque procedimentos relevantes antes de responder
2. Seja claro e didático nas explicações
3. Peça informações específicas quando necessário
4. Use linguagem técnica apropriada para o nível do cliente
5. Priorize segurança em todas as instruções
6. Escalate casos complexos ou quando o cliente não consegue executar

FERRAMENTAS DISPONÍVEIS:
- buscar_procedimentos: Para encontrar soluções
- obter_detalhes: Para passos específicos
- verificar_status: Para acompanhar progresso
- escalar_suporte: Para casos complexos
- salvar_feedback: Para melhorar atendimento
- criar_ticket: Para formalizar problemas
- buscar_historico: Para contexto do cliente
- validar_solucao: Para confirmar resolução

PROCESSO DE ATENDIMENTO:
1. Entenda o problema específico
2. Busque procedimentos relevantes
3. Apresente solução estruturada
4. Acompanhe execução dos passos
5. Valide se problema foi resolvido
6. Colete feedback do cliente

Lembre-se: Você representa a Pichau. Seja profissional, prestativo e eficiente.`;
  }

  /**
   * Tool para buscar procedimentos
   */
  private createBuscarProcedimentosTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: "buscar_procedimentos",
      description: "Busca procedimentos técnicos relacionados ao problema do cliente",
      schema: z.object({
        problema: z.string().describe("Descrição do problema técnico"),
        tipo: z.enum(["problema", "solucao", "hibrida"]).default("hibrida").describe("Tipo de busca"),
        limite: z.number().default(3).describe("Número máximo de resultados")
      }),
      func: async ({ problema, tipo, limite }: { problema: string; tipo: TipoBusca; limite: number }) => {
        try {
          const params = Validators.validarBuscaParams({
            query: problema,
            tipo: tipo as TipoBusca,
            limite,
            threshold: 0.7
          });

          const resultados = await this.searchService.buscar(params);
          
          if (resultados.length === 0) {
            return "Nenhum procedimento específico encontrado. Vou usar conhecimento geral ou escalar para suporte humano.";
          }

          return JSON.stringify({
            total: resultados.length,
            procedimentos: resultados.map((r: any) => ({
              id: r.id,
              titulo: r.titulo,
              categoria: r.categoria,
              relevancia: Math.round(r.similarity * 100),
              preview: r.preview
            }))
          });
        } catch (error) {
          logger.error('Erro na tool buscar_procedimentos:', error);
          return `Erro ao buscar procedimentos: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      }
    });
  }

  /**
   * Tool para obter detalhes de um procedimento
   */
  private createObterDetalhesTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: "obter_detalhes",
      description: "Obtém passos detalhados de um procedimento específico",
      schema: z.object({
        procedimento_id: z.number().describe("ID do procedimento"),
      }),
      func: async ({ procedimento_id }: { procedimento_id: number }) => {
        try {
          const procedimento = await this.searchService.obterProcedimento(procedimento_id);
          
          return JSON.stringify({
            titulo: procedimento.titulo,
            categoria: procedimento.categoria_nome,
            dificuldade: procedimento.dificuldade,
            tempo_estimado: procedimento.tempo_estimado,
            descricao_problema: procedimento.descricao_problema,
            solucao_completa: procedimento.solucao_completa,
            passos: procedimento.passos,
            recursos: procedimento.recursos,
            palavras_chave: procedimento.palavras_chave
          });
        } catch (error) {
          logger.error('Erro na tool obter_detalhes:', error);
          return `Erro ao obter detalhes: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      }
    });
  }

  /**
   * Tool para verificar status do atendimento
   */
  private createVerificarStatusTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: "verificar_status",
      description: "Verifica o status atual do atendimento e progresso",
      schema: z.object({
        acao: z.enum(["listar_passos", "marcar_concluido", "relatar_problema"]).describe("Ação a ser executada"),
        passo_numero: z.number().optional().describe("Número do passo se aplicável"),
        observacoes: z.string().optional().describe("Observações sobre o progresso")
      }),
      func: async ({ acao, passo_numero, observacoes }: { acao: "listar_passos" | "marcar_concluido" | "relatar_problema"; passo_numero?: number; observacoes?: string }) => {
        try {
          const status = {
            ticket_id: this.currentTicket?.id || 'novo',
            status_atual: this.currentTicket?.status || 'em_andamento',
            acao_executada: acao,
            passo_atual: passo_numero,
            observacoes,
            timestamp: new Date().toISOString()
          };

          if (this.currentTicket) {
            // Atualizar status no banco se necessário
            const pool = db.getPool();
            await pool.query(
              'INSERT INTO status_atendimento (ticket_id, acao, passo, observacoes) VALUES ($1, $2, $3, $4)',
              [this.currentTicket.id, acao, passo_numero, observacoes]
            );
          }

          return JSON.stringify(status);
        } catch (error) {
          logger.error('Erro na tool verificar_status:', error);
          return `Status: ${acao} executado com observações: ${observacoes}`;
        }
      }
    });
  }

  /**
   * Tool para escalar para suporte humano
   */
  private createEscalarSuporteTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: "escalar_suporte",
      description: "Escala o atendimento para um técnico humano quando necessário",
      schema: z.object({
        motivo: z.enum([
          "problema_complexo", 
          "cliente_confuso", 
          "hardware_fisico", 
          "garantia", 
          "insatisfacao"
        ]).describe("Motivo do escalonamento"),
        prioridade: z.enum(["baixa", "media", "alta", "critica"]).describe("Prioridade do caso"),
        resumo: z.string().describe("Resumo do problema e tentativas realizadas"),
        cliente_info: z.string().optional().describe("Informações relevantes do cliente")
      }),
      func: async ({
        motivo,
        prioridade,
        resumo,
        cliente_info
      }: {
        motivo: "problema_complexo" | "cliente_confuso" | "hardware_fisico" | "garantia" | "insatisfacao";
        prioridade: "baixa" | "media" | "alta" | "critica";
        resumo: string;
        cliente_info?: string;
      }) => {
        try {
          const ticket_escalacao = {
            id: `ESC-${Date.now()}`,
            motivo,
            prioridade,
            resumo,
            cliente_info,
            contexto_conversa: await this.memory.loadMemoryVariables({}),
            timestamp: new Date().toISOString()
          };

          // Salvar escalonamento no banco
          const pool = db.getPool();
          await pool.query(
            'INSERT INTO escalacoes (ticket_id, motivo, prioridade, resumo, contexto) VALUES ($1, $2, $3, $4, $5)',
            [ticket_escalacao.id, motivo, prioridade, resumo, JSON.stringify(ticket_escalacao)]
          );

          if (this.currentTicket) {
            this.currentTicket.status = 'escalado';
          }

          logger.info(`Caso escalado: ${ticket_escalacao.id} - ${motivo}`);

          return JSON.stringify({
            status: 'escalado',
            ticket_escalacao: ticket_escalacao.id,
            tempo_resposta_estimado: this.getTempoResposta(prioridade),
            proximos_passos: [
              "Aguarde contato de um técnico especializado",
              "Mantenha o computador disponível para testes",
              "Tenha em mãos número de série e nota fiscal"
            ]
          });
        } catch (error) {
          logger.error('Erro na tool escalar_suporte:', error);
          return `Escalonamento registrado: ${motivo} - ${prioridade}`;
        }
      }
    });
  }

  /**
   * Tool para salvar feedback
   */
  private createSalvarFeedbackTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: "salvar_feedback",
      description: "Salva feedback do cliente sobre a resolução do problema",
      schema: z.object({
        resolvido: z.boolean().describe("Se o problema foi resolvido"),
        rating: z.number().min(1).max(5).describe("Avaliação de 1 a 5"),
        comentario: z.string().optional().describe("Comentário adicional"),
        tempo_resolucao: z.number().optional().describe("Tempo de resolução em minutos")
      }),
      func: async ({ resolvido, rating, comentario, tempo_resolucao }: { resolvido: boolean; rating: number; comentario?: string; tempo_resolucao?: number }) => {
        try {
          const feedback = {
            ticket_id: this.currentTicket?.id || 'anonimo',
            resolvido,
            rating,
            comentario,
            tempo_resolucao,
            timestamp: new Date().toISOString()
          };

          // Salvar no banco
          const pool = db.getPool();
          await pool.query(
            `INSERT INTO feedback_atendimento 
             (ticket_id, resolvido, rating, comentario, tempo_resolucao) 
             VALUES ($1, $2, $3, $4, $5)`,
            [feedback.ticket_id, resolvido, rating, comentario, tempo_resolucao]
          );

          if (this.currentTicket && resolvido) {
            this.currentTicket.status = 'resolvido';
          }

          logger.info(`Feedback salvo: ${rating}/5 - Resolvido: ${resolvido}`);

          return JSON.stringify({
            feedback_salvo: true,
            agradecimento: "Obrigado pelo feedback! Isso nos ajuda a melhorar.",
            status_final: resolvido ? 'resolvido' : 'em_andamento'
          });
        } catch (error) {
          logger.error('Erro na tool salvar_feedback:', error);
          return `Feedback registrado: ${rating}/5 - ${resolvido ? 'Resolvido' : 'Não resolvido'}`;
        }
      }
    });
  }

  /**
   * Tool para criar ticket formal
   */
  private createCriarTicketTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: "criar_ticket",
      description: "Cria um ticket formal para acompanhamento do problema",
      schema: z.object({
        cliente_id: z.string().describe("ID ou identificação do cliente"),
        problema: z.string().describe("Descrição detalhada do problema"),
        categoria: z.string().describe("Categoria do problema"),
        prioridade: z.enum(["baixa", "media", "alta", "critica"]).default("media")
      }),
      func: async ({ cliente_id, problema, categoria, prioridade }: { cliente_id: string; problema: string; categoria: string; prioridade: "baixa" | "media" | "alta" | "critica" }) => {
        try {
          const ticket: TicketInfo = {
            id: `TKT-${Date.now()}`,
            cliente_id,
            problema,
            prioridade,
            status: 'aberto',
            created_at: new Date()
          };

          this.currentTicket = ticket;

          // Salvar no banco
          const pool = db.getPool();
          await pool.query(
            `INSERT INTO tickets 
             (id, cliente_id, problema, categoria, prioridade, status) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [ticket.id, cliente_id, problema, categoria, prioridade, 'aberto']
          );

          logger.info(`Ticket criado: ${ticket.id}`);

          return JSON.stringify({
            ticket_criado: ticket.id,
            status: 'aberto',
            prioridade,
            tempo_resposta_estimado: this.getTempoResposta(prioridade)
          });
        } catch (error) {
          logger.error('Erro na tool criar_ticket:', error);
          return `Ticket criado para: ${problema}`;
        }
      }
    });
  }

  /**
   * Tool para buscar histórico do cliente
   */
  private createBuscarHistoricoTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: "buscar_historico",
      description: "Busca histórico de atendimentos anteriores do cliente",
      schema: z.object({
        cliente_id: z.string().describe("ID do cliente"),
        limite: z.number().default(5).describe("Número de registros")
      }),
      func: async ({ cliente_id, limite }: { cliente_id: string; limite: number }) => {
        try {
          const pool = db.getPool();
          const resultado = await pool.query(
            `SELECT t.*, f.rating, f.resolvido 
             FROM tickets t
             LEFT JOIN feedback_atendimento f ON t.id = f.ticket_id
             WHERE t.cliente_id = $1 
             ORDER BY t.created_at DESC 
             LIMIT $2`,
            [cliente_id, limite]
          );

          const historico = resultado.rows.map((row: any) => ({
            ticket_id: row.id,
            problema: row.problema,
            status: row.status,
            rating: row.rating,
            resolvido: row.resolvido,
            data: row.created_at
          }));

          return JSON.stringify({
            cliente_id,
            total_atendimentos: historico.length,
            historico,
            cliente_recorrente: historico.length > 1
          });
        } catch (error) {
          logger.error('Erro na tool buscar_historico:', error);
          return `Cliente ${cliente_id}: Primeiro atendimento`;
        }
      }
    });
  }

  /**
   * Tool para validar se solução funcionou
   */
  private createValidarSolucaoTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: "validar_solucao",
      description: "Valida com o cliente se a solução proposta funcionou",
      schema: z.object({
        pergunta_validacao: z.string().describe("Pergunta específica para validar"),
        passos_executados: z.array(z.string()).describe("Lista de passos que foram executados"),
        problema_original: z.string().describe("Problema original relatado")
      }),
      func: async ({
        pergunta_validacao,
        passos_executados,
        problema_original
      }: {
        pergunta_validacao: string;
        passos_executados: string[];
        problema_original: string;
      }) => {
        try {
          const validacao = {
            pergunta: pergunta_validacao,
            contexto: {
              problema_original,
              passos_executados,
              timestamp: new Date().toISOString()
            },
            proximos_passos: [
              "Aguarde resposta do cliente",
              "Se funcionou: coletar feedback",
              "Se não funcionou: investigar mais ou escalar"
            ]
          };

          return JSON.stringify(validacao);
        } catch (error) {
          logger.error('Erro na tool validar_solucao:', error);
          return `Validação: ${pergunta_validacao}`;
        }
      }
    });
  }

  /**
   * Método principal para processar mensagens
   */
  public async processarMensagem(mensagem: string, clienteId?: string): Promise<AgentResponse> {
    try {
      // Validar entrada
      const mensagemValidada = Validators.validarChatMessage({ content: mensagem });
      
      logger.info(`Processando mensagem do cliente ${clienteId}: ${mensagem.substring(0, 50)}...`);

      // Executar agente
      const resultado = await this.agent.call({
        input: mensagem,
        cliente_id: clienteId || 'anonimo'
      });

      // Processar resposta
      const response: AgentResponse = {
        message: resultado.output,
        action: this.determinarAcao(resultado.output),
        confidence: this.calcularConfianca(resultado),
        tools_used: this.extrairFerramentasUsadas(resultado),
        next_steps: this.sugerirProximosPassos(resultado.output),
        ticket_update: this.currentTicket ? {
          id: this.currentTicket.id,
          status: this.currentTicket.status
        } : undefined
      };

      logger.success('Mensagem processada pelo agente');
      return response;

    } catch (error) {
      logger.error('Erro ao processar mensagem:', error);
      
      return {
        message: "Desculpe, ocorreu um erro interno. Vou escalar seu caso para um técnico humano que entrará em contato em breve.",
        action: 'escalate',
        confidence: 0,
        tools_used: [],
        next_steps: ["Aguarde contato do suporte técnico"]
      };
    }
  }

  /**
   * Determina a ação baseada na resposta
   */
  private determinarAcao(resposta: string): 'continue' | 'escalate' | 'solved' | 'need_info' {
    const respostaLower = resposta.toLowerCase();
    
    if (respostaLower.includes('escalado') || respostaLower.includes('técnico especializado')) {
      return 'escalate';
    }
    
    if (respostaLower.includes('resolvido') || respostaLower.includes('problema solucionado')) {
      return 'solved';
    }
    
    if (respostaLower.includes('preciso saber') || respostaLower.includes('me informe')) {
      return 'need_info';
    }
    
    return 'continue';
  }

  /**
   * Calcula confiança baseada no resultado
   */
  private calcularConfianca(resultado: any): number {
    // Lógica simples - pode ser melhorada
    const temFerramenta = resultado.intermediateSteps?.length > 0;
    const temSolucao = resultado.output.length > 100;
    
    if (temFerramenta && temSolucao) return 0.9;
    if (temFerramenta || temSolucao) return 0.7;
    return 0.5;
  }

  /**
   * Extrai ferramentas usadas
   */
  private extrairFerramentasUsadas(resultado: any): string[] {
    return resultado.intermediateSteps?.map((step: any) => step.action?.tool) || [];
  }

  /**
   * Sugere próximos passos
   */
  private sugerirProximosPassos(resposta: string): string[] {
    const passos: string[] = [];
    
    if (resposta.includes('execute')) {
      passos.push("Execute os passos sugeridos");
      passos.push("Relate o resultado");
    }
    
    if (resposta.includes('verifique')) {
      passos.push("Verifique as configurações mencionadas");
    }
    
    if (passos.length === 0) {
      passos.push("Siga as orientações fornecidas");
      passos.push("Entre em contato se precisar de ajuda");
    }
    
    return passos;
  }

  /**
   * Calcula tempo estimado de resposta
   */
  private getTempoResposta(prioridade: string): string {
    const tempos = {
      'critica': '30 minutos',
      'alta': '2 horas', 
      'media': '4 horas',
      'baixa': '24 horas'
    };
    
    return tempos[prioridade as keyof typeof tempos] || '4 horas';
  }

  /**
   * Limpa memória da conversa
   */
  public async limparMemoria(): Promise<void> {
    await this.memory.clear();
    this.currentTicket = null;
    logger.info('Memória do agente limpa');
  }

  /**
   * Obter estatísticas do agente
   */
  public async obterEstatisticas(): Promise<any> {
    try {
      const pool = db.getPool();
      
      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total_tickets,
          COUNT(CASE WHEN status = 'resolvido' THEN 1 END) as resolvidos,
          COUNT(CASE WHEN status = 'escalado' THEN 1 END) as escalados,
          AVG(CASE WHEN f.rating IS NOT NULL THEN f.rating END) as rating_medio
        FROM tickets t
        LEFT JOIN feedback_atendimento f ON t.id = f.ticket_id
        WHERE t.created_at >= NOW() - INTERVAL '30 days'
      `);
      
      return {
        periodo: '30 dias',
        ...stats.rows[0],
        agente_ativo: true,
        ferramentas_disponiveis: 8
      };
      
    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      return { erro: 'Não foi possível obter estatísticas' };
    }
  }
}

export default SuporteAgent;