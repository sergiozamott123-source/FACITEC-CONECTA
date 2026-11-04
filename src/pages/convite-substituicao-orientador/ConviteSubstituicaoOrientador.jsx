// src/pages/convite-substituicao-orientador/ConviteSubstituicaoOrientador.jsx
//
// Página PÚBLICA (sem exigir login prévio) para onde vai o link de
// convite gerado em OrientadorSubstituicao.jsx. É aqui que o professor
// substituto cria seu próprio acesso ao sistema e preenche seus
// próprios dados — "Opção B" do plano de implementação: o substituto
// assina sua própria Manifestação de Interesse, em vez do orientador
// anterior preencher tudo em nome dele.
//
// Revisão de 04/11/2026 (a pedido de Sérgio): o cadastro aqui passou a
// coletar o mesmo conjunto de campos do cadastro padrão de orientador
// (endereço, escola completa), e o substituto passou a anexar, além dos
// documentos pessoais de sempre, a Declaração de Anuência da escola
// (antes era anexada por quem sai) e a nova Declaração de Aceitação da
// Substituição. Depois de confirmar, o substituto fica com acesso
// restrito ao sistema (status 'pendente_documentacao_substituicao', ver
// RequireAcessoOrientador.jsx) até a Secretaria Executiva confirmar o
// Termo Aditivo assinado e aprovar o pedido.
//
// Ver obter_convite_substituicao_orientador / vincular_convite_substituicao_orientador
// no banco (src/lib/substituicoesOrientador.js).

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Upload, FileText, GraduationCap, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  obterConviteSubstituicaoOrientador,
  uploadDocSubstituto,
  uploadDocConviteSubstituto,
  vincularConviteSubstituicaoOrientador,
} from '@/lib/substituicoesOrientador'
import { baixarDeclaracaoAnuencia, baixarDeclaracaoAceitacao } from '@/lib/documentosSubstituicaoOrientador'

function Card({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-950 p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">{children}</div>
    </div>
  )
}

function CabecalhoConvite({ convite }) {
  return (
    <div className="px-6 pt-6 pb-4 border-b border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <GraduationCap className="w-5 h-5 text-blue-600" />
        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Convite de substituição de orientador</span>
      </div>
      <h1 className="text-lg font-bold text-gray-900">{convite.projeto_titulo}</h1>
      <p className="text-sm text-gray-500 mt-1">
        Você foi indicado(a) por <strong>{convite.orientador_saiu_nome}</strong> para assumir a orientação deste projeto,
        conforme o item 16.2 do Edital FACITEC vigente.
      </p>
    </div>
  )
}

function UploadCampo({ label, obrigatorio, currentUrl, onUpload, uploading, extra }) {
  const ref = useRef()
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {obrigatorio && <span className="text-red-500">*</span>}
      </label>
      {extra}
      <div
        className={`border rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors ${
          currentUrl ? 'border-green-300 bg-green-50' : 'border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
        }`}
        onClick={() => ref.current?.click()}
      >
        {currentUrl ? (
          <>
            <FileText className="w-4 h-4 text-green-600 shrink-0" />
            <span className="text-xs text-gray-700 flex-1">Documento enviado</span>
            <span className="text-[10px] text-blue-600 font-medium">Substituir</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">{uploading ? 'Enviando...' : 'Clique para enviar (PDF, JPG, PNG)'}</span>
          </>
        )}
      </div>
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" disabled={uploading} onChange={e => {
        const f = e.target.files?.[0]
        if (f) onUpload(f)
        e.target.value = ''
      }} />
    </div>
  )
}

export function ConviteSubstituicaoOrientador() {
  const { token } = useParams()
  const [convite, setConvite] = useState(null)
  const [erroConvite, setErroConvite] = useState(null)
  const [loadingConvite, setLoadingConvite] = useState(true)

  const [session, setSession] = useState(null)
  const [checandoSessao, setChecandoSessao] = useState(true)

  // Login/criar conta
  const [tab, setTab] = useState('register')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmSenha, setConfirmSenha] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [authSuccess, setAuthSuccess] = useState(null)

  // Cadastro do substituto (mesmos campos do cadastro padrão de orientador)
  const [meuOrientador, setMeuOrientador] = useState(null)
  const [form, setForm] = useState({
    nome_completo: '', cpf: '', telefone: '', rua: '', bairro: '', cidade: '',
    escola: '', telefone_escola: '', email_escola: '', instituicao: '',
  })
  const [uploading, setUploading] = useState({})
  // Anuência da escola + Aceitação da substituição — não ficam no registro
  // `orientador`, vivem na própria solicitação (ver vincularConviteSubstituicaoOrientador).
  const [anuencia, setAnuencia] = useState(null)
  const [aceitacao, setAceitacao] = useState(null)
  const [enviandoAnuencia, setEnviandoAnuencia] = useState(false)
  const [enviandoAceitacao, setEnviandoAceitacao] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)

  useEffect(() => {
    obterConviteSubstituicaoOrientador(token)
      .then(data => {
        if (!data || !data.valido) {
          setErroConvite(data?.motivo_invalido ?? 'Convite inválido.')
        } else {
          setConvite(data)
          setEmail(data.email_substituto ?? '')
          setForm(prev => ({
            ...prev,
            cpf: data.cpf_substituto ?? '',
            telefone: data.telefone_substituto ?? '',
          }))
        }
      })
      .catch(err => setErroConvite(err.message ?? 'Não foi possível carregar este convite.'))
      .finally(() => setLoadingConvite(false))
  }, [token])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setChecandoSessao(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    carregarMeuOrientador()
  }, [session])

  async function carregarMeuOrientador() {
    const { data } = await supabase.from('orientador').select('*').eq('auth_user_id', session.user.id).maybeSingle()
    if (data) {
      setMeuOrientador(data)
      setForm(prev => ({
        ...prev,
        nome_completo: data.nome_completo ?? prev.nome_completo,
        cpf: data.cpf ?? prev.cpf,
        telefone: data.telefone ?? prev.telefone,
        rua: data.rua ?? prev.rua,
        bairro: data.bairro ?? prev.bairro,
        cidade: data.cidade ?? prev.cidade,
        escola: data.escola ?? prev.escola,
        telefone_escola: data.telefone_escola ?? prev.telefone_escola,
        email_escola: data.email_escola ?? prev.email_escola,
        instituicao: data.instituicao ?? prev.instituicao,
      }))
    } else {
      // Primeiro acesso: cria o cadastro básico vinculado a este login, já
      // com o CPF/telefone informados pelo orientador que saiu (se houver).
      const { data: created, error } = await supabase
        .from('orientador')
        .insert({
          auth_user_id: session.user.id,
          email: session.user.email,
          nome_completo: convite?.nome_substituto ?? '',
          cpf: convite?.cpf_substituto ?? null,
          telefone: convite?.telefone_substituto ?? null,
          status: 'em_preenchimento',
        })
        .select()
        .single()
      if (!error) {
        setMeuOrientador(created)
        setForm(prev => ({
          ...prev,
          nome_completo: created.nome_completo ?? prev.nome_completo,
          cpf: created.cpf ?? prev.cpf,
          telefone: created.telefone ?? prev.telefone,
        }))
      }
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setAuthError(null)
    if (senha !== confirmSenha) { setAuthError('As senhas não coincidem.'); return }
    if (senha.length < 6) { setAuthError('A senha deve ter no mínimo 6 caracteres.'); return }
    setAuthLoading(true)
    const { error } = await supabase.auth.signUp({ email, password: senha })
    setAuthLoading(false)
    if (error) { setAuthError(error.message); return }
    setAuthSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro e depois faça login aqui mesmo.')
    setTab('login')
    setSenha('')
    setConfirmSenha('')
  }

  async function handleLogin(e) {
    e.preventDefault()
    setAuthError(null)
    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setAuthLoading(false)
    if (error) { setAuthError(error.message); return }
  }

  async function handleBlurField(e) {
    const { name, value } = e.target
    if (!meuOrientador) return
    await supabase.from('orientador').update({ [name]: value }).eq('id', meuOrientador.id)
  }

  async function handleUpload(campo, file) {
    if (!meuOrientador) return
    setUploading(prev => ({ ...prev, [campo]: true }))
    setErrorForm(null)
    try {
      const url = await uploadDocSubstituto(file, meuOrientador.id, campo)
      const { data } = await supabase.from('orientador').update({ [campo]: url }).eq('id', meuOrientador.id).select().single()
      setMeuOrientador(data)
    } catch (err) {
      setErrorForm(err.message ?? 'Erro ao enviar documento.')
    } finally {
      setUploading(prev => ({ ...prev, [campo]: false }))
    }
  }

  async function handleUploadAnuencia(file) {
    setEnviandoAnuencia(true)
    setErrorForm(null)
    try {
      const result = await uploadDocConviteSubstituto(file, token, 'anuencia')
      setAnuencia(result)
    } catch (err) {
      setErrorForm(err.message ?? 'Erro ao enviar a Declaração de Anuência.')
    } finally {
      setEnviandoAnuencia(false)
    }
  }

  async function handleUploadAceitacao(file) {
    setEnviandoAceitacao(true)
    setErrorForm(null)
    try {
      const result = await uploadDocConviteSubstituto(file, token, 'aceitacao')
      setAceitacao(result)
    } catch (err) {
      setErrorForm(err.message ?? 'Erro ao enviar a Declaração de Aceitação da Substituição.')
    } finally {
      setEnviandoAceitacao(false)
    }
  }

  function handleBaixarAnuencia() {
    baixarDeclaracaoAnuencia({
      orientador: { nome_completo: convite?.orientador_saiu_nome, escola: form.escola },
      projeto: { titulo: convite?.projeto_titulo },
      nomeSubstituto: form.nome_completo || convite?.nome_substituto,
    })
  }

  function handleBaixarAceitacao() {
    baixarDeclaracaoAceitacao({
      nomeSubstituto: form.nome_completo || convite?.nome_substituto,
      cpfSubstituto: form.cpf,
      projetoTitulo: convite?.projeto_titulo,
      orientadorSaiuNome: convite?.orientador_saiu_nome,
    })
  }

  async function handleConfirmar(e) {
    e.preventDefault()
    setErrorForm(null)
    const docsObrigatorios = ['doc_identidade', 'doc_diploma', 'doc_comprovante_residencia_url', 'doc_regularidade_url']
    const faltando = docsObrigatorios.filter(d => !meuOrientador?.[d])
    if (!form.nome_completo.trim() || !form.cpf.trim()) {
      setErrorForm('Preencha nome completo e CPF antes de confirmar.')
      return
    }
    if (faltando.length > 0) {
      setErrorForm('Envie todos os documentos obrigatórios antes de confirmar.')
      return
    }
    if (!anuencia) {
      setErrorForm('Anexe a Declaração de Anuência da Direção da escola antes de confirmar.')
      return
    }
    if (!aceitacao) {
      setErrorForm('Anexe a Declaração de Aceitação da Substituição assinada antes de confirmar.')
      return
    }
    setConfirmando(true)
    try {
      await supabase.from('orientador').update({ ...form, status: 'pendente_documentacao_substituicao' }).eq('id', meuOrientador.id)
      await vincularConviteSubstituicaoOrientador(
        token, form.nome_completo.trim(),
        anuencia.url, anuencia.nomeArquivo,
        aceitacao.url, aceitacao.nomeArquivo,
      )
      setConcluido(true)
    } catch (err) {
      setErrorForm(err.message ?? 'Erro ao confirmar o convite.')
    } finally {
      setConfirmando(false)
    }
  }

  if (loadingConvite || checandoSessao) {
    return <Card><div className="p-10 text-center text-gray-400 text-sm">Carregando convite...</div></Card>
  }

  if (erroConvite) {
    return (
      <Card>
        <div className="p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="text-sm font-semibold text-gray-800">{erroConvite}</p>
          <p className="text-xs text-gray-500">Entre em contato com o orientador que enviou este link para obter um novo convite.</p>
        </div>
      </Card>
    )
  }

  if (concluido) {
    return (
      <Card>
        <div className="p-8 text-center space-y-3">
          <CheckCircle className="w-10 h-10 text-green-600 mx-auto" />
          <p className="text-base font-semibold text-gray-900">Convite confirmado!</p>
          <p className="text-sm text-gray-600">
            Sua Manifestação de Interesse foi registrada. Enquanto a Secretaria Executiva confirma o Termo Aditivo e
            aprova o pedido, seu acesso ao sistema fica restrito ao acompanhamento desta solicitação — você será
            avisado assim que a substituição for efetivada.
          </p>
        </div>
      </Card>
    )
  }

  if (!session) {
    return (
      <Card>
        <CabecalhoConvite convite={convite} />
        <div className="p-6">
          <div className="grid grid-cols-2 border-b border-gray-200 mb-4">
            {[{ id: 'register', label: 'Criar conta' }, { id: 'login', label: 'Entrar' }].map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setAuthError(null) }}
                className={`py-2.5 text-sm font-medium transition-colors ${
                  tab === t.id ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {authSuccess && (
            <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800 mb-3">{authSuccess}</div>
          )}
          {authError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 mb-3">{authError}</div>
          )}

          <form onSubmit={tab === 'register' ? handleRegister : handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password" required value={senha} onChange={e => setSenha(e.target.value)}
                placeholder={tab === 'register' ? 'Mínimo 6 caracteres' : ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Confirmar senha</label>
                <input
                  type="password" required value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <button
              type="submit" disabled={authLoading}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {authLoading ? 'Aguarde...' : tab === 'register' ? 'Criar conta e continuar' : 'Entrar'}
            </button>
          </form>
        </div>
      </Card>
    )
  }

  // Sessão ativa — formulário de dados do substituto
  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 py-10">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg overflow-hidden">
        <CabecalhoConvite convite={convite} />
        <form onSubmit={handleConfirmar} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
              <input
                name="nome_completo" value={form.nome_completo}
                onChange={e => setForm(p => ({ ...p, nome_completo: e.target.value }))}
                onBlur={handleBlurField} required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input
                name="cpf" value={form.cpf}
                onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))}
                onBlur={handleBlurField} required placeholder="000.000.000-00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                name="telefone" value={form.telefone}
                onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
                onBlur={handleBlurField} placeholder="(00) 00000-0000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2 pt-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Endereço</p>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rua</label>
              <input
                name="rua" value={form.rua}
                onChange={e => setForm(p => ({ ...p, rua: e.target.value }))}
                onBlur={handleBlurField} placeholder="Rua das Flores, 123"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
              <input
                name="bairro" value={form.bairro}
                onChange={e => setForm(p => ({ ...p, bairro: e.target.value }))}
                onBlur={handleBlurField}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input
                name="cidade" value={form.cidade}
                onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))}
                onBlur={handleBlurField}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2 pt-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Escola / instituição</p>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Escola onde atua</label>
              <input
                name="escola" value={form.escola}
                onChange={e => setForm(p => ({ ...p, escola: e.target.value }))}
                onBlur={handleBlurField} placeholder="EMEF Nome da Escola"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone da escola</label>
              <input
                name="telefone_escola" value={form.telefone_escola}
                onChange={e => setForm(p => ({ ...p, telefone_escola: e.target.value }))}
                onBlur={handleBlurField} placeholder="(27) 3333-4444"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail da escola</label>
              <input
                type="email" name="email_escola" value={form.email_escola}
                onChange={e => setForm(p => ({ ...p, email_escola: e.target.value }))}
                onBlur={handleBlurField} placeholder="secretaria@escola.edu.br"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Formação (instituição/curso)</label>
              <input
                name="instituicao" value={form.instituicao}
                onChange={e => setForm(p => ({ ...p, instituicao: e.target.value }))}
                onBlur={handleBlurField} placeholder="Ex: Licenciatura em Ciências Biológicas — UFES"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documentos pessoais obrigatórios</p>
            <UploadCampo
              label="Identidade com foto e CPF"
              obrigatorio
              currentUrl={meuOrientador?.doc_identidade}
              uploading={uploading.doc_identidade}
              onUpload={f => handleUpload('doc_identidade', f)}
            />
            <UploadCampo
              label="Diploma de graduação de curso superior"
              obrigatorio
              currentUrl={meuOrientador?.doc_diploma}
              uploading={uploading.doc_diploma}
              onUpload={f => handleUpload('doc_diploma', f)}
            />
            <UploadCampo
              label="Comprovante de residência"
              obrigatorio
              currentUrl={meuOrientador?.doc_comprovante_residencia_url}
              uploading={uploading.doc_comprovante_residencia_url}
              onUpload={f => handleUpload('doc_comprovante_residencia_url', f)}
            />
            <UploadCampo
              label="Certidão de regularidade fiscal (CND)"
              obrigatorio
              currentUrl={meuOrientador?.doc_regularidade_url}
              uploading={uploading.doc_regularidade_url}
              onUpload={f => handleUpload('doc_regularidade_url', f)}
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documentos da substituição</p>
            <UploadCampo
              label="Declaração de Anuência da Direção da escola"
              obrigatorio
              currentUrl={anuencia?.url}
              uploading={enviandoAnuencia}
              onUpload={handleUploadAnuencia}
              extra={
                <button
                  type="button"
                  onClick={handleBaixarAnuencia}
                  className="flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline mb-1.5"
                >
                  <Download className="w-3 h-3" /> Baixar modelo já preenchido
                </button>
              }
            />
            <UploadCampo
              label="Declaração de Aceitação da Substituição"
              obrigatorio
              currentUrl={aceitacao?.url}
              uploading={enviandoAceitacao}
              onUpload={handleUploadAceitacao}
              extra={
                <button
                  type="button"
                  onClick={handleBaixarAceitacao}
                  className="flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline mb-1.5"
                >
                  <Download className="w-3 h-3" /> Baixar modelo já preenchido
                </button>
              }
            />
          </div>

          <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-3">
            <p className="text-xs text-blue-900">
              Ao confirmar, declaro estar ciente do Edital FACITEC vigente (item 16.2) e manifesto interesse em assumir a
              orientação deste projeto em substituição ao orientador anterior — esta confirmação vale como minha
              Manifestação de Interesse, assinada eletronicamente.
            </p>
          </div>

          {errorForm && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2 text-xs text-red-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {errorForm}
            </div>
          )}

          <button
            type="submit"
            disabled={confirmando}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {confirmando ? 'Confirmando...' : 'Confirmar e enviar para aprovação'}
          </button>
        </form>
      </div>
    </div>
  )
}
