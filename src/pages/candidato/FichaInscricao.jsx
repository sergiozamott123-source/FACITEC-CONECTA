import { useState, useEffect, useRef } from 'react'
import { Check, ChevronLeft, ChevronRight, Upload, FileText, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ── Componentes auxiliares internos ──────────────────────────────────────

function FLabel({ children, required }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function FInput({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}

function FTextarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none ${className}`}
      {...props}
    />
  )
}

function FSelect({ children, className = '', ...props }) {
  return (
    <select
      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

function ErrBox({ msg }) {
  if (!msg) return null
  return (
    <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{msg}</div>
  )
}

function StepIndicator({ current }) {
  const LABELS = ['Acesso', 'Proponente', 'Escola', 'Projeto', 'Perguntas', 'Envio']
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        {LABELS.map((label, i) => {
          const n = i + 1
          const done = n < current
          const active = n === current
          return (
            <div key={n} className="flex items-center flex-1">
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                  done   ? 'bg-blue-600 border-blue-600 text-white' :
                  active ? 'border-blue-600 text-blue-600 bg-white' :
                           'border-gray-300 text-gray-400 bg-white'
                }`}>
                  {done ? <Check className="w-4 h-4" /> : n}
                </div>
                <span className={`text-[10px] mt-1 font-medium hidden sm:block ${
                  active ? 'text-blue-700' : done ? 'text-blue-500' : 'text-gray-400'
                }`}>
                  {label}
                </span>
              </div>
              {i < LABELS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 -translate-y-2.5 ${done ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NavButtons({ step, onBack, onNext, nextLabel, saving, disabled }) {
  return (
    <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-100">
      {step > 1 ? (
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>
      ) : <div />}
      <button
        type="button"
        onClick={onNext}
        disabled={saving || disabled}
        className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {nextLabel ?? 'Continuar'}
        {!saving && <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  )
}

function FileUploadInput({ label, accept, currentUrl, onFile, uploading, hint }) {
  return (
    <div className="space-y-1.5">
      <FLabel>{label}</FLabel>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {currentUrl && (
        <div className="flex items-center gap-2 text-sm text-blue-600 mb-1">
          <FileText className="w-4 h-4 flex-none" />
          <a href={currentUrl} target="_blank" rel="noreferrer" className="underline truncate">
            Ver arquivo enviado
          </a>
        </div>
      )}
      <label className={`flex items-center gap-2 px-3 py-2 border-2 border-dashed rounded-md cursor-pointer transition-colors ${uploading ? 'opacity-50 cursor-not-allowed border-gray-200' : 'border-gray-300 hover:border-blue-400'}`}>
        <Upload className="w-4 h-4 text-gray-400 flex-none" />
        <span className="text-sm text-gray-500">{uploading ? 'Enviando…' : 'Selecionar arquivo'}</span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={uploading}
          onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>
    </div>
  )
}

// ── Utilitário de força de senha ──────────────────────────────────────────

function passwordStrength(pw) {
  if (!pw) return { level: 0, label: '' }
  const hasLetter  = /[a-zA-Z]/.test(pw)
  const hasNumber  = /[0-9]/.test(pw)
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw)
  if (pw.length < 6) return { level: 1, label: 'Fraca' }
  if (pw.length >= 8 && hasLetter && hasNumber && hasSpecial) return { level: 4, label: 'Forte' }
  if (pw.length >= 8 && hasLetter && hasNumber) return { level: 3, label: 'Boa' }
  return { level: 2, label: 'Razoável' }
}

const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']
const STRENGTH_TEXT   = ['', 'text-red-600', 'text-orange-500', 'text-yellow-600', 'text-green-600']

// ── Passos ────────────────────────────────────────────────────────────────

function Step1Auth({ onAuth, urlAuthError }) {
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  // Recuperação de senha
  const [showReset, setShowReset]       = useState(false)
  const [resetEmail, setResetEmail]     = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg]         = useState(null)
  const [resetErr, setResetErr]         = useState(null)

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { data: { session }, error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    onAuth(session)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { data: { session }, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome_completo: nome } },
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    if (session) {
      onAuth(session)
    } else {
      setError('Cadastro realizado! Verifique seu e-mail para confirmar a conta e depois faça login.')
      setMode('login')
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setResetErr(null)
    setResetMsg(null)
    setResetLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + '/redefinir-senha',
    })
    setResetLoading(false)
    if (err) { setResetErr(err.message); return }
    setResetMsg('Link de recuperação enviado! Verifique seu e-mail.')
  }

  function switchMode(v) {
    setMode(v)
    setError(null)
    setShowReset(false)
    setResetMsg(null)
    setResetErr(null)
  }

  const strength = passwordStrength(password)

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Acesso</h2>
        <p className="text-sm text-gray-500 mt-1">Faça login ou crie sua conta para iniciar a inscrição.</p>
      </div>
      <div className="flex rounded-lg bg-gray-100 p-1 gap-1">
        {[['login', 'Já tenho conta'], ['register', 'Criar conta']].map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => switchMode(v)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {l}
          </button>
        ))}
      </div>
      {urlAuthError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          O link de recuperação de senha expirou ou é inválido. Por favor, solicite um novo link.
        </div>
      )}
      <ErrBox msg={error} />
      <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-3">
        {mode === 'register' && (
          <div>
            <FLabel required>Nome completo</FLabel>
            <FInput type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" required autoFocus />
          </div>
        )}
        <div>
          <FLabel required>E-mail</FLabel>
          <FInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required autoFocus={mode === 'login'} />
        </div>
        <div>
          <FLabel required>Senha</FLabel>
          <FInput type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />

          {/* Recuperação de senha — somente na aba login */}
          {mode === 'login' && (
            <div className="mt-1.5">
              {!showReset ? (
                <button
                  type="button"
                  onClick={() => { setShowReset(true); setResetEmail(email) }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Esqueci minha senha
                </button>
              ) : (
                <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200 space-y-2">
                  {resetMsg ? (
                    <p className="text-xs text-green-700 font-medium">{resetMsg}</p>
                  ) : (
                    <>
                      {resetErr && <p className="text-xs text-red-600">{resetErr}</p>}
                      <FInput
                        type="email"
                        value={resetEmail}
                        onChange={e => setResetEmail(e.target.value)}
                        placeholder="seu@email.com"
                        required
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleReset}
                          disabled={resetLoading || !resetEmail}
                          className="flex-1 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {resetLoading ? 'Enviando…' : 'Enviar link de recuperação'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowReset(false); setResetErr(null); setResetMsg(null) }}
                          className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Indicador de força — somente na aba criar conta */}
          {mode === 'register' && password && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(lvl => (
                  <div
                    key={lvl}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      strength.level >= lvl ? STRENGTH_COLORS[strength.level] : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              {strength.label && (
                <p className={`text-xs font-medium ${STRENGTH_TEXT[strength.level]}`}>
                  Senha {strength.label.toLowerCase()}
                </p>
              )}
            </div>
          )}
          {mode === 'register' && (
            <p className="text-xs text-gray-400 mt-1.5">
              Use ao menos 8 caracteres combinando letras, números e símbolos (!@#$%) para uma senha segura.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta e continuar'}
        </button>
      </form>
    </div>
  )
}

function Step2Proponente({ form, onChange }) {
  const s = k => e => onChange({ ...form, [k]: e.target.value })
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Dados do Proponente</h2>
        <p className="text-sm text-gray-500 mt-1">Informações pessoais do orientador/professor responsável.</p>
      </div>
      <div>
        <FLabel required>Nome completo</FLabel>
        <FInput value={form.nome_completo} onChange={s('nome_completo')} placeholder="Nome completo" required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FLabel required>E-mail</FLabel>
          <FInput type="email" value={form.email} onChange={s('email')} placeholder="email@escola.edu.br" required />
        </div>
        <div>
          <FLabel>Telefone</FLabel>
          <FInput value={form.telefone} onChange={s('telefone')} placeholder="(27) 99999-9999" />
        </div>
      </div>
      <div>
        <FLabel>CPF</FLabel>
        <FInput value={form.cpf} onChange={s('cpf')} placeholder="000.000.000-00" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FLabel>Rua / Logradouro</FLabel>
          <FInput value={form.rua} onChange={s('rua')} placeholder="Rua das Flores, 123" />
        </div>
        <div>
          <FLabel>Bairro</FLabel>
          <FInput value={form.bairro} onChange={s('bairro')} placeholder="Centro" />
        </div>
      </div>
      <div>
        <FLabel>Cidade</FLabel>
        <FInput value={form.cidade} onChange={s('cidade')} placeholder="Vitória" />
      </div>
    </div>
  )
}

function Step3Escola({ form, onChange, onFileChange, uploadingDiploma }) {
  const s = k => e => onChange({ ...form, [k]: e.target.value })
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Dados da Escola</h2>
        <p className="text-sm text-gray-500 mt-1">Informações da instituição de ensino onde o projeto será desenvolvido.</p>
      </div>
      <div>
        <FLabel>Nome da escola</FLabel>
        <FInput value={form.escola} onChange={s('escola')} placeholder="EMEF Nome da Escola" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FLabel>Telefone da escola</FLabel>
          <FInput value={form.telefone_escola} onChange={s('telefone_escola')} placeholder="(27) 3333-4444" />
        </div>
        <div>
          <FLabel>E-mail da escola</FLabel>
          <FInput type="email" value={form.email_escola} onChange={s('email_escola')} placeholder="secretaria@escola.edu.br" />
        </div>
      </div>
      <div>
        <FLabel>Qualificação / formação</FLabel>
        <FInput value={form.instituicao} onChange={s('instituicao')} placeholder="Ex: Licenciatura em Ciências Biológicas — UFES" />
      </div>
      <FileUploadInput
        label="Diploma ou comprovante de formação"
        accept=".pdf,.jpg,.jpeg,.png"
        currentUrl={form.doc_diploma_url}
        onFile={onFileChange}
        uploading={uploadingDiploma}
        hint="Formatos aceitos: PDF, JPG, PNG"
      />
    </div>
  )
}

function Step4Projeto({ form, onChange, onPdfChange, uploadingPdf, eixos }) {
  const s = k => e => onChange({ ...form, [k]: e.target.value })

  function toggleEixo(eixoId) {
    const sel = form.eixosSelecionados
    const novo = sel.includes(eixoId) ? sel.filter(id => id !== eixoId) : [...sel, eixoId]
    onChange({ ...form, eixosSelecionados: novo })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Dados do Projeto</h2>
        <p className="text-sm text-gray-500 mt-1">Informações sobre o projeto de iniciação científica.</p>
      </div>
      <div>
        <FLabel required>Título do projeto</FLabel>
        <FInput value={form.titulo} onChange={s('titulo')} placeholder="Título do seu projeto" required />
      </div>

      {eixos.length > 0 && (
        <div>
          <FLabel>Eixos temáticos</FLabel>
          <p className="text-xs text-gray-500 mb-2">Selecione todos os eixos que se aplicam ao projeto.</p>
          <div className="space-y-2">
            {eixos.map(e => (
              <label key={e.id} className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.eixosSelecionados.includes(e.id)}
                  onChange={() => toggleEixo(e.id)}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 accent-blue-600 flex-none"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700">{e.nome}</span>
                  {e.descricao && <p className="text-xs text-gray-500 mt-0.5">{e.descricao}</p>}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <FLabel required>O projeto é inédito?</FLabel>
        <div className="flex gap-4 mt-1">
          {[['true', 'Sim, é inédito'], ['false', 'Não, já participei de edições anteriores']].map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="inedito"
                value={v}
                checked={String(form.inedito) === v}
                onChange={() => onChange({ ...form, inedito: v === 'true' })}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">{l}</span>
            </label>
          ))}
        </div>
      </div>

      {!form.inedito && (
        <>
          <div>
            <FLabel>O que esta versão tem de diferente?</FLabel>
            <FTextarea
              value={form.novidades}
              onChange={s('novidades')}
              placeholder="Descreva as novidades ou melhorias em relação à versão anterior..."
              rows={3}
            />
          </div>
          <div>
            <FLabel>Em quantas edições anteriores participou?</FLabel>
            <FSelect
              value={form.edicoes_anteriores}
              onChange={e => onChange({ ...form, edicoes_anteriores: Number(e.target.value) })}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </FSelect>
          </div>
        </>
      )}

      <FileUploadInput
        label="PDF do projeto"
        accept=".pdf"
        currentUrl={form.arquivo_pdf_url}
        onFile={onPdfChange}
        uploading={uploadingPdf}
        hint="Apenas arquivos PDF são aceitos."
      />
    </div>
  )
}

function Step5Perguntas({ campos, respostas, onChange }) {
  function shouldShow(campo) {
    if (!campo.campo_pai_id) return true
    const paiResp = String(respostas[campo.campo_pai_id] ?? '').toLowerCase().trim()
    const esperado = String(campo.valor_condicional ?? '').toLowerCase().trim()
    return paiResp === esperado
  }

  const visiveis = campos.filter(shouldShow)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Perguntas dissertativas</h2>
        <p className="text-sm text-gray-500 mt-1">Responda às perguntas sobre o seu projeto.</p>
      </div>
      {visiveis.length === 0 && (
        <p className="text-sm text-gray-400 italic">Nenhuma pergunta dissertativa configurada para esta edição.</p>
      )}
      {visiveis.map(campo => (
        <div key={campo.id}>
          <FLabel required={campo.obrigatorio}>{campo.pergunta}</FLabel>
          {campo.descricao_hint && (
            <p className="text-xs text-gray-500 mb-1.5">{campo.descricao_hint}</p>
          )}
          {campo.tipo === 'texto_longo' ? (
            <FTextarea
              value={respostas[campo.id] ?? ''}
              onChange={e => onChange({ ...respostas, [campo.id]: e.target.value })}
              placeholder="Digite sua resposta..."
              rows={4}
              required={campo.obrigatorio}
            />
          ) : campo.tipo === 'arquivo' ? (
            <input
              type="file"
              className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-300 file:text-sm file:font-medium file:bg-gray-50 hover:file:bg-gray-100"
            />
          ) : (
            <FInput
              value={respostas[campo.id] ?? ''}
              onChange={e => onChange({ ...respostas, [campo.id]: e.target.value })}
              placeholder="Digite sua resposta..."
              required={campo.obrigatorio}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function Step6Revisao({ proponente, escola, projeto, eixos, termosAceitos, onTermos, onEnviar, saving, stepError }) {
  const nomeEixos = (projeto.eixosSelecionados ?? [])
    .map(id => eixos.find(e => e.id === id)?.nome)
    .filter(Boolean)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Revisão e Envio</h2>
        <p className="text-sm text-gray-500 mt-1">Confira seus dados antes de enviar a inscrição.</p>
      </div>

      {/* Proponente */}
      <div className="rounded-lg border border-gray-200 p-4 space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Proponente</p>
        <Row label="Nome" value={proponente.nome_completo} />
        <Row label="E-mail" value={proponente.email} />
        <Row label="Telefone" value={proponente.telefone} />
        <Row label="CPF" value={proponente.cpf} />
        <Row label="Cidade" value={proponente.cidade} />
      </div>

      {/* Escola */}
      <div className="rounded-lg border border-gray-200 p-4 space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Escola</p>
        <Row label="Escola" value={escola.escola} />
        <Row label="Telefone" value={escola.telefone_escola} />
        <Row label="E-mail" value={escola.email_escola} />
        <Row label="Formação" value={escola.instituicao} />
        <Row label="Diploma" value={escola.doc_diploma_url ? 'Enviado ✓' : 'Não enviado'} />
      </div>

      {/* Projeto */}
      <div className="rounded-lg border border-gray-200 p-4 space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Projeto</p>
        <Row label="Título" value={projeto.titulo} />
        <Row label="Eixos" value={nomeEixos.join(', ') || '—'} />
        <Row label="Inédito" value={projeto.inedito ? 'Sim' : 'Não'} />
        {!projeto.inedito && (
          <>
            <Row label="Edições anteriores" value={projeto.edicoes_anteriores} />
            <Row label="Novidades" value={projeto.novidades} />
          </>
        )}
        <Row label="PDF do projeto" value={projeto.arquivo_pdf_url ? 'Enviado ✓' : 'Não enviado'} />
      </div>

      {/* Termos LGPD */}
      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
        <input
          type="checkbox"
          checked={termosAceitos}
          onChange={e => onTermos(e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded accent-blue-600 flex-none"
        />
        <span className="text-sm text-gray-700">
          Li e aceito os termos de uso e a política de privacidade (LGPD) do FACITEC Conecta.
          Os dados informados serão utilizados exclusivamente para fins de avaliação do projeto de iniciação científica.
        </span>
      </label>

      <ErrBox msg={stepError} />

      <button
        type="button"
        onClick={onEnviar}
        disabled={!termosAceitos || saving}
        className="w-full py-3 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? 'Enviando inscrição…' : 'Enviar inscrição'}
      </button>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 shrink-0 w-32">{label}:</span>
      <span className="text-gray-900 font-medium">{value || '—'}</span>
    </div>
  )
}

function Confirmacao({ codigo, edicao }) {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Inscrição enviada com sucesso!</h2>
        <p className="text-sm text-gray-500 mt-1">
          Edição {edicao?.codigo_facitec ?? edicao?.ano_referencia}
        </p>
      </div>
      <div className="inline-block bg-blue-50 border border-blue-200 rounded-xl px-6 py-4">
        <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Código de inscrição</p>
        <p className="text-2xl font-bold text-blue-700 tracking-widest">{codigo}</p>
      </div>
      <p className="text-sm text-gray-500 max-w-sm mx-auto">
        Guarde este código. Ele será necessário para acompanhar o andamento da sua inscrição.
      </p>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────

export function FichaInscricao() {
  const [step, setStep]             = useState(1)
  const [submitted, setSubmitted]   = useState(false)
  const [codigoGerado, setCodigo]   = useState(null)
  const [globalLoading, setGlobalLoading] = useState(true)
  const [globalError, setGlobalError]     = useState(null)
  const [saving, setSaving]         = useState(false)
  const [stepError, setStepError]   = useState(null)

  // Detecta erro no link de recuperação de senha (hash do Supabase)
  const [urlAuthError] = useState(() => {
    const hashParams   = new URLSearchParams(window.location.hash.slice(1))
    const searchParams = new URLSearchParams(window.location.search)
    const hasError = hashParams.get('error') || searchParams.get('error')
    if (hasError) history.replaceState(null, '', window.location.pathname)
    return !!hasError
  })

  // Auth
  const [session, setSession]       = useState(null)

  // DB entities
  const [edicaoAtiva, setEdicaoAtiva]   = useState(null)
  const [orientadorId, setOrientadorId] = useState(null)
  const [projetoId, setProjetoId]       = useState(null)
  const [eixos, setEixos]               = useState([])
  const [camposInscricao, setCampos]    = useState([])

  // Form states
  const [proponenteForm, setProponenteForm] = useState({
    nome_completo: '', cpf: '', telefone: '', rua: '', bairro: '', cidade: '', email: '',
  })
  const [escolaForm, setEscolaForm] = useState({
    escola: '', telefone_escola: '', email_escola: '', instituicao: '',
    doc_diploma_url: '', doc_diploma_file: null,
  })
  const [projetoForm, setProjetoForm] = useState({
    titulo: '', eixosSelecionados: [], inedito: true, novidades: '',
    edicoes_anteriores: 1, arquivo_pdf_url: '', arquivo_pdf_file: null,
  })
  const [respostas, setRespostas]     = useState({})
  const [termosAceitos, setTermos]    = useState(false)

  // Upload status
  const [uploadingDiploma, setUploadingDiploma] = useState(false)
  const [uploadingPdf, setUploadingPdf]         = useState(false)

  // Keep edicao in ref so auth state change callback can access it
  const edicaoRef = useRef(null)

  useEffect(() => {
    initPage()
  }, [])

  async function initPage() {
    setGlobalLoading(true)
    try {
      const { data: { session: sess } } = await supabase.auth.getSession()

      const { data: ed, error: edErr } = await supabase
        .from('edicao')
        .select('*')
        .eq('status', 'ativo')
        .order('ano_referencia', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (edErr) throw new Error(edErr.message)
      setEdicaoAtiva(ed)
      edicaoRef.current = ed

      if (ed) {
        const [{ data: eixosData }, { data: camposData }] = await Promise.all([
          supabase.from('eixo_tematico').select('*').eq('edicao_id', ed.id).order('ordem', { ascending: true }),
          supabase.from('campo_inscricao').select('*').eq('edicao_id', ed.id).order('ordem', { ascending: true }),
        ])
        setEixos(eixosData ?? [])
        setCampos(camposData ?? [])
      }

      if (sess) {
        setSession(sess)
        await loadExistingData(sess, ed)
      }
    } catch (err) {
      setGlobalError(err.message)
    } finally {
      setGlobalLoading(false)
    }
  }

  async function loadExistingData(sess, ed) {
    const { data: orientData } = await supabase
      .from('orientador')
      .select('*')
      .eq('auth_user_id', sess.user.id)
      .maybeSingle()

    if (orientData) {
      setOrientadorId(orientData.id)
      setProponenteForm({
        nome_completo: orientData.nome_completo ?? '',
        cpf: orientData.cpf ?? '',
        telefone: orientData.telefone ?? '',
        rua: orientData.rua ?? '',
        bairro: orientData.bairro ?? '',
        cidade: orientData.cidade ?? '',
        email: orientData.email ?? sess.user.email ?? '',
      })
      setEscolaForm({
        escola: orientData.escola ?? '',
        telefone_escola: orientData.telefone_escola ?? '',
        email_escola: orientData.email_escola ?? '',
        instituicao: orientData.instituicao ?? '',
        doc_diploma_url: orientData.doc_diploma_url ?? '',
        doc_diploma_file: null,
      })

      if (ed) {
        const { data: proj } = await supabase
          .from('projeto')
          .select('*, projeto_eixo(*)')
          .eq('orientador_id', orientData.id)
          .eq('edicao_id', ed.id)
          .in('status', ['rascunho', 'inscrito'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (proj) {
          setProjetoId(proj.id)
          const eixosSelecionados = (proj.projeto_eixo ?? []).map(pe => pe.eixo_tematico_id)
          setProjetoForm({
            titulo: proj.titulo ?? '',
            eixosSelecionados,
            inedito: proj.inedito ?? true,
            novidades: proj.palavras_chave_livre ?? '',
            edicoes_anteriores: proj.edicoes_anteriores ?? 1,
            arquivo_pdf_url: proj.arquivo_pdf_url ?? '',
            arquivo_pdf_file: null,
          })

          const { data: resp } = await supabase
            .from('resposta_inscricao')
            .select('*')
            .eq('projeto_id', proj.id)
          const respMap = {}
          ;(resp ?? []).forEach(r => { respMap[r.campo_id] = r.resposta })
          setRespostas(respMap)

          if (proj.status === 'inscrito') {
            setCodigo(proj.codigo_inscricao ?? null)
            setSubmitted(true)
            return
          }
        }
      }
    } else {
      setProponenteForm(f => ({ ...f, email: sess.user.email ?? '' }))
    }

    setStep(2)
  }

  async function handleAuth(sess) {
    setSession(sess)
    setSaving(true)
    setStepError(null)
    try {
      await loadExistingData(sess, edicaoRef.current)
    } catch (err) {
      setStepError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function uploadFile(bucket, path, file) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) throw new Error('Erro ao enviar arquivo: ' + error.message)
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  async function handleDiplomaFile(file) {
    setUploadingDiploma(true)
    try {
      const path = `diplomas/${session.user.id}-${Date.now()}.${file.name.split('.').pop()}`
      const url = await uploadFile('inscricoes', path, file)
      setEscolaForm(f => ({ ...f, doc_diploma_url: url, doc_diploma_file: null }))
    } catch (err) {
      setStepError(err.message)
    } finally {
      setUploadingDiploma(false)
    }
  }

  async function handlePdfFile(file) {
    setUploadingPdf(true)
    try {
      const path = `projetos/${session.user.id}-${Date.now()}.pdf`
      const url = await uploadFile('inscricoes', path, file)
      setProjetoForm(f => ({ ...f, arquivo_pdf_url: url, arquivo_pdf_file: null }))
    } catch (err) {
      setStepError(err.message)
    } finally {
      setUploadingPdf(false)
    }
  }

  async function saveStep2() {
    if (!session) throw new Error('Sessão expirada. Faça login novamente.')
    const payload = {
      nome_completo: proponenteForm.nome_completo,
      cpf: proponenteForm.cpf || null,
      telefone: proponenteForm.telefone || null,
      rua: proponenteForm.rua || null,
      bairro: proponenteForm.bairro || null,
      cidade: proponenteForm.cidade || null,
      email: proponenteForm.email || session.user.email,
      auth_user_id: session.user.id,
    }
    if (orientadorId) {
      const { error } = await supabase.from('orientador').update(payload).eq('id', orientadorId)
      if (error) throw new Error(error.message)
    } else {
      const { data, error } = await supabase.from('orientador').insert(payload).select().single()
      if (error) throw new Error(error.message)
      setOrientadorId(data.id)
    }
  }

  async function saveStep3() {
    if (!orientadorId) throw new Error('Dados do proponente não salvos. Volte ao passo 2.')
    const { error } = await supabase.from('orientador').update({
      escola: escolaForm.escola || null,
      telefone_escola: escolaForm.telefone_escola || null,
      email_escola: escolaForm.email_escola || null,
      instituicao: escolaForm.instituicao || null,
      doc_diploma_url: escolaForm.doc_diploma_url || null,
    }).eq('id', orientadorId)
    if (error) throw new Error(error.message)
  }

  async function saveStep4() {
    if (!orientadorId) throw new Error('Dados do proponente não salvos.')
    if (!edicaoAtiva) throw new Error('Nenhuma edição ativa encontrada.')
    const payload = {
      titulo: projetoForm.titulo,
      status: 'rascunho',
      orientador_id: orientadorId,
      edicao_id: edicaoAtiva.id,
      inedito: projetoForm.inedito,
      palavras_chave_livre: !projetoForm.inedito ? (projetoForm.novidades || null) : null,
      edicoes_anteriores: !projetoForm.inedito ? Number(projetoForm.edicoes_anteriores) : null,
      arquivo_pdf_url: projetoForm.arquivo_pdf_url || null,
    }
    let projId = projetoId
    if (projId) {
      const { error } = await supabase.from('projeto').update(payload).eq('id', projId)
      if (error) throw new Error(error.message)
    } else {
      const { data, error } = await supabase.from('projeto').insert(payload).select().single()
      if (error) throw new Error(error.message)
      projId = data.id
      setProjetoId(projId)
    }
    // Sync eixos
    await supabase.from('projeto_eixo').delete().eq('projeto_id', projId)
    if (projetoForm.eixosSelecionados.length > 0) {
      const { error } = await supabase.from('projeto_eixo').insert(
        projetoForm.eixosSelecionados.map(eixoId => ({ projeto_id: projId, eixo_tematico_id: eixoId }))
      )
      if (error) throw new Error(error.message)
    }
  }

  async function saveStep5(projId) {
    const id = projId ?? projetoId
    if (!id) return
    const visivel = camposInscricao.filter(c => {
      if (!c.campo_pai_id) return true
      return String(respostas[c.campo_pai_id] ?? '').toLowerCase() === String(c.valor_condicional ?? '').toLowerCase()
    })
    for (const campo of visivel) {
      const resposta = respostas[campo.id] ?? ''
      if (!resposta) continue
      await supabase.from('resposta_inscricao').upsert(
        { projeto_id: id, campo_id: campo.id, resposta },
        { onConflict: 'projeto_id,campo_id' }
      )
    }
  }

  async function handleNext() {
    setStepError(null)
    setSaving(true)
    try {
      if (step === 2) await saveStep2()
      if (step === 3) await saveStep3()
      if (step === 4) await saveStep4()
      if (step === 5) await saveStep5()
      setStep(s => s + 1)
    } catch (err) {
      setStepError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleEnviar() {
    setStepError(null)
    setSaving(true)
    try {
      await saveStep5()

      const { data: edAtual, error: edErr } = await supabase
        .from('edicao')
        .select('ultimo_sequencial, ano_referencia')
        .eq('id', edicaoAtiva.id)
        .single()
      if (edErr) throw new Error(edErr.message)

      const novoSeq = (edAtual.ultimo_sequencial ?? 0) + 1
      const codigo = `PibicJr${edAtual.ano_referencia}-${String(novoSeq).padStart(4, '0')}`

      const { error: projErr } = await supabase
        .from('projeto')
        .update({ status: 'inscrito', codigo_inscricao: codigo })
        .eq('id', projetoId)
      if (projErr) throw new Error(projErr.message)

      await supabase.from('edicao').update({ ultimo_sequencial: novoSeq }).eq('id', edicaoAtiva.id)

      setCodigo(codigo)
      setSubmitted(true)
    } catch (err) {
      setStepError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0c2358 0%, #1a3f72 100%)' }}>
      {/* Header */}
      <header className="px-6 py-4 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">FACITEC Conecta</p>
            <p className="text-white/60 text-xs leading-tight">Ficha de Inscrição · PibicJr</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
            {globalLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : globalError ? (
              <div className="py-8">
                <ErrBox msg={globalError} />
              </div>
            ) : !edicaoAtiva ? (
              <div className="py-8 text-center">
                <p className="text-gray-500 text-sm">As inscrições não estão abertas no momento.</p>
                <p className="text-gray-400 text-xs mt-1">Acompanhe o site do FACITEC para saber quando as inscrições serão abertas.</p>
              </div>
            ) : submitted ? (
              <Confirmacao codigo={codigoGerado} edicao={edicaoAtiva} />
            ) : (
              <>
                <StepIndicator current={step} />

                {step === 1 && (
                  <>
                    <Step1Auth onAuth={handleAuth} urlAuthError={urlAuthError} />
                    {saving && (
                      <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />Carregando seus dados…
                      </div>
                    )}
                    <ErrBox msg={stepError} />
                  </>
                )}

                {step === 2 && (
                  <>
                    <Step2Proponente form={proponenteForm} onChange={setProponenteForm} />
                    <ErrBox msg={stepError} />
                    <NavButtons step={step} onBack={() => setStep(1)} onNext={handleNext} saving={saving} />
                  </>
                )}

                {step === 3 && (
                  <>
                    <Step3Escola
                      form={escolaForm}
                      onChange={setEscolaForm}
                      onFileChange={handleDiplomaFile}
                      uploadingDiploma={uploadingDiploma}
                    />
                    <ErrBox msg={stepError} />
                    <NavButtons step={step} onBack={() => setStep(2)} onNext={handleNext} saving={saving} />
                  </>
                )}

                {step === 4 && (
                  <>
                    <Step4Projeto
                      form={projetoForm}
                      onChange={setProjetoForm}
                      onPdfChange={handlePdfFile}
                      uploadingPdf={uploadingPdf}
                      eixos={eixos}
                    />
                    <ErrBox msg={stepError} />
                    <NavButtons
                      step={step}
                      onBack={() => setStep(3)}
                      onNext={handleNext}
                      saving={saving}
                      disabled={!projetoForm.titulo.trim()}
                    />
                  </>
                )}

                {step === 5 && (
                  <>
                    <Step5Perguntas
                      campos={camposInscricao}
                      respostas={respostas}
                      onChange={setRespostas}
                    />
                    <ErrBox msg={stepError} />
                    <NavButtons step={step} onBack={() => setStep(4)} onNext={handleNext} saving={saving} />
                  </>
                )}

                {step === 6 && (
                  <Step6Revisao
                    proponente={proponenteForm}
                    escola={escolaForm}
                    projeto={projetoForm}
                    eixos={eixos}
                    termosAceitos={termosAceitos}
                    onTermos={setTermos}
                    onEnviar={handleEnviar}
                    saving={saving}
                    stepError={stepError}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="shrink-0 px-6 py-4 text-center">
        <p className="text-white/40 text-xs">
          Fundo Municipal de Ciência e Tecnologia de Vitória/ES · CDTIV
        </p>
      </footer>
    </div>
  )
}
