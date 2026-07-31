import { useCallback, useMemo, useState } from 'react'
import { Search, Plus, ChevronRight, FileText, ExternalLink, Download, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { FormField, Input, Select, Textarea, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { useTable, useCrud } from '@/hooks/useTable'
import { acervoItemService, areaPesquisaService, documentoAcervoService } from '@/lib/db'
import { useSecretaria } from '@/contexts/SecretariaAuthContext'
import { AnexarDocumentoAcervoItem, CATEGORIAS_ACERVO_ITEM } from './AnexarDocumentoAcervoItem'

const CATEGORIA_LABEL = Object.fromEntries(CATEGORIAS_ACERVO_ITEM.map((c) => [c.value, c.label]))

function areasPorId(areas) {
  return Object.fromEntries(areas.map((a) => [a.id, a]))
}

// "Agricultura › Piscicultura" para subárea, ou só o nome para área de topo.
function areaLabel(areaId, areasById) {
  const area = areasById[areaId]
  if (!area) return null
  if (area.area_pai_id) {
    const pai = areasById[area.area_pai_id]
    return pai ? `${pai.nome} › ${area.nome}` : area.nome
  }
  return area.nome
}

// Áreas de topo primeiro (alfabético), cada uma seguida das suas subáreas.
function areasOrdenadas(areas) {
  const topo = areas.filter((a) => !a.area_pai_id).sort((a, b) => a.nome.localeCompare(b.nome))
  return topo.flatMap((a) => [
    { ...a, indent: false },
    ...areas.filter((s) => s.area_pai_id === a.id).sort((x, y) => x.nome.localeCompare(y.nome)).map((s) => ({ ...s, indent: true })),
  ])
}

function agruparPorAno(itens) {
  const anos = [...new Set(itens.filter((i) => i.ano != null).map((i) => i.ano))].sort((a, b) => b - a)
  const grupos = anos.map((ano) => ({
    ano,
    itens: itens.filter((i) => i.ano === ano).sort((a, b) => a.titulo.localeCompare(b.titulo)),
  }))
  const semAno = itens.filter((i) => i.ano == null).sort((a, b) => a.titulo.localeCompare(b.titulo))
  if (semAno.length > 0) grupos.push({ ano: null, itens: semAno })
  return grupos
}

const EMPTY_ITEM = { titulo: '', ano: '', area_pesquisa_id: '', autor_principal: '', resumo: '' }

function AreaSelect({ areas, value, onChange, permitirVazio = true }) {
  return (
    <Select value={value} onChange={onChange}>
      {permitirVazio && <option value="">Sem área definida</option>}
      {areasOrdenadas(areas).map((a) => (
        <option key={a.id} value={a.id}>{a.indent ? `— ${a.nome}` : a.nome}</option>
      ))}
    </Select>
  )
}

function NovoProjetoForm({ areas, onCreated, onCancel }) {
  const [form, setForm] = useState(EMPTY_ITEM)
  const { saving, crudError, create } = useCrud(acervoItemService)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      categoria: 'projeto_pesquisa',
      titulo: form.titulo.trim(),
      ano: form.ano ? Number(form.ano) : null,
      area_pesquisa_id: form.area_pesquisa_id || null,
      autor_principal: form.autor_principal.trim() || null,
      resumo: form.resumo.trim() || null,
    }
    try {
      const created = await create(payload)
      onCreated(created)
    } catch { /* crudError exibido no formulário */ }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Título" required>
        <Input value={form.titulo} onChange={set('titulo')} required />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Ano">
          <Input type="number" min="1990" max="2099" value={form.ano} onChange={set('ano')} />
        </FormField>
        <FormField label="Área">
          <AreaSelect areas={areas} value={form.area_pesquisa_id} onChange={set('area_pesquisa_id')} />
        </FormField>
      </div>
      <FormField label="Autor principal">
        <Input value={form.autor_principal} onChange={set('autor_principal')} placeholder="Nome (texto livre)" />
      </FormField>
      <FormField label="Resumo">
        <Textarea value={form.resumo} onChange={set('resumo')} rows={3} />
      </FormField>
      <ErrorAlert message={crudError} />
      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={saving || !form.titulo.trim()}>{saving ? 'Salvando…' : 'Salvar projeto'}</Button>
      </div>
    </form>
  )
}

function AnexarEmProjetoExistenteForm({ itens, onUploaded }) {
  const [itemId, setItemId] = useState('')

  const opcoes = useMemo(
    () => agruparPorAno(itens).flatMap((g) => g.itens.map((i) => ({ id: i.id, label: `${i.ano ?? 'sem ano'} — ${i.titulo}` }))),
    [itens]
  )

  if (opcoes.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Cadastre um projeto antes de anexar arquivos a ele.</p>
  }

  return (
    <div className="space-y-3">
      <FormField label="Projeto" required>
        <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
          <option value="">Selecione…</option>
          {opcoes.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </Select>
      </FormField>
      {itemId && (
        <AnexarDocumentoAcervoItem itemId={itemId} onUploaded={onUploaded} label="Selecionar arquivo" />
      )}
    </div>
  )
}

function EnviarDocumentoModal({ open, onClose, itens, areas, onChanged }) {
  const [modo, setModo] = useState('novo')

  function handleClose() {
    setModo('novo')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Enviar documento" size="md">
      <div className="flex gap-1 border-b border-border mb-4">
        {[['novo', 'Novo projeto'], ['existente', 'Projeto existente']].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setModo(key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${modo === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {modo === 'novo' ? (
        <NovoProjetoForm areas={areas} onCreated={() => { onChanged(); handleClose() }} onCancel={handleClose} />
      ) : (
        <AnexarEmProjetoExistenteForm itens={itens} onUploaded={() => { onChanged(); handleClose() }} />
      )}
    </Modal>
  )
}

function DocumentosItem({ itemId, podeEditar, onChanged }) {
  const fetch = useCallback(() => documentoAcervoService.listPorEntidade('acervo_item', itemId), [itemId])
  const { data: documentos, loading, reload } = useTable(fetch)

  async function handleExcluir(id) {
    await documentoAcervoService.remove(id)
    reload()
    onChanged?.()
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-3">
      {documentos.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhum arquivo anexado ainda.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border">
          {documentos.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 px-3 py-2">
              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{doc.nome_arquivo}</p>
                <p className="text-[10px] text-muted-foreground">
                  {CATEGORIA_LABEL[doc.categoria] ?? doc.categoria}
                  {doc.descricao ? ` · ${doc.descricao}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-muted transition-colors">
                  <ExternalLink className="w-3 h-3" /> Ver
                </a>
                <a href={doc.url} download
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors">
                  <Download className="w-3 h-3" /> Baixar
                </a>
                {podeEditar && (
                  <button type="button" onClick={() => handleExcluir(doc.id)}
                    className="inline-flex items-center gap-1 text-xs text-destructive/70 hover:text-destructive px-2 py-1 rounded hover:bg-muted transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {podeEditar && (
        <AnexarDocumentoAcervoItem itemId={itemId} onUploaded={() => { reload(); onChanged?.() }} />
      )}
    </div>
  )
}

function ProjetoDetalheModal({ item, areasById, onClose, podeEditar }) {
  if (!item) return null
  return (
    <Modal open={!!item} onClose={onClose} title={item.titulo} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{item.ano ?? 'Ano não informado'}</span>
          <span>{areaLabel(item.area_pesquisa_id, areasById) ?? 'Área não informada'}</span>
          {item.autor_principal && <span>{item.autor_principal}</span>}
        </div>
        {item.resumo && <p className="text-sm text-foreground whitespace-pre-wrap">{item.resumo}</p>}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Arquivos</h3>
          <DocumentosItem itemId={item.id} podeEditar={podeEditar} />
        </div>
      </div>
    </Modal>
  )
}

export function ProjetosPesquisaTab() {
  const { role } = useSecretaria()
  const podeEditar = role === 'secretaria'
  const { data: itens, loading, error, reload } = useTable(useCallback(() => acervoItemService.listPorCategoria('projeto_pesquisa'), []))
  const { data: areas } = useTable(areaPesquisaService.list)
  const areasById = useMemo(() => areasPorId(areas), [areas])

  const [busca, setBusca] = useState('')
  const [filtroAno, setFiltroAno] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [modalEnvio, setModalEnvio] = useState(false)
  const [itemSelecionado, setItemSelecionado] = useState(null)

  const anosDisponiveis = useMemo(
    () => [...new Set(itens.filter((i) => i.ano != null).map((i) => i.ano))].sort((a, b) => b - a),
    [itens]
  )

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return itens.filter((i) => {
      if (filtroAno && String(i.ano) !== filtroAno) return false
      if (filtroArea && i.area_pesquisa_id !== filtroArea) return false
      if (termo) {
        const alvo = `${i.titulo} ${i.autor_principal ?? ''}`.toLowerCase()
        if (!alvo.includes(termo)) return false
      }
      return true
    })
  }, [itens, busca, filtroAno, filtroArea])

  const grupos = agruparPorAno(filtrados)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título ou autor…"
              className="h-8 pl-8 pr-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring w-64"
            />
          </div>
          <select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)}
            className="h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos os anos</option>
            {anosDisponiveis.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}
            className="h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todas as áreas</option>
            {areasOrdenadas(areas).map((a) => (
              <option key={a.id} value={a.id}>{a.indent ? `— ${a.nome}` : a.nome}</option>
            ))}
          </select>
        </div>
        {podeEditar && (
          <Button size="sm" onClick={() => setModalEnvio(true)}>
            <Plus className="w-4 h-4" /> Enviar documento
          </Button>
        )}
      </div>

      <ErrorAlert message={error} />

      {loading ? <LoadingState /> : grupos.length === 0 ? (
        <EmptyState message={itens.length === 0 ? 'Nenhum projeto de pesquisa cadastrado ainda.' : 'Nenhum projeto encontrado com os filtros atuais.'} />
      ) : (
        <div className="space-y-8">
          {grupos.map(({ ano, itens: itensDoAno }) => (
            <section key={ano ?? 'sem-ano'} className="space-y-3">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">{ano ?? 'Ano não informado'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {itensDoAno.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setItemSelecionado(item)}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground line-clamp-2">{item.titulo}</p>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {areaLabel(item.area_pesquisa_id, areasById) ?? 'Área não informada'}
                      </p>
                      {item.autor_principal && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.autor_principal}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <EnviarDocumentoModal open={modalEnvio} onClose={() => setModalEnvio(false)} itens={itens} areas={areas} onChanged={reload} />
      <ProjetoDetalheModal item={itemSelecionado} areasById={areasById} onClose={() => setItemSelecionado(null)} podeEditar={podeEditar} />
    </div>
  )
}
