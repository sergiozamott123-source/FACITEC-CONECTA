import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function RedefinirSenhaAvaliador() {
  const navigate = useNavigate()

  // 'loading' → aguardando token do Supabase
  // 'ready'   → token válido, exibe formulário
  // 'invalid' → link expirado ou inválido
  // 'success' → senha redefinida com sucesso
  const [status, setStatus] = useState('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // O Supabase processa o hash da URL automaticamente.
    // onAuthStateChange dispara PASSWORD_RECOVERY quando o link de e-mail é válido.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStatus('ready')
    })

    // Fallback: se a sessão já estava ativa antes do listener ser registrado
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStatus('ready')
    })

    // Após 8 segundos sem token válido, considera link inválido/expirado
    const timeout = setTimeout(() => {
      setStatus(prev => prev === 'loading' ? 'invalid' : prev)
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setStatus('success')
    setTimeout(() => navigate('/avaliador/projetos'), 2500)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0c2358 0%, #1a3f72 100%)' }}>
      <header className="px-6 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">FACITEC Conecta</p>
            <p className="text-white/60 text-xs leading-tight">Portal de Avaliadores</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Redefinir senha</h1>
            <p className="text-white/70 text-sm mt-1">
              FACITEC Conecta · Portal do Avaliador
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-2xl p-6 space-y-4">
            {status === 'loading' && (
              <p className="text-sm text-gray-500 text-center py-4">
                Validando link de recuperação...
              </p>
            )}

            {status === 'invalid' && (
              <div className="text-center space-y-3 py-2">
                <p className="text-sm text-red-700">
                  Este link de recuperação é inválido ou já expirou.
                </p>
                <p className="text-xs text-gray-500">
                  Links de recuperação expiram em 1 hora após o envio.
                  Solicite um novo na tela de login.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/avaliador/login')}
                  className="text-sm text-blue-600 hover:underline"
                >
                  ← Voltar ao login
                </button>
              </div>
            )}

            {status === 'ready' && (
              <>
                <div>
                  <p className="text-sm text-gray-600">
                    Escolha uma senha nova para sua conta. Mínimo de 6 caracteres.
                  </p>
                </div>
                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Nova senha <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      autoFocus
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Confirmar nova senha <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repita a senha"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Salvando...' : 'Salvar nova senha'}
                  </button>
                </form>
              </>
            )}

            {status === 'success' && (
              <div className="text-center space-y-3 py-2">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <p className="text-sm font-medium text-gray-800">Senha redefinida com sucesso!</p>
                <p className="text-xs text-gray-500">Redirecionando para seus projetos...</p>
              </div>
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
