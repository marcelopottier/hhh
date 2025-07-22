CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. NÃO DÁ VÍDEO - STEP 1 (PRINCIPAL)
-- =============================================

INSERT INTO support_solutions (
    problem_tag,
    step,
    title,
    introduction,
    problem_description,
    content,
    procedures,
    resources,
    closing_message,
    next_steps,
    tools_required,
    keywords,
    tags,
    category,
    subcategory,
    difficulty,
    estimated_time_minutes,
    created_by
) VALUES (
    'nao_da_video',
    1,
    'Computador não dá vídeo - Testes iniciais',
    'Vou te passar alguns testes para que possamos descartar algumas possíveis causas. Ao final da Listagem estou te enviando alguns links de vídeos que podem auxiliar no processo ok?',
    'Computador não exibe imagem no monitor, tela preta ou sem sinal de vídeo',
    'Por gentileza:

• Remova as memórias e utilize uma borracha branca ou folha de papel para realizar a limpeza dos contatos da memória (parte dourada/amarela).
• Verifique o encaixe da(s) memória(s) e troque-as de slot para verificar se o computador passa a funcionar.
• Se o seu computador tiver 2 módulos de memória, utilize apenas uma de cada vez para testes.
• Verifique se os cabos da fonte estão bem encaixados nos componentes e na placa-mãe: conector de 24 pinos e conector de alimentação do processador.
• Verifique se o dissipador de calor do processador está bem encaixado.
• Tente ligar com outro cabo de energia ou em outra tomada/filtro de linha. Evite utilizar adaptadores.
• Tente estar utilizando em outro monitor/televisor.
• Tente utilizar outro cabo em sua conexão de vídeo do pc/monitor.
• Evite utilizar adaptadores ou conversores em cabos de vídeo.

Se estiver tudo certo tente resetar a BIOS seguindo as etapas:
1 - Primeiramente desligue o computador e desconecte todos os cabos da parte traseira, incluindo o cabo de alimentação.
2 - Após isso localize a bateria da Placa mãe. Ela tem um formato circular e normalmente fica próxima ao SLOT PCI da placa de vídeo.
3 - Uma vez localizada a bateria, empurre a trava que prende a bateria para remove-la da placa mãe.
4 - Uma vez removida a bateria, pressione o botão LIGAR do gabinete por 15 segundos pelo menos e solte.
5 - Após isso recoloque a bateria do computador e tente ligar o PC novamente.

Lembre-se de desconectar o computador da tomada antes de trabalhar em sua placa-mãe e manusear a bateria com cuidado.',
    '[
        {
            "order": 1,
            "category": "memory",
            "instruction": "Remova as memórias e utilize uma borracha branca ou folha de papel para realizar a limpeza dos contatos da memória (parte dourada/amarela).",
            "type": "acao",
            "safety_warning": "Desligue o computador antes de manusear componentes internos",
            "estimated_minutes": 5
        },
        {
            "order": 2,
            "category": "memory",
            "instruction": "Verifique o encaixe da(s) memória(s) e troque-as de slot para verificar se o computador passa a funcionar.",
            "type": "verificacao",
            "estimated_minutes": 3
        },
        {
            "order": 3,
            "category": "memory",
            "instruction": "Se o seu computador tiver 2 módulos de memória, utilize apenas uma de cada vez para testes.",
            "type": "acao",
            "estimated_minutes": 5
        },
        {
            "order": 4,
            "category": "power",
            "instruction": "Verifique se os cabos da fonte estão bem encaixados nos componentes e na placa-mãe: conector de 24 pinos e conector de alimentação do processador.",
            "type": "verificacao",
            "estimated_minutes": 3
        },
        {
            "order": 5,
            "category": "cooling",
            "instruction": "Verifique se o dissipador de calor do processador está bem encaixado.",
            "type": "verificacao",
            "estimated_minutes": 2
        },
        {
            "order": 6,
            "category": "power",
            "instruction": "Tente ligar com outro cabo de energia ou em outra tomada/filtro de linha. Evite utilizar adaptadores.",
            "type": "acao",
            "estimated_minutes": 2
        },
        {
            "order": 7,
            "category": "display",
            "instruction": "Tente estar utilizando em outro monitor/televisor.",
            "type": "acao",
            "estimated_minutes": 3
        },
        {
            "order": 8,
            "category": "display",
            "instruction": "Tente utilizar outro cabo em sua conexão de vídeo do pc/monitor. Evite utilizar adaptadores ou conversores em cabos de vídeo.",
            "type": "acao",
            "estimated_minutes": 3
        },
        {
            "order": 9,
            "category": "bios",
            "instruction": "Desligue o computador e desconecte todos os cabos da parte traseira, incluindo o cabo de alimentação.",
            "type": "preparacao",
            "safety_warning": "Certifique-se de que o computador está completamente desligado",
            "estimated_minutes": 2
        },
        {
            "order": 10,
            "category": "bios",
            "instruction": "Localize a bateria da Placa mãe. Ela tem um formato circular e normalmente fica próxima ao SLOT PCI da placa de vídeo.",
            "type": "localizacao",
            "estimated_minutes": 3
        },
        {
            "order": 11,
            "category": "bios",
            "instruction": "Empurre a trava que prende a bateria para remove-la da placa mãe.",
            "type": "acao",
            "safety_warning": "Manuseie a bateria com cuidado",
            "estimated_minutes": 2
        },
        {
            "order": 12,
            "category": "bios",
            "instruction": "Com a bateria removida, pressione o botão LIGAR do gabinete por 15 segundos pelo menos e solte.",
            "type": "acao",
            "estimated_minutes": 1
        },
        {
            "order": 13,
            "category": "bios",
            "instruction": "Recoloque a bateria do computador e tente ligar o PC novamente.",
            "type": "finalizacao",
            "estimated_minutes": 3
        }
    ]'::jsonb,
    '[
        {
            "type": "video",
            "title": "Retirando a memória RAM",
            "url": "https://youtu.be/UU_KTI3IjQY",
            "description": "Vídeo demonstrando como remover corretamente os módulos de memória RAM",
            "category": "memory",
            "duration_seconds": 180
        },
        {
            "type": "video", 
            "title": "Limpando a memória RAM",
            "url": "https://youtu.be/ds0Dz957rJo",
            "description": "Como limpar adequadamente os contatos dourados da memória RAM",
            "category": "memory",
            "duration_seconds": 120
        }
    ]'::jsonb,
    'Estarei aguardando seu retorno com os resultados dos procedimentos. Qualquer dúvida estou a disposição!',
    ARRAY['nao_da_video_step_2'],
    ARRAY['borracha_branca', 'papel', 'cabo_energia_extra', 'monitor_extra', 'cabo_video_extra'],
    ARRAY['não dá vídeo', 'tela preta', 'sem sinal', 'não inicializa', 'memória RAM', 'fonte', 'BIOS', 'bateria', 'reset CMOS'],
    ARRAY['hardware', 'video', 'memoria', 'fonte', 'bios', 'troubleshooting', 'boot_issues'],
    'hardware',
    'video_issues',
    3,
    35,
    'pichau_official'
);

-- =============================================
-- 2. NÃO DÁ VÍDEO - STEP 2
-- =============================================

INSERT INTO support_solutions (
    problem_tag,
    step,
    title,
    introduction,
    problem_description,
    content,
    procedures,
    resources,
    closing_message,
    next_steps,
    tools_required,
    keywords,
    tags,
    category,
    subcategory,
    difficulty,
    estimated_time_minutes,
    created_by
) VALUES (
    'nao_da_video',
    2,
    'Computador não dá vídeo - Reset CMOS avançado',
    'Como seu computador não estaria dando vídeo, consegue realizar os procedimentos a seguir?',
    'Após primeiro teste sem sucesso, necessário reset mais profundo da BIOS/CMOS',
    'Com o computador desligado, remova o cabo de força da fonte, localize e remova a pilha CR2032 na placa-mãe.
Após aguardar de 1 a 2 min, recoloque a pilha na placa-mãe e ligue o computador novamente.

Para acesso a pilha, em alguns casos é necessário remover a placa de vídeo.

Caso não haja resultado, siga as instruções do vídeo de diagnóstico avançado.',
    '[
        {
            "order": 1,
            "category": "safety",
            "instruction": "Desligue o computador completamente e remova o cabo de força da fonte.",
            "type": "preparacao",
            "safety_warning": "Certifique-se de que o computador está completamente desligado",
            "estimated_minutes": 2
        },
        {
            "order": 2,
            "category": "hardware_access",
            "instruction": "Localize a pilha CR2032 na placa-mãe. Se necessário, remova a placa de vídeo para acessá-la.",
            "type": "localizacao",
            "estimated_minutes": 10
        },
        {
            "order": 3,
            "category": "cmos_reset",
            "instruction": "Remova cuidadosamente a pilha CR2032 da placa-mãe.",
            "type": "acao",
            "safety_warning": "Manuseie a pilha com cuidado",
            "estimated_minutes": 3
        },
        {
            "order": 4,
            "category": "waiting",
            "instruction": "Aguarde de 1 a 2 minutos com a pilha removida para descarregar completamente o CMOS.",
            "type": "observacao",
            "estimated_minutes": 2
        },
        {
            "order": 5,
            "category": "reassembly",
            "instruction": "Recoloque a pilha na placa-mãe e reconecte todos os componentes.",
            "type": "acao",
            "estimated_minutes": 5
        },
        {
            "order": 6,
            "category": "test",
            "instruction": "Conecte o cabo de força e tente ligar o computador novamente.",
            "type": "acao",
            "estimated_minutes": 3
        }
    ]'::jsonb,
    '[
        {
            "type": "video",
            "title": "Removendo placa de vídeo",
            "url": "https://www.youtube.com/watch?v=nSWclv5O1Do",
            "description": "Tutorial para remover placa de vídeo e acessar pilha CMOS",
            "category": "hardware"
        },
        {
            "type": "video",
            "title": "Diagnóstico avançado",
            "url": "https://drive.google.com/file/d/1QYmuSqZyw6PdRgYIJEVGf-EKy5pegUKh/view?usp=drive_link",
            "description": "Procedimentos avançados de diagnóstico para casos complexos",
            "category": "diagnosis"
        }
    ]'::jsonb,
    'Aguardo seu retorno com o resultado dos procedimentos. Reitero que estamos empenhados para buscarmos uma solução adequada para o problema que está enfrentando!',
    ARRAY['escalate_to_human', 'collect_equipment'],
    ARRAY['chave_fenda', 'pulseira_antiestatica'],
    ARRAY['não dá vídeo', 'reset CMOS', 'pilha CR2032', 'placa de vídeo', 'BIOS', 'diagnóstico avançado'],
    ARRAY['hardware', 'video', 'cmos', 'bios', 'troubleshooting', 'advanced'],
    'hardware',
    'video_issues',
    4,
    25,
    'pichau_official'
);

-- =============================================
-- 3. NÃO LIGA - STEP 1
-- =============================================

INSERT INTO support_solutions (
    problem_tag,
    step,
    title,
    introduction,
    problem_description,
    content,
    procedures,
    resources,
    closing_message,
    next_steps,
    tools_required,
    keywords,
    tags,
    category,
    subcategory,
    difficulty,
    estimated_time_minutes,
    created_by
) VALUES (
    'nao_liga',
    1,
    'Computador não liga - Teste da fonte de alimentação',
    'Peço por gentileza que efetue um teste básico que irei instrui-lo a seguir.',
    'Computador não responde ao apertar botão power, sem sinais de vida',
    'Teste da fonte de alimentação:

• Tire a fonte da tomada e desconecte todos os cabos que conectam ela ao seu PC
• Localize o conector 24 pinos (cabo que alimenta a placa-mãe)
• Utilizando um clips, faça a ligação direta do pino verde 16 (PS/ON) no pino preto 17 logo ao lado
• Logo após, ligue a fonte na tomada para verificar se a ventoinha irá girar
• Comprove o resultado através de um vídeo se possível',
    '[
        {
            "order": 1,
            "category": "safety",
            "instruction": "Desligue o computador da tomada e desconecte todos os cabos da fonte.",
            "type": "preparacao",
            "safety_warning": "Certifique-se de que não há energia",
            "estimated_minutes": 5
        },
        {
            "order": 2,
            "category": "hardware_identification",
            "instruction": "Localize o conector 24 pinos da fonte (cabo principal que vai para a placa-mãe).",
            "type": "localizacao",
            "estimated_minutes": 3
        },
        {
            "order": 3,
            "category": "power_test",
            "instruction": "Usando um clips de papel, conecte o pino verde 16 (PS/ON) ao pino preto 17 ao lado.",
            "type": "acao",
            "safety_warning": "Use apenas clips de metal, cuidado com curtos",
            "estimated_minutes": 5
        },
        {
            "order": 4,
            "category": "power_test",
            "instruction": "Com o clips conectado, ligue a fonte na tomada.",
            "type": "acao",
            "estimated_minutes": 2
        },
        {
            "order": 5,
            "category": "verification",
            "instruction": "Observe se a ventoinha da fonte gira. Se girar, a fonte está funcionando.",
            "type": "observacao",
            "estimated_minutes": 3
        },
        {
            "order": 6,
            "category": "documentation",
            "instruction": "Se possível, grave um vídeo mostrando o resultado do teste.",
            "type": "acao",
            "estimated_minutes": 5
        }
    ]'::jsonb,
    '[
        {
            "type": "video",
            "title": "Procedimento completo em vídeo",
            "url": "https://drive.google.com/file/d/1HKTBXyYtMJA1yxqQSPr0EfkkgUxWBpNZ/view?usp=sharing",
            "description": "Tutorial completo do teste da fonte de alimentação",
            "category": "power_supply"
        }
    ]'::jsonb,
    'Me comprove o resultado através de um vídeo. Qualquer dúvida retorne o contato, estarei à disposição. Aguardo seu retorno.',
    ARRAY['nao_liga_step_2'],
    ARRAY['clips_metal', 'multimetro'],
    ARRAY['não liga', 'sem energia', 'fonte', 'power supply', 'teste fonte', 'clips', 'pino verde'],
    ARRAY['hardware', 'power', 'fonte', 'troubleshooting', 'diagnostico'],
    'hardware',
    'power_issues',
    3,
    25,
    'pichau_official'
);

-- =============================================
-- 4. NÃO LIGA - STEP 2
-- =============================================

INSERT INTO support_solutions (
    problem_tag,
    step,
    title,
    introduction,
    problem_description,
    content,
    procedures,
    resources,
    closing_message,
    next_steps,
    tools_required,
    keywords,
    tags,
    category,
    subcategory,
    difficulty,
    estimated_time_minutes,
    created_by
) VALUES (
    'nao_liga',
    2,
    'Computador não liga - Teste do botão Power',
    'Por gentileza peço que se possível, realize o procedimento a seguir.',
    'Após teste da fonte, verificar se botão power está funcionando corretamente',
    'Teste do botão Power:

• Retire todos os cabos do painel frontal localizados geralmente no canto inferior direito da placa mãe
• Com a fonte ligada, utilize algum objeto metálico (como um clips ou chave de fenda) para fazer uma ponte (encostar um no outro) entre os dois pinos que correspondem ao botão POWER
• Observe se o computador liga com este teste direto',
    '[
        {
            "order": 1,
            "category": "hardware_access",
            "instruction": "Localize os cabos do painel frontal no canto inferior direito da placa-mãe.",
            "type": "localizacao",
            "estimated_minutes": 3
        },
        {
            "order": 2,
            "category": "disconnection",
            "instruction": "Retire cuidadosamente todos os cabos do painel frontal (Power SW, Reset SW, Power LED, HDD LED).",
            "type": "acao",
            "safety_warning": "Puxe pelos conectores, não pelos fios",
            "estimated_minutes": 5
        },
        {
            "order": 3,
            "category": "identification",
            "instruction": "Identifique os dois pinos que correspondem ao Power SW (botão POWER) na placa-mãe.",
            "type": "localizacao",
            "estimated_minutes": 3
        },
        {
            "order": 4,
            "category": "power_connection",
            "instruction": "Certifique-se de que a fonte está conectada e ligada na tomada.",
            "type": "verificacao",
            "estimated_minutes": 2
        },
        {
            "order": 5,
            "category": "direct_test",
            "instruction": "Use um clips ou chave de fenda para fazer ponte entre os dois pinos do Power SW.",
            "type": "acao",
            "safety_warning": "Toque rapidamente, como se fosse apertar um botão",
            "estimated_minutes": 2
        },
        {
            "order": 6,
            "category": "observation",
            "instruction": "Observe se o computador liga com este teste direto dos pinos.",
            "type": "observacao",
            "estimated_minutes": 3
        },
        {
            "order": 7,
            "category": "reconnection",
            "instruction": "Reconecte os cabos do painel frontal após o teste.",
            "type": "acao",
            "estimated_minutes": 5
        }
    ]'::jsonb,
    '[
        {
            "type": "guide",
            "title": "Localização pinos Power SW",
            "description": "Referência visual para localização dos pinos na placa-mãe",
            "category": "reference"
        }
    ]'::jsonb,
    'Aguardo retorno com o resultado do teste. Se o computador ligar com ponte direta, o problema é no botão do gabinete.',
    ARRAY['trocar_botao_power', 'verificar_gabinete'],
    ARRAY['chave_fenda', 'clips_metal', 'lanterna'],
    ARRAY['não liga', 'botão power', 'painel frontal', 'power SW', 'ponte direta', 'pinos'],
    ARRAY['hardware', 'power', 'botao', 'gabinete', 'troubleshooting'],
    'hardware',
    'power_issues',
    4,
    25,
    'pichau_official'
);

-- =============================================
-- 5. TELA AZUL - STEP 1
-- =============================================

INSERT INTO support_solutions (
    problem_tag,
    step,
    title,
    introduction,
    problem_description,
    content,
    procedures,
    resources,
    closing_message,
    next_steps,
    tools_required,
    keywords,
    tags,
    category,
    subcategory,
    difficulty,
    estimated_time_minutes,
    created_by
) VALUES (
    'tela_azul',
    1,
    'Tela azul (BSOD) - Teste de memória RAM',
    'Vamos verificar se o problema está relacionado à memória RAM.',
    'Sistema apresenta tela azul da morte (Blue Screen of Death) com códigos de erro',
    'Teste de memória RAM:

• Verifique o encaixe da(s) memória(s) e troque-as de slot para verificar se o computador passa a funcionar
• Remova as memórias e efetue a limpeza das peças em questão
• Tente iniciar o PC com apenas uma memória inserida por vez
• Repita o procedimento com as duas memórias que possui e observe se o problema será presente nas duas memórias utilizadas individualmente',
    '[
        {
            "order": 1,
            "category": "memory",
            "instruction": "Verifique o encaixe da(s) memória(s) e troque-as de slot para verificar se o computador passa a funcionar.",
            "type": "verificacao",
            "estimated_minutes": 5
        },
        {
            "order": 2,
            "category": "memory",
            "instruction": "Remova as memórias e efetue a limpeza dos contatos dourados com borracha branca ou papel.",
            "type": "acao",
            "safety_warning": "Desligue o computador antes de manusear a memória",
            "estimated_minutes": 10
        },
        {
            "order": 3,
            "category": "memory_test",
            "instruction": "Tente iniciar o PC com apenas uma memória inserida por vez.",
            "type": "acao",
            "estimated_minutes": 10
        },
        {
            "order": 4,
            "category": "memory_test",
            "instruction": "Repita o procedimento com todas as memórias que possui, testando uma por vez.",
            "type": "acao",
            "estimated_minutes": 15
        },
        {
            "order": 5,
            "category": "observation",
            "instruction": "Observe se o problema de tela azul será presente com cada memória testada individualmente.",
            "type": "observacao",
            "estimated_minutes": 20
        }
    ]'::jsonb,
    '[
        {
            "type": "video",
            "title": "Retirando a memória RAM",
            "url": "https://youtu.be/UU_KTI3IjQY",
            "description": "Tutorial para remover módulos de memória RAM",
            "category": "memory"
        },
        {
            "type": "video",
            "title": "Limpando a memória RAM",
            "url": "https://youtu.be/ds0Dz957rJo",
            "description": "Como limpar contatos da memória RAM",
            "category": "memory"
        }
    ]'::jsonb,
    'Fico no aguardo do seu retorno com os resultados dos procedimentos. Qualquer dúvida, sigo à sua disposição.',
    ARRAY['tela_azul_step_2'],
    ARRAY['borracha_branca', 'papel'],
    ARRAY['tela azul', 'BSOD', 'blue screen', 'memória RAM', 'erro sistema', 'crash'],
    ARRAY['software', 'hardware', 'memoria', 'sistema', 'troubleshooting'],
    'software',
    'system_errors',
    3,
    35,
    'pichau_official'
);

-- =============================================
-- 6. TELA AZUL - STEP 2 (FORMATAÇÃO)
-- =============================================

INSERT INTO support_solutions (
    problem_tag,
    step,
    title,
    introduction,
    problem_description,
    content,
    procedures,
    resources,
    closing_message,
    next_steps,
    tools_required,
    keywords,
    tags,
    category,
    subcategory,
    difficulty,
    estimated_time_minutes,
    created_by
) VALUES (
    'tela_azul',
    2,
    'Tela azul (BSOD) - Formatação completa do sistema',
    'Nesse caso, gostaria de sugerir que efetue uma formatação em seu PC, na tentativa da resolução do problema relatado. Irei instrui-lo passo a passo para realizar tal procedimento.',
    'Formatação completa do Windows para resolver problemas persistentes de tela azul',
    'Estarei lhe passando o método interno que a Pichau usa para realizar a formatação.

Para esse procedimento, é necessário utilizar um computador com acesso a internet e um pendrive de 8GB para preparar os arquivos de instalação.

Procedimento completo:
• Baixe a ferramenta de preparação dos arquivos do Windows
• Prepare o pendrive com os arquivos de instalação
• Configure o boot pelo pendrive
• Execute a instalação limpa do Windows
• Formate as partições existentes
• Configure o sistema após instalação',
    '[
        {
            "order": 1,
            "category": "download",
            "instruction": "Baixe a ferramenta de preparação dos arquivos do Windows (https://go.microsoft.com/fwlink/?LinkId=691209) e mantenha um pendrive de pelo menos 8GB conectado.",
            "type": "acao",
            "estimated_minutes": 10
        },
        {
            "order": 2,
            "category": "tool_setup",
            "instruction": "Execute a ferramenta, aceite os termos de licença e clique em CRIAR MÍDIA DE INSTALAÇÃO.",
            "type": "acao",
            "estimated_minutes": 5
        },
        {
            "order": 3,
            "category": "configuration",
            "instruction": "Na tela de seleção de idioma, arquitetura e edição, não faça alterações e clique em AVANÇAR.",
            "type": "acao",
            "estimated_minutes": 2
        },
        {
            "order": 4,
            "category": "media_creation",
            "instruction": "Selecione Unidade Flash USB como mídia e clique em avançar.",
            "type": "acao",
            "estimated_minutes": 3
        },
        {
            "order": 5,
            "category": "download_wait",
            "instruction": "Aguarde o download dos arquivos do Windows (pode demorar dependendo da velocidade da internet).",
            "type": "observacao",
            "estimated_minutes": 60
        },
        {
            "order": 6,
            "category": "boot_setup",
            "instruction": "Conecte o pendrive no PC e ligue pressionando a tecla de boot (F8 Asus, F11 MSI/AsRock, F12 Gigabyte). Selecione UEFI + nome do pendrive.",
            "type": "acao",
            "estimated_minutes": 5
        },
        {
            "order": 7,
            "category": "installation",
            "instruction": "Quando a instalação iniciar, selecione a versão do Windows desejada.",
            "type": "acao",
            "estimated_minutes": 3
        },
        {
            "order": 8,
            "category": "license",
            "instruction": "Na tela de licença, clique em Não tenho uma chave e avance.",
            "type": "acao",
            "estimated_minutes": 2
        },
        {
            "order": 9,
            "category": "installation_type",
            "instruction": "Selecione instalação personalizada do Windows.",
            "type": "acao",
            "estimated_minutes": 2
        },
        {
            "order": 10,
            "category": "partitioning",
            "instruction": "Na tela de partições, selecione e exclua uma a uma somente do disco onde o Windows será instalado.",
            "type": "acao",
            "safety_warning": "Cuidado para não excluir dados de outros discos",
            "estimated_minutes": 10
        },
        {
            "order": 11,
            "category": "partition_creation",
            "instruction": "Com apenas uma partição não alocada, selecione-a, clique em novo, formatar, confirme e avance.",
            "type": "acao",
            "estimated_minutes": 5
        },
        {
            "order": 12,
            "category": "installation_wait",
            "instruction": "Aguarde a cópia dos arquivos e configuração inicial do Windows.",
            "type": "observacao",
            "estimated_minutes": 30
        },
        {
            "order": 13,
            "category": "initial_setup",
            "instruction": "Complete a configuração de primeira utilização do Windows.",
            "type": "acao",
            "estimated_minutes": 15
        }
    ]'::jsonb,
    '[
        {
            "type": "link",
            "title": "Ferramenta de Criação de Mídia do Windows",
            "url": "https://go.microsoft.com/fwlink/?LinkId=691209",
            "description": "Ferramenta oficial da Microsoft para criar mídia de instalação",
            "category": "download"
        },
        {
            "type": "video",
            "title": "Vídeo explicativo de formatação",
            "url": "https://www.youtube.com/watch?v=6ChG3w8SEec",
            "description": "Como formatar e otimizar seu PC",
            "category": "tutorial"
        }
    ]'::jsonb,
    'Peço que me informe o resultado após realizar tal procedimento. Me mantenho à sua disposição para auxilia-lo no que houver necessidade.',
    ARRAY['install_drivers', 'system_optimization'],
    ARRAY['pendrive_8gb', 'computador_auxiliar'],
    ARRAY['formatação', 'tela azul', 'reinstalar Windows', 'instalação limpa', 'partições', 'mídia de instalação'],
    ARRAY['software', 'sistema', 'formatacao', 'instalacao', 'windows'],
    'software',
    'system_reinstall',
    5,
    150,
    'pichau_official'
);

-- =============================================
-- VERIFICAR INSERÇÕES - VERSÃO CORRIGIDA
-- =============================================

-- Contar procedimentos inseridos
SELECT 
    'Procedimentos inseridos' as status,
    COUNT(*) as total_procedures,
    COUNT(DISTINCT problem_tag) as unique_problems,
    array_agg(DISTINCT category) as categories
FROM support_solutions 
WHERE created_by = 'pichau_official';

-- Listar todos os procedimentos por tag (CORRIGIDO)
SELECT 
    problem_tag,
    step,
    title,
    difficulty,
    estimated_time_minutes,
    jsonb_array_length(procedures) as num_procedures,
    array_length(keywords, 1) as num_keywords
FROM support_solutions 
WHERE created_by = 'pichau_official'
ORDER BY problem_tag, step;

-- Verificar se há conflitos com procedimentos existentes
SELECT 
    problem_tag,
    step,
    COUNT(*) as count
FROM support_solutions 
WHERE problem_tag IN ('nao_da_video', 'nao_liga', 'tela_azul')
GROUP BY problem_tag, step
HAVING COUNT(*) > 1;

-- Estatísticas dos procedimentos
SELECT 
    category,
    COUNT(*) as procedures_count,
    ROUND(AVG(difficulty), 1) as avg_difficulty,
    ROUND(AVG(estimated_time_minutes), 1) as avg_time_minutes
FROM support_solutions 
WHERE created_by = 'pichau_official'
GROUP BY category
ORDER BY procedures_count DESC;

-- Verificar estrutura dos procedimentos JSONB
SELECT 
    problem_tag,
    step,
    title,
    jsonb_array_length(procedures) as total_steps,
    jsonb_array_length(resources) as total_resources,
    (SELECT COUNT(*) 
     FROM jsonb_array_elements(procedures) proc 
     WHERE proc->>'safety_warning' IS NOT NULL) as steps_with_warnings
FROM support_solutions 
WHERE created_by = 'pichau_official'
ORDER BY problem_tag, step;

-- Listar todas as categorias de procedimentos
SELECT DISTINCT
    p.value->>'category' as procedure_category,
    COUNT(*) as usage_count
FROM support_solutions s,
     jsonb_array_elements(s.procedures) p
WHERE s.created_by = 'pichau_official'
GROUP BY p.value->>'category'
ORDER BY usage_count DESC;

-- Verificar tempo total estimado por problema
SELECT 
    problem_tag,
    COUNT(*) as total_steps,
    SUM(estimated_time_minutes) as total_estimated_minutes,
    ROUND(AVG(estimated_time_minutes), 1) as avg_time_per_step
FROM support_solutions 
WHERE created_by = 'pichau_official'
GROUP BY problem_tag
ORDER BY total_estimated_minutes DESC;




-- =============================================
-- SCHEMA COMPLETO - SISTEMA DE CONVERSAS
-- Para LangGraph Agent com Histórico Persistente
-- =============================================

-- =============================================
-- 1. TABELA DE SESSÕES DE CONVERSA
-- =============================================

CREATE TABLE conversation_sessions (
    -- Identificação única
    thread_id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(100) NOT NULL,
    
    -- Controle temporal
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Status da conversa
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated', 'abandoned', 'archived')),
    
    -- Métricas da sessão
    total_messages INTEGER DEFAULT 0,
    user_messages INTEGER DEFAULT 0,
    assistant_messages INTEGER DEFAULT 0,
    system_messages INTEGER DEFAULT 0,
    
    -- Resultado da conversa
    issue_resolved BOOLEAN DEFAULT FALSE,
    resolution_type VARCHAR(50), -- 'self_service', 'escalated', 'abandoned', 'partial'
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    
    -- Informações do problema
    primary_issue_category VARCHAR(100), -- 'hardware', 'software', 'network', etc.
    primary_issue_description TEXT,
    tags TEXT[], -- Array de tags para facilitar busca
    
    -- Soluções aplicadas
    solutions_attempted JSONB DEFAULT '[]'::jsonb, -- Array de IDs de soluções tentadas
    successful_solution_id UUID REFERENCES support_solutions(id),
    
    -- Métricas de performance
    first_response_time_seconds INTEGER, -- Tempo até primeira resposta do bot
    resolution_time_seconds INTEGER, -- Tempo total para resolver
    escalation_time_seconds INTEGER, -- Tempo até escalar (se aplicável)
    
    -- Contexto da sessão
    user_agent TEXT,
    ip_address INET,
    referrer_url TEXT,
    device_type VARCHAR(50), -- 'mobile', 'desktop', 'tablet'
    
    -- Controle de qualidade
    needs_review BOOLEAN DEFAULT FALSE,
    review_reason TEXT,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. TABELA DE MENSAGENS
-- =============================================

CREATE TABLE conversation_messages (
    -- Identificação
    id VARCHAR(255) PRIMARY KEY, -- msg_timestamp_role
    thread_id VARCHAR(255) NOT NULL REFERENCES conversation_sessions(thread_id) ON DELETE CASCADE,
    
    -- Conteúdo da mensagem
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text', -- 'text', 'json', 'markdown', 'html'
    
    -- Timestamp e ordem
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sequence_number INTEGER NOT NULL, -- Ordem na conversa (1, 2, 3...)
    
    -- Metadados estruturados
    metadata JSONB DEFAULT '{}', -- Dados específicos por tipo de mensagem
    
    -- Para mensagens do usuário
    user_intent VARCHAR(100), -- 'problem_report', 'feedback', 'follow_up', 'clarification'
    user_sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral', 'frustrated'
    
    -- Para mensagens do assistant
    response_type VARCHAR(50), -- 'solution', 'question', 'escalation', 'closing'
    solution_id UUID REFERENCES support_solutions(id), -- Se aplicável
    confidence_score DECIMAL(3,2), -- 0.00 a 1.00
    
    -- Para mensagens do sistema
    system_event_type VARCHAR(50), -- 'session_start', 'escalation', 'timeout', etc.
    
    -- Processamento e análise
    processed_by_llm BOOLEAN DEFAULT FALSE,
    llm_model VARCHAR(100), -- 'gpt-4', 'gpt-3.5-turbo', etc.
    llm_tokens_used INTEGER,
    processing_time_ms INTEGER,
    
    -- Feedback da mensagem
    user_feedback VARCHAR(20), -- 'helpful', 'not_helpful', 'unclear'
    feedback_comment TEXT,
    feedback_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Flags de controle
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    needs_moderation BOOLEAN DEFAULT FALSE,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(thread_id, sequence_number)
);

-- =============================================
-- 3. TABELA DE CONTEXTO DA CONVERSA
-- =============================================

CREATE TABLE conversation_context (
    thread_id VARCHAR(255) PRIMARY KEY REFERENCES conversation_sessions(thread_id) ON DELETE CASCADE,
    
    -- Contexto acumulado durante a conversa
    problems_discussed TEXT[] DEFAULT ARRAY[]::TEXT[], -- Problemas mencionados
    solutions_attempted UUID[] DEFAULT ARRAY[]::UUID[], -- IDs das soluções tentadas
    client_attempts TEXT[] DEFAULT ARRAY[]::TEXT[], -- O que cliente já tentou
    
    -- Feedback estruturado
    feedback_history JSONB DEFAULT '[]'::jsonb, -- Array de feedbacks sobre soluções
    
    -- Histórico de escalações
    escalation_history JSONB DEFAULT '[]'::jsonb, -- Array de escalações e motivos
    
    -- Preferências do cliente identificadas
    preferred_communication_style VARCHAR(50), -- 'technical', 'simple', 'step_by_step'
    technical_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
    
    -- Estado emocional
    frustration_level INTEGER DEFAULT 0 CHECK (frustration_level BETWEEN 0 AND 5),
    patience_indicators JSONB DEFAULT '{}', -- Sinais de impaciência
    
    -- Contexto técnico
    device_info JSONB DEFAULT '{}', -- Informações do equipamento
    software_environment JSONB DEFAULT '{}', -- OS, versões, etc.
    network_context JSONB DEFAULT '{}', -- Conexão, provedor, etc.
    
    -- Tentativas de solução detalhadas
    solution_attempts JSONB DEFAULT '[]'::jsonb, -- Histórico detalhado de tentativas
    
    -- Palavras-chave extraídas
    extracted_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    topic_evolution JSONB DEFAULT '[]'::jsonb, -- Como o tópico evoluiu
    
    -- Tempo gasto em cada etapa
    time_analysis JSONB DEFAULT '{}', -- Tempo em análise, busca, suporte, etc.
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. TABELA DE INTERAÇÕES COM SOLUÇÕES
-- =============================================

CREATE TABLE conversation_solution_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id VARCHAR(255) NOT NULL REFERENCES conversation_sessions(thread_id) ON DELETE CASCADE,
    solution_id UUID NOT NULL REFERENCES support_solutions(id),
    message_id VARCHAR(255) REFERENCES conversation_messages(id),
    
    -- Detalhes da interação
    interaction_type VARCHAR(50) NOT NULL, -- 'presented', 'attempted', 'completed', 'failed'
    similarity_score DECIMAL(5,4), -- Score da busca semântica
    presentation_order INTEGER, -- Ordem de apresentação (1º, 2º, 3º)
    
    -- Resultado da tentativa
    attempt_result VARCHAR(50), -- 'successful', 'failed', 'partial', 'skipped', 'pending'
    user_feedback VARCHAR(50), -- 'helpful', 'not_helpful', 'unclear', 'too_complex'
    feedback_comment TEXT,
    
    -- Tempo gasto na solução
    time_to_attempt_minutes INTEGER, -- Tempo entre apresentação e tentativa
    time_to_feedback_minutes INTEGER, -- Tempo entre tentativa e feedback
    
    -- Contexto da apresentação
    adaptation_applied JSONB DEFAULT '{}', -- Como a solução foi adaptada
    steps_completed INTEGER, -- Quantos passos foram completados
    total_steps INTEGER, -- Total de passos na solução
    
    -- Métricas
    difficulty_reported INTEGER CHECK (difficulty_reported BETWEEN 1 AND 5),
    clarity_rating INTEGER CHECK (clarity_rating BETWEEN 1 AND 5),
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. TABELA DE ANÁLISE DE SENTIMENTO
-- =============================================

CREATE TABLE conversation_sentiment_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id VARCHAR(255) NOT NULL REFERENCES conversation_sessions(thread_id) ON DELETE CASCADE,
    message_id VARCHAR(255) REFERENCES conversation_messages(id),
    
    -- Análise de sentimento
    sentiment VARCHAR(20) NOT NULL, -- 'positive', 'negative', 'neutral'
    sentiment_score DECIMAL(4,3), -- -1.000 a 1.000
    confidence DECIMAL(4,3), -- 0.000 a 1.000
    
    -- Emoções detectadas
    emotions JSONB DEFAULT '{}', -- {'anger': 0.1, 'frustration': 0.8, 'satisfaction': 0.0}
    
    -- Indicadores comportamentais
    urgency_level INTEGER CHECK (urgency_level BETWEEN 1 AND 5),
    politeness_score DECIMAL(3,2), -- 0.00 a 1.00
    technical_language_usage DECIMAL(3,2), -- Uso de termos técnicos
    
    -- Análise de contexto
    topic_shift_detected BOOLEAN DEFAULT FALSE,
    escalation_risk_score DECIMAL(3,2), -- 0.00 a 1.00
    satisfaction_prediction DECIMAL(3,2), -- Predição de satisfação final
    
    -- Metadados da análise
    analysis_model VARCHAR(100), -- Modelo usado para análise
    analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_time_ms INTEGER,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 6. ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índices para conversation_sessions
CREATE INDEX idx_conversation_sessions_customer ON conversation_sessions(customer_id);
CREATE INDEX idx_conversation_sessions_status ON conversation_sessions(status);
CREATE INDEX idx_conversation_sessions_active ON conversation_sessions(last_active_at DESC) WHERE status = 'active';
CREATE INDEX idx_conversation_sessions_resolved ON conversation_sessions(ended_at DESC) WHERE status = 'resolved';
CREATE INDEX idx_conversation_sessions_category ON conversation_sessions(primary_issue_category);
CREATE INDEX idx_conversation_sessions_tags ON conversation_sessions USING GIN(tags);
CREATE INDEX idx_conversation_sessions_date_range ON conversation_sessions(started_at, ended_at);

-- Índices para conversation_messages
CREATE INDEX idx_conversation_messages_thread ON conversation_messages(thread_id);
CREATE INDEX idx_conversation_messages_timestamp ON conversation_messages(timestamp DESC);
CREATE INDEX idx_conversation_messages_role ON conversation_messages(role);
CREATE INDEX idx_conversation_messages_sequence ON conversation_messages(thread_id, sequence_number);
CREATE INDEX idx_conversation_messages_solution ON conversation_messages(solution_id) WHERE solution_id IS NOT NULL;
CREATE INDEX idx_conversation_messages_feedback ON conversation_messages(user_feedback) WHERE user_feedback IS NOT NULL;
CREATE INDEX idx_conversation_messages_metadata ON conversation_messages USING GIN(metadata);

-- Índices para conversation_context
CREATE INDEX idx_conversation_context_problems ON conversation_context USING GIN(problems_discussed);
CREATE INDEX idx_conversation_context_solutions ON conversation_context USING GIN(solutions_attempted);
CREATE INDEX idx_conversation_context_keywords ON conversation_context USING GIN(extracted_keywords);
CREATE INDEX idx_conversation_context_frustration ON conversation_context(frustration_level);

-- Índices para conversation_solution_interactions
CREATE INDEX idx_solution_interactions_thread ON conversation_solution_interactions(thread_id);
CREATE INDEX idx_solution_interactions_solution ON conversation_solution_interactions(solution_id);
CREATE INDEX idx_solution_interactions_result ON conversation_solution_interactions(attempt_result);
CREATE INDEX idx_solution_interactions_feedback ON conversation_solution_interactions(user_feedback);
CREATE INDEX idx_solution_interactions_score ON conversation_solution_interactions(similarity_score DESC);

-- Índices para conversation_sentiment_analysis
CREATE INDEX idx_sentiment_analysis_thread ON conversation_sentiment_analysis(thread_id);
CREATE INDEX idx_sentiment_analysis_sentiment ON conversation_sentiment_analysis(sentiment);
CREATE INDEX idx_sentiment_analysis_score ON conversation_sentiment_analysis(sentiment_score);
CREATE INDEX idx_sentiment_analysis_escalation_risk ON conversation_sentiment_analysis(escalation_risk_score DESC);

-- =============================================
-- 7. TRIGGERS AUTOMÁTICOS
-- =============================================

-- Trigger para atualizar contadores de mensagens
CREATE OR REPLACE FUNCTION update_session_message_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Atualizar contadores na sessão
        UPDATE conversation_sessions 
        SET 
            total_messages = total_messages + 1,
            user_messages = user_messages + CASE WHEN NEW.role = 'user' THEN 1 ELSE 0 END,
            assistant_messages = assistant_messages + CASE WHEN NEW.role = 'assistant' THEN 1 ELSE 0 END,
            system_messages = system_messages + CASE WHEN NEW.role = 'system' THEN 1 ELSE 0 END,
            last_active_at = NOW(),
            updated_at = NOW()
        WHERE thread_id = NEW.thread_id;
        
        -- Calcular first_response_time se for primeira resposta do assistant
        IF NEW.role = 'assistant' THEN
            UPDATE conversation_sessions 
            SET first_response_time_seconds = EXTRACT(EPOCH FROM (NEW.timestamp - started_at))::INTEGER
            WHERE thread_id = NEW.thread_id 
            AND first_response_time_seconds IS NULL;
        END IF;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrementar contadores
        UPDATE conversation_sessions 
        SET 
            total_messages = total_messages - 1,
            user_messages = user_messages - CASE WHEN OLD.role = 'user' THEN 1 ELSE 0 END,
            assistant_messages = assistant_messages - CASE WHEN OLD.role = 'assistant' THEN 1 ELSE 0 END,
            system_messages = system_messages - CASE WHEN OLD.role = 'system' THEN 1 ELSE 0 END,
            updated_at = NOW()
        WHERE thread_id = OLD.thread_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_counters
    AFTER INSERT OR DELETE ON conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_session_message_counters();

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sessions_updated_at
    BEFORE UPDATE ON conversation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_messages_updated_at
    BEFORE UPDATE ON conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_context_updated_at
    BEFORE UPDATE ON conversation_context
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 8. VIEWS ÚTEIS PARA RELATÓRIOS
-- =============================================

-- View para sessões com métricas
CREATE VIEW conversation_sessions_with_metrics AS
SELECT 
    cs.*,
    -- Métricas calculadas
    EXTRACT(EPOCH FROM (COALESCE(cs.ended_at, NOW()) - cs.started_at))::INTEGER / 60 as duration_minutes,
    CASE 
        WHEN cs.total_messages > 0 THEN ROUND(cs.assistant_messages::DECIMAL / cs.total_messages * 100, 1)
        ELSE 0 
    END as assistant_message_percentage,
    
    -- Última mensagem
    (SELECT content FROM conversation_messages WHERE thread_id = cs.thread_id ORDER BY sequence_number DESC LIMIT 1) as last_message,
    (SELECT timestamp FROM conversation_messages WHERE thread_id = cs.thread_id ORDER BY sequence_number DESC LIMIT 1) as last_message_at,
    
    -- Contagem de soluções tentadas
    COALESCE(array_length(cc.solutions_attempted, 1), 0) as solutions_attempted_count,
    
    -- Nível de frustração
    COALESCE(cc.frustration_level, 0) as current_frustration_level
    
FROM conversation_sessions cs
LEFT JOIN conversation_context cc ON cs.thread_id = cc.thread_id;

-- View para análise de performance diária
CREATE VIEW daily_conversation_metrics AS
SELECT 
    DATE(started_at) as date,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_sessions,
    COUNT(*) FILTER (WHERE status = 'escalated') as escalated_sessions,
    COUNT(*) FILTER (WHERE status = 'abandoned') as abandoned_sessions,
    ROUND(AVG(total_messages), 1) as avg_messages_per_session,
    ROUND(AVG(resolution_time_seconds) / 60, 1) as avg_resolution_time_minutes,
    ROUND(AVG(satisfaction_rating), 2) as avg_satisfaction_rating,
    COUNT(*) FILTER (WHERE issue_resolved = true) as issues_resolved_count
FROM conversation_sessions
WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- =============================================
-- 9. FUNÇÕES ÚTEIS
-- =============================================

-- Função para arquivar conversas antigas
CREATE OR REPLACE FUNCTION archive_old_conversations(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    UPDATE conversation_sessions 
    SET status = 'archived', updated_at = NOW()
    WHERE status IN ('resolved', 'abandoned') 
    AND last_active_at < NOW() - (days_old || ' days')::INTERVAL
    AND status != 'archived';
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas de uma sessão
CREATE OR REPLACE FUNCTION get_session_stats(session_thread_id VARCHAR(255))
RETURNS TABLE (
    total_messages INTEGER,
    user_messages INTEGER,
    assistant_messages INTEGER,
    duration_minutes INTEGER,
    solutions_tried INTEGER,
    current_status VARCHAR(20),
    satisfaction_rating INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.total_messages,
        cs.user_messages,
        cs.assistant_messages,
        EXTRACT(EPOCH FROM (COALESCE(cs.ended_at, NOW()) - cs.started_at))::INTEGER / 60,
        COALESCE(array_length(cc.solutions_attempted, 1), 0),
        cs.status,
        cs.satisfaction_rating
    FROM conversation_sessions cs
    LEFT JOIN conversation_context cc ON cs.thread_id = cc.thread_id
    WHERE cs.thread_id = session_thread_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 10. DADOS DE EXEMPLO (OPCIONAL)
-- =============================================

-- Inserir uma sessão de exemplo
INSERT INTO conversation_sessions (
    thread_id, customer_id, primary_issue_category, 
    primary_issue_description, tags
) VALUES (
    'thread_example_001', 
    'CUSTOMER_123', 
    'hardware', 
    'Computador não liga após atualização',
    ARRAY['boot_issue', 'hardware', 'update_problem']
);

-- Inserir contexto inicial
INSERT INTO conversation_context (thread_id) VALUES ('thread_example_001');

-- Inserir mensagens de exemplo
INSERT INTO conversation_messages (
    id, thread_id, role, content, sequence_number, user_intent
) VALUES 
(
    'msg_001_user', 'thread_example_001', 'user', 
    'Meu computador não liga depois que fiz uma atualização do Windows', 
    1, 'problem_report'
),
(
    'msg_002_assistant', 'thread_example_001', 'assistant',
    'Vou te ajudar com esse problema de inicialização. Vamos fazer alguns testes...',
    2, 'solution'
);

-- =============================================
-- COMENTÁRIOS FINAIS
-- =============================================

/*
ESTE SCHEMA FORNECE:

1. ✅ HISTÓRICO COMPLETO: Todas as mensagens persistidas
2. ✅ CONTEXTO RICO: Informações detalhadas sobre cada conversa
3. ✅ MÉTRICAS: Performance e qualidade do atendimento
4. ✅ ANÁLISE: Sentimento e comportamento do usuário
5. ✅ ESCALABILIDADE: Índices otimizados para performance
6. ✅ RELATÓRIOS: Views prontas para dashboards
7. ✅ MANUTENÇÃO: Funções para limpeza e arquivamento

PRÓXIMOS PASSOS:
1. Executar este script no banco
2. Implementar ConversationService em TypeScript
3. Integrar com LangGraph Agent
4. Testar persistência de conversas
5. Implementar dashboards de métricas

PERFORMANCE:
- Suporta milhões de mensagens
- Queries otimizadas com índices
- Particionamento por data (se necessário)
- Arquivamento automático de conversas antigas
*/