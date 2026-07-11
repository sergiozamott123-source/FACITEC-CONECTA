import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, X, Upload, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { OrientadorSidebar } from './OrientadorSidebar'
import { usePortalOrientador } from '@/contexts/PortalOrientadorContext'
import { supabase } from '@/lib/supabase'
import { getMaxBolsistas, gerarPrefixoCodigo } from '@/lib/programas'

const ACEITOS = '.pdf,.jpg,.jpeg,.png,.webp'
const BUCKET = 'inscricoes'

function calcIdade(dataNasc) {
  if (!dataNasc) return null
  const hoje = new Date()
  const nasc = new Date(dataNasc)
  let age = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) age--
  return age
}

function isMenor(dataNasc) {
  const idade = calcIdade(dataNasc)
  return idade !== null && idade < 18
}

function gerarCodigo(projeto, count) {
  const rank = String(projeto?.rank ?? 1).padStart(3, '0')
  const seq = String(count + 1).padStart(2, '0')
  return `${gerarPrefixoCodigo(projeto?.edicao)}-${rank}-B${seq}`
}

async function uploadArquivo(file, path) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return publicUrl
}

const FORM_INICIAL = {
  nome_completo: '',
  cpf: '',
  data_nascimento: '',
  email: '',
  telefone: '',
  escola_origem: '',
  ano_serie: '',
  matricula_escolar: '',
  tipo: 'bolsista',
  nome_responsavel: '',
  cpf_responsavel: '',
  rg_responsavel: '',
  vinculo_responsavel: 'pai/mae',
  telefone_responsavel: '',
  email_responsavel: '',
}

const DOCS_CAMPOS = [
  { key: 'doc_rg_url',       label: 'RG do bolsista',            menor: false },
  { key: 'doc_cpf_url',      label: 'CPF do bolsista',           menor: false },
  { key: 'doc_matricula_url', label: 'Comprovante de matrícula', menor: false },
  { key: 'responsavel_doc_rg_url',  label: 'RG do responsável',  menor: true  },
  { key: 'responsavel_doc_cpf_url', label: 'CPF do responsável', menor: true  },
]

function UploadField({ label, fieldKey, preview, onUpload, uploading }) {
  const inputRef = useRef()
  const isPdf = preview?.toLowerCase().includes('.pdf') || preview?.endsWith('.pdf')

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-700">{label}</label>
      <div
        className="border border-dashed border-gray-300 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          isPdf ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="w-5 h-5 text-red-500 shrink-0" />
              <span className="text-xs text-gray-700 truncate">{preview.split('/').pop()}</span>
            </div>
          ) : (
            <img src={preview} alt={label} className="h-12 w-12 object-cover rounded border border-gray-200" />
          )
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <Upload className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Clique para enviar</span>
          </div>
        )}
        <span className="text-[10px] text-gray-400 shrink-0">PDF, JPG, PNG</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACEITOS}
        className="hidden"
        disabled={uploading[fieldKey]}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onUpload(fieldKey, file)
        }}
      />
      {uploading[fieldKey] && (
        <p className="text-[10px] text-blue-500">Enviando...</p>
      )}
    </div>
  )
}

function TipoBadge({ tipo }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
      tipo === 'bolsista'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-purple-50 text-purple-700 border-purple-200'
    }`}>
      {tipo === 'bolsista' ? 'Bolsista' : 'Voluntário'}
    </span>
  )
}

function MaioridadeBadge({ dataNasc }) {
  const menor = isMenor(dataNasc)
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
      menor
        ? 'bg-orange-50 text-orange-700 border-orange-200'
        : 'bg-gray-50 text-gray-600 border-gray-200'
    }`}>
      {menor ? 'Menor' : 'Maior'}
    </span>
  )
}

function StatusBadge({ bolsista }) {
  const campos = ['nome_completo', 'cpf', 'data_nascimento', 'escola_origem', 'doc_rg_url', 'doc_cpf_url', 'doc_matricula_url']
  const completo = campos.every(c => bolsista[c])
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
      completo
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-amber-50 text-amber-700 border-amber-200'
    }`}>
      {completo ? 'Completo' : 'Pendente'}
    </span>
  )
}

function Section({ id, title, openSection, setOpenSection, children }) {
  const open = openSection === id
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpenSection(open ? null : id)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="px-4 py-4 space-y-3">{children}</div>}
    </div>
  )
}

export function OrientadorEquipe() {
  const { orientador, projeto } = usePortalOrientador()
  const MAX_BOLSISTAS = getMaxBolsistas(projeto?.edicao?.programa_id)
  const [bolsistas, setBolsistas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [docs, setDocs] = useState({})
  const [uploading, setUploading] = useState({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [openSection, setOpenSection] = useState('pessoal')

  const menor = isMenor(form.data_nascimento)
  const draftKey = projeto?.id ? `rascunho_bolsista_${projeto.id}` : null
  const [draftSaved, setDraftSaved] = useState(false)

  useEffect(() => {
    if (!projeto) { setLoading(false); return }
    fetchBolsistas()
  }, [projeto])

  useEffect(() => {
    if (!showForm || editingId || !draftKey) return
    localStorage.setItem(draftKey, JSON.stringify(form))
    setDraftSaved(true)
    const timer = setTimeout(() => setDraftSaved(false), 2000)
    return () => clearTimeout(timer)
  }, [form, showForm, editingId, draftKey])

  async function fetchBolsistas() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('bolsista')
      .select('*')
      .eq('projeto_id', projeto.id)
      .eq('status', 'ativo')
      .order('created_at', { ascending: true })
    if (err) setError('Erro ao carregar bolsistas.')
    setBolsistas(data ?? [])
    setLoading(false)
  }

  function abrirFormNovo() {
    const saved = draftKey ? localStorage.getItem(draftKey) : null
    if (saved) {
      try { setForm(JSON.parse(saved)) } catch { setForm(FORM_INICIAL) }
    } else {
      setForm(FORM_INICIAL)
    }
    setDocs({})
    setEditingId(null)
    setFormError(null)
    setOpenSection('pessoal')
    setShowForm(true)
  }

  function abrirFormEditar(b) {
    setForm({
      nome_completo: b.nome_completo ?? '',
      cpf: b.cpf ?? '',
      data_nascimento: b.data_nascimento ?? '',
      email: b.email ?? '',
      telefone: b.telefone ?? '',
      escola_origem: b.escola_origem ?? '',
      ano_serie: b.ano_serie ?? '',
      matricula_escolar: b.matricula_escolar ?? '',
      tipo: b.tipo ?? 'bolsista',
      nome_responsavel: b.nome_responsavel ?? '',
      cpf_responsavel: b.cpf_responsavel ?? '',
      rg_responsavel: b.rg_responsavel ?? '',
      vinculo_responsavel: b.vinculo_responsavel ?? 'pai/mae',
      telefone_responsavel: b.telefone_responsavel ?? '',
      email_responsavel: b.email_responsavel ?? '',
    })
    setDocs({
      doc_rg_url: b.doc_rg_url ?? '',
      doc_cpf_url: b.doc_cpf_url ?? '',
      doc_matricula_url: b.doc_matricula_url ?? '',
      responsavel_doc_rg_url: b.responsavel_doc_rg_url ?? '',
      responsavel_doc_cpf_url: b.responsavel_doc_cpf_url ?? '',
    })
    setEditingId(b.id)
    setFormError(null)
    setOpenSection('pessoal')
    setShowForm(true)
  }

  function fecharForm() {
    setShowForm(false)
    setEditingId(null)
    setFormError(null)
  }

  async function handleUpload(fieldKey, file) {
    if (!projeto) return
    const codigo = editingId
      ? bolsistas.find(b => b.id === editingId)?.codigo_facitec ?? 'temp'
      : gerarCodigo(projeto, bolsistas.length)
    const ext = file.name.split('.').pop()
    const path = `bolsistas/${projeto.id}/${codigo}/${fieldKey}.${ext}`
    setUploading(prev => ({ ...prev, [fieldKey]: true }))
    try {
      const url = await uploadArquivo(file, path)
      setDocs(prev => ({ ...prev, [fieldKey]: url }))
    } catch {
      setFormError('Erro ao enviar arquivo. Verifique o tamanho e tente novamente.')
    } finally {
      setUploading(prev => ({ ...prev, [fieldKey]: false }))
    }
  }

  async function handleSalvar(e) {
    e.preventDefault()
    if (!form.nome_completo || !form.data_nascimento) {
      setFormError('Nome completo e data de nascimento são obrigatórios.')
      return
    }
    setSaving(true)
    setFormError(null)

    const payload = {
      ...form,
      ...docs,
      projeto_id: projeto.id,
      orientador_id: orientador.id,
      status: 'ativo',
    }

    let err
    if (editingId) {
      const { error } = await supabase.from('bolsista').update(payload).eq('id', editingId)
      err = error
    } else {
      const codigo = gerarCodigo(projeto, bolsistas.length)
      const { error } = await supabase.from('bolsista').insert({ ...payload, codigo_facitec: codigo })
      err = error
    }

    setSaving(false)
    if (err) {
      setFormError('Erro ao salvar bolsista: ' + err.message)
      return
    }
    if (!editingId && draftKey) localStorage.removeItem(draftKey)
    await fetchBolsistas()
    fecharForm()
  }

  const f = (name) => ({
    name,
    value: form[name],
    onChange: e => setForm(prev => ({ ...prev, [name]: e.target.value })),
    className: 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  })

  const inputLabel = (label, required) => (
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  )

  const sec = (id, title, children) => (
    <Section id={id} title={title} openSection={openSection} setOpenSection={setOpenSection}>
      {children}
    </Section>
  )

  return (
    <div className="min-h-screen flex bg-gray-50">
      <OrientadorSidebar />

      <main className="flex-1 ml-[200px] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Minha equipe</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? '—' : `${bolsistas.length} de ${MAX_BOLSISTAS} bolsistas cadastrados`}
            </p>
          </div>
          {!showForm && bolsistas.length < MAX_BOLSISTAS && (
            <button
              onClick={abrirFormNovo}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar bolsista
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        <div className={`grid gap-6 ${showForm ? 'grid-cols-[1fr_420px]' : 'grid-cols-1'}`}>
          {/* Lista */}
          <div>
            {loading ? (
              <div className="text-center py-12 text-gray-400 text-sm">Carregando bolsistas...</div>
            ) : bolsistas.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                <p>Nenhum bolsista cadastrado ainda.</p>
                <button onClick={abrirFormNovo} className="mt-2 text-blue-600 hover:underline text-sm font-medium">
                  Adicionar o primeiro bolsista
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {bolsistas.map(b => (
                  <div
                    key={b.id}
                    className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-blue-700 text-sm font-bold">
                        {b.nome_completo?.charAt(0) ?? '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{b.nome_completo}</p>
                        {b.codigo_facitec && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            {b.codigo_facitec}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {b.data_nascimento && (
                          <span className="text-xs text-gray-400">
                            {calcIdade(b.data_nascimento)} anos
                          </span>
                        )}
                        {b.escola_origem && (
                          <span className="text-xs text-gray-400 truncate max-w-[180px]">{b.escola_origem}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <TipoBadge tipo={b.tipo} />
                      <MaioridadeBadge dataNasc={b.data_nascimento} />
                      <StatusBadge bolsista={b} />
                    </div>
                    <button
                      onClick={() => abrirFormEditar(b)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulário */}
          {showForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 h-fit sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">
                    {editingId ? 'Editar bolsista' : 'Novo bolsista'}
                  </h2>
                  {!editingId && (
                    <p className={`text-[10px] mt-0.5 transition-opacity duration-500 ${draftSaved ? 'text-green-600 opacity-100' : 'opacity-0'}`}>
                      Rascunho salvo automaticamente
                    </p>
                  )}
                </div>
                <button onClick={fecharForm} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSalvar} className="space-y-3">
                {/* Seção 1 — Dados pessoais */}
                {sec('pessoal', '1. Dados pessoais', <>
                  <div>{inputLabel('Nome completo', true)}<input type="text" {...f('nome_completo')} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>{inputLabel('CPF')}<input type="text" {...f('cpf')} placeholder="000.000.000-00" /></div>
                    <div>{inputLabel('Data de nascimento', true)}<input type="date" {...f('data_nascimento')} /></div>
                  </div>
                  {form.data_nascimento && (
                    <div className={`text-xs px-2 py-1 rounded ${isMenor(form.data_nascimento) ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-600'}`}>
                      {isMenor(form.data_nascimento)
                        ? `⚠️ Menor de idade (${calcIdade(form.data_nascimento)} anos) — seção de responsável obrigatória`
                        : `✓ Maior de idade (${calcIdade(form.data_nascimento)} anos)`}
                    </div>
                  )}
                  <div>{inputLabel('E-mail')}<input type="email" {...f('email')} /></div>
                  <div>{inputLabel('Telefone')}<input type="text" {...f('telefone')} placeholder="(27) 99999-9999" /></div>
                </>)}

                {/* Seção 2 — Dados escolares */}
                {sec('escolar', '2. Dados escolares', <>
                  <div>{inputLabel('Nome da escola')}<input type="text" {...f('escola_origem')} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>{inputLabel('Ano/série')}<input type="text" {...f('ano_serie')} placeholder="Ex: 8º ano" /></div>
                    <div>{inputLabel('Matrícula')}<input type="text" {...f('matricula_escolar')} /></div>
                  </div>
                  <div>{inputLabel('Tipo')}
                    <select {...f('tipo')} className={f('tipo').className}>
                      <option value="bolsista">Bolsista</option>
                      <option value="voluntario">Voluntário</option>
                    </select>
                  </div>
                </>)}

                {/* Seção 3 — Responsável (só para menor) */}
                {menor && sec('responsavel', '3. Responsável legal', <>
                  <div>{inputLabel('Nome do responsável')}<input type="text" {...f('nome_responsavel')} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>{inputLabel('CPF do responsável')}<input type="text" {...f('cpf_responsavel')} /></div>
                    <div>{inputLabel('RG do responsável')}<input type="text" {...f('rg_responsavel')} /></div>
                  </div>
                  <div>{inputLabel('Vínculo')}
                    <select {...f('vinculo_responsavel')} className={f('vinculo_responsavel').className}>
                      <option value="pai/mae">Pai/Mãe</option>
                      <option value="tutor_legal">Tutor legal</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>{inputLabel('Telefone')}<input type="text" {...f('telefone_responsavel')} /></div>
                    <div>{inputLabel('E-mail')}<input type="email" {...f('email_responsavel')} /></div>
                  </div>
                </>)}

                {/* Seção documentos */}
                {sec('documentos', menor ? '4. Documentos' : '3. Documentos',
                  DOCS_CAMPOS.filter(d => !d.menor || menor).map(d => (
                    <UploadField
                      key={d.key}
                      label={d.label}
                      fieldKey={d.key}
                      preview={docs[d.key]}
                      onUpload={handleUpload}
                      uploading={uploading}
                    />
                  ))
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={saving || Object.values(uploading).some(Boolean)}
                    className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar bolsista'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
