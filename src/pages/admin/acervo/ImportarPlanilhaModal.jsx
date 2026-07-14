import { useState } from 'react'
import { Upload, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { ErrorAlert } from '@/components/common/FormField'
import { useXlsx } from '@/hooks/useXlsx'
import { supabase } from '@/lib/supabase'

// Modal reutilizável de importação inteligente de planilha — Fase B / B.1
// do Acervo Inteligente (ver PROMPT_ACERVO_INTELIGENTE.md).
//
// Fluxo: upload do arquivo -> a Edge Function `acervo-importar-planilha` usa
// IA para interpretar e devolver os registros -> pré-visualização editável
// (o usuário revisa/corrige campo a campo, pode excluir linhas) -> só então
// "Confirmar e salvar" chama `onConfirmar`, que é responsabilidade de cada
// página-mãe (cada entidade tem sua própria lógica de gravação — orientador,
// bolsista e projeto têm relacionamentos diferentes entre si).
//
// Nunca grava nada sozinho: mesmo que a IA tenha 100% de confiança em tudo,
// a pré-visualização sempre aparece antes de qualquer escrita no banco.
export function ImportarPlanilhaModal({ open, onClose, entidade, tituloEntidade, campos, onConfirmar }) {
  const [passo, setPasso] = useState('upload') // upload | preview
  const [linhas, setLinhas] = useState([])
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState(null)
  const { parse, reset: resetXlsx } = useXlsx()

  function fecharTudo() {
    setPasso('upload')
    setLinhas([])
    setErro(null)
    resetXlsx()
    onClose()
  }

  async function handleArquivo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErro(null)
    setProcessando(true)
    try {
      const { rows } = await parse(file)
      if (rows.length === 0) throw new Error('A planilha parece vazia.')

      const { data, error } = await supabase.functions.invoke('acervo-importar-planilha', {
        body: { entidade, texto: JSON.stringify(rows) },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      const linhasComId = (data.linhas ?? []).map((l) => ({
        ...l,
        _key: crypto.randomUUID(),
        _incluir: true,
      }))
      if (linhasComId.length === 0) {
        throw new Error('A IA não conseguiu identificar nenhum registro nesta planilha.')
      }
      setLinhas(linhasComId)
      setPasso('preview')
    } catch (err) {
      setErro(err.message ?? 'Erro ao processar a planilha.')
    } finally {
      setProcessando(false)
      e.target.value = ''
    }
  }

  function editarCampo(key, campo, valor) {
    setLinhas((ls) => ls.map((l) => (l._key === key ? { ...l, [campo]: valor } : l)))
  }

  function alternarIncluir(key) {
    setLinhas((ls) => ls.map((l) => (l._key === key ? { ...l, _incluir: !l._incluir } : l)))
  }

  async function handleConfirmar() {
    setErro(null)
    setProcessando(true)
    try {
      const aprovadas = linhas.filter((l) => l._incluir)
      await onConfirmar(aprovadas)
      fecharTudo()
    } catch (err) {
      setErro(err.message ?? 'Erro ao salvar os registros.')
    } finally {
      setProcessando(false)
    }
  }

  const qtdIncluidas = linhas.filter((l) => l._incluir).length
  const qtdChecar = linhas.filter((l) => l._incluir && l._confianca === 'checar').length

  return (
    <Modal open={open} onClose={fecharTudo} title={`Importar planilha — ${tituloEntidade}`} size="xl">
      {passo === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Envie uma planilha (.xlsx, .xls ou .csv) com os dados de {tituloEntidade.toLowerCase()}. A IA lê o
            conteúdo e organiza os registros para você revisar — nada é gravado automaticamente.
          </p>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-10 cursor-pointer hover:border-primary/50 transition-colors">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm font-medium">Clique para escolher o arquivo</span>
            <span className="text-xs text-muted-foreground">.xlsx, .xls ou .csv</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleArquivo}
              disabled={processando}
            />
          </label>
          {processando && (
            <p className="text-sm text-muted-foreground text-center">Lendo e organizando os dados com IA…</p>
          )}
          <ErrorAlert message={erro} />
        </div>
      )}

      {passo === 'preview' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {linhas.length} registro(s) identificado(s)
            {qtdChecar > 0 && (
              <span className="text-amber-600 font-medium"> · {qtdChecar} para conferir</span>
            )}
            {' '}— revise, corrija o que precisar e desmarque o que não deve entrar.
          </p>
          <div className="border border-border rounded-lg overflow-auto max-h-[50vh]">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-left font-medium px-3 py-2 w-10"></th>
                  {campos.map((c) => (
                    <th key={c.key} className="text-left font-medium px-3 py-2">{c.label}</th>
                  ))}
                  <th className="text-left font-medium px-3 py-2 w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr
                    key={l._key}
                    className={`border-t border-border ${!l._incluir ? 'opacity-40' : ''} ${l._confianca === 'checar' ? 'bg-amber-50' : ''}`}
                  >
                    <td className="px-3 py-1.5">
                      <input type="checkbox" checked={l._incluir} onChange={() => alternarIncluir(l._key)} />
                    </td>
                    {campos.map((c) => (
                      <td key={c.key} className="px-3 py-1.5">
                        <input
                          value={l[c.key] ?? ''}
                          onChange={(e) => editarCampo(l._key, c.key, e.target.value)}
                          disabled={!l._incluir}
                          className="w-full h-8 text-sm px-2 border border-transparent hover:border-input focus:border-input rounded outline-none bg-transparent focus:bg-background disabled:cursor-not-allowed"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-1.5">
                      {l._confianca === 'checar' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5" /> checar
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ok
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ErrorAlert message={erro} />
          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={fecharTudo} disabled={processando}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleConfirmar} disabled={processando || qtdIncluidas === 0}>
              {processando ? 'Salvando…' : `Confirmar e salvar (${qtdIncluidas})`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
