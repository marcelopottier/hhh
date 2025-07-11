INSERT INTO categorias_problema (nome, descricao) 
VALUES ('Hardware - Inicialização', 'Problemas relacionados ao computador não ligar ou inicializar');

-- Inserir o procedimento principal
INSERT INTO procedimentos (
    categoria_id, 
    titulo, 
    descricao_problema, 
    solucao_completa,
    palavras_chave,
    tags,
    dificuldade,
    tempo_estimado
) VALUES (
    1, -- categoria_id
    'Computador não liga ou não dá vídeo',
    'Computador apresenta problemas para inicializar, não exibe imagem no monitor ou não responde ao pressionar o botão de energia',
    'Procedimento completo para diagnóstico de problemas de inicialização incluindo verificação de memória, cabos, fonte e reset de BIOS',
    ARRAY['não liga', 'sem vídeo', 'tela preta', 'não inicializa', 'memória RAM', 'fonte', 'BIOS'],
    ARRAY['hardware', 'inicializacao', 'memoria', 'fonte', 'bios', 'troubleshooting'],
    3, -- dificuldade média
    45 -- 45 minutos estimados
);

-- Inserir os passos detalhados
INSERT INTO passos_procedimento (procedimento_id, numero_passo, titulo_passo, descricao_passo, tipo_passo, obrigatorio) VALUES
(1, 1, 'Limpeza dos contatos da memória RAM', 'Remova as memórias e utilize uma borracha branca ou folha de papel para realizar a limpeza dos contatos da memória (parte dourada/amarela).', 'acao', true),

(1, 2, 'Verificação do encaixe da memória', 'Verifique o encaixe da(s) memória(s) e troque-as de slot para verificar se o computador passa a funcionar.', 'verificacao', true),

(1, 3, 'Teste com módulos individuais', 'Se o seu computador tiver 2 módulos de memória, utilize apenas uma de cada vez para testes.', 'acao', true),

(1, 4, 'Verificação dos cabos da fonte', 'Verifique se os cabos da fonte estão bem encaixados nos componentes e na placa-mãe: conector de 24 pinos e conector de alimentação do processador.', 'verificacao', true),

(1, 5, 'Verificação do dissipador do processador', 'Verifique se o dissipador de calor do processador está bem encaixado.', 'verificacao', true),

(1, 6, 'Teste de cabo de energia e tomada', 'Tente ligar com outro cabo de energia ou em outra tomada/filtro de linha. Evite utilizar adaptadores.', 'acao', true),

(1, 7, 'Teste com outro monitor', 'Tente estar utilizando em outro monitor/televisor.', 'acao', true),

(1, 8, 'Teste de cabo de vídeo', 'Tente utilizar outro cabo em sua conexão de vídeo do pc/monitor. Evite utilizar adaptadores ou conversores em cabos de vídeo.', 'acao', true),

(1, 9, 'Preparação para reset da BIOS', 'Desligue o computador e desconecte todos os cabos da parte traseira, incluindo o cabo de alimentação.', 'acao', true),

(1, 10, 'Localização da bateria da placa-mãe', 'Localize a bateria da Placa mãe. Ela tem um formato circular e normalmente fica próxima ao SLOT PCI da placa de vídeo.', 'acao', true),

(1, 11, 'Remoção da bateria CMOS', 'Empurre a trava que prende a bateria para removê-la da placa mãe.', 'acao', true),

(1, 12, 'Descarga estática', 'Uma vez removida a bateria, pressione o botão LIGAR do gabinete por 15 segundos pelo menos e solte.', 'acao', true),

(1, 13, 'Recolocação da bateria e teste', 'Recoloque a bateria do computador e tente ligar o PC novamente.', 'acao', true),

(1, 14, 'Precauções importantes', 'Lembre-se de desconectar o computador da tomada antes de trabalhar em sua placa-mãe e manusear a bateria com cuidado.', 'aviso', true);

-- Inserir recursos de apoio (vídeos mencionados)
INSERT INTO recursos_apoio (procedimento_id, tipo_recurso, titulo, url, descricao, ordem) VALUES
(1, 'video', 'Como limpar contatos da memória RAM', 'https://exemplo.com/video1', 'Vídeo demonstrando a limpeza adequada dos contatos da memória', 1),
(1, 'video', 'Identificação e remoção da bateria CMOS', 'https://exemplo.com/video2', 'Como localizar e remover com segurança a bateria da placa-mãe', 2),
(1, 'video', 'Verificação de cabos da fonte de alimentação', 'https://exemplo.com/video3', 'Demonstração dos conectores principais da fonte de alimentação', 3);

-- Inserir mais categorias para expandir a base
INSERT INTO categorias_problema (nome, descricao) VALUES 
('Hardware - Temperatura', 'Problemas relacionados ao superaquecimento de componentes'),
('Software - Sistema Operacional', 'Problemas com Windows, drivers e sistema'),
('Hardware - Áudio', 'Problemas com som, microfone e dispositivos de áudio'),
('Hardware - Conectividade', 'Problemas com Wi-Fi, Bluetooth e conexões de rede');

-- Exemplo de dados adicionais para demonstrar o sistema
INSERT INTO procedimentos (categoria_id, titulo, descricao_problema, solucao_completa, palavras_chave, tags, dificuldade, tempo_estimado) VALUES 
(2, 'Computador desligando sozinho', 'PC desliga automaticamente durante uso, especialmente em jogos ou tarefas pesadas', 'Verificação de temperatura, limpeza de coolers e aplicação de pasta térmica', ARRAY['desliga sozinho', 'superaquecimento', 'temperatura alta', 'cooler'], ARRAY['hardware', 'temperatura', 'cooler', 'pasta-termica'], 2, 30),
(3, 'Tela azul (BSOD) frequente', 'Sistema apresenta tela azul da morte com frequência durante o uso', 'Diagnóstico de drivers, teste de memória e verificação de integridade do sistema', ARRAY['tela azul', 'BSOD', 'blue screen', 'crash'], ARRAY['software', 'drivers', 'sistema', 'memoria'], 4, 60);
