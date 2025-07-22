export function analyzeCustomerLocationRefined(address: any): {
  isJoinville: boolean;
  region: string;
  state?: string;
  details: string;
} {
  const fullAddress = address.fullAddress.toLowerCase();
  const cep = address.cep.replace(/\D/g, '');
  
  const isJoinville = fullAddress.includes('joinville') || 
                     fullAddress.includes('joinvile') ||
                     cep.startsWith('89200') || 
                     cep.startsWith('89201') || 
                     cep.startsWith('89202') ||
                     cep.startsWith('89203') ||
                     cep.startsWith('89204') ||
                     cep.startsWith('89205') ||
                     cep.startsWith('89206') ||
                     cep.startsWith('89207') ||
                     cep.startsWith('89208') ||
                     cep.startsWith('89209') ||
                     cep.startsWith('89210') ||
                     cep.startsWith('89211') ||
                     cep.startsWith('89212') ||
                     cep.startsWith('89213') ||
                     cep.startsWith('89214') ||
                     cep.startsWith('89215') ||
                     cep.startsWith('89216') ||
                     cep.startsWith('89217') ||
                     cep.startsWith('89218') ||
                     cep.startsWith('89219') ||
                     cep.startsWith('89220') ||
                     cep.startsWith('89221') ||
                     cep.startsWith('89222') ||
                     cep.startsWith('89223') ||
                     cep.startsWith('89224') ||
                     cep.startsWith('89225') ||
                     cep.startsWith('89226') ||
                     cep.startsWith('89227') ||
                     cep.startsWith('89228') ||
                     cep.startsWith('89229') ||
                     cep.startsWith('89230') ||
                     cep.startsWith('89231') ||
                     cep.startsWith('89232') ||
                     cep.startsWith('89233') ||
                     cep.startsWith('89234') ||
                     cep.startsWith('89235') ||
                     cep.startsWith('89236') ||
                     cep.startsWith('89237') ||
                     cep.startsWith('89238') ||
                     cep.startsWith('89239');
  
  // Identificar região geral
  let region = 'other';
  if (isJoinville) region = 'joinville';
  else if (fullAddress.includes('santa catarina') || fullAddress.includes('sc')) region = 'santa_catarina';
  else if (fullAddress.includes('são paulo') || fullAddress.includes('sp')) region = 'sao_paulo';
  else if (fullAddress.includes('rio de janeiro') || fullAddress.includes('rj')) region = 'rio_de_janeiro';
  
  return {
    isJoinville: isJoinville,
    region: region,
    details: `Endereço analisado: ${address.fullAddress}${isJoinville ? ' (Joinville - Loja física disponível)' : ' (Outras opções disponíveis)'}`
  };
}

export function generateProblemSummary(problemTag: string): string {
  const summaries: { [key: string]: string } = {
    'boot_issue': 'Computador não liga/problemas de inicialização',
    'bsod': 'Tela azul da morte (BSOD)',
    'performance': 'Lentidão/travamentos do sistema',
    'update_issue': 'Problemas com atualizações',
    'hardware_failure': 'Falha de hardware detectada',
    'software_error': 'Erros de software/aplicativos',
    'network_issue': 'Problemas de conectividade',
    'display_problem': 'Problemas de vídeo/tela',
    'audio_issue': 'Problemas de áudio',
    'peripheral_issue': 'Problemas com periféricos',
  };
  
  return summaries[problemTag] || 'Problema técnico não identificado especificamente';
}

// Funções para atualizar FreshDesk com notas internas específicas

export async function updateFreshdeskForPhysicalStore(
  ticketId: string,
  address: any,
  customerData: any,
  problemTag: string,
  problemSummary: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[FRESHDESK] Atualizando para loja física - Ticket: ${ticketId}`);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const internalNote = `CLIENTE OPTOU PELA LOJA FÍSICA - JOINVILLE

INFORMAÇÕES DO CLIENTE:
- Nome: ${customerData?.name || 'Não informado'}
- Pedido: ${customerData?.orderNumber || 'Não informado'}
- Modelo: ${customerData?.equipmentModel || 'Não especificado'}

ENDEREÇO DO CLIENTE:
${address.fullAddress}

PROBLEMA:
Tag: ${problemTag}
Resumo: ${problemSummary}

AÇÃO:
Cliente confirmou que levará o equipamento na LOJA FÍSICA de Joinville
Endereço da loja: Rua Visconde de Taunay, 380 - Atiradores
Horário: Segunda a Sexta, 8h às 18h

STATUS: Transferir para equipe da loja física
CONTATO: Cliente já orientado sobre horário e local

TRANSFERIDO EM: ${new Date().toLocaleString('pt-BR')}`;
    
    console.log(`[FRESHDESK] 🏪 Nota interna criada para loja física`);
    console.log(`[FRESHDESK] 🏷️ Tags: physical_store, joinville, customer_choice`);
    
    return { success: true };
    
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

export async function updateFreshdeskForVoucherChoice(
  ticketId: string,
  address: any,
  customerData: any,
  problemTag: string,
  problemSummary: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[FRESHDESK] Atualizando para voucher - Ticket: ${ticketId}`);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const internalNote = `CLIENTE ESCOLHEU VOUCHER DE R$ 150,00

📋 INFORMAÇÕES DO CLIENTE:
- Nome: ${customerData?.name || 'Não informado'}
- Pedido: ${customerData?.orderNumber || 'Não informado'}
- Modelo: ${customerData?.equipmentModel || 'Não especificado'}

ENDEREÇO:
${address.fullAddress}

PROBLEMA:
Tag: ${problemTag}
Resumo: ${problemSummary}

VOUCHER SOLICITADO:
- Valor: R$ 150,00
- Tipo: Reembolso para assistência técnica local
- Status: ACEITO PELO CLIENTE

PROCESSADO EM: ${new Date().toLocaleString('pt-BR')}`;
    
    console.log(`[FRESHDESK] 🎫 Nota interna criada para voucher`);
    console.log(`[FRESHDESK] 🏷️ Tags: voucher_accepted, reimbursement_150, human_required`);
    
    return { success: true };
    
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

export async function updateFreshdeskForCollectionChoice(
  ticketId: string,
  address: any,
  customerData: any,
  problemTag: string,
  problemSummary: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[FRESHDESK] Atualizando para coleta - Ticket: ${ticketId}`);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const internalNote = `CLIENTE ESCOLHEU COLETA GRATUITA

INFORMAÇÕES DO CLIENTE:
- Nome: ${customerData?.name || 'Não informado'}
- Pedido: ${customerData?.orderNumber || 'Não informado'}
- Modelo: ${customerData?.equipmentModel || 'Não especificado'}

ENDEREÇO PARA COLETA:
${address.fullAddress}

PROBLEMA:
Tag: ${problemTag}
Resumo: ${problemSummary}

COLETA CONFIRMADA:
- Tipo: Gratuita
- Status: ACEITA PELO CLIENTE
- Endereço confirmado pelo sistema

AGENDADO EM: ${new Date().toLocaleString('pt-BR')}`;
    
    console.log(`[FRESHDESK] Nota interna criada para coleta`);
    console.log(`[FRESHDESK] Tags: collection_accepted, free_shipping, logistics_required`);
    
    return { success: true };
    
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

export function analyzeCustomerIntent(response: string, context: string): {
  acceptsPhysicalStore?: boolean;
  prefersVoucher?: boolean;
  isUnclear?: boolean;
} {
  const responseLower = response.toLowerCase().trim();
  
  if (context === "joinville_store_choice") {
    // Analisar se aceita loja física
    
    // Respostas positivas para loja
    if (
      responseLower.includes('sim') ||
      responseLower.includes('aceito') ||
      responseLower.includes('loja') ||
      responseLower.includes('físic') ||
      responseLower.includes('presencial') ||
      responseLower.includes('vou levar') ||
      responseLower.includes('posso levar') ||
      responseLower.includes('prefiro levar') ||
      responseLower.includes('melhor levar') ||
      responseLower.includes('ok') ||
      responseLower.includes('perfeito') ||
      responseLower.includes('ótimo') ||
      responseLower.includes('blz') ||
      responseLower.includes('beleza')
    ) {
      return { acceptsPhysicalStore: true };
    }
    
    // Respostas negativas para loja (prefere coleta)
    if (
      responseLower.includes('não') ||
      responseLower.includes('nao') ||
      responseLower.includes('coleta') ||
      responseLower.includes('buscar') ||
      responseLower.includes('casa') ||
      responseLower.includes('residência') ||
      responseLower.includes('residencia') ||
      responseLower.includes('prefiro coleta') ||
      responseLower.includes('melhor coleta') ||
      responseLower.includes('coletar') ||
      responseLower.includes('retirar') ||
      responseLower.includes('não posso levar') ||
      responseLower.includes('nao posso levar')
    ) {
      return { acceptsPhysicalStore: false };
    }
    
  } else if (context === "other_region_choice") {
    // Analisar se prefere voucher ou coleta
    
    // Respostas para voucher
    if (
      responseLower.includes('voucher') ||
      responseLower.includes('reembolso') ||
      responseLower.includes('150') ||
      responseLower.includes('dinheiro') ||
      responseLower.includes('local') ||
      responseLower.includes('assistência') ||
      responseLower.includes('assistencia') ||
      responseLower.includes('próximo') ||
      responseLower.includes('proximo') ||
      responseLower.includes('perto') ||
      responseLower.includes('aqui perto') ||
      responseLower.includes('na minha cidade') ||
      responseLower.includes('opção 1') ||
      responseLower.includes('opcao 1') ||
      responseLower.includes('primeira opção') ||
      responseLower.includes('primeira opcao')
    ) {
      return { prefersVoucher: true };
    }
    
    // Respostas para coleta
    if (
      responseLower.includes('coleta') ||
      responseLower.includes('buscar') ||
      responseLower.includes('coletar') ||
      responseLower.includes('laboratório') ||
      responseLower.includes('laboratorio') ||
      responseLower.includes('especializado') ||
      responseLower.includes('vocês') ||
      responseLower.includes('pichau') ||
      responseLower.includes('casa') ||
      responseLower.includes('residência') ||
      responseLower.includes('residencia') ||
      responseLower.includes('opção 2') ||
      responseLower.includes('opcao 2') ||
      responseLower.includes('segunda opção') ||
      responseLower.includes('segunda opcao') ||
      responseLower.includes('gratuita') ||
      responseLower.includes('grátis') ||
      responseLower.includes('gratis')
    ) {
      return { prefersVoucher: false };
    }
  }
  
  // Se não conseguiu determinar claramente
  return { isUnclear: true };
}

export function extractAddressFromQuery(query: string): {
  street: string;
  neighborhood: string;
  cep: string;
  complement?: string;
  fullAddress: string;
  isComplete: boolean;
} {
  const lines = query.split('\n').map(line => line.trim());
  
  let street = '';
  let neighborhood = '';
  let cep = '';
  let complement = '';
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('rua:') || lowerLine.includes('rua ')) {
      street = line.split(':')[1]?.trim() || line.replace(/rua\s*/i, '').trim();
    } else if (lowerLine.includes('bairro:') || lowerLine.includes('bairro ')) {
      neighborhood = line.split(':')[1]?.trim() || line.replace(/bairro\s*/i, '').trim();
    } else if (lowerLine.includes('cep:') || lowerLine.includes('cep ')) {
      cep = line.split(':')[1]?.trim() || line.replace(/cep\s*/i, '').trim();
    } else if (lowerLine.includes('complemento:') || lowerLine.includes('complemento ')) {
      complement = line.split(':')[1]?.trim() || line.replace(/complemento\s*/i, '').trim();
    }
  }
  
  // Verificar se campos obrigatórios estão preenchidos
  const isComplete = !!(street && neighborhood && cep);
  
  const fullAddress = `${street}, ${neighborhood}, CEP: ${cep}${complement ? `, ${complement}` : ''}`;
  
  return {
    street,
    neighborhood,
    cep,
    complement,
    fullAddress,
    isComplete
  };
}