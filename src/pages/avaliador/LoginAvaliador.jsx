import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAvaliador } from '@/contexts/AvaliadorContext'
import { supabase } from '@/lib/supabase'

const REDIRECT_URL = 'http://localhost:5173/avaliador/redefinir-senha'

export function LoginAvaliador() {
  const { login } = useAvaliador()
  const navigate = useNavigate()

  // view: 'login' | 'forgot'
  const [view, setView] = useState('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState(null)
  const [forgotSent, setForgotSent] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/avaliador/projetos')
    } catch {
      setError('E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setForgotError(null)
    setForgotLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: REDIRECT_URL,
    })
    setForgotLoading(false)
    if (error) { setForgotError(error.message); return }
    setForgotSent(true)
  }

  const switchToForgot = () => {
    setView('forgot')
    setForgotEmail(email) // aproveita e-mail já digitado, se houver
    setForgotError(null)
    setForgotSent(false)
    setError(null)
  }

  const switchToLogin = () => {
    setView('login')
    setError(null)
  }

  // Visual de entrada no padrão do Portal CCAD (pedido do Sérgio, 17/11/2026):
  // fundo azul-marinho liso, assinatura branca grande, cartão branco.
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
            <h1 className="text-2xl font-bold text-white">Área do Avaliador</h1>
            <p className="text-sm mt-1 text-[var(--dv-texto-suave-escuro)]">
              FACITEC Conecta · Portal do Avaliador
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-4">
            {view === 'login' ? (
              <>
                {error && (
                  <div className="rounded-md bg-[var(--dv-erro-fundo)] border border-[var(--dv-erro-fundo)] px-4 py-3 text-sm text-[var(--dv-erro)]">
                    {error}
                  </div>
                )}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      E-mail <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      autoFocus
                      className="w-full px-3 py-2 min-h-[40px] border border-[var(--dv-borda)] rounded-md text-sm text-[var(--dv-texto)] focus:outline-none focus:border-[var(--dv-primaria)] focus:ring-2 focus:ring-[var(--dv-primaria-clara)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Senha <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      required
                      className="w-full px-3 py-2 min-h-[40px] border border-[var(--dv-borda)] rounded-md text-sm text-[var(--dv-texto)] focus:outline-none focus:border-[var(--dv-primaria)] focus:ring-2 focus:ring-[var(--dv-primaria-clara)]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-[var(--dv-primaria)] text-white text-sm font-semibold rounded-md hover:bg-[var(--dv-primaria-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={switchToForgot}
                    className="text-sm text-[var(--dv-primaria-texto)] hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Recuperar senha</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Informe seu e-mail cadastrado e enviaremos um link para redefinir a senha.
                  </p>
                </div>

                {forgotSent ? (
                  <div className="rounded-md bg-[var(--dv-sucesso-fundo)] border border-[var(--dv-sucesso-fundo)] px-4 py-3 text-sm text-[var(--dv-sucesso)]">
                    E-mail enviado! Verifique sua caixa de entrada e clique no link recebido.
                    O link expira em 1 hora.
                  </div>
                ) : (
                  <>
                    {forgotError && (
                      <div className="rounded-md bg-[var(--dv-erro-fundo)] border border-[var(--dv-erro-fundo)] px-4 py-3 text-sm text-[var(--dv-erro)]">
                        {forgotError}
                      </div>
                    )}
                    <form onSubmit={handleForgot} className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          E-mail <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          placeholder="seu@email.com"
                          required
                          autoFocus
                          className="w-full px-3 py-2 min-h-[40px] border border-[var(--dv-borda)] rounded-md text-sm text-[var(--dv-texto)] focus:outline-none focus:border-[var(--dv-primaria)] focus:ring-2 focus:ring-[var(--dv-primaria-clara)]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="w-full py-2.5 px-4 bg-[var(--dv-primaria)] text-white text-sm font-semibold rounded-md hover:bg-[var(--dv-primaria-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {forgotLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                      </button>
                    </form>
                  </>
                )}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={switchToLogin}
                    className="text-sm text-[var(--dv-primaria-texto)] hover:underline"
                  >
                    ← Voltar ao login
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 text-center">
        <p className="text-xs text-[var(--dv-texto-suave-escuro)] opacity-70">
          Fundo Municipal de Ciência e Tecnologia de Vitória/ES · CDTIV
        </p>
      </footer>
    </div>
  )
}
