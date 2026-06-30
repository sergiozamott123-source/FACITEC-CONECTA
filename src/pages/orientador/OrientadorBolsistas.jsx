import { useEffect, useRef, useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Upload, FileText, CheckCircle, AlertTriangle, Trash2, X, ArrowLeftRight } from 'lucide-react'
import { OrientadorSidebar } from './OrientadorSidebar'
import { usePortalOrientador } from '@/contexts/PortalOrientadorContext'
import { supabase } from '@/lib/supabase'

const BUCKET = 'inscricoes'
const MAX_BOLSISTAS = 8
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACEITOS = '.pdf,.jpg,.jpeg,.png'

function maskCpf(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

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

const DOCS_BASE = [
  { key: 'doc_identidade_aluno',     label: 'Identidade com foto e CPF do aluno',          ref: 'Edital 13.5-e' },
  { key: 'doc_declaracao_matricula', label: 'Comprovante de matrícula',                      ref: 'Edital 13.5-f' },
  { key: 'doc_anuencia_direcao',     label: 'Declaração de anuência da direção — Anexo V',  ref: 'Edital 13.5-g' },
  { key: 'doc_autorizacao_imagem',   label: 'Autorização de uso de imagem — Anexo VI',      ref: 'Edital 13.5-h' },
]

const DOCS_MENOR = [
  { key: 'doc_autorizacao_responsavel', label: 'Autorização do responsável — Anexo III',       ref: 'Edital 13.5-c' },
  { key: 'doc_identidade_responsavel',  label: 'Identidade com foto e CPF do responsável',     ref: 'Edital 13.5-d' },
]

function calcStatus(b) {
  const baseDocs = DOCS_BASE.map(d => b[d.key])
  const menorDocs = isMenor(b.data_nascimento) ? DOCS_MENOR.map(d => b[d.key]) : []
  const all = [...baseDocs, ...menorDocs]
  if (all.every(Boolean)) return 'completo'
  if (all.some(Boolean)) return 'pendente'
  return 'incompleto'
}

function faltaEmailResponsavel(b) {
  return isMenor(b.data_nascimento) && !b.email_responsavel
}

function calcChecklistStatus(b) {
  const dadosOk = !!(b.nome_completo && b.cpf && b.data_nascimento)
  if (!dadosOk) return 'incompleto'
  if (calcStatus(b) !== 'completo') return 'pendente'
  if (faltaEmailResponsavel(b)) return 'pendente'
  return 'pronto'
}

function StatusBadge({ bolsista }) {
  const status = calcStatus(bolsista)
  const cfg = {
    completo:   { label: 'Completo',   cls: 'bg-green-50 text-green-700 border-green-200' },
    pendente:   { label: 'Pendente',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    incompleto: { label: 'Incompleto', cls: 'bg-red-50 text-red-700 border-red-200'       },
  }[status]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function iniciais(nome) {
  if (!nome) return '?'
  return nome.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

async function uploadArquivo(file, projetoId, bolsistaId, fieldKey) {
  if (file.size > MAX_FILE_SIZE) throw new Error('Arquivo muito grande. Máximo: 5MB.')
  const ext = file.name.split('.').pop()
  const path = `bolsistas/${projetoId}/${bolsistaId}/${fieldKey}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return publicUrl
}

function DocUploadField({ label, reference, fieldKey, currentUrl, onUpload, uploading, disabled }) {
  const ref = useRef()
  const hasFile = !!currentUrl
  const isPdf = currentUrl?.toLowerCase().endsWith('.pdf')
  const filename = currentUrl ? decodeURIComponent(currentUrl.split('/').pop().split('?')[0]) : null

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-700">{label}</p>
        <span className="text-[10px] text-gray-400">{reference}</span>
      </div>
      <div
        className={`border rounded-lg p-2.5 flex items-center gap-2 transition-colors ${
          disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
            : hasFile
              ? 'border-green-300 bg-green-50 hover:bg-green-100 cursor-pointer'
              : 'border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer'
        }`}
        onClick={() => !disabled && ref.current?.click()}
      >
        {hasFile ? (
          <>
            {isPdf
              ? <FileText className="w-4 h-4 text-red-500 shrink-0" />
              : <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            }
            <span className="text-xs text-gray-600 truncate flex-1">{filename}</span>
            <span className="text-[10px] text-blue-600 shrink-0">Substituir</span>
          </>
        ) : (
          <>
            <Upload className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400">
              {disabled ? 'Salve o nome primeiro' : 'Enviar (PDF, JPG, PNG — máx. 5MB)'}
            </span>
          </>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept={ACEITOS}
        className="hidden"
        disabled={uploading || disabled}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onUpload(fieldKey, f)
          e.target.value = ''
        }}
      />
      {uploading && <p className="text-[10px] text-blue-500">Enviando...</p>}
    </div>
  )
}

// Card para bolsistas já salvos no banco — auto-save no blur
function BolsistaCard({ bolsista, projeto, expanded, onToggle, onUpdate, onDelete, onSubstituir }) {
  const [form, setForm] = useState({
    nome_completo: bolsista.nome_completo ?? '',
    cpf: bolsista.cpf ?? '',
    data_nascimento: bolsista.data_nascimento ?? '',
    ano_escolar: bolsista.ano_escolar ?? '',
    nome_responsavel: bolsista.nome_responsavel ?? '',
    cpf_responsavel: bolsista.cpf_responsavel ?? '',
    rg_responsavel: bolsista.rg_responsavel ?? '',
    vinculo_responsavel: bolsista.vinculo_responsavel ?? 'pai/mae',
    telefone_responsavel: bolsista.telefone_responsavel ?? '',
    email_responsavel: bolsista.email_responsavel ?? '',
  })
  const [uploading, setUploading] = useState({})
  const [fieldError, setFieldError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const menor = isMenor(form.data_nascimento)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name === 'cpf' ? maskCpf(value) : value }))
  }

  async function handleBlur(e) {
    const { name, value } = e.target
    if (!value) return
    const { error: err } = await supabase.from('bolsista').update({ [name]: value }).eq('id', bolsista.id)
    if (err) setFieldError(`Erro ao salvar: ${err.message}`)
    else { setFieldError(null); onUpdate({ ...bolsista, [name]: value }) }
  }

  async function handleUpload(fieldKey, file) {
    setUploading(prev => ({ ...prev, [fieldKey]: true }))
    setFieldError(null)
    try {
      const url = await uploadArquivo(file, projeto.id, bolsista.id, fieldKey)
      const { error: err } = await supabase.from('bolsista').update({ [fieldKey]: url }).eq('id', bolsista.id)
      if (err) throw new Error(err.message)
      onUpdate({ ...bolsista, [fieldKey]: url })
    } catch (err) {
      setFieldError(err.message ?? 'Erro ao enviar arquivo.')
    } finally {
      setUploading(prev => ({ ...prev, [fieldKey]: false }))
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remover ${form.nome_completo || 'este bolsista'} da equipe?`)) return
    setDeleting(true)
    const { error: err } = await supabase.from('bolsista').update({ status: 'inativo' }).eq('id', bolsista.id)
    if (err) { setFieldError(`Erro ao remover: ${err.message}`); setDeleting(false); return }
    onDelete(bolsista.id)
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={onToggle}>
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <span className="text-blue-700 text-xs font-bold">{iniciais(form.nome_completo)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{form.nome_completo}</p>
          <p className="text-xs text-gray-400">
            {form.ano_escolar || '—'}{form.data_nascimento && ` · ${calcIdade(form.data_nascimento)} anos`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge bolsista={{ ...bolsista, ...form }} />
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-5 pt-4">
          {fieldError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">{fieldError}</div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dados do bolsista</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome completo <span className="text-red-500">*</span></label>
                <input name="nome_completo" value={form.nome_completo} onChange={handleChange} onBlur={handleBlur} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">CPF</label>
                <input name="cpf" value={form.cpf} onChange={handleChange} onBlur={handleBlur} placeholder="000.000.000-00" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data de nascimento <span className="text-red-500">*</span></label>
                <input name="data_nascimento" type="date" value={form.data_nascimento} onChange={handleChange} onBlur={handleBlur} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Ano escolar</label>
                <input name="ano_escolar" value={form.ano_escolar} onChange={handleChange} onBlur={handleBlur} placeholder="Ex: 8º ano do Ensino Médio" className={inputCls} />
              </div>
            </div>
            {form.data_nascimento && (
              <div className={`mt-2 text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1.5 ${
                menor ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-500'
              }`}>
                {menor && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                {menor
                  ? `Menor de idade (${calcIdade(form.data_nascimento)} anos) — documentos do responsável obrigatórios`
                  : `Maior de idade (${calcIdade(form.data_nascimento)} anos)`}
              </div>
            )}
          </div>

          {menor && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dados do responsável</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nome do responsável</label>
                  <input name="nome_responsavel" value={form.nome_responsavel} onChange={handleChange} onBlur={handleBlur} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CPF do responsável</label>
                  <input name="cpf_responsavel" value={form.cpf_responsavel} onChange={handleChange} onBlur={handleBlur} placeholder="000.000.000-00" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">RG do responsável</label>
                  <input name="rg_responsavel" value={form.rg_responsavel} onChange={handleChange} onBlur={handleBlur} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Vínculo</label>
                  <select name="vinculo_responsavel" value={form.vinculo_responsavel} onChange={handleChange} onBlur={handleBlur} className={inputCls}>
                    <option value="pai/mae">Pai/Mãe</option>
                    <option value="responsavel_legal">Responsável legal</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Telefone do responsável</label>
                  <input name="telefone_responsavel" value={form.telefone_responsavel} onChange={handleChange} onBlur={handleBlur} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">E-mail do responsável</label>
                  <input type="email" name="email_responsavel" value={form.email_responsavel} onChange={handleChange} onBlur={handleBlur} placeholder="email@exemplo.com" className={inputCls} />
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Documentos</p>
            <div className="space-y-2">
              {DOCS_BASE.map(d => (
                <DocUploadField key={d.key} label={d.label} reference={d.ref} fieldKey={d.key}
                  currentUrl={bolsista[d.key]} onUpload={handleUpload} uploading={uploading[d.key]} />
              ))}
              {menor && (
                <>
                  <div className="pt-1 pb-0.5">
                    <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Documentos do responsável
                    </p>
                  </div>
                  {DOCS_MENOR.map(d => (
                    <DocUploadField key={d.key} label={d.label} reference={d.ref} fieldKey={d.key}
                      currentUrl={bolsista[d.key]} onUpload={handleUpload} uploading={uploading[d.key]} />
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="pt-1 border-t border-gray-100 flex items-center gap-4">
            <button onClick={onSubstituir}
              className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 transition-colors">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Substituir
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50">
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? 'Removendo...' : 'Remover bolsista'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Card temporário para novo bolsista — INSERT só acontece ao preencher o nome
function NovoBolsistaCard({ projeto, orientador, onInserted, onCancel }) {
  const [form, setForm] = useState({ nome_completo: '', cpf: '', data_nascimento: '', ano_escolar: '', tipo: 'bolsista' })
  const [saving, setSaving] = useState(false)
  const [insertError, setInsertError] = useState(null)
  const [uploading, setUploading] = useState({})
  const savedId = useRef(null) // id real após o primeiro INSERT

  const menor = isMenor(form.data_nascimento)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name === 'cpf' ? maskCpf(value) : value }))
  }

  async function handleBlur(e) {
    const { name, value } = e.target
    if (!value) return

    // Primeiro INSERT: disparado quando nome_completo tem valor
    if (!savedId.current) {
      if (name !== 'nome_completo') return // aguardar nome antes de qualquer coisa
      setSaving(true)
      setInsertError(null)
      const { data, error: err } = await supabase
        .from('bolsista')
        .insert({
          projeto_id: projeto.id,
          orientador_id: orientador.id,
          status: 'ativo',
          nome_completo: value,
          tipo: form.tipo,
        })
        .select()
        .single()
      setSaving(false)
      if (err) {
        setInsertError(`Erro ao salvar: ${err.message}`)
        return
      }
      savedId.current = data.id

      // Gerar e salvar código do bolsista automaticamente
      const numOr = orientador.codigo_orientador?.split('-')[1] ?? '000'
      const tipoCod = form.tipo === 'voluntario' ? 'BV' : 'BT'
      const { count } = await supabase
        .from('bolsista')
        .select('*', { count: 'exact', head: true })
        .eq('orientador_id', orientador.id)
        .eq('tipo', form.tipo)
        .eq('status', 'ativo')
      const seq = String(count).padStart(2, '0')
      const codigo_bolsista = `PIBIC26-${numOr}-${tipoCod}${seq}`
      await supabase.from('bolsista').update({ codigo_bolsista }).eq('id', data.id)

      onInserted({ ...data, codigo_bolsista })
      return
    }

    // UPDATEs subsequentes após o INSERT inicial
    await supabase.from('bolsista').update({ [name]: value }).eq('id', savedId.current)
  }

  async function handleUpload(fieldKey, file) {
    if (!savedId.current) return
    setUploading(prev => ({ ...prev, [fieldKey]: true }))
    try {
      const url = await uploadArquivo(file, projeto.id, savedId.current, fieldKey)
      const { error: err } = await supabase.from('bolsista').update({ [fieldKey]: url }).eq('id', savedId.current)
      if (err) throw new Error(err.message)
    } catch (err) {
      setInsertError(err.message ?? 'Erro ao enviar arquivo.')
    } finally {
      setUploading(prev => ({ ...prev, [fieldKey]: false }))
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <div className="bg-white rounded-xl border-2 border-blue-300 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border-b border-blue-100">
        <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center shrink-0">
          <span className="text-blue-600 text-xs font-bold">
            {form.nome_completo ? iniciais(form.nome_completo) : '+'}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-800">
            {form.nome_completo || 'Novo bolsista'}
          </p>
          <p className="text-xs text-blue-500">
            {saving ? 'Salvando...' : 'Preencha o nome para salvar automaticamente'}
          </p>
        </div>
        <button onClick={onCancel} className="text-blue-400 hover:text-blue-600 transition-colors" title="Cancelar">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 pb-4 pt-4 space-y-5">
        {insertError && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">{insertError}</div>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dados do bolsista</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nome completo <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">(salvo automaticamente ao sair do campo)</span>
              </label>
              <input name="nome_completo" value={form.nome_completo} onChange={handleChange} onBlur={handleBlur}
                placeholder="Nome completo do bolsista" className={inputCls} autoFocus />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de bolsa <span className="text-red-500">*</span></label>
              <select name="tipo" value={form.tipo} onChange={handleChange} className={inputCls}>
                <option value="bolsista">Bolsista (BT)</option>
                <option value="voluntario">Voluntário (BV)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">CPF</label>
              <input name="cpf" value={form.cpf} onChange={handleChange} onBlur={handleBlur}
                placeholder="000.000.000-00" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Data de nascimento <span className="text-red-500">*</span></label>
              <input name="data_nascimento" type="date" value={form.data_nascimento} onChange={handleChange} onBlur={handleBlur} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Ano escolar</label>
              <input name="ano_escolar" value={form.ano_escolar} onChange={handleChange} onBlur={handleBlur}
                placeholder="Ex: 8º ano do Ensino Médio" className={inputCls} />
            </div>
          </div>
          {form.data_nascimento && (
            <div className={`mt-2 text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1.5 ${
              menor ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-500'
            }`}>
              {menor && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
              {menor
                ? `Menor de idade (${calcIdade(form.data_nascimento)} anos) — documentos do responsável obrigatórios`
                : `Maior de idade (${calcIdade(form.data_nascimento)} anos)`}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Documentos</p>
          <div className="space-y-3">
            {DOCS_BASE.map(d => (
              <DocUploadField
                key={d.key}
                label={d.label}
                reference={d.ref}
                fieldKey={d.key}
                currentUrl={null}
                onUpload={handleUpload}
                uploading={uploading[d.key]}
                disabled={!form.nome_completo}
              />
            ))}
            {menor && DOCS_MENOR.map(d => (
              <DocUploadField
                key={d.key}
                label={d.label}
                reference={d.ref}
                fieldKey={d.key}
                currentUrl={null}
                onUpload={handleUpload}
                uploading={uploading[d.key]}
                disabled={!form.nome_completo}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SubstituirModal({ bolsista, onConfirm, onClose, saving, backendError }) {
  const [motivo, setMotivo] = useState('')
  const [novoForm, setNovoForm] = useState({
    nome_completo: '',
    cpf: '',
    data_nascimento: '',
    ano_escolar: '',
    nome_responsavel: '',
    cpf_responsavel: '',
    rg_responsavel: '',
    vinculo_responsavel: 'pai/mae',
    telefone_responsavel: '',
    email_responsavel: '',
  })
  const [err, setErr] = useState(null)

  const menor = isMenor(novoForm.data_nascimento)

  function handleChange(e) {
    const { name, value } = e.target
    const masked = (name === 'cpf' || name === 'cpf_responsavel') ? maskCpf(value) : value
    setNovoForm(prev => ({ ...prev, [name]: masked }))
  }

  function handleConfirm() {
    if (!motivo.trim()) { setErr('Informe o motivo da substituição.'); return }
    if (!novoForm.nome_completo.trim()) { setErr('Informe o nome do novo bolsista.'); return }
    if (!novoForm.data_nascimento) { setErr('Informe a data de nascimento do novo bolsista.'); return }
    setErr(null)
    onConfirm(motivo.trim(), novoForm)
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-gray-900">Substituir bolsista</h2>
          <button onClick={onClose} disabled={saving} className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <p>
              O bolsista <span className="font-semibold">{bolsista.nome_completo}</span> será marcado como substituído.
              Esta ação ficará registrada e visível para a Secretaria.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Motivo da substituição <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Descreva o motivo da substituição..."
              rows={3}
              className={inputCls + ' resize-none'}
            />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dados do novo bolsista</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome completo <span className="text-red-500">*</span></label>
                <input name="nome_completo" value={novoForm.nome_completo} onChange={handleChange} placeholder="Nome completo do bolsista" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">CPF</label>
                <input name="cpf" value={novoForm.cpf} onChange={handleChange} placeholder="000.000.000-00" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data de nascimento <span className="text-red-500">*</span></label>
                <input name="data_nascimento" type="date" value={novoForm.data_nascimento} onChange={handleChange} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Ano escolar / Escola</label>
                <input name="ano_escolar" value={novoForm.ano_escolar} onChange={handleChange} placeholder="Ex: 8º ano do Ensino Médio" className={inputCls} />
              </div>
            </div>
            {novoForm.data_nascimento && (
              <div className={`mt-2 text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1.5 ${
                menor ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-500'
              }`}>
                {menor && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                {menor
                  ? `Menor de idade (${calcIdade(novoForm.data_nascimento)} anos) — dados do responsável obrigatórios`
                  : `Maior de idade (${calcIdade(novoForm.data_nascimento)} anos)`}
              </div>
            )}
          </div>

          {menor && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dados do responsável</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nome do responsável</label>
                  <input name="nome_responsavel" value={novoForm.nome_responsavel} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CPF do responsável</label>
                  <input name="cpf_responsavel" value={novoForm.cpf_responsavel} onChange={handleChange} placeholder="000.000.000-00" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">RG do responsável</label>
                  <input name="rg_responsavel" value={novoForm.rg_responsavel} onChange={handleChange} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Vínculo</label>
                  <select name="vinculo_responsavel" value={novoForm.vinculo_responsavel} onChange={handleChange} className={inputCls}>
                    <option value="pai/mae">Pai/Mãe</option>
                    <option value="responsavel_legal">Responsável legal</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Telefone do responsável</label>
                  <input name="telefone_responsavel" value={novoForm.telefone_responsavel} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">E-mail do responsável</label>
                  <input type="email" name="email_responsavel" value={novoForm.email_responsavel} onChange={handleChange} placeholder="email@exemplo.com" className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {(err || backendError) && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">{err || backendError}</div>
          )}
        </div>

        <div className="flex gap-2 justify-end px-5 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
            <ArrowLeftRight className="w-4 h-4" />
            {saving ? 'Confirmando...' : 'Confirmar substituição'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ChecklistEnvio({ bolsistas, orientador }) {
  const [confirmando, setConfirmando] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [erro, setErro] = useState(null)

  const statuses = bolsistas.map(b => ({ ...b, _status: calcChecklistStatus(b) }))
  const prontos = statuses.filter(b => b._status === 'pronto').length
  const total = bolsistas.length
  const todosProtos = total > 0 && prontos === total
  const pct = total > 0 ? Math.round((prontos / total) * 100) : 0

  const cfg = {
    pronto:     { icon: '✅', label: 'Pronto',               cls: 'text-green-700 bg-green-50 border-green-200' },
    pendente:   { icon: '⚠️', label: 'Documentos pendentes', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
    incompleto: { icon: '❌', label: 'Dados incompletos',    cls: 'text-red-700 bg-red-50 border-red-200'       },
  }

  async function handleConfirmar() {
    setConfirmando(true)
    setErro(null)
    const { error: err } = await supabase
      .from('orientador')
      .update({ equipe_confirmada: true, data_confirmacao_equipe: new Date().toISOString() })
      .eq('id', orientador.id)
    setConfirmando(false)
    if (err) { setErro(`Erro ao confirmar: ${err.message}`); return }
    setConfirmado(true)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <h2 className="text-base font-bold text-gray-900">✅ Checklist de envio — Equipe pronta?</h2>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-600">
          <span>{prontos} de {total} bolsistas prontos</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${todosProtos ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="space-y-2">
        {statuses.map(b => {
          const c = cfg[b._status]
          const semEmail = b._status !== 'pronto' && faltaEmailResponsavel(b)
          return (
            <li key={b.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${c.cls}`}>
              <span className="shrink-0">{c.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="font-medium truncate block">{b.nome_completo || '—'}</span>
                {semEmail && (
                  <span className="text-[10px] flex items-center gap-0.5 mt-0.5 text-amber-600">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    E-mail do responsável obrigatório
                  </span>
                )}
              </div>
              <span className="text-xs shrink-0">{c.label}</span>
            </li>
          )
        })}
      </ul>

      {erro && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">{erro}</div>
      )}

      {confirmado ? (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-2 text-green-800 text-sm font-semibold">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Equipe confirmada e enviada à Secretaria com sucesso!
        </div>
      ) : (
        <>
          <button
            onClick={handleConfirmar}
            disabled={!todosProtos || confirmando}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {confirmando ? 'Confirmando...' : 'Confirmar envio à Secretaria'}
          </button>
          {!todosProtos && (
            <p className="text-xs text-gray-500 text-center">
              Todos os bolsistas precisam estar ✅ prontos antes de confirmar o envio.
            </p>
          )}
        </>
      )}
    </div>
  )
}

export function OrientadorBolsistas() {
  const { orientador, projeto } = usePortalOrientador()
  const [bolsistas, setBolsistas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [substituirTarget, setSubstituirTarget] = useState(null)
  const [substituindo, setSubstituindo] = useState(false)
  const [substituirError, setSubstituirError] = useState(null)

  useEffect(() => {
    if (!projeto) { setLoading(false); return }
    fetchBolsistas()
  }, [projeto])

  async function fetchBolsistas() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('bolsista')
      .select('*')
      .eq('projeto_id', projeto.id)
      .eq('status', 'ativo')
      .or('status_bolsista.is.null,status_bolsista.neq.substituido')
      .order('created_at', { ascending: true })
    if (err) setError(`Erro ao carregar bolsistas: ${err.message}`)
    setBolsistas(data ?? [])
    setLoading(false)
  }

  function handleAdicionar() {
    if (!projeto) { setError('Projeto não encontrado. Verifique se seu projeto está com status "selecionado".'); return }
    if (bolsistas.length >= MAX_BOLSISTAS) return
    setShowNew(true)
    setExpanded(null)
  }

  // Chamado pelo NovoBolsistaCard após INSERT bem-sucedido
  function handleInserted(novoBolsista) {
    setShowNew(false)
    setBolsistas(prev => [...prev, novoBolsista])
    setExpanded(novoBolsista.id)
  }

  function handleUpdate(updated) {
    setBolsistas(prev => prev.map(b => b.id === updated.id ? updated : b))
  }

  function handleDelete(id) {
    setBolsistas(prev => prev.filter(b => b.id !== id))
    if (expanded === id) setExpanded(null)
  }

  async function handleConfirmarSubstituicao(motivo, novoForm) {
    setSubstituindo(true)
    setSubstituirError(null)
    const antigo = substituirTarget
    const now = new Date().toISOString()
    try {
      const { error: errAntigo } = await supabase
        .from('bolsista')
        .update({ status_bolsista: 'substituido', motivo_substituicao: motivo, data_substituicao: now })
        .eq('id', antigo.id)
      if (errAntigo) throw new Error(errAntigo.message)

      const { data: novoData, error: errNovo } = await supabase
        .from('bolsista')
        .insert({
          orientador_id: antigo.orientador_id,
          projeto_id: antigo.projeto_id,
          tipo: antigo.tipo,
          codigo_bolsista: antigo.codigo_bolsista,
          status: 'ativo',
          nome_completo: novoForm.nome_completo,
          cpf: novoForm.cpf || null,
          data_nascimento: novoForm.data_nascimento,
          ano_escolar: novoForm.ano_escolar || null,
          nome_responsavel: novoForm.nome_responsavel || null,
          cpf_responsavel: novoForm.cpf_responsavel || null,
          rg_responsavel: novoForm.rg_responsavel || null,
          vinculo_responsavel: novoForm.vinculo_responsavel || null,
          telefone_responsavel: novoForm.telefone_responsavel || null,
          email_responsavel: novoForm.email_responsavel || null,
        })
        .select()
        .single()
      if (errNovo) throw new Error(errNovo.message)

      await supabase.from('substituicao_bolsista').insert({
        bolsista_saindo_id: antigo.id,
        bolsista_entrando_id: novoData.id,
        motivo,
        data_substituicao: now,
        projeto_id: antigo.projeto_id,
        orientador_id: antigo.orientador_id,
      })

      setSubstituirTarget(null)
      fetchBolsistas()
    } catch (err) {
      setSubstituirError(err.message ?? 'Erro ao realizar substituição.')
    } finally {
      setSubstituindo(false)
    }
  }

  const total = bolsistas.length
  const completos = bolsistas.filter(b => calcStatus(b) === 'completo').length
  const pendencias = bolsistas.filter(b => calcStatus(b) !== 'completo').length

  return (
    <div className="min-h-screen flex bg-gray-50">
      <OrientadorSidebar />

      <main className="flex-1 ml-[200px] p-6 space-y-5" style={{ maxWidth: 'calc(100% - 200px)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bolsistas</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? '—' : `${total} de ${MAX_BOLSISTAS} bolsistas cadastrados`}
            </p>
          </div>
          <button
            onClick={handleAdicionar}
            disabled={showNew || bolsistas.length >= MAX_BOLSISTAS || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Cadastrar novo bolsista
          </button>
        </div>

        {!loading && !projeto && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Projeto não encontrado</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Nenhum projeto com status "selecionado" foi encontrado para este orientador. Entre em contato com a secretaria.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {/* Resumo */}
        {!loading && projeto && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Cadastrados',   value: total,      color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-200'  },
              { label: 'Doc. completa', value: completos,  color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
              { label: 'Pendências',    value: pendencias, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
            ].map(c => (
              <div key={c.label} className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-gray-600 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Carregando bolsistas...</div>
        ) : (
          <div className="space-y-2">
            {bolsistas.map(b => (
              <BolsistaCard
                key={b.id}
                bolsista={b}
                projeto={projeto}
                expanded={expanded === b.id}
                onToggle={() => setExpanded(expanded === b.id ? null : b.id)}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onSubstituir={() => { setSubstituirError(null); setSubstituirTarget(b) }}
              />
            ))}

            {bolsistas.length === 0 && !showNew && projeto && (
              <div className="text-center py-12 text-gray-400 text-sm">
                <p>Nenhum bolsista cadastrado.</p>
                <button onClick={handleAdicionar} className="mt-2 text-blue-600 hover:underline text-sm font-medium">
                  Cadastrar o primeiro bolsista
                </button>
              </div>
            )}

            {showNew && (
              <NovoBolsistaCard
                projeto={projeto}
                orientador={orientador}
                onInserted={handleInserted}
                onCancel={() => setShowNew(false)}
              />
            )}
          </div>
        )}

        {bolsistas.length >= MAX_BOLSISTAS && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Limite de <span className="font-semibold">{MAX_BOLSISTAS} bolsistas</span> atingido conforme o Edital FACITEC 01/2026.
            </p>
          </div>
        )}

        {!loading && projeto && bolsistas.length > 0 && (
          <ChecklistEnvio bolsistas={bolsistas} orientador={orientador} />
        )}
      </main>

      {substituirTarget && (
        <SubstituirModal
          bolsista={substituirTarget}
          onConfirm={handleConfirmarSubstituicao}
          onClose={() => { setSubstituirTarget(null); setSubstituirError(null) }}
          saving={substituindo}
          backendError={substituirError}
        />
      )}
    </div>
  )
}
