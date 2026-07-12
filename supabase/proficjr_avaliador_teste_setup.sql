-- =============================================================================
-- FACITEC Conecta — Avaliador de teste para o fluxo ponta a ponta do PROFIC Jr
-- Executar no SQL Editor do Supabase (Dashboard → SQL Editor → New Query)
--
-- ATUALIZAÇÃO: o usuário criado com e-mail fake (@exemplo.com) não confirmava
-- login (sem "Auto confirm"). Recriado com e-mail real
-- (sergiozamott123+proficjrteste@gmail.com) e "Auto confirm user" marcado.
-- Este UPDATE aponta o avaliador já cadastrado pro novo auth_user_id.
-- =============================================================================

UPDATE avaliador
SET auth_user_id = 'c651e8e9-a056-4af4-9cf9-3f9bb41e4ae8',
    email = 'sergiozamott123+proficjrteste@gmail.com'
WHERE id = '4a14d8f1-6eb8-4adc-b72e-3b8821589fb4'
RETURNING id, nome, email, auth_user_id, edicao_id;
