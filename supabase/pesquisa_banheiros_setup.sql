-- =============================================================================
-- FACITEC Conecta — Pesquisa Banheiros Públicos (CDTIV)
-- Executar no SQL Editor do Supabase (Dashboard → SQL Editor → New Query)
--
-- O que este arquivo faz:
--   1. Cria a tabela modulo_acesso: quem pode abrir cada card/módulo além da
--      Secretaria (ex.: o Gerente de Inovação só na Pesquisa Banheiros).
--   2. Cria as tabelas da pesquisa, todas com prefixo banheiro_.
--   3. Cria as funções que o sistema chama.
--
-- O que este arquivo NÃO faz:
--   * Não altera nenhuma tabela, policy ou função existente do PIBIC Jr/PROFIC Jr.
--   * Não mexe em user_roles.
--
-- Segurança:
--   * Todas as tabelas novas têm RLS ligado e NENHUMA policy: ninguém lê ou
--     escreve direto pela chave pública. Todo acesso passa pelas funções abaixo.
--   * Quem responde (sem login) só consegue chamar banheiro_validar_codigo e
--     banheiro_enviar_resposta.
--   * Códigos de acesso são guardados só como hash (sha256).
--   * 20 códigos errados em 15 minutos bloqueiam o mesmo IP por um tempo.
--   * As funções da equipe exigem Secretaria OU linha em modulo_acesso.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Acesso por módulo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.modulo_acesso (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modulo     text NOT NULL,
  nome       text,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, modulo)
);
ALTER TABLE public.modulo_acesso ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.modulo_acesso FROM anon, authenticated;

-- Secretaria tem acesso a todos os módulos; demais usuários só aos listados.
CREATE OR REPLACE FUNCTION public.tem_acesso_modulo(p_modulo text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'secretaria')
    OR EXISTS (SELECT 1 FROM public.modulo_acesso m WHERE m.user_id = auth.uid() AND m.modulo = p_modulo)
  );
$$;

-- -----------------------------------------------------------------------------
-- 2. Tabelas da pesquisa
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banheiro_codigos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_hash  text NOT NULL UNIQUE,
  final        text NOT NULL,              -- 4 últimos caracteres, só para identificar
  lote         text,                       -- ex.: Semus, Semmam
  criado_em    timestamptz NOT NULL DEFAULT now(),
  criado_por   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expira_em    timestamptz,
  usado_em     timestamptz,
  revogado     boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.banheiro_respostas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_id       uuid NOT NULL UNIQUE REFERENCES public.banheiro_codigos(id),
  respostas       jsonb NOT NULL,
  nome            text,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  analise_cpsi    jsonb,
  analise_em      timestamptz,
  analise_por     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  analise_modelo  text
);

CREATE TABLE IF NOT EXISTS public.banheiro_tentativas (
  id  bigserial PRIMARY KEY,
  ip  text,
  em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS banheiro_tentativas_ip_em ON public.banheiro_tentativas (ip, em);

ALTER TABLE public.banheiro_codigos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banheiro_respostas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banheiro_tentativas  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.banheiro_codigos, public.banheiro_respostas, public.banheiro_tentativas FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.banheiro_tentativas_id_seq FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Funções internas
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.banheiro_hash(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT encode(extensions.digest(upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')), 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.banheiro_ip()
RETURNS text LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce(
    split_part(nullif(current_setting('request.headers', true), '')::json->>'x-forwarded-for', ',', 1),
    'desconhecido');
$$;

CREATE OR REPLACE FUNCTION public.banheiro_bloqueado()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT count(*) >= 20 FROM public.banheiro_tentativas
   WHERE ip = public.banheiro_ip() AND em > now() - interval '15 minutes';
$$;

CREATE OR REPLACE FUNCTION public.banheiro_registra_falha()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.banheiro_tentativas (ip) VALUES (public.banheiro_ip());
  DELETE FROM public.banheiro_tentativas WHERE em < now() - interval '1 day';
END $$;

-- -----------------------------------------------------------------------------
-- 4. Funções públicas (quem responde, sem login)
--    Devolvem um status em vez de erro para que o registro de tentativas
--    erradas não seja desfeito.
-- -----------------------------------------------------------------------------

-- Retorno: 'ok' | 'invalido' | 'usado' | 'bloqueado'
CREATE OR REPLACE FUNCTION public.banheiro_validar_codigo(p_codigo text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.banheiro_codigos;
BEGIN
  IF public.banheiro_bloqueado() THEN RETURN 'bloqueado'; END IF;
  SELECT * INTO c FROM public.banheiro_codigos WHERE codigo_hash = public.banheiro_hash(p_codigo);
  IF c.id IS NULL OR c.revogado OR (c.expira_em IS NOT NULL AND c.expira_em < now()) THEN
    PERFORM public.banheiro_registra_falha();
    RETURN 'invalido';
  END IF;
  IF c.usado_em IS NOT NULL THEN RETURN 'usado'; END IF;
  RETURN 'ok';
END $$;

-- Grava a resposta e consome o código na mesma operação.
-- Retorno: 'ok' | 'invalido' | 'usado' | 'bloqueado' | 'dados_invalidos'
CREATE OR REPLACE FUNCTION public.banheiro_enviar_resposta(p_codigo text, p_respostas jsonb, p_nome text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.banheiro_codigos;
BEGIN
  IF public.banheiro_bloqueado() THEN RETURN 'bloqueado'; END IF;
  IF p_respostas IS NULL OR jsonb_typeof(p_respostas) <> 'object'
     OR octet_length(p_respostas::text) > 60000 OR length(coalesce(p_nome, '')) > 120 THEN
    RETURN 'dados_invalidos';
  END IF;

  SELECT * INTO c FROM public.banheiro_codigos WHERE codigo_hash = public.banheiro_hash(p_codigo) FOR UPDATE;
  IF c.id IS NULL OR c.revogado OR (c.expira_em IS NOT NULL AND c.expira_em < now()) THEN
    PERFORM public.banheiro_registra_falha();
    RETURN 'invalido';
  END IF;
  IF c.usado_em IS NOT NULL THEN RETURN 'usado'; END IF;

  INSERT INTO public.banheiro_respostas (codigo_id, respostas, nome)
  VALUES (c.id, p_respostas, nullif(trim(p_nome), ''));
  UPDATE public.banheiro_codigos SET usado_em = now() WHERE id = c.id;
  RETURN 'ok';
END $$;

-- -----------------------------------------------------------------------------
-- 5. Funções da equipe (Secretaria ou modulo_acesso 'pesquisa-banheiros')
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.banheiro_gerar_codigos(p_qtd int, p_lote text DEFAULT NULL, p_validade_dias int DEFAULT NULL)
RETURNS TABLE (codigo text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  alfabeto CONSTANT text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  b bytea; s text; i int; k int;
BEGIN
  IF NOT public.tem_acesso_modulo('pesquisa-banheiros') THEN RAISE EXCEPTION 'sem_permissao' USING errcode = '42501'; END IF;
  IF p_qtd IS NULL OR p_qtd < 1 OR p_qtd > 200 THEN RAISE EXCEPTION 'quantidade_invalida'; END IF;
  FOR i IN 1..p_qtd LOOP
    LOOP
      b := extensions.gen_random_bytes(8);
      s := '';
      FOR k IN 0..7 LOOP
        s := s || substr(alfabeto, (get_byte(b, k) % length(alfabeto)) + 1, 1);
      END LOOP;
      codigo := 'SV-' || substr(s, 1, 4) || '-' || substr(s, 5, 4);
      BEGIN
        INSERT INTO public.banheiro_codigos (codigo_hash, final, lote, criado_por, expira_em)
        VALUES (public.banheiro_hash(codigo), substr(s, 5, 4), nullif(trim(p_lote), ''), auth.uid(),
                CASE WHEN p_validade_dias IS NULL THEN NULL ELSE now() + make_interval(days => p_validade_dias) END);
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- colisão rara: gera outro
      END;
    END LOOP;
    RETURN NEXT;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.banheiro_revogar_codigo(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.tem_acesso_modulo('pesquisa-banheiros') THEN RAISE EXCEPTION 'sem_permissao' USING errcode = '42501'; END IF;
  UPDATE public.banheiro_codigos SET revogado = true WHERE id = p_id AND usado_em IS NULL;
END $$;

CREATE OR REPLACE FUNCTION public.banheiro_listar_codigos()
RETURNS TABLE (id uuid, final text, lote text, criado_em timestamptz, criado_por_email text,
               expira_em timestamptz, usado_em timestamptz, revogado boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.tem_acesso_modulo('pesquisa-banheiros') THEN RAISE EXCEPTION 'sem_permissao' USING errcode = '42501'; END IF;
  RETURN QUERY
    SELECT c.id, c.final, c.lote, c.criado_em, u.email::text, c.expira_em, c.usado_em, c.revogado
      FROM public.banheiro_codigos c LEFT JOIN auth.users u ON u.id = c.criado_por
     ORDER BY c.criado_em DESC;
END $$;

CREATE OR REPLACE FUNCTION public.banheiro_listar_respostas()
RETURNS TABLE (id uuid, respostas jsonb, nome text, criado_em timestamptz, lote text, final text,
               analise_cpsi jsonb, analise_em timestamptz, analise_modelo text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.tem_acesso_modulo('pesquisa-banheiros') THEN RAISE EXCEPTION 'sem_permissao' USING errcode = '42501'; END IF;
  RETURN QUERY
    SELECT r.id, r.respostas, r.nome, r.criado_em, c.lote, c.final, r.analise_cpsi, r.analise_em, r.analise_modelo
      FROM public.banheiro_respostas r JOIN public.banheiro_codigos c ON c.id = r.codigo_id
     ORDER BY r.criado_em DESC;
END $$;

-- Usada pela Edge Function banheiro-analise-cpsi, com o login de quem clicou.
CREATE OR REPLACE FUNCTION public.banheiro_salvar_analise(p_id uuid, p_analise jsonb, p_modelo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.tem_acesso_modulo('pesquisa-banheiros') THEN RAISE EXCEPTION 'sem_permissao' USING errcode = '42501'; END IF;
  IF p_analise IS NULL OR jsonb_typeof(p_analise) <> 'object' OR octet_length(p_analise::text) > 60000 THEN
    RAISE EXCEPTION 'analise_invalida';
  END IF;
  UPDATE public.banheiro_respostas
     SET analise_cpsi = p_analise, analise_em = now(), analise_por = auth.uid(), analise_modelo = left(p_modelo, 80)
   WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'resposta_nao_encontrada'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.banheiro_listar_equipe()
RETURNS TABLE (email text, papel text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.tem_acesso_modulo('pesquisa-banheiros') THEN RAISE EXCEPTION 'sem_permissao' USING errcode = '42501'; END IF;
  RETURN QUERY
    SELECT u.email::text, 'Secretaria executiva'::text
      FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id WHERE r.role = 'secretaria'
    UNION ALL
    SELECT u.email::text, coalesce(m.nome, 'Equipe da pesquisa')
      FROM public.modulo_acesso m JOIN auth.users u ON u.id = m.user_id WHERE m.modulo = 'pesquisa-banheiros';
END $$;

-- -----------------------------------------------------------------------------
-- 6. Permissões de execução (só das funções novas)
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  public.tem_acesso_modulo(text),
  public.banheiro_hash(text), public.banheiro_ip(), public.banheiro_bloqueado(), public.banheiro_registra_falha(),
  public.banheiro_validar_codigo(text), public.banheiro_enviar_resposta(text, jsonb, text),
  public.banheiro_gerar_codigos(int, text, int), public.banheiro_revogar_codigo(uuid),
  public.banheiro_listar_codigos(), public.banheiro_listar_respostas(),
  public.banheiro_salvar_analise(uuid, jsonb, text), public.banheiro_listar_equipe()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.banheiro_validar_codigo(text)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.banheiro_enviar_resposta(text, jsonb, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tem_acesso_modulo(text)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.banheiro_gerar_codigos(int, text, int)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.banheiro_revogar_codigo(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.banheiro_listar_codigos()                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.banheiro_listar_respostas()                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.banheiro_salvar_analise(uuid, jsonb, text)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.banheiro_listar_equipe()                    TO authenticated;

-- =============================================================================
-- PASSO MANUAL — dar acesso ao Gerente de Inovação (depois de rodar o acima)
--
-- 1. Supabase → Authentication → Users → Add user → Create new user
--    E-mail: joao.barroso@cdtiv.com.br · Senha: uma senha provisória
--    Marque "Auto Confirm User".
-- 2. Rode:
--    INSERT INTO public.modulo_acesso (user_id, modulo, nome)
--    SELECT id, 'pesquisa-banheiros', 'Gerente de Inovação'
--      FROM auth.users WHERE email = 'joao.barroso@cdtiv.com.br'
--    ON CONFLICT DO NOTHING;
--
-- Para tirar o acesso de alguém:
--    DELETE FROM public.modulo_acesso
--     WHERE modulo = 'pesquisa-banheiros'
--       AND user_id = (SELECT id FROM auth.users WHERE email = 'email@cdtiv.com.br');
-- =============================================================================
