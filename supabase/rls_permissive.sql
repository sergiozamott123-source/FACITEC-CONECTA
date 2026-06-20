-- =============================================================================
-- FACITEC Conecta — Políticas RLS Permissivas
-- Executar no SQL Editor do Supabase (Dashboard → SQL Editor → New Query)
--
-- ATENÇÃO: estas políticas permitem acesso total sem autenticação.
-- Revisar e restringir por role quando o sistema de auth for configurado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- edicao
-- -----------------------------------------------------------------------------
ALTER TABLE edicao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "edicao_select"  ON edicao;
DROP POLICY IF EXISTS "edicao_insert"  ON edicao;
DROP POLICY IF EXISTS "edicao_update"  ON edicao;
DROP POLICY IF EXISTS "edicao_delete"  ON edicao;

CREATE POLICY "edicao_select"  ON edicao FOR SELECT USING (true);
CREATE POLICY "edicao_insert"  ON edicao FOR INSERT WITH CHECK (true);
CREATE POLICY "edicao_update"  ON edicao FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "edicao_delete"  ON edicao FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- projeto
-- -----------------------------------------------------------------------------
ALTER TABLE projeto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projeto_select"  ON projeto;
DROP POLICY IF EXISTS "projeto_insert"  ON projeto;
DROP POLICY IF EXISTS "projeto_update"  ON projeto;
DROP POLICY IF EXISTS "projeto_delete"  ON projeto;

CREATE POLICY "projeto_select"  ON projeto FOR SELECT USING (true);
CREATE POLICY "projeto_insert"  ON projeto FOR INSERT WITH CHECK (true);
CREATE POLICY "projeto_update"  ON projeto FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "projeto_delete"  ON projeto FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- orientador
-- -----------------------------------------------------------------------------
ALTER TABLE orientador ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orientador_select"  ON orientador;
DROP POLICY IF EXISTS "orientador_insert"  ON orientador;
DROP POLICY IF EXISTS "orientador_update"  ON orientador;
DROP POLICY IF EXISTS "orientador_delete"  ON orientador;

CREATE POLICY "orientador_select"  ON orientador FOR SELECT USING (true);
CREATE POLICY "orientador_insert"  ON orientador FOR INSERT WITH CHECK (true);
CREATE POLICY "orientador_update"  ON orientador FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "orientador_delete"  ON orientador FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- bolsista
-- -----------------------------------------------------------------------------
ALTER TABLE bolsista ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bolsista_select"  ON bolsista;
DROP POLICY IF EXISTS "bolsista_insert"  ON bolsista;
DROP POLICY IF EXISTS "bolsista_update"  ON bolsista;
DROP POLICY IF EXISTS "bolsista_delete"  ON bolsista;

CREATE POLICY "bolsista_select"  ON bolsista FOR SELECT USING (true);
CREATE POLICY "bolsista_insert"  ON bolsista FOR INSERT WITH CHECK (true);
CREATE POLICY "bolsista_update"  ON bolsista FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "bolsista_delete"  ON bolsista FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- contrato
-- -----------------------------------------------------------------------------
ALTER TABLE contrato ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contrato_select"  ON contrato;
DROP POLICY IF EXISTS "contrato_insert"  ON contrato;
DROP POLICY IF EXISTS "contrato_update"  ON contrato;
DROP POLICY IF EXISTS "contrato_delete"  ON contrato;

CREATE POLICY "contrato_select"  ON contrato FOR SELECT USING (true);
CREATE POLICY "contrato_insert"  ON contrato FOR INSERT WITH CHECK (true);
CREATE POLICY "contrato_update"  ON contrato FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "contrato_delete"  ON contrato FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- termo_adesao
-- -----------------------------------------------------------------------------
ALTER TABLE termo_adesao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "termo_adesao_select"  ON termo_adesao;
DROP POLICY IF EXISTS "termo_adesao_insert"  ON termo_adesao;
DROP POLICY IF EXISTS "termo_adesao_update"  ON termo_adesao;
DROP POLICY IF EXISTS "termo_adesao_delete"  ON termo_adesao;

CREATE POLICY "termo_adesao_select"  ON termo_adesao FOR SELECT USING (true);
CREATE POLICY "termo_adesao_insert"  ON termo_adesao FOR INSERT WITH CHECK (true);
CREATE POLICY "termo_adesao_update"  ON termo_adesao FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "termo_adesao_delete"  ON termo_adesao FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- pagamento
-- -----------------------------------------------------------------------------
ALTER TABLE pagamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pagamento_select"  ON pagamento;
DROP POLICY IF EXISTS "pagamento_insert"  ON pagamento;
DROP POLICY IF EXISTS "pagamento_update"  ON pagamento;
DROP POLICY IF EXISTS "pagamento_delete"  ON pagamento;

CREATE POLICY "pagamento_select"  ON pagamento FOR SELECT USING (true);
CREATE POLICY "pagamento_insert"  ON pagamento FOR INSERT WITH CHECK (true);
CREATE POLICY "pagamento_update"  ON pagamento FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "pagamento_delete"  ON pagamento FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- avaliacao
-- -----------------------------------------------------------------------------
ALTER TABLE avaliacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avaliacao_select"  ON avaliacao;
DROP POLICY IF EXISTS "avaliacao_insert"  ON avaliacao;
DROP POLICY IF EXISTS "avaliacao_update"  ON avaliacao;
DROP POLICY IF EXISTS "avaliacao_delete"  ON avaliacao;

CREATE POLICY "avaliacao_select"  ON avaliacao FOR SELECT USING (true);
CREATE POLICY "avaliacao_insert"  ON avaliacao FOR INSERT WITH CHECK (true);
CREATE POLICY "avaliacao_update"  ON avaliacao FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "avaliacao_delete"  ON avaliacao FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- avaliador
-- -----------------------------------------------------------------------------
ALTER TABLE avaliador ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avaliador_select"  ON avaliador;
DROP POLICY IF EXISTS "avaliador_insert"  ON avaliador;
DROP POLICY IF EXISTS "avaliador_update"  ON avaliador;
DROP POLICY IF EXISTS "avaliador_delete"  ON avaliador;

CREATE POLICY "avaliador_select"  ON avaliador FOR SELECT USING (true);
CREATE POLICY "avaliador_insert"  ON avaliador FOR INSERT WITH CHECK (true);
CREATE POLICY "avaliador_update"  ON avaliador FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "avaliador_delete"  ON avaliador FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- recurso
-- -----------------------------------------------------------------------------
ALTER TABLE recurso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recurso_select"  ON recurso;
DROP POLICY IF EXISTS "recurso_insert"  ON recurso;
DROP POLICY IF EXISTS "recurso_update"  ON recurso;
DROP POLICY IF EXISTS "recurso_delete"  ON recurso;

CREATE POLICY "recurso_select"  ON recurso FOR SELECT USING (true);
CREATE POLICY "recurso_insert"  ON recurso FOR INSERT WITH CHECK (true);
CREATE POLICY "recurso_update"  ON recurso FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "recurso_delete"  ON recurso FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- recurso_criterio
-- -----------------------------------------------------------------------------
ALTER TABLE recurso_criterio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recurso_criterio_select"  ON recurso_criterio;
DROP POLICY IF EXISTS "recurso_criterio_insert"  ON recurso_criterio;
DROP POLICY IF EXISTS "recurso_criterio_update"  ON recurso_criterio;
DROP POLICY IF EXISTS "recurso_criterio_delete"  ON recurso_criterio;

CREATE POLICY "recurso_criterio_select"  ON recurso_criterio FOR SELECT USING (true);
CREATE POLICY "recurso_criterio_insert"  ON recurso_criterio FOR INSERT WITH CHECK (true);
CREATE POLICY "recurso_criterio_update"  ON recurso_criterio FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "recurso_criterio_delete"  ON recurso_criterio FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- criterio_avaliacao
-- -----------------------------------------------------------------------------
ALTER TABLE criterio_avaliacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "criterio_avaliacao_select"  ON criterio_avaliacao;
DROP POLICY IF EXISTS "criterio_avaliacao_insert"  ON criterio_avaliacao;
DROP POLICY IF EXISTS "criterio_avaliacao_update"  ON criterio_avaliacao;
DROP POLICY IF EXISTS "criterio_avaliacao_delete"  ON criterio_avaliacao;

CREATE POLICY "criterio_avaliacao_select"  ON criterio_avaliacao FOR SELECT USING (true);
CREATE POLICY "criterio_avaliacao_insert"  ON criterio_avaliacao FOR INSERT WITH CHECK (true);
CREATE POLICY "criterio_avaliacao_update"  ON criterio_avaliacao FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "criterio_avaliacao_delete"  ON criterio_avaliacao FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- relatorio_mensal
-- -----------------------------------------------------------------------------
ALTER TABLE relatorio_mensal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "relatorio_mensal_select"  ON relatorio_mensal;
DROP POLICY IF EXISTS "relatorio_mensal_insert"  ON relatorio_mensal;
DROP POLICY IF EXISTS "relatorio_mensal_update"  ON relatorio_mensal;
DROP POLICY IF EXISTS "relatorio_mensal_delete"  ON relatorio_mensal;

CREATE POLICY "relatorio_mensal_select"  ON relatorio_mensal FOR SELECT USING (true);
CREATE POLICY "relatorio_mensal_insert"  ON relatorio_mensal FOR INSERT WITH CHECK (true);
CREATE POLICY "relatorio_mensal_update"  ON relatorio_mensal FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "relatorio_mensal_delete"  ON relatorio_mensal FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- importacao_log
-- -----------------------------------------------------------------------------
ALTER TABLE importacao_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "importacao_log_select"  ON importacao_log;
DROP POLICY IF EXISTS "importacao_log_insert"  ON importacao_log;
DROP POLICY IF EXISTS "importacao_log_update"  ON importacao_log;
DROP POLICY IF EXISTS "importacao_log_delete"  ON importacao_log;

CREATE POLICY "importacao_log_select"  ON importacao_log FOR SELECT USING (true);
CREATE POLICY "importacao_log_insert"  ON importacao_log FOR INSERT WITH CHECK (true);
CREATE POLICY "importacao_log_update"  ON importacao_log FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "importacao_log_delete"  ON importacao_log FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- convocacao
-- Acesso total permissivo — mesmo padrão das demais tabelas admin.
-- O controle de quem pode criar convocações é feito na camada de aplicação.
-- -----------------------------------------------------------------------------
ALTER TABLE convocacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "convocacao_select" ON convocacao;
DROP POLICY IF EXISTS "convocacao_insert" ON convocacao;
DROP POLICY IF EXISTS "convocacao_update" ON convocacao;
DROP POLICY IF EXISTS "convocacao_delete" ON convocacao;

CREATE POLICY "convocacao_select" ON convocacao FOR SELECT USING (true);
CREATE POLICY "convocacao_insert" ON convocacao FOR INSERT WITH CHECK (true);
CREATE POLICY "convocacao_update" ON convocacao FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "convocacao_delete" ON convocacao FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- convocacao_criterio
--
-- TRADE-OFF TEMPORÁRIO: o admin não possui sessão Supabase Auth hoje — acessa
-- o banco direto via anon key sem autenticar, portanto auth.uid() IS NULL.
-- Usamos isso como proxy de "é admin" para INSERT e DELETE.
-- Quando o admin ganhar sessão própria com role no JWT, substituir por:
--   (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
--
-- Admin  (auth.uid() IS NULL)    → SELECT, INSERT, UPDATE, DELETE totais
-- Avaliador (auth.uid() NOT NULL) → SELECT e UPDATE apenas nas próprias linhas
--                                   INSERT e DELETE bloqueados
-- -----------------------------------------------------------------------------
ALTER TABLE convocacao_criterio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "convocacao_criterio_select" ON convocacao_criterio;
DROP POLICY IF EXISTS "convocacao_criterio_insert" ON convocacao_criterio;
DROP POLICY IF EXISTS "convocacao_criterio_update" ON convocacao_criterio;
DROP POLICY IF EXISTS "convocacao_criterio_delete" ON convocacao_criterio;

-- SELECT: admin (sem sessão) OU avaliador vendo apenas as próprias linhas
CREATE POLICY "convocacao_criterio_select" ON convocacao_criterio
  FOR SELECT USING (
    auth.uid() IS NULL
    OR avaliador_id = (
      SELECT id FROM avaliador WHERE auth_user_id = auth.uid()
    )
  );

-- INSERT: somente admin (avaliador não cria convocações)
CREATE POLICY "convocacao_criterio_insert" ON convocacao_criterio
  FOR INSERT WITH CHECK (
    auth.uid() IS NULL
  );

-- UPDATE: admin OU avaliador atualizando apenas as próprias linhas
-- Restrição de quais colunas o avaliador pode alterar é validada no front-end
CREATE POLICY "convocacao_criterio_update" ON convocacao_criterio
  FOR UPDATE
  USING (
    auth.uid() IS NULL
    OR avaliador_id = (
      SELECT id FROM avaliador WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NULL
    OR avaliador_id = (
      SELECT id FROM avaliador WHERE auth_user_id = auth.uid()
    )
  );

-- DELETE: somente admin
CREATE POLICY "convocacao_criterio_delete" ON convocacao_criterio
  FOR DELETE USING (
    auth.uid() IS NULL
  );

-- =============================================================================
-- Verificação — lista as políticas criadas
-- =============================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  cmd        AS operacao,
  qual       AS using_expr,
  with_check AS check_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'edicao', 'projeto', 'orientador', 'bolsista', 'contrato',
    'termo_adesao', 'pagamento', 'avaliacao', 'avaliador',
    'recurso', 'recurso_criterio', 'criterio_avaliacao',
    'relatorio_mensal', 'importacao_log',
    'convocacao', 'convocacao_criterio'
  )
ORDER BY tablename, cmd;
