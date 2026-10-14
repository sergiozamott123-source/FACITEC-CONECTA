// src/lib/cnd.js
//
// Upload e acompanhamento de vencimento das Certidões Negativas de Débito
// (CND) dos beneficiários pagáveis do PibicJr.
//
// Tudo abaixo de "── Gestão de CNDs" foi acrescentado em 14/10/2026 para a
// tela própria de Gestão de CNDs (upload avulso ou em lote, com leitura
// automática do PDF) — nada do que já existia acima foi alterado.

import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { supabase } from '@/lib/supabase'
import { listarBeneficiariosPagaveis } from '@/lib/pagamentos'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

const BUCKET = 'inscricoes'

export async function uploadCnd({ beneficiarioTipo, beneficiarioId, cpf, file, dataValidade }) {
  const path = `cnd/${beneficiarioTipo}-${beneficiarioId}-${Date.now()}.pdf`
  const { error: eUpload } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf' })
  if (eUpload) throw eUpload

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const payload = {
    beneficiario_tipo: beneficiarioTipo,
    orientador_id: beneficiarioTipo === 'orientador' ? beneficiarioId : null,
    bolsista_id: beneficiarioTipo === 'bolsista' ? beneficiarioId : null,
    cpf,
    arquivo_url: publicUrl,
    nome_arquivo: file.name,
    data_validade: dataValidade,
  }

  const { data, error } = await supabase.from('cnd_documento').insert(payload).select().single()
  if (error) throw error
  return data
}

function diasEntre(dataA, dataB) {
  const msPorDia = 1000 * 60 * 60 * 24
  return Math.ceil((new Date(dataA) - new Date(dataB)) / msPorDia)
}

// Beneficiários pagáveis cuja CND vigente mais recente vence em até
// `diasAntecedencia` dias, ou que nunca tiveram CND cadastrada (tratada
// como "vencida").
export async function listarCndVencendoEmBreve(edicaoId, diasAntecedencia = 15) {
  const beneficiarios = await listarBeneficiariosPagaveis(edicaoId)
  if (!beneficiarios.length) return []

  const orientadorIds = beneficiarios.filter(b => b.beneficiario_tipo === 'orientador').map(b => b.id)
  const bolsistaIds = beneficiarios.filter(b => b.beneficiario_tipo === 'bolsista').map(b => b.id)

  const [{ data: docsOrientador, error: e1 }, { data: docsBolsista, error: e2 }] = await Promise.all([
    orientadorIds.length
      ? supabase.from('cnd_documento').select('orientador_id, data_validade').in('orientador_id', orientadorIds)
      : Promise.resolve({ data: [], error: null }),
    bolsistaIds.length
      ? supabase.from('cnd_documento').select('bolsista_id, data_validade').in('bolsista_id', bolsistaIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (e1) throw e1
  if (e2) throw e2

  const validadeMaisRecente = new Map()
  for (const doc of docsOrientador ?? []) {
    const atual = validadeMaisRecente.get(`orientador:${doc.orientador_id}`)
    if (!atual || doc.data_validade > atual) validadeMaisRecente.set(`orientador:${doc.orientador_id}`, doc.data_validade)
  }
  for (const doc of docsBolsista ?? []) {
    const atual = validadeMaisRecente.get(`bolsista:${doc.bolsista_id}`)
    if (!atual || doc.data_validade > atual) validadeMaisRecente.set(`bolsista:${doc.bolsista_id}`, doc.data_validade)
  }

  const hoje = new Date().toISOString().slice(0, 10)
  const resultado = []

  for (const beneficiario of beneficiarios) {
    const dataValidade = validadeMaisRecente.get(`${beneficiario.beneficiario_tipo}:${beneficiario.id}`) ?? null
    const diasParaVencer = dataValidade ? diasEntre(dataValidade, hoje) : null
    const vencida = !dataValidade || diasParaVencer < 0
    const vencendoEmBreve = vencida || diasParaVencer <= diasAntecedencia

    if (vencendoEmBreve) {
      resultado.push({
        beneficiario_tipo: beneficiario.beneficiario_tipo,
        id: beneficiario.id,
        nome: beneficiario.nome,
        data_validade: dataValidade,
        dias_para_vencer: diasParaVencer,
        vencida,
      })
    }
  }

  return resultado
}

// ── Gestão de CNDs (14/10/2026) ─────────────────────────────────────────────

// Todos os beneficiários pagáveis com a situação da CND de cada um — a
// mesma lógica de `listarCndVencendoEmBreve` acima, só que sem o filtro:
// aqui entra todo mundo, não só quem está vencendo. Usado pela tela
// "Gestão de CNDs" (tabela completa + upload avulso ou em lote).
export async function listarTodosComCnd(edicaoId) {
  const beneficiarios = await listarBeneficiariosPagaveis(edicaoId)
  if (!beneficiarios.length) return []

  const orientadorIds = beneficiarios.filter(b => b.beneficiario_tipo === 'orientador').map(b => b.id)
  const bolsistaIds = beneficiarios.filter(b => b.beneficiario_tipo === 'bolsista').map(b => b.id)

  const [{ data: docsOrientador, error: e1 }, { data: docsBolsista, error: e2 }] = await Promise.all([
    orientadorIds.length
      ? supabase.from('cnd_documento').select('orientador_id, data_validade, arquivo_url').in('orientador_id', orientadorIds)
      : Promise.resolve({ data: [], error: null }),
    bolsistaIds.length
      ? supabase.from('cnd_documento').select('bolsista_id, data_validade, arquivo_url').in('bolsista_id', bolsistaIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (e1) throw e1
  if (e2) throw e2

  const maisRecentePorChave = new Map()
  function considerar(chave, doc) {
    const atual = maisRecentePorChave.get(chave)
    if (!atual || doc.data_validade > atual.data_validade) maisRecentePorChave.set(chave, doc)
  }
  for (const doc of docsOrientador ?? []) considerar(`orientador:${doc.orientador_id}`, doc)
  for (const doc of docsBolsista ?? []) considerar(`bolsista:${doc.bolsista_id}`, doc)

  const hoje = new Date().toISOString().slice(0, 10)

  return beneficiarios.map(beneficiario => {
    const doc = maisRecentePorChave.get(`${beneficiario.beneficiario_tipo}:${beneficiario.id}`) ?? null
    const dataValidade = doc?.data_validade ?? null
    const diasParaVencer = dataValidade ? diasEntre(dataValidade, hoje) : null
    const vencida = !dataValidade || diasParaVencer < 0
    return {
      beneficiario_tipo: beneficiario.beneficiario_tipo,
      id: beneficiario.id,
      nome: beneficiario.nome,
      cpf: beneficiario.cpf,
      data_validade: dataValidade,
      dias_para_vencer: diasParaVencer,
      vencida,
      arquivo_url: doc?.arquivo_url ?? null,
    }
  })
}

// Depois de gravar uma CND nova, libera (cnd_status = 'regular') qualquer
// pagamento desse beneficiário, nesta edição, que ainda esteja com status
// 'pendente' (ou seja, ainda não enviado à DAF) e retido por CND — mesmo
// efeito que marcar "Conferir CND → Regular" manualmente no Financeiro, só
// que automático depois do upload. Pagamentos já 'solicitado'/'pago' nunca
// são tocados (não precisam: a tela de Financeiro nem olha mais o
// cnd_status deles nesse ponto).
export async function liberarCndPagamentosPendentes(edicaoId, beneficiarioTipo, beneficiarioId) {
  const campo = beneficiarioTipo === 'orientador' ? 'orientador_id' : 'bolsista_id'
  const { data, error } = await supabase
    .from('pagamento')
    .update({ cnd_status: 'regular', cnd_verificado_em: new Date().toISOString() })
    .eq('edicao_id', edicaoId)
    .eq('beneficiario_tipo', beneficiarioTipo)
    .eq(campo, beneficiarioId)
    .eq('status', 'pendente')
    .neq('cnd_status', 'regular')
    .select('id')
  if (error) throw error
  return data ?? []
}

// Lê o texto de todas as páginas de um PDF (File do input/drag-and-drop) —
// mesma biblioteca (pdfjs-dist) já usada em lib/documentoImagem.js, só que
// aqui extraindo texto em vez de desenhar a página num canvas. Funciona bem
// para CNDs emitidas digitalmente (o caso normal, direto do site da Receita
// Federal); um PDF escaneado/foto não tem texto para ler — devolve string
// vazia nesse caso, tratado como "não identificado" por quem chama.
export async function extrairTextoPdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let texto = ''
  const totalPaginas = Math.min(pdf.numPages, 3)
  for (let i = 1; i <= totalPaginas; i++) {
    const page = await pdf.getPage(i)
    const conteudo = await page.getTextContent()
    texto += conteudo.items.map(item => item.str).join(' ') + ' '
  }
  return texto
}

function normalizarCpf(cpf) {
  return (cpf ?? '').replace(/\D/g, '')
}

// Procura, dentro do texto lido do PDF, qual beneficiário (da lista já
// cadastrada no sistema) é o dono da certidão — compara os CPFs que
// aparecem no texto com o CPF já cadastrado de cada pessoa. Só devolve uma
// identificação quando exatamente um beneficiário bate (evita acertar "no
// chute" quando o PDF cita mais de um CPF, ou nenhum).
function identificarBeneficiarioPeloTexto(texto, beneficiarios) {
  const candidatosNoPdf = new Set((texto.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g) ?? []).map(normalizarCpf))
  if (candidatosNoPdf.size === 0) return null

  const encontrados = beneficiarios.filter(b => candidatosNoPdf.has(normalizarCpf(b.cpf)))
  return encontrados.length === 1 ? encontrados[0] : null
}

// Tenta achar a data de validade dentro do texto do PDF — procura uma data
// (dd/mm/aaaa) logo depois de uma palavra como "válid..." (cobre "válida
// até", "validade:", etc., do jeito que a Receita Federal costuma escrever
// na CND). Se não achar perto dessa palavra, usa a data mais distante no
// futuro entre todas as datas do texto, como palpite. Sempre tratado como
// sugestão editável por quem usa — nunca gravado sem conferência.
function detectarDataValidade(texto) {
  const regexData = /(\d{2})\/(\d{2})\/(\d{4})/g
  const paraIso = ([, d, m, a]) => `${a}-${m}-${d}`

  const indicePalavra = texto.toLowerCase().search(/valid/)
  if (indicePalavra >= 0) {
    const janela = texto.slice(indicePalavra, indicePalavra + 60)
    const matchJanela = [...janela.matchAll(regexData)]
    if (matchJanela.length) return paraIso(matchJanela[matchJanela.length - 1])
  }

  const todasAsDatas = [...texto.matchAll(regexData)].map(paraIso)
  if (!todasAsDatas.length) return null
  return todasAsDatas.reduce((maisFutura, atual) => (atual > maisFutura ? atual : maisFutura))
}

// Função principal usada pela tela: lê o PDF e devolve o palpite completo
// (pessoa identificada, CPF achado, validade sugerida) — nunca lança erro;
// qualquer falha de leitura devolve "nada identificado" para a tela pedir
// conferência manual, em vez de travar o lote inteiro.
export async function identificarCndNoPdf(file, beneficiarios) {
  try {
    const texto = await extrairTextoPdf(file)
    return {
      beneficiario: identificarBeneficiarioPeloTexto(texto, beneficiarios),
      dataValidadeSugerida: detectarDataValidade(texto),
    }
  } catch {
    return { beneficiario: null, dataValidadeSugerida: null }
  }
}
