// src/lib/substituicoes.js
//
// Contagem de pedidos de substituição de bolsista pendentes — usada para o
// aviso/contador no menu lateral da Secretaria Executiva. Ver o painel em
// src/pages/admin/SubstituicoesPainel.jsx e as funções solicitar_substituicao
// / aprovar_substituicao / recusar_substituicao no banco.

import { supabase } from '@/lib/supabase'

export async function contarSolicitacoesSubstituicaoPendentes() {
  const { count, error } = await supabase
    .from('solicitacao_substituicao')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pendente')
  if (error) throw error
  return count ?? 0
}
