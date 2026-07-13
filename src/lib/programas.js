// Registro único de programas do Facitec Conecta.
// Fonte de verdade para: Hub de Programas, rotas /:programa, e filtro de
// dados por `edicao.programa_id` em todas as páginas de M1/M2.
//
// Para ativar um novo programa:
//   1. Marque `ativo: true` abaixo (ele passa a aparecer no Hub e as rotas
//      /:slug, /:slug/selecao e /admin/:slug/:ano/* passam a resolver).
//   2. Cadastre edições em `edicao` com `programa_id` igual ao `programaId`
//      definido aqui.

import pibicJrImg from "@/assets/programas/pibic-jr.jpg"
import proficJrImg from "@/assets/programas/profic-jr.jpg"
import proficJovemImg from "@/assets/programas/profic-jovem.jpg"
import posGraduacaoImg from "@/assets/programas/pos-graduacao.jpg"

export const PROGRAMAS = [
  {
    slug: "pibic-jr",
    programaId: "PIBICJR",
    nome: "PIBIC Jr",
    nomeCompleto: "Programa de Iniciação Científica Júnior",
    publico: "Ensino Fundamental II · 6º ao 9º ano",
    descricao: "Formação científica desde cedo, conectando alunos a orientadores e projetos de pesquisa aplicada.",
    cor: "#534AB7",
    corBg: "#EEEDFE",
    ativo: true,
    // Prefixo curto usado nos códigos gerados (ex: código de bolsista PIBIC26-001-B01).
    codigoPrefixo: "PIBIC",
    // Tamanho máximo da equipe (1 orientador + N bolsistas), conforme o edital do programa.
    maxBolsistas: 8,
    image: pibicJrImg,
  },
  {
    slug: "profic-jr",
    programaId: "PROFICJR",
    nome: "PROFIC Jr",
    nomeCompleto: "Programa de Fomento à Iniciação Científica Jr",
    publico: "Ensino Fundamental I · 1º ao 5º ano",
    descricao: "Estímulo à curiosidade científica nos primeiros anos escolares.",
    cor: "#0F6E56",
    corBg: "#E1F5EE",
    // Ativado em 11/07 — módulo tecnicamente pronto (regras do edital, rubrica
    // de avaliação, documentos, vídeos, data de início da bolsa). Usuário optou
    // por ativar agora mesmo sem ter liberado a plataforma publicamente ainda.
    ativo: true,
    codigoPrefixo: "PROFIC",
    maxBolsistas: 5,
    // Rubrica do edital: cada critério usa uma escala qualitativa fixa de 5 níveis
    // (não notas livres em 0,5) — ver PROMPT_PROFICJR.md, seção 2.
    escalaAvaliacao: [
      { valor: 2.5, label: "Totalmente" },
      { valor: 2.0, label: "Satisfatoriamente" },
      { valor: 1.5, label: "Parcialmente" },
      { valor: 1.0, label: 'De forma um pouco "rasa"' },
      { valor: 0,   label: "Insuficiente" },
    ],
    image: proficJrImg,
  },
  {
    slug: "profic-jovem",
    programaId: "PROFICJOVEM",
    nome: "PROFIC Jovem",
    nomeCompleto: "Programa de Fomento à Iniciação Científica",
    publico: "Ensino Médio · 1º ao 3º ano",
    descricao: "Pesquisa aplicada e inovação para estudantes do ensino médio de Vitória.",
    cor: "#993C1D",
    corBg: "#FAECE7",
    ativo: false,
    codigoPrefixo: "PROFICJOVEM",
    image: proficJovemImg,
  },
  {
    slug: "pos-graduacao",
    programaId: "POSGRADUACAO",
    nome: "Pós-Graduação",
    nomeCompleto: "Programa de Bolsas para Pós-Graduação",
    publico: "Mestrado e Doutorado",
    descricao: "Apoio à pesquisa avançada em parceria com universidades e institutos de pesquisa.",
    cor: "#854F0B",
    corBg: "#FAEEDA",
    ativo: false,
    codigoPrefixo: "POSGRAD",
    image: posGraduacaoImg,
  },
  {
    slug: "projeto-pesquisa",
    programaId: "PROJETOPESQUISA",
    nome: "Projeto de Pesquisa",
    nomeCompleto: "Apoio a Projetos de Pesquisa",
    publico: "Pesquisadores e orientadores",
    descricao: "Apoio direto a projetos de pesquisa, com ou sem estudante bolsista vinculado.",
    cor: "#993556",
    corBg: "#FBEAF0",
    // Categoria só para uso histórico no Acervo (não tem fluxo de edital/
    // inscrição próprio) — por isso ativo:false, mesmo padrão de
    // PROFICJOVEM/POSGRADUACAO antes de irem ao ar.
    ativo: false,
    codigoPrefixo: "PROJPESQ",
    // TODO: trocar por uma imagem própria quando houver — reaproveitando a
    // de Pós-Graduação como placeholder por ora (categoria inativa, não
    // aparece no Hub público, só no seletor de edição legada do Acervo).
    image: posGraduacaoImg,
  },
]

export function getPrograma(slug) {
  return PROGRAMAS.find((p) => p.slug === slug) ?? null
}

// Para telas que só têm o programaId (ex: edicao.programa_id), não o slug da rota —
// caso do portal do avaliador/candidato, que resolve o programa a partir do dado
// carregado (projeto → edicao → programa_id), não da URL.
export function getProgramaByProgramaId(programaId) {
  return PROGRAMAS.find((p) => p.programaId === programaId) ?? null
}

// Tamanho máximo de equipe (1 orientador + N bolsistas) para um programa. Cai em 8
// (padrão histórico do PIBIC Jr) quando o programa ainda não tem o valor confirmado.
export function getMaxBolsistas(programaId) {
  return getProgramaByProgramaId(programaId)?.maxBolsistas ?? 8
}

// Escala qualitativa fixa de avaliação de um programa (5 níveis, ex: PROFIC Jr),
// ou null quando o programa usa notas livres em incrementos de 0,5 (ex: PIBIC Jr).
export function getEscalaAvaliacao(programaId) {
  return getProgramaByProgramaId(programaId)?.escalaAvaliacao ?? null
}

// Gera o prefixo de código usado em bolsistas/contratos (ex: PIBIC26, PROFIC26) a
// partir do programa e ano de referência de uma edição.
export function gerarPrefixoCodigo(edicao) {
  const prefixo = getProgramaByProgramaId(edicao?.programa_id)?.codigoPrefixo ?? "PIBIC"
  const anoCurto = String(edicao?.ano_referencia ?? "2026").slice(-2)
  return `${prefixo}${anoCurto}`
}

// Rota pública do card do Hub. Programas ainda não "ativo" não navegam dali,
// mas continuam acessíveis por URL direta durante o desenvolvimento.
export function rotaPrograma(programa) {
  return programa?.ativo ? `/${programa.slug}` : null
}

export const PROGRAMA_ID_PADRAO = "PIBICJR"
