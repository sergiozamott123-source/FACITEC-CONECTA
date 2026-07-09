-- =============================================================================
-- FACITEC Conecta — Relatório Mensal do Orientador (6 ciclos por edição)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- relatorio_mensal_ciclo — janelas de abertura/fechamento por edição
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relatorio_mensal_ciclo (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id      uuid NOT NULL REFERENCES edicao(id),
  numero_ciclo   int NOT NULL CHECK (numero_ciclo BETWEEN 1 AND 6),
  mes_referencia text NOT NULL,
  data_abertura  date NOT NULL,
  data_fechamento date NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edicao_id, numero_ciclo)
);

DROP TRIGGER IF EXISTS relatorio_mensal_ciclo_set_updated_at ON relatorio_mensal_ciclo;
CREATE TRIGGER relatorio_mensal_ciclo_set_updated_at
  BEFORE UPDATE ON relatorio_mensal_ciclo
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed dos 6 ciclos da edição ativa 2026 (abre dia 18, fecha dia 25 do mês)
INSERT INTO relatorio_mensal_ciclo (edicao_id, numero_ciclo, mes_referencia, data_abertura, data_fechamento)
SELECT e.id, c.numero, c.mes, c.abertura::date, c.fechamento::date
FROM edicao e
CROSS JOIN (VALUES
  (1, 'Julho',    '2026-07-18', '2026-07-25'),
  (2, 'Agosto',   '2026-08-18', '2026-08-25'),
  (3, 'Setembro', '2026-09-18', '2026-09-25'),
  (4, 'Outubro',  '2026-10-18', '2026-10-25'),
  (5, 'Novembro', '2026-11-18', '2026-11-25'),
  (6, 'Dezembro', '2026-12-18', '2026-12-25')
) AS c(numero, mes, abertura, fechamento)
WHERE e.ano_referencia = 2026 AND e.status = 'ativo'
ON CONFLICT (edicao_id, numero_ciclo) DO NOTHING;

ALTER TABLE relatorio_mensal_ciclo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "relatorio_mensal_ciclo_select" ON relatorio_mensal_ciclo;
DROP POLICY IF EXISTS "relatorio_mensal_ciclo_insert" ON relatorio_mensal_ciclo;
DROP POLICY IF EXISTS "relatorio_mensal_ciclo_update" ON relatorio_mensal_ciclo;
DROP POLICY IF EXISTS "relatorio_mensal_ciclo_delete" ON relatorio_mensal_ciclo;

CREATE POLICY "relatorio_mensal_ciclo_select" ON relatorio_mensal_ciclo
  FOR SELECT USING (get_my_role() IN ('secretaria', 'orientador'));

CREATE POLICY "relatorio_mensal_ciclo_insert" ON relatorio_mensal_ciclo
  FOR INSERT WITH CHECK (get_my_role() = 'secretaria');

CREATE POLICY "relatorio_mensal_ciclo_update" ON relatorio_mensal_ciclo
  FOR UPDATE USING (get_my_role() = 'secretaria') WITH CHECK (get_my_role() = 'secretaria');

CREATE POLICY "relatorio_mensal_ciclo_delete" ON relatorio_mensal_ciclo
  FOR DELETE USING (get_my_role() = 'secretaria');

-- -----------------------------------------------------------------------------
-- relatorio_mensal — extensão dos campos estruturados do ciclo
-- (mantém conteudo/arquivo_url/status legados usados pela tela Histórico e
-- pelo importador de dados históricos — não remover)
-- -----------------------------------------------------------------------------
ALTER TABLE relatorio_mensal
  ADD COLUMN IF NOT EXISTS ciclo_id uuid REFERENCES relatorio_mensal_ciclo(id),
  ADD COLUMN IF NOT EXISTS frequencia_bolsistas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS atividades_realizadas text,
  ADD COLUMN IF NOT EXISTS resultados_alcancados text,
  ADD COLUMN IF NOT EXISTS desafios_enfrentados text,
  ADD COLUMN IF NOT EXISTS evidencias_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reaberto_em timestamptz,
  ADD COLUMN IF NOT EXISTS reaberto_por uuid REFERENCES auth.users(id);

-- Amplia o vocabulário de status para incluir o fluxo novo, sem quebrar o
-- vocabulário legado (pendente/enviado/aprovado/reprovado) usado em Histórico.
ALTER TABLE relatorio_mensal DROP CONSTRAINT IF EXISTS relatorio_mensal_status_check;
ALTER TABLE relatorio_mensal ADD CONSTRAINT relatorio_mensal_status_check
  CHECK (status IN ('pendente', 'enviado', 'aprovado', 'reprovado', 'rascunho', 'reaberto_pela_secretaria'));

-- Um único registro por (orientador_id, ciclo_id). Constraint "cheia" (sem
-- WHERE) porque o upsert do PostgREST (supabase-js .upsert) gera um
-- ON CONFLICT que só casa com índices não-parciais — um índice único
-- parcial (WHERE ciclo_id IS NOT NULL) faz o upsert falhar com 42P10.
-- Isso não afeta as entradas legadas do Histórico (ciclo_id nulo): UNIQUE
-- trata cada NULL como distinto, então múltiplas linhas com ciclo_id nulo
-- para o mesmo orientador continuam permitidas.
ALTER TABLE relatorio_mensal DROP CONSTRAINT IF EXISTS relatorio_mensal_orientador_ciclo_uniq;
ALTER TABLE relatorio_mensal ADD CONSTRAINT relatorio_mensal_orientador_ciclo_uniq
  UNIQUE (orientador_id, ciclo_id);

DROP TRIGGER IF EXISTS relatorio_mensal_set_updated_at ON relatorio_mensal;
CREATE TRIGGER relatorio_mensal_set_updated_at
  BEFORE UPDATE ON relatorio_mensal
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS de relatorio_mensal — substitui as políticas totalmente permissivas
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "relatorio_mensal_select" ON relatorio_mensal;
DROP POLICY IF EXISTS "relatorio_mensal_insert" ON relatorio_mensal;
DROP POLICY IF EXISTS "relatorio_mensal_update" ON relatorio_mensal;
DROP POLICY IF EXISTS "relatorio_mensal_delete" ON relatorio_mensal;

CREATE POLICY "relatorio_mensal_select" ON relatorio_mensal
  FOR SELECT USING (
    get_my_role() = 'secretaria'
    OR orientador_id = get_my_orientador_id()
  );

CREATE POLICY "relatorio_mensal_insert" ON relatorio_mensal
  FOR INSERT WITH CHECK (
    get_my_role() = 'secretaria'
    OR (orientador_id = get_my_orientador_id() AND status = 'rascunho')
  );

CREATE POLICY "relatorio_mensal_update" ON relatorio_mensal
  FOR UPDATE USING (
    get_my_role() = 'secretaria'
    OR (orientador_id = get_my_orientador_id() AND status = 'rascunho')
  ) WITH CHECK (
    get_my_role() = 'secretaria'
    OR (orientador_id = get_my_orientador_id() AND status IN ('rascunho', 'enviado'))
  );

CREATE POLICY "relatorio_mensal_delete" ON relatorio_mensal
  FOR DELETE USING (get_my_role() = 'secretaria');

-- -----------------------------------------------------------------------------
-- Storage — bucket de evidências dos relatórios
-- {orientador_id}/{ciclo_id}/{arquivo}
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('relatorios-evidencias', 'relatorios-evidencias', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "relatorios_evidencias_select" ON storage.objects;
DROP POLICY IF EXISTS "relatorios_evidencias_insert" ON storage.objects;
DROP POLICY IF EXISTS "relatorios_evidencias_update" ON storage.objects;
DROP POLICY IF EXISTS "relatorios_evidencias_delete" ON storage.objects;

CREATE POLICY "relatorios_evidencias_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'relatorios-evidencias'
    AND (
      get_my_role() = 'secretaria'
      OR (storage.foldername(name))[1] = get_my_orientador_id()::text
    )
  );

CREATE POLICY "relatorios_evidencias_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'relatorios-evidencias'
    AND (storage.foldername(name))[1] = get_my_orientador_id()::text
  );

CREATE POLICY "relatorios_evidencias_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'relatorios-evidencias'
    AND (
      get_my_role() = 'secretaria'
      OR (storage.foldername(name))[1] = get_my_orientador_id()::text
    )
  );

-- =============================================================================
-- Verificação
-- =============================================================================
SELECT numero_ciclo, mes_referencia, data_abertura, data_fechamento FROM relatorio_mensal_ciclo ORDER BY numero_ciclo;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'relatorio_mensal' ORDER BY ordinal_position;
SELECT policyname, cmd FROM pg_policies WHERE tablename IN ('relatorio_mensal', 'relatorio_mensal_ciclo') ORDER BY tablename, cmd;
