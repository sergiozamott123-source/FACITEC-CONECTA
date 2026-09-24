// src/lib/registroNovidades.js
//
// Changelog interno de entregas no FACITEC CONECTA (tabela registro_novidades,
// ver supabase/registro_novidades_setup.sql). Cadastro é feito diretamente no
// banco a cada entrega concluída — esta tela só lê.
//
// Usado pelo Relatório de Atividades para o NRH (RelatorioNRH.jsx) para montar
// automaticamente o resumo do período escolhido.

import { supabase } from '@/lib/supabase'

export async function listarNovidades({ dataInicio, dataFim }) {
  let query = supabase.from('registro_novidades').select('*').order('data', { ascending: true })
  if (dataInicio) query = query.gte('data', dataInicio)
  if (dataFim) query = query.lte('data', dataFim)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

// Monta o texto-resumo automático a partir das novidades do período — vira o
// conteúdo inicial (editável) do campo "Atividades no FACITEC CONECTA".
export function montarResumoAutomatico(novidades) {
  if (!novidades.length) return ''
  return novidades.map(n => `• ${n.titulo}: ${n.descricao}`).join('\n\n')
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

// Sugere o texto de "referência" (mês/período) a partir do intervalo de datas
// escolhido — mesmo estilo usado pelo próprio Sérgio no modelo do documento
// ("agosto/setembro-2026"). Sempre editável na tela antes de gerar o PDF.
export function sugerirReferencia(dataInicioStr, dataFimStr) {
  if (!dataInicioStr || !dataFimStr) return ''
  const di = new Date(`${dataInicioStr}T00:00:00`)
  const df = new Date(`${dataFimStr}T00:00:00`)
  const mesInicio = MESES[di.getMonth()]
  const anoInicio = di.getFullYear()
  const mesFim = MESES[df.getMonth()]
  const anoFim = df.getFullYear()

  if (anoInicio === anoFim && mesInicio === mesFim) return `${mesInicio}-${anoInicio}`
  if (anoInicio === anoFim) return `${mesInicio}/${mesFim}-${anoInicio}`
  return `${mesInicio}-${anoInicio} a ${mesFim}-${anoFim}`
}

// Primeiro dia do mês corrente e hoje, em "AAAA-MM-DD" — período padrão
// sugerido ao abrir a tela (o coordenador pode ajustar livremente).
export function periodoPadrao() {
  const hoje = new Date()
  // Monta "AAAA-MM-DD" a partir dos componentes locais (não usar
  // toISOString(), que converte para UTC e pode voltar um dia à noite).
  const paraISO = (ano, mes, dia) => `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  return {
    dataInicio: paraISO(hoje.getFullYear(), hoje.getMonth(), 1),
    dataFim: paraISO(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()),
  }
}
