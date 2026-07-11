# Prompt: Finalizar o módulo PROFIC Jr no Facitec Conecta

> Contexto para quem for executar: a fundação multiprograma (rotas `/admin/:programa/:ano/...`,
> `src/lib/programas.js`, `AdminContext` filtrando por `programa_id`) já existe no repositório.
> Este prompt cobre o que falta para o PROFIC Jr — regras de negócio do edital real e lacunas
> técnicas confirmadas por leitura direta do código, não por suposição.

## 1. O que é o PROFIC Jr (fonte: minuta do Edital FACITEC PROFICJR/2026)

- Público: alunos do **Ensino Fundamental I (1º ao 5º ano)** da rede pública municipal de
  Vitória-ES. Orientador: profissional do quadro de Magistério da rede municipal (escola ou
  Centro de Ciência, Educação e Cultura da SEME), com nível superior.
- **10 projetos selecionados.** Cada equipe: **1 orientador + 5 estudantes bolsistas**
  (diferente do PIBIC Jr, que é 1+8 — não copiar esse valor).
- Bolsas: orientador **R$ 800,00/mês**, bolsista **R$ 200,00/mês**, 6 parcelas mensais
  sucessivas. Valor global do edital: **R$ 108.000,00** (10 × R$1.800 × 6 meses — confere).
- Vigência do projeto: 6 meses a partir da assinatura do contrato. **Seleção ocorre em 2026,
  mas o pagamento das bolsas só começa a partir da abertura do calendário letivo de 2027**
  (confirmar com o usuário como isso deve ser representado na `edicao` — provavelmente
  `data_inicio`/`data_termino` da edição em 2026 para seleção, mas `data_inicio` do *contrato/
  bolsa* em 2027; ver seção 5).
- Conta bancária do bolsista é aberta **em nome do representante legal** (todo estudante é
  menor, diferente do PIBIC Jr onde isso é condicional por idade).
- Frequência mínima do bolsista: 75% mensal. Substituição de bolsista: até 3 por projeto,
  sem anuência do substituído até o fim do 3º mês. Substituição de orientador: permitida,
  mediante aprovação do Comitê de Acompanhamento.
- **Dois vídeos de acompanhamento** por projeto: um ao final do 3º mês/ciclo, outro ao
  final do 5º mês/ciclo — mostrando o protagonismo dos alunos. Isso não existe hoje no
  fluxo do PIBIC Jr.
- **Encerramento com exposição pública**: os grupos expõem os protótipos; um Comitê
  (CDTIV + SEME) avalia por 4 critérios (qualidade do protótipo, qualidade visual da
  apresentação, organização/desenvoltura da equipe, organização do estande) e premia com
  **selos Ouro/Prata/Bronze** por escola. Também não existe hoje.
- Entrega final: protótipo funcional + relatório final em até 60 dias após o encerramento.

## 2. Critérios de avaliação da seleção — diferentes do PIBIC Jr

Rubrica específica para a faixa etária (Fundamental I), **não** usar os critérios de mérito
científico do PIBIC Jr. São 4 critérios, 2,5 pontos cada, total 10:

| Item | Critério | Pontuação |
|---|---|---|
| I | Curiosidade e conexão com a realidade da criança | 2,5 |
| II | Adequação da proposta à faixa etária | 2,5 |
| III | Papel do mediador e exequibilidade lúdica | 2,5 |
| IV | Criatividade na forma de explorar e comunicar | 2,5 |

Cada critério usa uma escala qualitativa fixa (não numérica livre):
`Totalmente = 2,5 | Satisfatoriamente = 2,0 | Parcialmente = 1,5 | De forma um pouco "rasa" = 1,0 | Insuficiente = 0`.

Desempate, nesta ordem: critério I → II → III → IV → decisão do Presidente do CMCT.

Ação técnica: cadastrar esses 4 registros em `criterio_avaliacao` vinculados à edição do
PROFICJR (a tabela já suporta `nota_maxima` e `ordem` por critério — confirmar se também
comporta a escala qualitativa de 5 níveis por extenso, ou se isso fica só como texto de apoio
ao avaliador na UI, sem mudar o schema).

## 3. Documentos exigidos — o que já existe vs. o que falta

Já existem como campos de upload (`DOCS_BASE`/`DOCS_MENOR` em `SuperpainelM2.jsx`,
`doc_diploma` no orientador): identidade do aluno, declaração de matrícula, anuência da
direção, autorização de imagem, autorização do responsável, identidade do responsável,
diploma do orientador.

Confirmar se já existem ou precisam ser criados:
- "Declaração de Regularidade junto ao FACITEC" (item 13.5.k do edital) — não encontrei
  campo equivalente no código revisado.
- Upload dos 2 vídeos de acompanhamento (mês 3 e mês 5) — não existe hoje.
- Como `isMenor(data_nascimento)` decide DOCS_MENOR: para o PROFIC Jr isso deveria ser
  sempre verdadeiro (Fundamental I = sempre menor), então provavelmente não precisa mudar
  nada aqui, mas vale um teste manual pra confirmar que a idade de um aluno do 1º-5º ano
  sempre cai no critério de "menor" usado pela função.

## 4. Lacunas técnicas confirmadas (independem do conteúdo do edital)

Verificadas por leitura direta do código nesta sessão, não pelo relatório da outra sessão:

1. **`src/pages/admin/ConvocacaoRecurso.jsx` não filtra por edição/programa** — busca todos
   os registros de `recurso` do banco. Mesmo com a rota generalizada para
   `/admin/:programa/:ano/recursos`, essa tela vai misturar recursos do PIBIC Jr com os do
   PROFIC Jr. Corrigir com o mesmo padrão de seletor de edição já usado em
   `Classificacao.jsx`, antes do PROFIC Jr ter recursos de verdade.
2. **Portal do Orientador ainda gera código com prefixo fixo `PIBIC26-`** em vez de usar
   `codigoPrefixo` de `src/lib/programas.js` (que já tem `PROFIC` cadastrado para o
   `profic-jr`). Localizar onde esse código é gerado (busca por `PIBIC26` no portal do
   orientador) e trocar para usar o registro central.
3. Confirmar se o tamanho de equipe (1 orientador + N bolsistas) está hardcoded em algum
   lugar assumindo N=8 (herdado do PIBIC Jr) — se estiver, parametrizar por programa/edição
   em vez de fixo, já que o PROFIC Jr usa N=5.

## 5. Checklist de ativação (fazer por último, depois do conteúdo acima)

1. Criar a `edicao` real com `programa_id = 'PROFICJR'`, `ano_referencia`, `numero_edital`,
   valores e datas do edital publicado (as datas de cronograma, número do edital e tema
   central ainda estão em branco na minuta — pegar com o usuário quando o edital for
   publicado oficialmente).
2. Decidir e implementar como representar a divisão "seleção em 2026 / pagamento a partir
   de 2027" — provavelmente duas datas diferentes (uma para o processo seletivo, outra para
   início da vigência financeira do contrato). Confirmar com o usuário antes de assumir um
   modelo de dados para isso.
3. Cadastrar os 4 critérios de avaliação (seção 2).
4. Marcar `ativo: true` no registro do `profic-jr` em `src/lib/programas.js` só quando o
   conteúdo acima estiver pronto e testado — isso é o que faz o card aparecer no Hub público.
5. Testar o fluxo ponta a ponta com uma edição de teste antes de tornar público (inscrição →
   avaliação com a rubrica nova → classificação → recurso → contrato com equipe de 1+5 →
   relatório mensal → vídeos de acompanhamento) antes de ativar de verdade.

## 6. Coisas que a minuta deixa em aberto — não travam a implementação, mas avisar o usuário

- Tema central do edital (item 9) ainda não definido.
- Datas do cronograma (item 13) todas em branco.
- Número do edital, número da Resolução do CMCT, e número exato de bolsas (a minuta usa
  "xxx" onde os valores 10 projetos / 1+5 equipe já foram confirmados fora da minuta).

## 7. Tela inicial da Secretaria Executiva — "Programas FACITEC" primeiro

Pedido do usuário (documento IDEIA.docx), verificado direto no código em 11/07:

- **`src/pages/LoginSecretaria.jsx` ainda navega direto para
  `/admin/pibic-jr/2026/painel`** (hardcoded) após o login. Trocar para navegar para `/admin`
  (a tela "Programas FACITEC", `HomeAdmin.jsx`), que já existe e já lista todos os programas
  (ativos ou "em breve") a partir do registro central `src/lib/programas.js`.
- `HomeAdmin.jsx` está com fundo branco simples. O usuário quer visual mais "imponente":
  foto de Vitória sombreada ao fundo (mesmo tratamento que `HubProgramas.jsx`, a tela pública
  do Hub, já usa).
- Decisão confirmada com o usuário: ao clicar no card de um programa, se houver **apenas uma
  edição ativa**, navegar direto para o painel dela (pular o passo de expandir a lista de
  edições e clicar em "Acessar painel"). Só mostrar a lista de edições quando houver mais de
  uma.
- `HomeAdmin.jsx` hoje só busca edições do PIBIC Jr (`edicoesPibic`, filtrando
  `programa_id === 'PIBICJR'` com fallback). Generalizar para qualquer programa ativo do
  registro central, não só PIBIC Jr — necessário para o PROFIC Jr aparecer com edições reais
  quando for ativado.
- Nota técnica: `AdminContext` hoje é escopado a um único `programaId` resolvido a partir da
  URL (`Layout.jsx`). Na rota `/admin` (antes de escolher programa) ele cai no padrão
  `PIBICJR`. Para `HomeAdmin.jsx` mostrar contagem de edições de todos os programas ao mesmo
  tempo, provavelmente precisa buscar `edicoes` sem o filtro de `AdminContext`, direto via
  `edicaoService.list()` sem argumento (retorna todas) e agrupar por `programa_id` no
  componente.
- Itens do documento que **já estão corrigidos no código atual** (não fazer de novo — só
  confirmar depois do deploy): título "Secretaria executiva" (não mais "Secretariado"),
  "Esqueci minha senha" (não mais "Escique"), colunas corretas na tela de Classificação
  (não mais o texto de teste "Às vezes, ele é um dos seus maiores talentos" — isso indica
  que era um valor de teste salvo em algum `criterio_avaliacao.nome`, já removido/corrigido).
  Os prints do usuário parecem ser do site publicado no Vercel, que está atrás do código
  local — vale confirmar com um novo deploy antes de investigar mais.
