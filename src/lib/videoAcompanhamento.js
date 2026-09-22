// src/lib/videoAcompanhamento.js
//
// Vídeos de Acompanhamento do PIBIC Jr (Edital 01/2026) — 2 entregas por
// edição (3º e 5º mês), link do YouTube (não listado), prazos fixos e
// iguais para todas as equipes. Sem upload de arquivo — o vídeo fica
// hospedado no YouTube, só o link é guardado aqui.
//
// Diferente do relatório mensal, não há estado "rascunho"/"enviado" com
// trava: atraso não bloqueia pagamento (decisão da Secretaria), então o
// orientador pode atualizar o link livremente a qualquer momento. O status
// mostrado na tela é sempre calculado a partir de hoje x prazo x link.

import { supabase } from '@/lib/supabase'

// Aceita os formatos comuns de link do YouTube (watch?v=, youtu.be/, /live/,
// /shorts/) — validação simples de formato, não confirma que o vídeo existe
// nem que está "não listado" (isso depende do próprio YouTube).
const REGEX_YOUTUBE = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|live\/|shorts\/)|youtu\.be\/)[\w-]+/i

export function linkYoutubeValido(link) {
  return typeof link === 'string' && REGEX_YOUTUBE.test(link.trim())
}

// ── Ciclos (os 2 prazos da edição) ──────────────────────────────────────
export async function listarCiclosVideo(edicaoId) {
  const { data, error } = await supabase
    .from('video_acompanhamento_ciclo')
    .select('*')
    .eq('edicao_id', edicaoId)
    .order('numero_video', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function atualizarPrazoCiclo(id, dataFechamento) {
  const { error } = await supabase
    .from('video_acompanhamento_ciclo')
    .update({ data_fechamento: dataFechamento })
    .eq('id', id)
  if (error) throw error
}

// ── Envios do orientador ────────────────────────────────────────────────
export async function listarVideosDoOrientador(orientadorId) {
  const { data, error } = await supabase
    .from('video_acompanhamento')
    .select('*')
    .eq('orientador_id', orientadorId)
  if (error) throw error
  return data ?? []
}

export async function salvarLinkVideo({ orientadorId, cicloId, linkYoutube }) {
  const { data, error } = await supabase
    .from('video_acompanhamento')
    .upsert(
      { orientador_id: orientadorId, ciclo_id: cicloId, link_youtube: linkYoutube.trim(), enviado_em: new Date().toISOString() },
      { onConflict: 'orientador_id,ciclo_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Status (usado tanto no dashboard do orientador quanto no painel da Secretaria) ──
// 'enviado'          — link preenchido, dentro do prazo (ou sem prazo vencido ainda)
// 'enviado_atrasado' — link preenchido, mas depois do prazo
// 'atrasado'         — sem link, prazo já vencido
// 'pendente'         — sem link, prazo ainda não vencido
export function statusVideoNoCiclo(ciclo, video) {
  const hoje = new Date().toISOString().slice(0, 10)
  const prazoVencido = hoje > ciclo.data_fechamento

  if (video?.link_youtube) {
    const enviadoAtrasado = video.enviado_em && video.enviado_em.slice(0, 10) > ciclo.data_fechamento
    return enviadoAtrasado ? 'enviado_atrasado' : 'enviado'
  }
  return prazoVencido ? 'atrasado' : 'pendente'
}

export function formatarDataBR(dataISO) {
  if (!dataISO) return '—'
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

// ── Banner de aviso (dashboard e tela de vídeos do orientador) ──────────
// Diferente do relatório mensal, os 2 prazos ficam abertos ao mesmo tempo
// (não é um "ciclo atual" sequencial) — o banner aponta para o mais urgente
// entre os que ainda não foram enviados.
export function calcularBannerVideos(ciclos, videosPorCicloId) {
  const pendentes = ciclos
    .map(ciclo => ({ ciclo, status: statusVideoNoCiclo(ciclo, videosPorCicloId[ciclo.id]) }))
    .filter(({ status }) => status === 'pendente' || status === 'atrasado')
    .sort((a, b) => a.ciclo.data_fechamento.localeCompare(b.ciclo.data_fechamento))

  if (!pendentes.length) return null
  const { ciclo, status } = pendentes[0]

  if (status === 'atrasado') {
    return {
      tom: 'atraso',
      mensagem: `O prazo do "${ciclo.rotulo}" encerrou sem envio do link do vídeo. Regularize o quanto antes.`,
    }
  }

  const hoje = new Date()
  const fechamento = new Date(`${ciclo.data_fechamento}T23:59:59`)
  const diasRestantes = Math.ceil((fechamento - hoje) / (1000 * 60 * 60 * 24))

  if (diasRestantes <= 7) {
    return {
      tom: 'urgente',
      mensagem: `Faltam ${diasRestantes <= 1 ? '1 dia' : `${diasRestantes} dias`} para o prazo do "${ciclo.rotulo}". O link do vídeo ainda não foi enviado.`,
    }
  }

  return {
    tom: 'info',
    mensagem: `"${ciclo.rotulo}" está aberto até ${formatarDataBR(ciclo.data_fechamento)}.`,
  }
}
