# Prompt: Acervo Inteligente — redesenho do módulo Acervo

> Este documento **substitui a visão** descrita em `PROMPT_ACERVO.md` (12/07).
> A Fase 1 ali documentada tratava o Acervo como um cofre passivo (você sobe
> o PDF pronto, ele fica lá). A visão confirmada com o usuário em 13/07 é
> mais ambiciosa: o Acervo deve ser um **repositório inteligente** — você sobe
> material bruto (planilha, PDF, Word) e o sistema organiza sozinho em
> registros estruturados, servindo como fonte de consulta permanente da
> Secretaria Executiva. As decisões de modelo de dados da Fase 1 (reaproveitar
> `edicao`/`projeto`/`orientador`/`bolsista`, tabela `documento_acervo`
> polimórfica) continuam válidas — o que muda é a navegação e a adição de uma
> camada de IA.

## Decisões confirmadas com o usuário (13/07)

1. **Importação de planilha**: a IA lê o arquivo e monta uma **pré-visualização
   editável** — o usuário revisa/corrige campo a campo antes de confirmar e
   gravar. Nunca grava direto sem revisão humana.
2. **Documentos soltos** (PDF de contrato, ficha, projeto): a IA tenta
   identificar sozinha a quem/qual projeto pertence pelo conteúdo do arquivo
   (nome, CPF, título) e já vincula automaticamente. Casos de baixa confiança
   ficam sinalizados para revisão manual (ver mockup — badge amarelo "checar").
3. **Posição na Home**: o Acervo fica em área própria, separada dos cards de
   programa (PIBIC Jr, PROFIC Jr) — ele não tem "edição ativa" própria, é uma
   ferramenta que atravessa todos os programas. Mas deve ter destaque visual
   na Home, não ficar escondido só no menu lateral.
4. **Ordem de construção**: primeiro a estrutura de navegação (Fase A, sem
   IA — já testável), depois a importação inteligente (Fase B).

## Ampliação de escopo confirmada com o usuário (13/07, durante o teste da edição 2017)

O Acervo não fica restrito a PIBIC Jr/PROFIC Jr — o FACITEC já apoiou outras
modalidades no passado (Pós-Graduação — Mestrado/Doutorado — e Projetos de
Pesquisa avulsos, sem bolsista de iniciação científica), e esses dados também
devem entrar no Acervo. Decisões:

- **"Projeto de Pesquisa"** já foi adicionado ao registro central
  (`src/lib/programas.js`, `programaId: "PROJETOPESQUISA"`, `ativo: false` —
  categoria só para uso histórico no Acervo, sem fluxo de edital próprio).
  Pode existir **sem bolsista nenhum** (só orientador/pesquisador) — isso já
  funciona sem mudança de código, porque o cadastro de projeto legado já
  ignora linhas de bolsista em branco.
- **Doutorado e Mestrado continuam juntos** sob a categoria já existente
  "Pós-Graduação" (`POSGRADUACAO`) — decisão confirmada de não separar.
- **Pendência**: a imagem usada para `PROJETOPESQUISA` é um placeholder
  (reaproveita `posGraduacaoImg`) — trocar por uma imagem própria quando
  houver uma disponível. Não bloqueia nada porque a categoria é `ativo:
  false` e não aparece no Hub público, só no seletor de edição legada do
  Acervo.
- Nenhuma mudança de schema foi necessária para essa ampliação — o desenho
  original (edição → projeto → orientador/bolsista, tudo escopado por
  `edicao.programa_id`) já era genérico o suficiente para absorver categorias
  novas só com uma entrada a mais no registro de programas.



- Tabela `documento_acervo` (polimórfica: `entidade_tipo` + `entidade_id`) e
  bucket `acervo` — já criados via `supabase/acervo_setup.sql`, já rodado
  pelo usuário em produção. **Não recriar.**
- `edicao.status = 'encerrado'` já é o marcador de edição legada, usado em
  `Edicoes.jsx`. **Não criar novo campo/tabela para isso.**
- `src/pages/admin/Acervo.jsx` (lista de edições encerradas + modal de
  cadastro de edição legada) e `src/pages/admin/AcervoEdicao.jsx` (accordion
  de projetos com documentos) já implementam boa parte da Fase 1 — a Fase A
  abaixo **reestrutura a navegação dessas telas**, não descarta o código:
  os componentes `AnexarDocumento` e `ListaDocumentos`
  (`src/components/acervo/`) continuam sendo a peça de upload/listagem,
  só passam a ser usados dentro de páginas por entidade em vez de um
  accordion único.
- Módulo M4 "Legado" já está `ativo: true` apontando pra `/admin/acervo`
  (`src/pages/PibicJr.jsx`) — mantém, é a porta de entrada vinda de dentro
  de um programa.
- Padrão de Edge Function chamando a API Anthropic já existe (função
  `gerar-parecer-recurso`) — usar como referência de autenticação/estrutura
  para as funções novas da Fase B.

## Fase A — reestruturação da navegação (fazer agora)

### A.1 Card na Home

Em `src/pages/admin/HomeAdmin.jsx`: abaixo da grade de cards de programa,
nova seção `Ferramentas` (ou título equivalente) com um card "Acervo" no
mesmo estilo visual dos `ProgramaCard` (mesmo componente ou uma variante),
mas sem badge "ativo/em breve" — leva direto para `/admin/acervo`. Não entra
na grade `PROGRAMAS_CONFIG` (que é reservada a programas de verdade com
`edicao.programa_id`).

### A.2 Estrutura de rotas

Reorganizar `/admin/acervo` para o padrão de navegação por edição, análogo ao
que já existe pra programas (`/admin/:programa/:ano/...`), mas para edições
legadas de qualquer programa:

- `/admin/acervo` — tela atual de `Acervo.jsx`: lista de edições encerradas
  agrupadas por programa + cadastro de edição legada. Mantém como está.
- `/admin/acervo/:edicaoId` — **nova tela "shell"** com menu lateral próprio
  (reaproveitar visualmente o padrão de `Sidebar.jsx`, categoria "Registros"):
  Projetos, Orientadores, Bolsistas Jr, Inscritos. Cada item leva a uma
  sub-rota:
  - `/admin/acervo/:edicaoId/projetos`
  - `/admin/acervo/:edicaoId/orientadores`
  - `/admin/acervo/:edicaoId/bolsistas`
  - `/admin/acervo/:edicaoId/inscritos`
- A rota antiga `/admin/acervo/:edicaoId` (accordion único de
  `AcervoEdicao.jsx`) pode virar redirect para
  `/admin/acervo/:edicaoId/projetos` (primeira aba por padrão).

### A.3 Páginas por entidade

Cada uma das quatro páginas segue o mesmo padrão:

- Busca os registros da entidade filtrados por `edicao_id` (reaproveitar
  `orientadorService.list(edicaoId)`, `bolsistaService.list(edicaoId)` — já
  aceitam esse filtro, ver `src/lib/db.js`; criar equivalente pra `projeto`
  e pra "inscritos" se ainda não existir um service pronto).
- Lista em tabela: nome/título + coluna "Documentos" com ícone de download
  quando há `documento_acervo` vinculado àquele registro (`entidade_tipo` +
  `entidade_id`), texto "—" quando não há.
- Botão "Anexar documento" por linha, reaproveitando o componente
  `AnexarDocumento` já existente.
- Botão "Novo [projeto/orientador/bolsista] legado" no topo, reaproveitando
  os modais leves já existentes em `Acervo.jsx`/`AcervoEdicao.jsx` (só nome
  obrigatório, sem CPF/critérios que não existem pra dado antigo).
- "Inscritos" é a única entidade nova: projetos/pessoas que se inscreveram
  mas não foram selecionados naquela edição legada — mesmo modelo de cadastro
  leve, usando `projeto`/`orientador` com um campo ou status que os distinga
  dos selecionados (ex.: reaproveitar `bolsista.status` ou
  `orientador.status` se já existir um valor equivalente a "não selecionado";
  confirmar com o usuário antes de inventar um novo enum).

### A.4 O que NÃO fazer na Fase A

- Não implementar nenhuma chamada de IA ainda — upload continua manual,
  sem parsing automático. Isso é Fase B.
- Não mexer no `documento_acervo` nem no bucket `acervo` — schema já está
  pronto e correto para o que a Fase A precisa.

## Fase B — importação inteligente (desenhar aqui, construir depois)

Não implementar ainda nesta rodada — mas a Fase A deve deixar a estrutura de
dados/rotas pronta para plugar isto sem retrabalho.

### B.1 Importação de planilha (upload → pré-visualização → confirmar)

- Nova Edge Function `acervo-importar-planilha`: recebe o arquivo (csv/xlsx
  convertido para texto/JSON no frontend antes do envio, ex. via `xlsx`/
  SheetJS, já usado em `Central de relatórios`), o tipo de entidade alvo
  (`orientador`/`bolsista`/`projeto`/`inscrito`) e o `edicao_id`. Chama a API
  Anthropic com um prompt que descreve o schema esperado de cada campo e pede
  retorno em JSON estrito (ver `<anthropic_api_in_artifacts>` /
  `structured_outputs_in_xml` como referência de como forçar JSON puro).
  Devolve um array de linhas, cada uma com os campos extraídos e um
  `confianca: "ok" | "checar"` por campo ou por linha (linha inteira "checar"
  quando algum dado essencial não foi identificado, ex. projeto sem
  orientador correspondente).
- Frontend: modal "Importar planilha" com 3 passos — (1) escolher arquivo,
  (2) tabela de pré-visualização editável (inputs inline, como no mockup
  aprovado — campos com problema em destaque visual `warning`), (3) botão
  "Confirmar e salvar" que faz o insert em lote na tabela correspondente,
  sempre com `edicao_id` da edição legada aberta.
- Nunca gravar sem esse passo de revisão — mesmo se a IA tiver 100% de
  confiança em tudo, a pré-visualização aparece sempre.

### B.2 Identificação automática de documento solto

- Nova Edge Function `acervo-identificar-documento`: recebe o arquivo (PDF/
  imagem, base64) e a lista de candidatos daquela edição (orientadores/
  projetos/bolsistas já cadastrados, com nome e CPF quando existir). Chama a
  API Anthropic com o documento anexado (`type: document`, ver
  `<handling_files>`) pedindo para identificar de qual candidato se trata e
  com que confiança.
- Se confiança alta: vincula automaticamente (`entidade_tipo`/`entidade_id`
  preenchidos) e mostra um toast "Vinculado a [nome] automaticamente —
  desfazer" com opção de corrigir.
- Se confiança baixa/nenhum candidato bate: cai no fluxo manual atual
  (`AnexarDocumento` pede pra escolher a entidade na hora).

## Perguntas em aberto (não travam a Fase A, avisar antes da Fase B)

- Como representar "Inscritos" (não selecionados) nas tabelas atuais —
  reaproveitar um status existente ou introduzir um novo campo? Confirmar
  antes de implementar A.3 para essa aba especificamente.
- Custo/volume: a Fase B faz uma chamada à API Anthropic por
  upload — para arquivos grandes (planilhas de centenas de linhas) avaliar
  se processa tudo de uma vez ou em lotes.
