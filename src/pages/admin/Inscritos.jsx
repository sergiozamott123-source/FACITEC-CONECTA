import { useState, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/contexts/AdminContext'
import { Modal } from '@/components/common/Modal'
import { ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'

function Row({ label, value }) {
  return (
    <div className="flex gap-2 text-sm py-1">
      <span className="text-muted-foreground shrink-0 w-40">{label}:</span>
      <span className="text-foreground font-medium break-words">{value || '—'}</span>
    </div>
  )
}

function Secao({ titulo, children }) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{titulo}</p>
      {children}
    </div>
  )
}

function formatarData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function formatarDataHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Inscrições antigas (anteriores à coluna enviado_em) caem no fallback created_at.
function dataEnvio(item) {
  return item?.enviado_em ?? item?.created_at ?? null
}

export function Inscritos() {
  const { edicaoSelecionada } = useAdmin()
  const edicaoId = edicaoSelecionada?.id ?? null
  const ano = edicaoSelecionada?.data_inicio ? new Date(edicaoSelecionada.data_inicio).getFullYear() : (edicaoSelecionada?.ano_referencia ?? '—')

  const [inscritos, setInscritos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState(null)
  const [detalhe, setDetalhe] = useState(null)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)

  async function carregar() {
    setLoading(true)
    setErro(null)
    try {
      const { data, error } = await supabase
        .from('projeto')
        .select('id, titulo, codigo_inscricao, created_at, enviado_em, orientador:orientador_id(id, nome_completo, escola)')
        .eq('edicao_id', edicaoId)
        .in('status', ['inscrito', 'reserva', 'selecionado'])
      if (error) throw error
      const ordenados = [...(data ?? [])].sort((a, b) => new Date(dataEnvio(b)) - new Date(dataEnvio(a)))
      setInscritos(ordenados)
    } catch {
      setErro('Não foi possível carregar a lista de inscritos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!edicaoId) return
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicaoId])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return inscritos
    return inscritos.filter(i => (i.orientador?.nome_completo ?? '').toLowerCase().includes(q))
  }, [inscritos, busca])

  async function abrirDetalhe(item) {
    setSelecionado(item)
    setDetalhe(null)
    setCarregandoDetalhe(true)
    try {
      const { data, error } = await supabase
        .from('projeto')
        .select(`
          *,
          orientador:orientador_id ( * ),
          projeto_eixo ( eixo_tematico:eixo_tematico_id ( id, nome ) ),
          resposta_inscricao ( resposta, campo:campo_id ( id, pergunta, ordem ) )
        `)
        .eq('id', item.id)
        .single()
      if (error) throw error
      setDetalhe(data)
    } catch {
      setErro('Não foi possível carregar o detalhe desta inscrição.')
    } finally {
      setCarregandoDetalhe(false)
    }
  }

  function fecharDetalhe() {
    setSelecionado(null)
    setDetalhe(null)
  }

  const eixosNomes = (detalhe?.projeto_eixo ?? []).map(pe => pe.eixo_tematico?.nome).filter(Boolean)
  const respostasOrdenadas = [...(detalhe?.resposta_inscricao ?? [])]
    .sort((a, b) => (a.campo?.ordem ?? 0) - (b.campo?.ordem ?? 0))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Inscritos</h1>
        <p className="text-sm text-muted-foreground mt-1">PIBIC Jr · Edição {ano}</p>
      </div>

      <ErrorAlert message={erro} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {loading ? 'Carregando...' : `${inscritos.length} inscrito${inscritos.length === 1 ? '' : 's'}`}
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome..."
            className="h-9 pl-8 pr-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring w-64"
          />
        </div>
      </div>

      {loading ? <LoadingState /> : filtrados.length === 0 ? (
        <EmptyState message={busca ? 'Nenhum inscrito encontrado para essa busca.' : 'Nenhuma inscrição enviada nesta edição ainda.'} />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Nome</th>
                <th className="text-left font-medium px-4 py-2.5">Escola</th>
                <th className="text-left font-medium px-4 py-2.5">Data de inscrição</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(item => (
                <tr
                  key={item.id}
                  onClick={() => abrirDetalhe(item)}
                  className="border-t border-border cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <td className="px-4 py-2.5 font-medium text-foreground">{item.orientador?.nome_completo ?? '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{item.orientador?.escola ?? '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatarData(dataEnvio(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!selecionado}
        onClose={fecharDetalhe}
        title={selecionado?.orientador?.nome_completo ?? 'Detalhe da inscrição'}
        size="xl"
      >
        {carregandoDetalhe || !detalhe ? (
          <LoadingState />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">
                Código: <span className="font-mono font-medium text-foreground">{detalhe.codigo_inscricao ?? '—'}</span>
              </p>
              <p className="text-xs text-muted-foreground">Enviado em {formatarDataHora(dataEnvio(detalhe))}</p>
            </div>

            <Secao titulo="Proponente">
              <Row label="Nome" value={detalhe.orientador?.nome_completo} />
              <Row label="E-mail" value={detalhe.orientador?.email} />
              <Row label="Telefone" value={detalhe.orientador?.telefone} />
              <Row label="CPF" value={detalhe.orientador?.cpf} />
              <Row label="Endereço" value={[detalhe.orientador?.rua, detalhe.orientador?.bairro, detalhe.orientador?.cidade].filter(Boolean).join(', ')} />
            </Secao>

            <Secao titulo="Escola">
              <Row label="Escola" value={detalhe.orientador?.escola} />
              <Row label="Telefone" value={detalhe.orientador?.telefone_escola} />
              <Row label="E-mail" value={detalhe.orientador?.email_escola} />
              <Row label="Formação" value={detalhe.orientador?.instituicao} />
              <Row
                label="Diploma"
                value={detalhe.orientador?.doc_diploma_url
                  ? <a href={detalhe.orientador.doc_diploma_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Ver arquivo</a>
                  : 'Não enviado'}
              />
            </Secao>

            <Secao titulo="Projeto">
              <Row label="Título" value={detalhe.titulo} />
              <Row label="Eixos temáticos" value={eixosNomes.join(', ')} />
              <Row label="Inédito" value={detalhe.inedito ? 'Sim' : 'Não'} />
              {!detalhe.inedito && (
                <>
                  <Row label="Edições anteriores" value={detalhe.edicoes_anteriores} />
                  <Row label="Novidades" value={detalhe.palavras_chave_livre} />
                </>
              )}
              <Row
                label="PDF do projeto"
                value={detalhe.arquivo_pdf_url
                  ? <a href={detalhe.arquivo_pdf_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Ver arquivo</a>
                  : 'Não enviado'}
              />
            </Secao>

            {respostasOrdenadas.length > 0 && (
              <Secao titulo="Perguntas dissertativas">
                <div className="space-y-3">
                  {respostasOrdenadas.map((r, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium text-foreground">{r.campo?.pergunta}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-0.5">{r.resposta || '—'}</p>
                    </div>
                  ))}
                </div>
              </Secao>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
