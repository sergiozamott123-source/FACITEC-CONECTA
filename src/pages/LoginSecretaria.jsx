import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSecretaria } from '@/contexts/SecretariaAuthContext'
import { supabase } from '@/lib/supabase'
import LogoFacitecConecta from '@/components/orientador/LogoFacitecConecta'

export function LoginSecretaria() {
  const { login } = useSecretaria()
  const navigate = useNavigate()

  // view: 'login' | 'forgot'
  const [view, setView] = useState('login')

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
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
      await login(email, senha)
      navigate('/admin')
    } catch (err) {
      setError(err.message || 'Não foi possível entrar. Verifique seus dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setForgotError(null)
    setForgotLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/login/secretaria/redefinir-senha`,
    })
    setForgotLoading(false)
    if (error) { setForgotError('Não foi possível enviar o e-mail de recuperação. Tente novamente.'); return }
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
    <div
      className="min-h-screen flex flex-col bg-cover bg-center"
      style={{
        backgroundColor: '#0f1e2d',
        backgroundImage: `linear-gradient(180deg, rgba(15,30,45,0.30) 0%, rgba(15,30,45,0.45) 55%, rgba(10,20,32,0.68) 100%), url('/images/hero-vitoria.jpg')`,
      }}
    >
      <header className="px-6 py-6 flex justify-center">
        <LogoFacitecConecta size="sm" inverted />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Secretaria executiva</h1>
            <p className="text-white/70 text-sm mt-1">
              Gestão dos programas, bolsistas e relatórios
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
                      placeholder="seuemail@facitec.vitoria.es.gov.br"
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
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
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
                          placeholder="seuemail@facitec.vitoria.es.gov.br"
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
