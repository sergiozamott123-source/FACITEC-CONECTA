// src/lib/relatorioMensal.js
//
// Relatório Mensal do Orientador — 6 ciclos por edição (julho a dezembro),
// janela de envio controlada pela Secretaria, rascunho automático e envio
// definitivo travado após confirmação.

import { supabase } from '@/lib/supabase'

const BUCKET = 'relatorios-evidencias'
export const MIN_EVIDENCIAS = 3
export const MAX_EVIDENCIAS = 5

// ── Ciclos ───────────────────────────────────────────────────────────────
export async function listarCiclos(edicaoId) {
  const { data, error } = await supabase
    .from('relatorio_mensal_ciclo')
    .select('*')
    .eq('edicao_id', edicaoId)
    .order('numero_ciclo', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function atualizarJanelaCiclo(id, { data_abertura, data_fechamento }) {
  const { error } = await supabase
    .from('relatorio_mensal_ciclo')
    .update({ data_abertura, data_fechamento })
    .eq('id', id)
  if (error) throw error
}

// ── Relatórios do orientador ────────────────────────────────────────────
export async function listarRelatoriosDoOrientador(orientadorId) {
  const { data, error } = await supabase
    .from('relatorio_mensal')
    .select('*')
    .eq('orientador_id', orientadorId)
    .not('ciclo_id', 'is', null)
  if (error) throw error
  return data ?? []
}

export async function salvarRascunho(payload) {
  const { data, error } = await supabase
    .from('relatorio_mensal')
    .upsert({ ...payload, status: 'rascunho' }, { onConflict: 'orientador_id,ciclo_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function enviarRelatorio(id) {
  const { data, error } = await supabase
    .from('relatorio_mensal')
    .update({ status: 'enviado', enviado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function reabrirRelatorio(id, userId, motivo) {
  const { error } = await supabase
    .from('relatorio_mensal')
    .update({
      status: 'rascunho',
      reaberto_em: new Date().toISOString(),
      reaberto_por: userId,
      motivo_reabertura: motivo,
      enviado_em: null,
    })
    .eq('id', id)
  if (error) throw error
}

// ── Evidências (Supabase Storage) ───────────────────────────────────────
export async function uploadEvidencia(file, orientadorId, cicloId) {
  const ext = file.name.split('.').pop()
  const nomeArquivo = `${crypto.randomUUID()}.${ext}`
  const path = `${orientadorId}/${cicloId}/${nomeArquivo}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function removerEvidencia(url) {
  const marker = `/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return
  const path = decodeURIComponent(url.slice(idx + marker.length))
  await supabase.storage.from(BUCKET).remove([path])
}

// ── Detecção do ciclo vigente para o orientador ─────────────────────────
// Percorre os ciclos em ordem; o primeiro que ainda não tem envio e cuja
// janela já abriu é o "ciclo atual" (mesmo que a janela já tenha fechado —
// nesse caso fica marcado como atrasado, mas ainda pode ser preenchido).
// Se o próximo ciclo pendente ainda não abriu, não há nada a fazer agora.
export function detectarCicloAtual(ciclos, relatoriosPorCicloId) {
  const ordenados = [...ciclos].sort((a, b) => a.numero_ciclo - b.numero_ciclo)
  const hoje = new Date().toISOString().slice(0, 10)

  for (const ciclo of ordenados) {
    const relatorio = relatoriosPorCicloId[ciclo.id] ?? null
    if (relatorio?.status === 'enviado') continue

    if (hoje < ciclo.data_abertura) {
      return { ciclo: null, relatorio: null, proximoCiclo: ciclo, atrasado: false }
    }

    return { ciclo, relatorio, proximoCiclo: null, atrasado: hoje > ciclo.data_fechamento }
  }

  return { ciclo: null, relatorio: null, proximoCiclo: null, atrasado: false, concluido: true }
}

// ── Estado do banner de notificação (dashboard e tela do relatório) ─────
export function calcularBanner(ciclo, relatorio, atrasado) {
  if (!ciclo || relatorio?.status === 'enviado') return null

  if (atrasado) {
    return {
      tom: 'atraso',
      mensagem: `O prazo do ciclo ${ciclo.numero_ciclo} (${ciclo.mes_referencia}) encerrou sem envio do relatório. Regularize o quanto antes.`,
    }
  }

  const hoje = new Date()
  const fechamento = new Date(`${ciclo.data_fechamento}T23:59:59`)
  const diasRestantes = Math.ceil((fechamento - hoje) / (1000 * 60 * 60 * 24))

  if (diasRestantes <= 2) {
    return {
      tom: 'urgente',
      mensagem: `Faltam ${diasRestantes <= 1 ? '1 dia' : `${diasRestantes} dias`} para o fechamento do ciclo ${ciclo.numero_ciclo}. O relatório ainda não foi enviado.`,
    }
  }

  return {
    tom: 'info',
    mensagem: `Relatório do ciclo ${ciclo.numero_ciclo} está aberto até ${formatarDataBR(ciclo.data_fechamento)}. Envie para manter o pagamento da bolsa em dia.`,
  }
}

export function formatarDataBR(dataISO) {
  if (!dataISO) return '—'
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

// ── Painel da Secretaria ─────────────────────────────────────────────────
export function statusRelatorioNoCiclo(ciclo, relatorio) {
  if (relatorio?.status === 'enviado') {
    const atrasado = relatorio.enviado_em && new Date(relatorio.enviado_em) > new Date(`${ciclo.data_fechamento}T23:59:59`)
    return atrasado ? 'enviado_atrasado' : 'enviado'
  }
  const hoje = new Date().toISOString().slice(0, 10)
  if (hoje > ciclo.data_fechamento) return 'atrasado'
  return 'pendente'
}
