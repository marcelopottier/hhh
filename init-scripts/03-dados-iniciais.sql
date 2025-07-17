-- =============================================
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
    E'Por gentileza:\n\n' ||
    E'• Remova as memórias e utilize uma borracha branca ou folha de papel para realizar a limpeza dos contatos da memória (parte dourada/amarela).\n' ||
    E'• Verifique o encaixe da(s) memória(s) e troque-as de slot para verificar se o computador passa a funcionar.\n' ||
    E'• Se o seu computador tiver 2 módulos de memória, utilize apenas uma de cada vez para testes.\n' ||
    E'• Verifique se os cabos da fonte estão bem encaixados nos componentes e na placa-mãe: conector de 24 pinos e conector de alimentação do processador.\n' ||
    E'• Verifique se o dissipador de calor do processador está bem encaixado.\n' ||
    E'• Tente ligar com outro cabo de energia ou em outra tomada/filtro de linha. Evite utilizar adaptadores.\n' ||
    E'• Tente estar utilizando em outro monitor/televisor.\n' ||
    E'• Tente utilizar outro cabo em sua conexão de vídeo do pc/monitor.\n' ||
    E'• Evite utilizar adaptadores ou conversores em cabos de vídeo.\n\n' ||
    E'Se estiver tudo certo tente resetar a BIOS seguindo as etapas:\n' ||
    E'1 - Primeiramente desligue o computador e desconecte todos os cabos da parte traseira, incluindo o cabo de alimentação.\n' ||
    E'2 - Após isso localize a bateria da Placa mãe. Ela tem um formato circular e normalmente fica próxima ao SLOT PCI da placa de vídeo.\n' ||
    E'3 - Uma vez localizada a bateria, empurre a trava que prende a bateria para remove-la da placa mãe.\n' ||
    E'4 - Uma vez removida a bateria, pressione o botão LIGAR do gabinete por 15 segundos pelo menos e solte.\n' ||
    E'5 - Após isso recoloque a bateria do computador e tente ligar o PC novamente.\n\n' ||
    E'Lembre-se de desconectar o computador da tomada antes de trabalhar em sua placa-mãe e manusear a bateria com cuidado.',
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
    E'Com o computador desligado, remova o cabo de força da fonte, localize e remova a pilha CR2032 na placa-mãe.\n' ||
    E'Após aguardar de 1 a 2 min, recoloque a pilha na placa-mãe e ligue o computador novamente.\n\n' ||
    E'Para acesso a pilha, em alguns casos é necessário remover a placa de vídeo.\n\n' ||
    E'Caso não haja resultado, siga as instruções do vídeo de diagnóstico avançado.',
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
    E'Teste da fonte de alimentação:\n\n' ||
    E'• Tire a fonte da tomada e desconecte todos os cabos que conectam ela ao seu PC\n' ||
    E'• Localize o conector 24 pinos (cabo que alimenta a placa-mãe)\n' ||
    E'• Utilizando um clips, faça a ligação direta do pino verde 16 (PS/ON) no pino preto 17 logo ao lado\n' ||
    E'• Logo após, ligue a fonte na tomada para verificar se a ventoinha irá girar\n' ||
    E'• Comprove o resultado através de um vídeo se possível',
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
    E'Teste do botão Power:\n\n' ||
    E'• Retire todos os cabos do painel frontal localizados geralmente no canto inferior direito da placa mãe\n' ||
    E'• Com a fonte ligada, utilize algum objeto metálico (como um clips ou chave de fenda) para fazer uma ponte (encostar um no outro) entre os dois pinos que correspondem ao botão POWER\n' ||
    E'• Observe se o computador liga com este teste direto',
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
    E'Teste de memória RAM:\n\n' ||
    E'• Verifique o encaixe da(s) memória(s) e troque-as de slot para verificar se o computador passa a funcionar\n' ||
    E'• Remova as memórias e efetue a limpeza das peças em questão\n' ||
    E'• Tente iniciar o PC com apenas uma memória inserida por vez\n' ||
    E'• Repita o procedimento com as duas memórias que possui e observe se o problema será presente nas duas memórias utilizadas individualmente',
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
    E'Estarei lhe passando o método interno que a Pichau usa para realizar a formatação.\n\n' ||
    E'Para esse procedimento, é necessário utilizar um computador com acesso a internet e um pendrive de 8GB para preparar os arquivos de instalação.\n\n' ||
    E'Procedimento completo:\n' ||
    E'• Baixe a ferramenta de preparação dos arquivos do Windows\n' ||
    E'• Prepare o pendrive com os arquivos de instalação\n' ||
    E'• Configure o boot pelo pendrive\n' ||
    E'• Execute a instalação limpa do Windows\n' ||
    E'• Formate as partições existentes\n' ||
    E'• Configure o sistema após instalação',
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
            "instruction": "Na tela de licença, clique em 'Não tenho uma chave' e avance.",
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
-- VERIFICAR INSERÇÕES
-- =============================================

-- Contar procedimentos inseridos
SELECT 
    'Procedimentos inseridos' as status,
    COUNT(*) as total_procedures,
    COUNT(DISTINCT problem_tag) as unique_problems,
    array_agg(DISTINCT category) as categories
FROM support_solutions 
WHERE created_by = 'pichau_official';

-- Listar todos os procedimentos por tag
SELECT 
    problem_tag,
    step,
    title,
    difficulty,
    estimated_time_minutes,
    array_length(procedures, 1) as num_procedures,
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