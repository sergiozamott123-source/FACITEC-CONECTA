-- =============================================================================
-- FACITEC Conecta — Atribui codigo_orientador ao orientador de teste do PROFIC Jr
-- Executar no SQL Editor do Supabase (Dashboard → SQL Editor → New Query)
--
-- Contexto: SuperpainelM2.jsx (e GerenciarUsuariosOrientadores.jsx) só reconhece
-- um orientador como "de verdade selecionado" quando codigo_orientador não é
-- nulo — e nada no código grava esse campo (mesma lacuna do status='selecionado'
-- em `projeto`, ver tarefa "Construir ação formal de seleção final").
-- =============================================================================

UPDATE orientador
SET codigo_orientador = 'PROFIC26-001'
WHERE email = 'teste.proficjr@exemplo.com'
RETURNING id, nome_completo, email, codigo_orientador;
