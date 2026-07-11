// Cálculo do ranking de classificação (nota final, consenso e desempate por
// critério) — usado pela tela de Classificação e pelo card "Avaliação" da
// Central de relatórios. Mantido fora de páginas React para não violar a
// regra de fast-refresh (arquivo de componente só pode exportar componentes).

export const CONSENSO_VARIANT = {
  'Aprovado':               'success',
  'Aprovado com Ressalvas': 'warning',
  'Não Aprovado':           'destructive',
  'Sem consenso':           'secondary',
  'Não informado':          'secondary',
}

export function computarRanking(projetos, avaliacoes, criteriosOrdenados) {
  const projetoMap = {}
  projetos.forEach(p => { projetoMap[p.id] = p })

  const byProjeto = {}
  avaliacoes.forEach(av => {
    if (!byProjeto[av.projeto_id]) byProjeto[av.projeto_id] = []
    byProjeto[av.projeto_id].push(av)
  })

  const items = Object.entries(byProjeto)
    .filter(([pid]) => projetoMap[pid])
    .map(([pid, avs]) => {
      const n = avs.length

      // Nota total de cada avaliação = soma das notas em avaliacao_criterio
      const totais = avs.map(av =>
        (av.notas_criterio ?? []).reduce((s, nc) => s + Number(nc.nota ?? 0), 0)
      )
      const notaFinal = totais.reduce((s, t) => s + t, 0) / n

      // Consenso: só conta avaliações que de fato têm recomendacao_final preenchida.
      // Se nenhuma tiver → "Não informado" (dados importados do sistema anterior).
      // Se houver empate entre as que têm → "Sem consenso".
      const avComRec = avs.filter(a => a.recomendacao_final)
      let consenso
      if (avComRec.length === 0) {
        consenso = 'Não informado'
      } else {
        const votos = {}
        avComRec.forEach(a => {
          votos[a.recomendacao_final] = (votos[a.recomendacao_final] || 0) + 1
        })
        const maxVotos = Math.max(...Object.values(votos))
        const vencedores = Object.entries(votos).filter(([, c]) => c === maxVotos)
        consenso = vencedores.length === 1 ? vencedores[0][0] : 'Sem consenso'
      }

      // Média por critério (para desempate, na ordem de criteriosOrdenados)
      const mediasPorCod = {}
      criteriosOrdenados.forEach(c => {
        const vals = avs.flatMap(av =>
          (av.notas_criterio ?? [])
            .filter(nc => nc.criterio?.codigo === c.codigo)
            .map(nc => Number(nc.nota ?? 0))
        )
        mediasPorCod[c.codigo] = vals.length > 0
          ? vals.reduce((s, v) => s + v, 0) / vals.length
          : 0
      })

      return { projeto: projetoMap[pid], notaFinal, n, consenso, mediasPorCod }
    })

  items.sort((a, b) => {
    const diff = b.notaFinal - a.notaFinal
    if (Math.abs(diff) > 0.0001) return diff
    for (const c of criteriosOrdenados) {
      const d = (b.mediasPorCod[c.codigo] ?? 0) - (a.mediasPorCod[c.codigo] ?? 0)
      if (Math.abs(d) > 0.0001) return d
    }
    return 0
  })

  return items
}
