-- =============================================================================
-- FACITEC Conecta — PROFIC Jr: vídeos de acompanhamento + início da bolsa
-- Executar no SQL Editor do Supabase (Dashboard → SQL Editor → New Query)
--
-- Contexto (PROMPT_PROFICJR.md, seções 3 e 5):
--   - PROFIC Jr exige 2 vídeos de acompanhamento por projeto (fim do 3º e do 5º mês),
--     documentando o protagonismo dos alunos. Não existe hoje campo para isso.
--   - Seleção do PROFIC Jr ocorre em 2026, mas o pagamento das bolsas só começa a
--     partir da abertura do calendário letivo de 2027 — precisa de uma data própria
--     no contrato, distinta de edicao.data_inicio/data_termino (que continuam
--     representando o período do processo seletivo em 2026).
--
-- `doc_regularidade_url` (Declaração de Regularidade junto ao FACITEC) NÃO está
-- neste arquivo porque a coluna já existe em `orientador` — só faltava ligá-la à UI.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- projeto — vídeos de acompanhamento (mês 3 e mês 5)
-- -----------------------------------------------------------------------------
ALTER TABLE projeto ADD COLUMN IF NOT EXISTS video_mes3_url        text;
ALTER TABLE projeto ADD COLUMN IF NOT EXISTS nome_arquivo_video_mes3 text;
ALTER TABLE projeto ADD COLUMN IF NOT EXISTS video_mes5_url        text;
ALTER TABLE projeto ADD COLUMN IF NOT EXISTS nome_arquivo_video_mes5 text;

-- -----------------------------------------------------------------------------
-- contrato — início real do pagamento da bolsa (distinto da vigência/assinatura)
-- -----------------------------------------------------------------------------
ALTER TABLE contrato ADD COLUMN IF NOT EXISTS data_inicio_bolsa date;

COMMENT ON COLUMN contrato.data_inicio_bolsa IS
  'Data em que o pagamento das bolsas efetivamente começa. Para o PROFIC Jr isso é '
  'a abertura do calendário letivo de 2027, mesmo com o contrato assinado/vigente '
  'desde 2026 — não confundir com edicao.data_inicio/data_termino (período da '
  'seleção) nem com contrato.data_inicio_vigencia (vigência contratual de 6 meses).';
