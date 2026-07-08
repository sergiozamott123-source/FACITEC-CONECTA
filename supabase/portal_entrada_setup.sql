-- =============================================================================
-- FACITEC Conecta — Portal de Entrada: papéis de acesso (Secretaria / Orientador)
-- Executar no SQL Editor do Supabase (Dashboard → SQL Editor → New Query)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_roles — mapeia um usuário do Supabase Auth ao papel dele no sistema.
-- Só a Edge Function (service role, que ignora RLS) escreve nesta tabela —
-- nenhum usuário autenticado pode se auto-atribuir um papel.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
  user_id    uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('secretaria', 'orientador')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_own" ON user_roles;
CREATE POLICY "user_roles_select_own" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Funções auxiliares (security definer — leem user_roles/orientador ignorando RLS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_orientador_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM orientador WHERE auth_user_id = auth.uid()
$$;

-- -----------------------------------------------------------------------------
-- Backfill — orientadores que já têm auth_user_id vinculado ganham a role
-- 'orientador' automaticamente, sem precisar recriar a conta.
-- -----------------------------------------------------------------------------
INSERT INTO user_roles (user_id, role)
SELECT auth_user_id, 'orientador'
FROM orientador
WHERE auth_user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- bolsista_select — antes era USING (true) (qualquer sessão via anon key via
-- todos os bolsistas). Agora: secretaria vê tudo, orientador vê só os seus.
-- Demais policies de bolsista (insert/update/delete) e de todas as outras
-- tabelas permanecem como estão — não fazem parte desta mudança.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "bolsista_select" ON bolsista;
CREATE POLICY "bolsista_select" ON bolsista
  FOR SELECT USING (
    get_my_role() = 'secretaria'
    OR orientador_id = get_my_orientador_id()
  );

-- =============================================================================
-- PASSO MANUAL — criar a primeira conta de Secretaria
--
-- 1. Supabase Dashboard → Authentication → Users → Add user
--    (e-mail real da secretaria + senha; marcar "Auto Confirm User")
-- 2. Copiar o UUID gerado para o usuário e rodar:
--
--    insert into user_roles (user_id, role)
--    values ('<uuid-copiado>', 'secretaria');
--
-- Repita o passo 2 para cada conta adicional de secretaria.
-- =============================================================================

-- =============================================================================
-- Verificação
-- =============================================================================
SELECT user_id, role, created_at FROM user_roles ORDER BY created_at;

SELECT policyname, cmd AS operacao, qual AS using_expr, with_check AS check_expr
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('user_roles', 'bolsista')
ORDER BY tablename, cmd;
