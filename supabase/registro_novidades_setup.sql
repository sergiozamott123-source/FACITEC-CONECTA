-- =============================================================================
-- FACITEC Conecta — Registro de Novidades (changelog interno do sistema)
-- =============================================================================
-- Cada linha é uma entrega concluída no FACITEC CONECTA (o software). Serve de
-- base automática para o "Relatório de Atividades para o NRH"
-- (src/pages/admin/RelatorioNRH.jsx): ao escolher um período, a tela busca as
-- novidades daquele intervalo e já monta um texto-resumo pronto (editável)
-- para o relatório mensal enviado ao NRH.
--
-- Cadastro: feito diretamente aqui no banco (INSERT), não pela tela — a cada
-- funcionalidade nova concluída no FACITEC CONECTA, adiciona-se uma linha.
-- Não existe política de INSERT/UPDATE/DELETE para o app por esse motivo.
-- =============================================================================

CREATE TABLE IF NOT EXISTS registro_novidades (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data      date NOT NULL DEFAULT CURRENT_DATE,
  titulo    text NOT NULL,
  descricao text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE registro_novidades IS 'Changelog interno de entregas no FACITEC CONECTA. Alimenta o Relatório de Atividades para o NRH. Cadastro feito via SQL a cada entrega concluída, não pela tela.';

ALTER TABLE registro_novidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registro_novidades_select" ON registro_novidades;
CREATE POLICY "registro_novidades_select" ON registro_novidades
  FOR SELECT USING (get_my_role() = 'secretaria');

-- -----------------------------------------------------------------------------
-- Seed inicial (23/09/2026): entregas já realizadas no FACITEC CONECTA entre
-- ago-set/2026, reconstituídas a partir do histórico de desenvolvimento, para
-- que o relatório já nasça útil em vez de começar vazio.
-- -----------------------------------------------------------------------------
INSERT INTO registro_novidades (data, titulo, descricao) VALUES
('2026-08-15', 'Reforço da segurança dos dados sensíveis no sistema',
 'Foi realizada uma auditoria completa de segurança do banco de dados do sistema, que identificou falhas de configuração que permitiam o acesso indevido, por pessoas não autenticadas, a dados sensíveis de bolsistas menores de idade, informações financeiras e resultados de avaliação. Todas as falhas identificadas foram corrigidas, passando cada informação a ser acessível apenas ao respectivo usuário responsável (orientador, avaliador ou Secretaria Executiva), sem qualquer alteração perceptível para quem utiliza o sistema normalmente.'),
('2026-08-31', 'Implementação da funcionalidade de substituição de bolsistas',
 'Foi implementada, para todos os orientadores do PIBIC Jr, a possibilidade de substituir um bolsista da equipe diretamente pelo sistema, com preenchimento dos dados completos do substituto e envio da documentação exigida. A funcionalidade transfere automaticamente a vaga de pagamento do bolsista substituído para o substituto, preservando o orçamento do grupo sem duplicidade, e mantém ambos claramente identificados na visão da Secretaria Executiva.'),
('2026-09-02', 'Correção da identificação de bolsistas titulares no painel do orientador',
 'Foi corrigida uma falha que fazia bolsistas titulares regularmente cadastrados aparecerem, no painel do orientador, com a identificação incorreta de "Voluntário". A correção não alterou nenhum dado já cadastrado nem o cálculo de pagamentos; o ajuste teve efeito apenas na exibição visual da informação nas telas do orientador.'),
('2026-09-03', 'Aprovação obrigatória da Secretaria Executiva nas substituições de bolsistas',
 'O processo de substituição de bolsistas deixou de ser automático e passou a depender de aprovação formal da Secretaria Executiva, que passou a contar com um painel próprio para analisar cada pedido, comparar os dados do bolsista que sai com os do substituto, conferir o ofício de solicitação anexado e aprovar ou recusar a troca. O sistema passou também a notificar automaticamente a Secretaria sempre que um novo pedido de substituição é registrado.'),
('2026-09-09', 'Correção de falha no acesso ao cadastro de bolsistas substitutos',
 'Foi corrigida uma falha que impedia a abertura da tela de detalhes de um bolsista sempre que ele havia entrado no sistema por meio de uma substituição. A tela passou a localizar cada bolsista por seu identificador interno exclusivo, eliminando o problema de forma definitiva para qualquer quantidade de substituições futuras.'),
('2026-09-09', 'Unificação e reforço de segurança no cadastro de bolsistas e no envio de documentos',
 'Foi eliminada uma tela antiga e paralela de cadastro de bolsistas, que gravava os documentos enviados em local diferente do reconhecido pela Secretaria Executiva, fazendo documentos já enviados por orientadores parecerem indevidamente pendentes. A partir dessa correção, toda a documentação de bolsistas substitutos passou a ficar visível de forma centralizada para a Secretaria, que passou também a receber um alerta automático sempre que houver documentação pendente de conferência.'),
('2026-09-09', 'Simplificação da documentação exigida em substituições de bolsistas',
 'A Declaração de Anuência da Direção Escolar deixou de ser exigida do orientador no processo de substituição de bolsistas, por se tratar de um documento vinculado à autorização do projeto como um todo, e não ao bolsista individualmente, evitando a cobrança de um documento desnecessário aos orientadores nesse momento específico.'),
('2026-09-09', 'Proteção contra erros de pagamento em substituições de bolsistas',
 'Foi implementado um conjunto de verificações automáticas para impedir que bolsistas já substituídos continuem a receber pagamento e para assegurar que bolsistas substitutos só sejam incluídos na folha de pagamento com documentação completa. A Ficha de Solicitação de Pagamento de Bolsa passou também a trazer um histórico completo de pagamentos por vaga ao longo de todo o contrato, identificando claramente quando houve substituição.'),
('2026-09-09', 'Padronização visual do Termo de Adesão com as logomarcas institucionais',
 'O Termo de Adesão emitido para cada bolsista passou a exibir as logomarcas do FACITEC e da CDTIV em seu cabeçalho, alinhando esse documento à identidade visual já utilizada nos demais documentos oficiais gerados pelo sistema.'),
('2026-09-09', 'Assinatura eletrônica do orientador na solicitação de substituição de bolsista',
 'A solicitação de substituição de bolsista passou a exigir do orientador uma assinatura eletrônica, mediante confirmação do próprio CPF e de uma declaração formal de responsabilidade pela decisão, com registro de data e hora. Essa confirmação passou a ficar visível para a Secretaria Executiva no momento da análise do pedido, complementando o ofício assinado que já era anexado.'),
('2026-09-10', 'Cadastro de bolsistas voluntários como base para substituições futuras',
 'Os orientadores passaram a poder cadastrar previamente bolsistas voluntários, que recebem apenas certificado, sem bolsa, formando uma base disponível para substituição imediata de titulares que venham a sair. O processo de substituição passou a permitir a promoção direta de um voluntário já cadastrado a titular, sempre com a mesma aprovação da Secretaria Executiva exigida nas demais substituições.'),
('2026-09-10', 'Emissão de Ficha Cadastral Individual do bolsista com documentos de identidade',
 'Foi criada, no painel de substituições da Secretaria Executiva, a opção de gerar uma Ficha de Cadastro Individual em PDF de cada bolsista substituto, reunindo automaticamente os dados já registrados no sistema e as imagens dos documentos de identidade, em tamanho ampliado que permite a conferência sem necessidade de abrir cada documento separadamente.'),
('2026-09-16', 'Correção de falha que impedia o envio do Relatório Mensal de setembro',
 'Foi identificada e corrigida uma falha técnica no banco de dados do sistema que impedia todos os orientadores de salvar ou enviar o Relatório Mensal referente ao ciclo de setembro. A correção restabeleceu imediatamente o envio normal do relatório e evita que a mesma falha volte a ocorrer nos ciclos de novembro e dezembro.'),
('2026-09-22', 'Implementação do módulo de Vídeos de Acompanhamento do PIBIC Jr',
 'Foi implementada uma nova área do sistema, para orientadores e para a Secretaria Executiva, destinada ao envio e acompanhamento dos vídeos de acompanhamento exigidos pelo edital do PIBIC Jr no terceiro e no quinto mês de cada projeto. Os orientadores passaram a poder informar o link do vídeo publicado, com indicação automática de status, enquanto a Secretaria Executiva passou a contar com um painel consolidado de acompanhamento de todas as equipes do programa.')
ON CONFLICT DO NOTHING;

-- Conferência: deve listar a tabela criada e a política de leitura.
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'registro_novidades';
