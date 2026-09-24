import { useEffect, useState } from 'react'
import { RefreshCw, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  listarNovidades,
  montarResumoAutomatico,
  sugerirReferencia,
  periodoPadrao,
} from '@/lib/registroNovidades'
import { gerarPDFRelatorioNRH } from '@/lib/relatorioNRHPdf'
import { useToast } from '@/hooks/useToast'
import { Toast } from '@/components/common/Toast'

// Relatório de Atividades para o NRH — pedido do Sérgio (Secretário Executivo
// CMCT/FACITEC), ver claude/facitec-conecta-relatorio-atividades-nrh.md.
//
// Diferente do Termo de Envio do Portal CCAD (que só formata um texto digitado
// à mão), aqui o texto das atividades no FACITEC CONECTA sai pré-pronto,
// montado a partir do registro de novidades do sistema (registro_novidades) —
// mas sempre editável antes de gerar o PDF.
export function RelatorioNRH() {
  const [periodo, setPeriodo] = useState(periodoPadrao)
  const [referencia, setReferencia] = useState('')
  const [carregandoNovidades, setCarregandoNovidades] = useState(false)
  const [textoAtividades, setTextoAtividades] = useState('')
  const [outrasAtividades, setOutrasAtividades] = useState('')
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState(null)
  const { toast, showToast } = useToast()

  async function buscarNovidadesDoPeriodo(novoPeriodo) {
    setCarregandoNovidades(true)
    setErro(null)
    try {
      const novidades = await listarNovidades(novoPeriodo)
      setTextoAtividades(montarResumoAutomatico(novidades))
      setReferencia(sugerirReferencia(novoPeriodo.dataInicio, novoPeriodo.dataFim))
      if (!novidades.length) {
        showToast('Nenhuma novidade registrada nesse período — o texto ficou em branco, pode escrever à mão.', 'ok')
      }
    } catch {
      setErro('Não foi possível buscar as novidades do sistema para esse período.')
    } finally {
      setCarregandoNovidades(false)
    }
  }

  // Busca automática ao abrir a tela, com o período padrão (mês corrente).
  useEffect(() => {
    buscarNovidadesDoPeriodo(periodo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleGerarPDF() {
    setGerando(true)
    try {
      const partes = [textoAtividades.trim()]
      if (outrasAtividades.trim()) partes.push(outrasAtividades.trim())
      gerarPDFRelatorioNRH({ referencia, textoAtividades: partes.filter(Boolean).join('\n\n') })
    } catch {
      setErro('Não foi possível gerar o PDF do relatório.')
    } finally {
      setGerando(false)
    }
  }

  const podeGerar = referencia.trim().length > 0 && textoAtividades.trim().length > 0

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Relatório de Atividades para o NRH</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monta automaticamente, a partir das novidades registradas no sistema, o relatório mensal
          de atividades da Secretaria Executiva enviado ao NRH — revise o texto e gere o PDF.
        </p>
      </div>

      {erro && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{erro}</div>
      )}

      <div className="bg-white rounded-xl border border-border p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Período — início</label>
            <input
              type="date"
              value={periodo.dataInicio}
              onChange={e => setPeriodo(p => ({ ...p, dataInicio: e.target.value }))}
              className="w-full border border-border rounded-md px-3 py-1.5 text-sm bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Período — fim</label>
            <input
              type="date"
              value={periodo.dataFim}
              onChange={e => setPeriodo(p => ({ ...p, dataFim: e.target.value }))}
              className="w-full border border-border rounded-md px-3 py-1.5 text-sm bg-background"
            />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={carregandoNovidades}
          onClick={() => buscarNovidadesDoPeriodo(periodo)}
        >
          {carregandoNovidades ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
          {carregandoNovidades ? 'Buscando novidades...' : 'Atualizar texto automático deste período'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Atenção: clicar neste botão recalcula o texto de atividades do zero, a partir das
          novidades do período — qualquer edição manual feita antes se perde. Só mudar as datas
          acima não altera o texto sozinho; é preciso clicar aqui para atualizar.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-border p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Referência (mês/período exibido no texto)</label>
          <input
            type="text"
            value={referencia}
            onChange={e => setReferencia(e.target.value)}
            placeholder="ex.: setembro-2026 ou agosto/setembro-2026"
            className="w-full border border-border rounded-md px-3 py-1.5 text-sm bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Atividades no FACITEC CONECTA</label>
          <textarea
            value={textoAtividades}
            onChange={e => setTextoAtividades(e.target.value)}
            rows={10}
            className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background font-mono"
            placeholder="Gerado automaticamente a partir do registro de novidades do sistema — pode editar livremente."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Outras atividades (não relacionadas ao FACITEC CONECTA) — opcional
          </label>
          <textarea
            value={outrasAtividades}
            onChange={e => setOutrasAtividades(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
            placeholder="Alguma outra atividade da Secretaria Executiva que queira incluir no relatório deste mês?"
          />
        </div>

        <div className="flex justify-end">
          <Button disabled={!podeGerar || gerando} onClick={handleGerarPDF}>
            {gerando ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
            {gerando ? 'Gerando...' : 'Gerar PDF do Relatório'}
          </Button>
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  )
}
