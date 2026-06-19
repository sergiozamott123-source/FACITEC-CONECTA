import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useOrientador } from '@/contexts/OrientadorContext'
import { supabase } from '@/lib/supabase'

const REDIRECT_URL = 'http://localhost:5173/candidato/redefinir-senha'

export function LoginCandidato() {
  const { login } = useOrientador()
  const navigate = useNavigate()

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
      navigate('/candidato/meus-recursos')
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
    setForgotEmail(email)
    setForgotError(null)
    setForgotSent(false)
    setError(null)
  }

  const switchToLogin = () => {
    setView('login')
    setError(null)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0c2358 0%, #1a3f72 100%)' }}>
      <header className="px-6 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">FACITEC Conecta</p>
            <p className="text-white/60 text-xs leading-tight">Portal do Candidato</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Área do Candidato</h1>
            <p className="text-white/70 text-sm mt-1">
              Programa de Iniciação Científica Júnior · PibicJr 2026
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-2xl p-6 space-y-4">
            {view === 'login' ? (
              <>
                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={switchToForgot}
                    className="text-sm text-blue-600 hover:underline"
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
                  <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                    E-mail enviado! Verifique sua caixa de entrada e clique no link recebido.
                    O link expira em 1 hora.
                  </div>
                ) : (
                  <>
                    {forgotError && (
                      <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    className="text-sm text-blue-600 hover:underline"
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
        <p className="text-white/40 text-xs">
          Fundo Municipal de Ciência e Tecnologia de Vitória/ES · CDTIV
        </p>
      </footer>
    </div>
  )
}
