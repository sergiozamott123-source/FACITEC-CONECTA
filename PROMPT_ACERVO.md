# Prompt: Módulo Acervo (legado) do Facitec Conecta

> Contexto: pedido do usuário via documento "Prompt Facitec Conecta - Acervo
> Histórico.docx" em 12/07. Visão: um módulo que organiza os dados de edições já
> encerradas de todos os programas do FACITEC (PIBIC Jr já tem 2017, 2022, 2023,
> 2024, 2025; a edição 2026 vai virar legado quando encerrar; PROFIC Jr também vai
> acumular legado com o tempo), com capacidade de receber material solto (PDFs,
> planilhas, fotos, vídeos) e permitir que a Secretaria explore essa riqueza de
> dados: projetos apoiados/inscritos, proponentes, orientadores e bolsistas de
> cada edição passada.
>
> Decisões já confirmadas com o usuário:
> 1. **Reaproveitar as tabelas atuais** (`edicao`, `projeto`, `orientador`,
>    `bolsista`) em vez de criar um modelo de dados paralelo só para legado.
>    Edições antigas são simplesmente `edicao.status = 'encerrado'` (valor que já
>    existe e já é suportado em `Edicoes.jsx`).
> 2. **Hoje só existem arquivos soltos** (PDFs, fotos, docs), sem planilha
>    estruturada por trás — a prioridade é ter onde colocar esse material e um
>    cadastro leve dos dados, não uma importação em massa (isso fica pra Fase 2,
>    quando/se os dados forem organizados em planilha).
> 3. **Escopo de hoje: planejar tudo em fases, implementar a base primeiro.**

## 1. O que já existe no repositório (não duplicar)

- `edicao.status` já aceita `'planejado' | 'ativo' | 'encerrado'`
  (`Edicoes.jsx`), e a tela de Edições já lista/edita edições de todos os
  programas de uma vez (`edicaoService.list()` sem filtro).
- O módulo M4 "Legado" já está **previsto como placeholder** em
  `src/pages/PibicJr.jsx` (`buildModulos`): `{ id: "m4", codigo: "M4", nome:
  "Legado", desc: "Edições passadas e incorporação ao acervo", ativo: false,
  rota: null, Icon: Archive }`. Isso confirma que a arquitetura já antecipava
  esse módulo — só falta construir e ligar a rota.
- `Historico.jsx` (`/admin/:programa/:ano/historico`, "Central de Relatórios")
  é um hub de relatórios da **edição ativa atual** (financeiro, classificação,
  relatórios mensais) — não é um arquivo histórico entre anos, é outra coisa,
  não mexer nele além de talvez linkar pro Acervo no futuro.
- Padrão de bucket de storage já estabelecido (`inscricoes`,
  `videos-acompanhamento`) — seguir o mesmo padrão para o bucket novo do Acervo.
- Padrão de registro central de programas (`src/lib/programas.js`) — o Acervo
  deve ser cross-program desde o início (não hardcoded pro PIBIC Jr), usando
  esse registro pra listar programas/filtrar.

## 2. Fase 1 — Base (implementar agora)

### 2.1 Banco de dados

Tabela nova `documento_acervo` — anexo genérico e polimórfico, pra poder pendurar
qualquer arquivo solto em qualquer entidade (edição, projeto, orientador ou
bolsista) sem exigir que o dado estruturado exista primeiro:

```sql
create table documento_acervo (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid references edicao(id),           -- sempre preenchido, pra filtrar por ano/edição fácil
  entidade_tipo text not null,                      -- 'edicao' | 'projeto' | 'orientador' | 'bolsista'
  entidade_id uuid,                                 -- null quando entidade_tipo = 'edicao'
  categoria text not null,                          -- 'foto' | 'video' | 'pdf' | 'planilha' | 'documento' | 'outro'
  nome_arquivo text not null,
  url text not null,
  descricao text,
  criado_em timestamptz default now()
);
```

Bucket de storage novo `acervo` (público, permissivo — mesmo padrão de
`rls_permissive.sql`), aceitando PDF, imagens, vídeo e documentos office, com
limite generoso (recomendo 300MB, mesmo teto do bucket de vídeos).

### 2.2 Tela do Acervo

Nova página, cross-program, algo como `/admin/acervo` (nível Sistema, não dentro
de um programa específico — porque o Acervo precisa mostrar/filtrar por
qualquer programa) ou `/admin/:programa/acervo` se preferir escopado por
programa com um seletor pra trocar. Sugestão: seguir o padrão visual do Hub
"Programas FACITEC", com:

- Lista de edições com `status = 'encerrado'`, agrupadas por programa
  (`src/lib/programas.js`), ordenadas por ano decrescente.
- Ao abrir uma edição: lista de projetos daquela edição, cada um expansível
  mostrando orientador, bolsistas, e os documentos anexados
  (`documento_acervo` filtrado por `entidade_tipo`/`entidade_id`).
- Um componente `AnexarDocumento` reutilizável (upload + categoria + descrição),
  usado tanto no nível de edição quanto de projeto/orientador/bolsista.

### 2.3 Cadastro rápido de dados legados

Formulário leve de "Cadastrar edição legada" / "Cadastrar projeto legado" —
**não** deve reusar o fluxo de inscrição/seleção da edição ativa (não faz
sentido pedir avaliação, critérios, recursos etc. pra um projeto de 2017). Só
os campos essenciais:

- Edição: programa, ano, status já fixo em `'encerrado'`.
- Projeto: título, orientador (nome/e-mail/dados básicos), lista de bolsistas
  (nome, tipo).
- Sem obrigatoriedade de CPF/documentos/critérios — esses dados muitas vezes
  não existem mais para edições antigas. Tudo opcional exceto o mínimo (nome).

### 2.4 Ligar o M4 "Legado"

Em `src/pages/PibicJr.jsx` (usado tanto por `/pibic-jr` quanto `/profic-jr`):
trocar o módulo M4 pra `ativo: true`, `rota: /admin/acervo` (ou a rota
escolhida acima), mantendo o mesmo cartão visual já desenhado.

## 3. Fase 2 — depois que os dados estiverem organizados (não fazer agora)

- Importação em massa via planilha (Excel/CSV) de projetos/bolsistas
  históricos, no mesmo espírito do que já existe em `src/lib/importacao.js`
  para avaliações — mas para dados de projeto/equipe completos.
- OCR ou extração automática de dados a partir de PDFs antigos, se fizer
  sentido no futuro.
- Automatizar a transição de uma edição ativa pra "legado" quando ela for
  formalmente encerrada (hoje isso seria só trocar `status` manualmente em
  Edições — está OK deixar manual por enquanto).

## 4. Perguntas em aberto para o usuário (não travam a Fase 1, mas avisar)

- O Acervo deve ser visível/pesquisável só pela Secretaria (admin), ou também
  deve ter alguma vitrine pública (ex: "projetos que já passaram pelo FACITEC")
  no portal público? A minuta não deixou isso claro — assumi "só admin" pra
  Fase 1.
- Quando um bolsista/orientador de uma edição legada tiver documentos
  sensíveis (CPF, RG), aplicar o mesmo padrão de bucket público-mas-sem-URL-
  adivinhável já usado hoje, ou isso precisa de mais cuidado por serem dados
  de anos diferentes, possivelmente já publicados em outros lugares? Assumi
  mesmo padrão atual (permissivo) para não travar a Fase 1 — revisar depois
  se o volume de dados sensíveis for grande.
