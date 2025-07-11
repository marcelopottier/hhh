export const validateProcedimento = (req, res, next) => {
  try {
    const {
      categoria_id,
      titulo,
      descricao_problema,
      solucao_completa,
      palavras_chave = [],
      tags = [],
      dificuldade = 3,
      tempo_estimado,
      passos = [],
      recursos = []
    } = req.body;

    const errors = [];

    // Validações obrigatórias
    if (!titulo || typeof titulo !== 'string' || titulo.trim().length < 3) {
      errors.push('Título é obrigatório e deve ter pelo menos 3 caracteres');
    }

    if (!descricao_problema || typeof descricao_problema !== 'string' || descricao_problema.trim().length < 10) {
      errors.push('Descrição do problema é obrigatória e deve ter pelo menos 10 caracteres');
    }

    if (!solucao_completa || typeof solucao_completa !== 'string' || solucao_completa.trim().length < 10) {
      errors.push('Solução completa é obrigatória e deve ter pelo menos 10 caracteres');
    }

    // Validações opcionais
    if (categoria_id && (!Number.isInteger(categoria_id) || categoria_id < 1)) {
      errors.push('categoria_id deve ser um número inteiro positivo');
    }

    if (!Array.isArray(palavras_chave)) {
      errors.push('palavras_chave deve ser um array');
    }

    if (!Array.isArray(tags)) {
      errors.push('tags deve ser um array');
    }

    if (dificuldade && (!Number.isInteger(dificuldade) || dificuldade < 1 || dificuldade > 5)) {
      errors.push('dificuldade deve ser um número inteiro entre 1 e 5');
    }

    if (tempo_estimado && (!Number.isInteger(tempo_estimado) || tempo_estimado < 1)) {
      errors.push('tempo_estimado deve ser um número inteiro positivo (em minutos)');
    }

    // Validação dos passos
    if (!Array.isArray(passos)) {
      errors.push('passos deve ser um array');
    } else {
      passos.forEach((passo, index) => {
        if (!passo.numero_passo || !Number.isInteger(passo.numero_passo) || passo.numero_passo < 1) {
          errors.push(`Passo ${index + 1}: numero_passo é obrigatório e deve ser um inteiro positivo`);
        }

        if (!passo.descricao_passo || typeof passo.descricao_passo !== 'string' || passo.descricao_passo.trim().length < 5) {
          errors.push(`Passo ${index + 1}: descricao_passo é obrigatória e deve ter pelo menos 5 caracteres`);
        }

        if (passo.tipo_passo && !['acao', 'verificacao', 'observacao', 'aviso'].includes(passo.tipo_passo)) {
          errors.push(`Passo ${index + 1}: tipo_passo deve ser 'acao', 'verificacao', 'observacao' ou 'aviso'`);
        }

        if (passo.obrigatorio !== undefined && typeof passo.obrigatorio !== 'boolean') {
          errors.push(`Passo ${index + 1}: obrigatorio deve ser true ou false`);
        }

        if (passo.tempo_estimado && (!Number.isInteger(passo.tempo_estimado) || passo.tempo_estimado < 1)) {
          errors.push(`Passo ${index + 1}: tempo_estimado deve ser um número inteiro positivo`);
        }
      });

      // Verificar se os números dos passos são sequenciais e únicos
      const numerosPasso = passos.map(p => p.numero_passo).sort((a, b) => a - b);
      const numerosUnicos = [...new Set(numerosPasso)];
      
      if (numerosPasso.length !== numerosUnicos.length) {
        errors.push('Os números dos passos devem ser únicos');
      }

      // Verificar se começam do 1 e são sequenciais
      if (numerosPasso.length > 0) {
        const expected = Array.from({length: numerosPasso.length}, (_, i) => i + 1);
        const isSequential = numerosPasso.every((num, index) => num === expected[index]);
        
        if (!isSequential) {
          errors.push('Os números dos passos devem ser sequenciais começando do 1');
        }
      }
    }

    // Validação dos recursos
    if (!Array.isArray(recursos)) {
      errors.push('recursos deve ser um array');
    } else {
      recursos.forEach((recurso, index) => {
        if (!recurso.tipo_recurso || !['video', 'imagem', 'link', 'documento'].includes(recurso.tipo_recurso)) {
          errors.push(`Recurso ${index + 1}: tipo_recurso é obrigatório e deve ser 'video', 'imagem', 'link' ou 'documento'`);
        }

        if (!recurso.titulo || typeof recurso.titulo !== 'string' || recurso.titulo.trim().length < 3) {
          errors.push(`Recurso ${index + 1}: titulo é obrigatório e deve ter pelo menos 3 caracteres`);
        }

        if (recurso.url && (typeof recurso.url !== 'string' || !isValidUrl(recurso.url))) {
          errors.push(`Recurso ${index + 1}: url deve ser uma URL válida`);
        }

        if (recurso.ordem && (!Number.isInteger(recurso.ordem) || recurso.ordem < 1)) {
          errors.push(`Recurso ${index + 1}: ordem deve ser um número inteiro positivo`);
        }
      });
    }

    // Se há erros, retornar resposta de erro
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors
      });
    }

    // Limpar e padronizar dados
    req.body = {
      categoria_id,
      titulo: titulo.trim(),
      descricao_problema: descricao_problema.trim(),
      solucao_completa: solucao_completa.trim(),
      palavras_chave: palavras_chave.map(p => p.toString().trim().toLowerCase()).filter(p => p.length > 0),
      tags: tags.map(t => t.toString().trim().toLowerCase()).filter(t => t.length > 0),
      dificuldade,
      tempo_estimado,
      passos: passos.map(passo => ({
        numero_passo: passo.numero_passo,
        titulo_passo: passo.titulo_passo ? passo.titulo_passo.trim() : null,
        descricao_passo: passo.descricao_passo.trim(),
        tipo_passo: passo.tipo_passo || 'acao',
        obrigatorio: passo.obrigatorio !== false,
        tempo_estimado: passo.tempo_estimado
      })),
      recursos: recursos.map(recurso => ({
        tipo_recurso: recurso.tipo_recurso,
        titulo: recurso.titulo.trim(),
        url: recurso.url ? recurso.url.trim() : null,
        descricao: recurso.descricao ? recurso.descricao.trim() : null,
        ordem: recurso.ordem || 1
      }))
    };

    next();

  } catch (error) {
    console.error('[Validation] Erro na validação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na validação',
      error: error.message
    });
  }
};

export const validateBusca = (req, res, next) => {
  try {
    const { query, limit = 5, similarity_threshold = 0.7 } = req.body;

    const errors = [];

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      errors.push('Query de busca é obrigatória e deve ter pelo menos 3 caracteres');
    }

    if (limit && (!Number.isInteger(limit) || limit < 1 || limit > 50)) {
      errors.push('Limit deve ser um número inteiro entre 1 e 50');
    }

    if (similarity_threshold && (typeof similarity_threshold !== 'number' || similarity_threshold < 0 || similarity_threshold > 1)) {
      errors.push('similarity_threshold deve ser um número entre 0 e 1');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetros de busca inválidos',
        errors: errors
      });
    }

    req.body.query = query.trim();
    req.body.limit = limit;
    req.body.similarity_threshold = similarity_threshold;

    next();

  } catch (error) {
    console.error('[Validation] Erro na validação de busca:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na validação',
      error: error.message
    });
  }
};

export const validateCategoria = (req, res, next) => {
  try {
    const { nome, descricao } = req.body;

    const errors = [];

    if (!nome || typeof nome !== 'string' || nome.trim().length < 3) {
      errors.push('Nome da categoria é obrigatório e deve ter pelo menos 3 caracteres');
    }

    if (descricao && (typeof descricao !== 'string' || descricao.trim().length < 5)) {
      errors.push('Descrição deve ter pelo menos 5 caracteres se fornecida');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados da categoria inválidos',
        errors: errors
      });
    }

    req.body = {
      nome: nome.trim(),
      descricao: descricao ? descricao.trim() : null
    };

    next();

  } catch (error) {
    console.error('[Validation] Erro na validação de categoria:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na validação',
      error: error.message
    });
  }
};

export const validateMassa = (req, res, next) => {
  try {
    const { procedimentos } = req.body;

    if (!Array.isArray(procedimentos) || procedimentos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Array de procedimentos é obrigatório e deve conter pelo menos um item'
      });
    }

    if (procedimentos.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Máximo de 100 procedimentos por vez para evitar timeout'
      });
    }

    // Validação básica de cada procedimento
    const errors = [];
    procedimentos.forEach((proc, index) => {
      if (!proc.titulo || typeof proc.titulo !== 'string') {
        errors.push(`Procedimento ${index + 1}: título é obrigatório`);
      }
      if (!proc.descricao_problema || typeof proc.descricao_problema !== 'string') {
        errors.push(`Procedimento ${index + 1}: descrição do problema é obrigatória`);
      }
      if (!proc.solucao_completa || typeof proc.solucao_completa !== 'string') {
        errors.push(`Procedimento ${index + 1}: solução completa é obrigatória`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Erros nos dados dos procedimentos',
        errors: errors.slice(0, 10) // Limitar número de erros mostrados
      });
    }

    next();

  } catch (error) {
    console.error('[Validation] Erro na validação em massa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na validação',
      error: error.message
    });
  }
};

// Função auxiliar para validar URLs
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Middleware para logging de requests
export const logRequest = (req, res, next) => {
  const start = Date.now();
  const { method, url, ip } = req;
  
  console.log(`[API] ${method} ${url} - IP: ${ip}`);
  
  // Override do método res.json para capturar response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    console.log(`[API] ${method} ${url} - ${res.statusCode} - ${duration}ms`);
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware para tratamento de erros globais
export const errorHandler = (error, req, res, next) => {
  console.error('[API] Erro não tratado:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });

  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
  });
};