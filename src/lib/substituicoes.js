// src/lib/substituicoes.js
//
// Contagem de pendências de substituição de bolsista — usada para o
// aviso/contador no menu lateral da Secretaria Executiva. Conta duas coisas
// que precisam de atenção da Secretaria: pedidos de substituição aguardando
// aprovação, e bolsistas substitutos com documentação incompleta (inclusive
// os que entraram pelo fluxo antigo, antes da aprovação da Secretaria
// existir — ver `claude/facitec-conecta-fluxo-substituicao-seguro.md`).
// Ver o painel em src/pages/admin/SubstituicoesPainel.jsx e as funções
// solicitar_substituicao / aprovar_substituicao / recusar_substituicao no
// banco.

import { supabase } from '@/lib/supabase'

function calcIdade(dataNasc) {
  if (!dataNasc) return null
  const hoje = new Date()
  const nasc = new Date(dataNasc)
  let age = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) age--
  return age
}

function isMenor(dataNasc) {
  const idade = calcIdade(dataNasc)
  return idade !== null && idade < 18
}

// Mesma lista de documentos exigidos usada em SubstituicoesPainel.jsx —
// mantida em cada arquivo para simplicidade, mas precisa ficar em
// sincronia (ver Edital 13.5 e-h). doc_anuencia_direcao (Anexo V) fica de
// fora aqui de propósito: é documento de PROJETO, enviado uma única vez no
// início do processo de envio de documentação, e não deve ser cobrado de
// novo de um bolsista substituto (todo bolsista contado por esta função
// veio de `substituicao_bolsista`, ou seja, é sempre um substituto).
const DOCS_BASE_KEYS = ['doc_identidade_aluno', 'doc_declaracao_matricula', 'doc_autorizacao_imagem']
const DOCS_MENOR_KEYS = ['doc_autorizacao_responsavel', 'doc_identidade_responsavel']

function documentacaoCompleta(bolsista) {
  const chaves = isMenor(bolsista.data_nascimento) ? [...DOCS_BASE_KEYS, ...DOCS_MENOR_KEYS] : DOCS_BASE_KEYS
  return chaves.every(k => Boolean(bolsista[k]))
}

export async function contarSolicitacoesSubstituicaoPendentes() {
  const [{ count: pendentes, error: e1 }, { data: subs, error: e2 }] = await Promise.all([
    supabase.from('solicitacao_substituicao').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
    supabase.from('substituicao_bolsista').select('bolsista_entrou_id'),
  ])
  if (e1) throw e1
  if (e2) throw e2

  const idsEntrou = [...new Set((subs ?? []).map(s => s.bolsista_entrou_id).filter(Boolean))]
  let comDocsPendentes = 0
  if (idsEntrou.length > 0) {
    const { data: entrantes, error: e3 } = await supabase
      .from('bolsista')
      .select('data_nascimento, doc_identidade_aluno, doc_declaracao_matricula, doc_anuencia_direcao, doc_autorizacao_imagem, doc_autorizacao_responsavel, doc_identidade_responsavel')
      .in('id', idsEntrou)
      .eq('status', 'ativo')
    if (e3) throw e3
    comDocsPendentes = (entrantes ?? []).filter(b => !documentacaoCompleta(b)).length
  }

  return (pendentes ?? 0) + comDocsPendentes
}
