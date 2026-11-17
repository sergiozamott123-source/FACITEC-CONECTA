// Login, recuperação de senha e controle de acesso da equipe da
// Pesquisa Banheiros Públicos. Entra quem é Secretaria ou quem está em
// modulo_acesso com modulo = 'pesquisa-banheiros' (ver o SQL de setup).
import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { temAcesso } from '@/lib/pesquisaBanheiros/api'

const Ctx = createContext(null)
export const useEquipePesquisa = () => useContext(Ctx)

export function RequireAcessoPesquisa({ children }) {
  const [estado, setEstado] = useState({ carregando: true })

  useEffect(() => {
    let ativo = true
    async function checar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { if (ativo) setEstado({ carregando: false, ok: false }); return }
      try {
        const [ok, papel] = await Promise.all([
          temAcesso(),
          supabase.rpc('get_my_role').then((r) => r.data ?? null),
        ])
        if (ativo) setEstado({ carregando: false, ok: !!ok, email: session.user.email, secretaria: papel === 'secretaria' })
      } catch {
        if (ativo) setEstado({ carregando: false, ok: false })
      }
    }
    checar()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT' && ativo) setEstado({ carregando: false, ok: false })
    })
    return () => { ativo = false; subscription.unsubscribe() }
  }, [])

  if (estado.carregando) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-400 text-sm">Verificando acesso...</p></div>
  }
  if (!estado.ok) return <Navigate to="/login/pesquisa-banheiros" replace />
  return <Ctx.Provider value={estado}>{children}</Ctx.Provider>
}

// Visual de entrada no padrão do Portal CCAD (pedido do Sérgio, 17/11/2026):
// fundo azul-marinho liso, assinatura branca grande, cartão branco.
function Moldura({ titulo, subtitulo, children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--dv-marinho)]">
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img
              src="/identidade/facitec-conecta-assinatura-branca.svg"
              alt="FACITEC Conecta"
              className="h-14 sm:h-20 w-auto mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-white">{titulo}</h1>
            <p className="text-sm mt-1 text-[var(--dv-texto-suave-escuro)]">{subtitulo}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-4">{children}</div>
        </div>
      </main>
    </div>
  )
}

const campo = 'w-full px-3 py-2 min-h-[40px] border border-[var(--dv-borda)] rounded-md text-sm text-[var(--dv-texto)] focus:outline-none focus:border-[var(--dv-primaria)] focus:ring-2 focus:ring-[var(--dv-primaria-clara)]'
const botaoPrimario = 'w-full py-2.5 rounded-md bg-[var(--dv-primaria)] text-white text-sm font-semibold hover:bg-[var(--dv-primaria-hover)] disabled:opacity-50'
const aviso = (tipo, texto) => (
  <div className={`rounded-md px-4 py-3 text-sm border ${tipo === 'erro' ? 'bg-[var(--dv-erro-fundo)] border-[var(--dv-erro-fundo)] text-[var(--dv-erro)]' : 'bg-[var(--dv-sucesso-fundo)] border-[var(--dv-sucesso-fundo)] text-[var(--dv-sucesso)]'}`}>{texto}</div>
)

export function LoginPesquisa() {
  const navigate = useNavigate()
  const [view, setView] = useState('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [ok, setOk] = useState(null)
  const [carregando, setCarregando] = useState(false)

  async function entrar(e) {
    e.preventDefault(); setErro(null); setCarregando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    if (error) { setErro('E-mail ou senha incorretos.'); setCarregando(false); return }
    const acesso = await temAcesso().catch(() => false)
    if (!acesso) {
      await supabase.auth.signOut()
      setErro('Esta conta não tem acesso à Pesquisa Banheiros Públicos. Fale com a Secretaria Executiva do FACITEC.')
      setCarregando(false); return
    }
    navigate('/pesquisa-banheiros/painel')
  }

  async function recuperar(e) {
    e.preventDefault(); setErro(null); setCarregando(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login/pesquisa-banheiros/redefinir-senha`,
    })
    setCarregando(false)
    if (error) setErro('Não foi possível enviar o e-mail de recuperação. Tente novamente.')
    else setOk('Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.')
  }

  return (
    <Moldura titulo="Pesquisa Banheiros Públicos" subtitulo="Acesso da equipe da CDTIV">
      {erro && aviso('erro', erro)}
      {ok && aviso('ok', ok)}
      <form onSubmit={view === 'login' ? entrar : recuperar} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="pb-email" className="block text-sm font-medium text-gray-700">E-mail</label>
          <input id="pb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus className={campo} placeholder="seuemail@cdtiv.com.br" />
        </div>
        {view === 'login' && (
          <div className="space-y-1">
            <label htmlFor="pb-senha" className="block text-sm font-medium text-gray-700">Senha</label>
            <input id="pb-senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required className={campo} />
          </div>
        )}
        <button disabled={carregando} className={botaoPrimario}>
          {carregando ? 'Aguarde…' : view === 'login' ? 'Entrar' : 'Enviar link de recuperação'}
        </button>
      </form>
      <div className="flex justify-between text-sm">
        <button type="button" className="text-[var(--dv-primaria-texto)] underline" onClick={() => navigate('/')}>← Voltar ao portal</button>
        <button type="button" className="text-[var(--dv-primaria-texto)] underline" onClick={() => { setView(view === 'login' ? 'recuperar' : 'login'); setErro(null); setOk(null) }}>
          {view === 'login' ? 'Esqueci minha senha' : 'Voltar ao login'}
        </button>
      </div>
    </Moldura>
  )
}

export function RedefinirSenhaPesquisa() {
  const navigate = useNavigate()
  const [pronto, setPronto] = useState(false)
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [erro, setErro] = useState(null)
  const [feito, setFeito] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY' || evento === 'SIGNED_IN') setPronto(true)
    })
    supabase.auth.getSession().then(({ data }) => { if (data.session) setPronto(true) })
    return () => subscription.unsubscribe()
  }, [])

  async function salvar(e) {
    e.preventDefault(); setErro(null)
    if (senha.length < 8) { setErro('A senha precisa ter pelo menos 8 caracteres.'); return }
    if (senha !== senha2) { setErro('As senhas não conferem.'); return }
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) { setErro('Não foi possível salvar a nova senha. Peça um novo link.'); return }
    setFeito(true)
    setTimeout(() => navigate('/pesquisa-banheiros/painel'), 2000)
  }

  return (
    <Moldura titulo="Nova senha" subtitulo="Pesquisa Banheiros Públicos">
      {!pronto && <p className="text-sm text-gray-500">Validando o link…</p>}
      {erro && aviso('erro', erro)}
      {feito && aviso('ok', 'Senha alterada. Abrindo o painel…')}
      {pronto && !feito && (
        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="pb-s1" className="block text-sm font-medium text-gray-700">Nova senha</label>
            <input id="pb-s1" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className={campo} required />
          </div>
          <div className="space-y-1">
            <label htmlFor="pb-s2" className="block text-sm font-medium text-gray-700">Repita a nova senha</label>
            <input id="pb-s2" type="password" value={senha2} onChange={(e) => setSenha2(e.target.value)} className={campo} required />
          </div>
          <button className={botaoPrimario}>Salvar senha</button>
        </form>
      )}
    </Moldura>
  )
}
