-- =============================================================================
-- FACITEC Conecta — Marca o projeto de teste do PROFIC Jr como "selecionado"
-- Executar no SQL Editor do Supabase (Dashboard → SQL Editor → New Query)
--
-- Contexto: não existe hoje, em nenhum programa (PIBIC Jr incluso), uma ação
-- no app que grave status='selecionado' num projeto após a fase de recursos.
-- O portal do orientador (PortalOrientadorContext.jsx) só reconhece um projeto
-- ativo quando esse status existe — sem ele, cai em `projeto = null`, o que
-- explica tanto o "0 de 8" (fallback de getMaxBolsistas quando programaId é
-- undefined) quanto os uploads travados (handleUpload/handleSalvar checam
-- `if (!projeto) return`). Isso é uma lacuna real do sistema, registrada
-- separadamente para planejar uma ação formal de seleção final no M1.
-- =============================================================================

UPDATE projeto
SET status = 'selecionado'
WHERE codigo_inscricao = 'PROFICJr2026-0001'
RETURNING id, titulo, codigo_inscricao, status, edicao_id;
