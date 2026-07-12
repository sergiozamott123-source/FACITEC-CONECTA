-- =============================================================================
-- FACITEC Conecta — Ação formal de seleção final (M1 → M2)
-- Executar no SQL Editor do Supabase (Dashboard → SQL Editor → New Query)
--
-- Contexto (PROMPT_SELECAO_FINAL.md): até hoje `projeto.status='selecionado'` e
-- `orientador.codigo_orientador` eram gravados manualmente via SQL. Este arquivo
-- prepara a `edicao` para a ação "Confirmar seleção final" feita pela tela de
-- Classificação (src/pages/Classificacao.jsx):
--   - numero_vagas: substitui o `VAGAS = 10` hardcoded, uma por edição (o número
--     de vagas pode mudar entre edições do mesmo programa).
--   - data_selecao_final: registra quando a seleção final foi confirmada, para
--     não ficar sem rastro de quando isso aconteceu.
-- =============================================================================

ALTER TABLE edicao ADD COLUMN IF NOT EXISTS numero_vagas int;
ALTER TABLE edicao ADD COLUMN IF NOT EXISTS data_selecao_final timestamptz;

COMMENT ON COLUMN edicao.numero_vagas IS
  'Número de vagas do edital desta edição — usado pela ação "Confirmar seleção '
  'final" (Classificação) para definir quantos dos projetos mais bem classificados '
  'viram status=selecionado (os demais viram reserva).';

COMMENT ON COLUMN edicao.data_selecao_final IS
  'Data/hora em que a ação "Confirmar seleção final" foi executada pela última '
  'vez para esta edição.';
