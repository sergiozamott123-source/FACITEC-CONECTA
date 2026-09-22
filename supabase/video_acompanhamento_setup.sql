-- =============================================================================
-- FACITEC Conecta — Vídeos de Acompanhamento do PIBIC Jr (Edital 01/2026)
--
-- Exigência do edital (seção "Entregas"): cada equipe envia 2 vídeos de
-- acompanhamento do projeto — um no 3º mês, outro no 5º mês — publicados
-- como link do YouTube (não listado), sem upload de arquivo no sistema.
--
-- Prazos combinados com a Secretaria (datas fixas, iguais para toda a
-- edição — não contam a partir da assinatura individual do contrato):
--   Vídeo 1 (3º mês) — até 30/10/2026
--   Vídeo 2 (5º mês) — até 11/12/2026
--
-- Atraso não bloqueia pagamento (diferente da documentação cadastral em
-- pagamentos.js) — fica só sinalizado para a Secretaria acompanhar
-- manualmente. Por isso não existe aqui nenhum estado "rascunho"/"enviado"
-- com trava: o orientador pode atualizar o link livremente a qualquer
-- momento; o status (pendente/enviado/atrasado) é sempre calculado a
-- partir da data de hoje x prazo x link preenchido.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- video_acompanhamento_ciclo — os 2 prazos da edição
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_acompanhamento_ciclo (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id       uuid NOT NULL REFERENCES edicao(id),
  numero_video    int NOT NULL CHECK (numero_video IN (1, 2)),
  rotulo          text NOT NULL,
  data_fechamento date NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edicao_id, numero_video)
);

DROP TRIGGER IF EXISTS video_acompanhamento_ciclo_set_updated_at ON video_acompanhamento_ciclo;
CREATE TRIGGER video_acompanhamento_ciclo_set_updated_at
  BEFORE UPDATE ON video_acompanhamento_ciclo
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed dos 2 prazos da edição ativa 2026 do PIBIC Jr especificamente — o
-- PROFIC Jr também pode ter edição ativa em 2026, mas o edital dele não foi
-- conferido para esta exigência, então não seedamos ciclo de vídeo para ele
-- aqui (evita presumir prazos que ninguém confirmou).
INSERT INTO video_acompanhamento_ciclo (edicao_id, numero_video, rotulo, data_fechamento)
SELECT e.id, c.numero, c.rotulo, c.fechamento::date
FROM edicao e
CROSS JOIN (VALUES
  (1, 'Vídeo do 3º mês', '2026-10-30'),
  (2, 'Vídeo do 5º mês', '2026-12-11')
) AS c(numero, rotulo, fechamento)
WHERE e.ano_referencia = 2026 AND e.status = 'ativo' AND e.programa_id = 'PIBICJR'
ON CONFLICT (edicao_id, numero_video) DO NOTHING;

ALTER TABLE video_acompanhamento_ciclo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_acompanhamento_ciclo_select" ON video_acompanhamento_ciclo;
DROP POLICY IF EXISTS "video_acompanhamento_ciclo_insert" ON video_acompanhamento_ciclo;
DROP POLICY IF EXISTS "video_acompanhamento_ciclo_update" ON video_acompanhamento_ciclo;
DROP POLICY IF EXISTS "video_acompanhamento_ciclo_delete" ON video_acompanhamento_ciclo;

CREATE POLICY "video_acompanhamento_ciclo_select" ON video_acompanhamento_ciclo
  FOR SELECT USING (get_my_role() IN ('secretaria', 'orientador'));

CREATE POLICY "video_acompanhamento_ciclo_insert" ON video_acompanhamento_ciclo
  FOR INSERT WITH CHECK (get_my_role() = 'secretaria');

CREATE POLICY "video_acompanhamento_ciclo_update" ON video_acompanhamento_ciclo
  FOR UPDATE USING (get_my_role() = 'secretaria') WITH CHECK (get_my_role() = 'secretaria');

CREATE POLICY "video_acompanhamento_ciclo_delete" ON video_acompanhamento_ciclo
  FOR DELETE USING (get_my_role() = 'secretaria');

-- -----------------------------------------------------------------------------
-- video_acompanhamento — o link enviado por cada orientador, por ciclo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_acompanhamento (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orientador_id uuid NOT NULL REFERENCES orientador(id),
  ciclo_id      uuid NOT NULL REFERENCES video_acompanhamento_ciclo(id),
  link_youtube  text NOT NULL,
  enviado_em    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (orientador_id, ciclo_id)
);

DROP TRIGGER IF EXISTS video_acompanhamento_set_updated_at ON video_acompanhamento;
CREATE TRIGGER video_acompanhamento_set_updated_at
  BEFORE UPDATE ON video_acompanhamento
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE video_acompanhamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_acompanhamento_select" ON video_acompanhamento;
DROP POLICY IF EXISTS "video_acompanhamento_insert" ON video_acompanhamento;
DROP POLICY IF EXISTS "video_acompanhamento_update" ON video_acompanhamento;
DROP POLICY IF EXISTS "video_acompanhamento_delete" ON video_acompanhamento;

CREATE POLICY "video_acompanhamento_select" ON video_acompanhamento
  FOR SELECT USING (
    get_my_role() = 'secretaria'
    OR orientador_id = get_my_orientador_id()
  );

CREATE POLICY "video_acompanhamento_insert" ON video_acompanhamento
  FOR INSERT WITH CHECK (
    get_my_role() = 'secretaria'
    OR orientador_id = get_my_orientador_id()
  );

CREATE POLICY "video_acompanhamento_update" ON video_acompanhamento
  FOR UPDATE USING (
    get_my_role() = 'secretaria'
    OR orientador_id = get_my_orientador_id()
  ) WITH CHECK (
    get_my_role() = 'secretaria'
    OR orientador_id = get_my_orientador_id()
  );

CREATE POLICY "video_acompanhamento_delete" ON video_acompanhamento
  FOR DELETE USING (get_my_role() = 'secretaria');

-- =============================================================================
-- Verificação
-- =============================================================================
SELECT numero_video, rotulo, data_fechamento FROM video_acompanhamento_ciclo ORDER BY numero_video;
SELECT policyname, cmd FROM pg_policies WHERE tablename IN ('video_acompanhamento', 'video_acompanhamento_ciclo') ORDER BY tablename, cmd;
