// src/lib/cnd.js
//
// Upload e acompanhamento de vencimento das Certidões Negativas de Débito
// (CND) dos beneficiários pagáveis do PibicJr.

import { supabase } from '@/lib/supabase'
import { listarBeneficiariosPagaveis } from '@/lib/pagamentos'

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
