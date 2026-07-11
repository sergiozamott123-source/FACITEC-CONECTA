-- =============================================================================
-- FACITEC Conecta — Perguntas dissertativas da Ficha de Inscrição do PROFIC Jr
-- Executar no SQL Editor do Supabase (Dashboard → SQL Editor → New Query)
--
-- Contexto: modelo de perguntas baseado no formulário real usado pelo PIBIC Jr
-- (Google Forms "Inscrição - Pibic Jr. 2025"), adaptado para o PROFIC Jr —
-- sem a pergunta de eixos temáticos, que o edital do PROFIC Jr não usa (por
-- isso nenhum registro é criado em `eixo_tematico`; a seção correspondente
-- desaparece sozinha na tela quando não há eixos cadastrados).
--
-- Edição-alvo: PROFICJR-2026, id 70543c7a-987a-41cf-a530-c942f16a3291.
--
-- ATUALIZAÇÃO 11/07: as perguntas 6 e 7 (Curso de Capacitação CDTIV/FACITEC +
-- upload do comprovante) foram REMOVIDAS a pedido do usuário — esta edição do
-- PROFIC Jr não terá esse curso. Já executadas via DELETE direto no Supabase;
-- este arquivo abaixo reflete só as 5 perguntas que continuam valendo.
-- =============================================================================

INSERT INTO campo_inscricao (edicao_id, pergunta, descricao_hint, tipo, obrigatorio, ordem)
VALUES
  (
    '70543c7a-987a-41cf-a530-c942f16a3291',
    'Descreva claramente o objetivo do projeto, informando qual o produto e/ou processo inovador a ser desenvolvido.',
    'Descreva também os objetivos específicos do projeto, na forma de metas físicas objetivas (entregas).',
    'texto_longo', true, 1
  ),
  (
    '70543c7a-987a-41cf-a530-c942f16a3291',
    'Descreva a justificativa de seu projeto.',
    'Por exemplo: quais as contribuições o projeto se propõe a alcançar? Qual a aplicabilidade de seu projeto, no sentido de sua utilidade ou vantajosidade (simplifica uma rotina, economiza tempo ou dinheiro, satisfaz alguma necessidade, etc.)?',
    'texto_longo', true, 2
  ),
  (
    '70543c7a-987a-41cf-a530-c942f16a3291',
    'Descreva a metodologia de seu projeto.',
    'Por exemplo: como, onde e com quê será conduzido? Quais serão os passos para a execução? Como será a forma de escolha da equipe de estudantes? Quais os métodos de desenvolvimento e instrumentos de coleta de dados (entrevista, formulário, observação, testes ou outros)?',
    'texto_longo', true, 3
  ),
  (
    '70543c7a-987a-41cf-a530-c942f16a3291',
    'No que se refere à interação de seu projeto com a escola e/ou comunidade do entorno, descreva como o seu projeto se relaciona ou interage com ela(s).',
    NULL,
    'texto_longo', true, 4
  ),
  (
    '70543c7a-987a-41cf-a530-c942f16a3291',
    'Quanto ao potencial de escalabilidade, descreva como o seu projeto pode se expandir, assumindo possíveis novas demandas a partir de sua base.',
    NULL,
    'texto_longo', true, 5
  );

-- Verificação
SELECT ordem, pergunta, tipo, obrigatorio, campo_pai_id, valor_condicional
FROM campo_inscricao
WHERE edicao_id = '70543c7a-987a-41cf-a530-c942f16a3291'
ORDER BY ordem;
