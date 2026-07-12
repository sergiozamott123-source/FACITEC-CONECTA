# Prompt: Ação formal de seleção final (M1 → M2)

> Contexto: descoberto durante o teste ponta a ponta do PROFIC Jr em 12/07. Afeta os
> dois programas (PIBIC Jr e PROFIC Jr), não é específico de nenhum. Até hoje, essa
> etapa vem sendo feita manualmente direto no banco (Supabase SQL Editor), inclusive
> para o PIBIC Jr em produção.

## 1. O problema, confirmado por leitura direta do código

Depois que a fase de recursos se encerra, os projetos mais bem classificados (dentro
do número de vagas do edital) deveriam virar oficialmente "selecionados" — isso é o
que libera o orientador para montar a equipe de bolsistas (`/orientador/equipe`) e a
Secretaria para gerar o contrato (`/admin/:programa/:ano/m2`).

Busquei no código inteiro por qualquer lugar que grave esses dois campos e **não
encontrei nenhum**:

- `projeto.status = 'selecionado'` — só é **lido** (badges em `Classificacao.jsx`,
  filtro em `PortalOrientadorContext.jsx` linha 58 que decide se o orientador tem um
  projeto ativo, filtro em `SuperpainelM2.jsx`/`ContratosPainel.jsx`).
- `orientador.codigo_orientador` — só é **lido** (`SuperpainelM2.jsx` linha 339 só
  lista orientadores com esse campo preenchido; `GerenciarUsuariosOrientadores.jsx`
  também filtra por ele; gerador de código de bolsista depende dele:
  `` `${gerarPrefixoCodigo(edicao)}-${numOr}-${tipoCod}${seq}` ``, onde `numOr` vem de
  `codigo_orientador.split('-')[1]`).

Sem essas duas gravações, um projeto aprovado fica com o portal do orientador
mostrando `projeto = null` (equipe trava em "0 de 8" — fallback de
`getMaxBolsistas(undefined)` — e uploads não funcionam, pois
`OrientadorEquipe.jsx`/`OrientadorBolsistas.jsx` checam `if (!projeto) return`), e o
orientador nem aparece no Superpainel M2 da Secretaria.

`VAGAS = 10` também está hardcoded em `Classificacao.jsx` linha 9 (mesmo padrão de
risco do antigo `maxBolsistas = 8` fixo) — coincide com o número do PROFIC Jr, mas
não deveria depender de coincidência.

## 2. O que construir

Uma ação de "Confirmar seleção final", provavelmente como um botão em
`Classificacao.jsx` (ou uma tela nova pós-recursos, se fizer mais sentido
separar), que:

1. Busca os projetos da edição ordenados por nota final (mesma lógica de
   ranking já usada na tela).
2. Marca os top N (N = vagas do edital) como `status = 'selecionado'`.
3. Marca os demais (ou um grupo de reserva, se o edital previr) como
   `status = 'reserva'`.
4. Para cada projeto selecionado, busca o `orientador_id` e atribui
   `codigo_orientador` no formato `` `${gerarPrefixoCodigo(edicao)}-${seq}` ``
   (ex: `PROFIC26-001`), sequencial por ordem de classificação — usar o helper já
   existente em `src/lib/programas.js`.
5. Parametrizar `VAGAS`: hoje é fixo em 10 no código; decidir se vira um campo em
   `edicao` (ex: `edicao.numero_vagas`) ou no registro de `src/lib/programas.js`
   (mais parecido com `maxBolsistas`). Recomendo `edicao.numero_vagas` porque o
   número de vagas pode mudar entre edições do mesmo programa.

## 3. Cuidados de segurança/idempotência

- A ação é consequente (afeta quem pode gerar contrato) — precisa de confirmação
  explícita antes de executar (modal "Tem certeza?"), não deve rodar sem clique
  deliberado.
- Rodar duas vezes não deve duplicar nem sobrescrever `codigo_orientador` de quem
  já tem um atribuído — checar antes de gravar.
- Considerar bloquear/avisar se ainda houver recursos em aberto (`status` de
  recurso diferente de `respondido`/`decidido`) para a edição, já que a seleção
  final só deveria acontecer depois que a fase de recursos estiver de fato
  encerrada.
- Deixar registrado (log simples, ou um campo `data_selecao_final` na `edicao`)
  quando essa ação foi executada, pra não ficar sem rastro de quando/quem confirmou.

## 4. Contexto de teste já feito

Para desbloquear o teste ponta a ponta do PROFIC Jr em 12/07, os dois campos foram
setados manualmente via SQL para o projeto de teste (`PROFICJr2026-0001`,
orientador `teste.proficjr@exemplo.com`) — isso confirma exatamente o
comportamento esperado depois que essa ação existir: o portal do orientador passou
a reconhecer `projeto` corretamente (`getMaxBolsistas` retornou 5, uploads
funcionaram) e o orientador passou a aparecer no Superpainel M2.
