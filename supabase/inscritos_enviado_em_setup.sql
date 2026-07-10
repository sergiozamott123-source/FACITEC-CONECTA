-- =============================================================================
-- FACITEC Conecta — projeto.enviado_em: data real de envio da inscrição
-- Corrige a tela "Inscritos", que hoje usa projeto.created_at (data de
-- início do rascunho) como se fosse a data de envio final.
-- =============================================================================

ALTER TABLE projeto
  ADD COLUMN IF NOT EXISTS enviado_em timestamptz;

-- Backfill: inscrições já enviadas (status = 'inscrito', 'reserva' ou
-- 'selecionado' — os dois últimos são o resultado da classificação de uma
-- inscrição que foi enviada) que ainda não têm enviado_em ganham created_at
-- como aproximação razoável. Rascunhos (status = 'rascunho') NÃO são
-- preenchidos — nunca foram enviados.
UPDATE projeto
SET enviado_em = created_at
WHERE status IN ('inscrito', 'reserva', 'selecionado')
  AND enviado_em IS NULL;

-- Verificação
SELECT status, count(*) AS total, count(enviado_em) AS com_enviado_em
FROM projeto
GROUP BY status
ORDER BY status;
