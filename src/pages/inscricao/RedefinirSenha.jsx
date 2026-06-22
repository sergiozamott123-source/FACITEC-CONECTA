import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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

export function RedefinirSenha() {
  const navigate = useNavigate()

  // 'loading' → aguardando token do Supabase processar o hash da URL
  // 'ready'   → token válido, exibe formulário
  // 'invalid' → link expirado ou inválido
  // 'success' → senha redefinida com sucesso
  const [status, setStatus]   = useState('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)

  const strength = passwordStrength(password)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStatus('ready')
    })

    // Fallback: token já processado antes do listener ser registrado
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStatus(prev => prev === 'loading' ? 'ready' : prev)
    })

    // Após 8 s sem evento válido, considera link inválido/expirado
    const timeout = setTimeout(() => {
      setStatus(prev => prev === 'loading' ? 'invalid' : prev)
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6)  { setError('A senha deve ter no mínimo 6 caracteres.'); return }
    setSaving(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (err) { setError(err.message); return }
    setStatus('success')
    setTimeout(() => navigate('/inscricao'), 3000)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0c2358 0%, #1a3f72 100%)' }}>
      <header className="px-6 py-4 shrink-0">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">FACITEC Conecta</p>
            <p className="text-white/60 text-xs leading-tight">Ficha de Inscrição · PibicJr</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Redefinir senha</h1>
            <p className="text-white/70 text-sm mt-1">Crie uma nova senha para acessar sua inscrição.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-4">
            {status === 'loading' && (
              <p className="text-sm text-gray-500 text-center py-6">
                Validando link de recuperação…
              </p>
            )}

            {status === 'invalid' && (
              <div className="text-center space-y-3 py-4">
                <p className="text-sm text-red-700 font-medium">
                  Este link de recuperação é inválido ou já expirou.
                </p>
                <p className="text-xs text-gray-500">
                  Links de recuperação expiram em 1 hora após o envio.
                  Solicite um novo na tela de inscrição.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/inscricao')}
                  className="text-sm text-blue-600 hover:underline"
                >
                  ← Voltar à inscrição
                </button>
              </div>
            )}

            {status === 'ready' && (
              <>
                <p className="text-sm text-gray-600">
                  Escolha uma nova senha para sua conta.
                </p>

                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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

                    {password && (
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
                    <p className="text-xs text-gray-400 mt-1.5">
                      Use ao menos 8 caracteres combinando letras, números e símbolos (!@#$%) para uma senha segura.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    {confirm && password !== confirm && (
                      <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={saving || password !== confirm || !password}
                    className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Salvando…' : 'Salvar nova senha'}
                  </button>
                </form>
              </>
            )}

            {status === 'success' && (
              <div className="text-center space-y-3 py-4">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <p className="text-sm font-semibold text-gray-800">Senha alterada com sucesso!</p>
                <p className="text-xs text-gray-500">Redirecionando para a inscrição…</p>
              </div>
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
