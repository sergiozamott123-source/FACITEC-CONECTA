import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { FormField, Input, ErrorAlert } from '@/components/common/FormField'
import { InscricaoLayout } from '@/components/inscricao/InscricaoLayout'

export function LoginInscricao() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    navigate('/inscricao/formulario')
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return }
    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro, depois faça login.')
    setTab('login')
    setPassword('')
    setConfirmPassword('')
  }

  const switchTab = (t) => { setTab(t); setError(null); setSuccess(null) }

  return (
    <InscricaoLayout>
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Portal de Inscrições</h1>
          <p className="text-white/70 text-sm mt-1">
            Programa de Iniciação Científica Júnior · PibicJr
          </p>
        </div>

        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="grid grid-cols-2 border-b">
            {[
              { id: 'login', label: 'Entrar' },
              { id: 'register', label: 'Criar conta' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`py-3.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-4">
            {success && (
              <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                {success}
              </div>
            )}
            <ErrorAlert message={error} />

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <FormField label="E-mail" required>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoFocus
                  />
                </FormField>
                <FormField label="Senha" required>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    required
                  />
                </FormField>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <FormField label="E-mail" required>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoFocus
                  />
                </FormField>
                <FormField label="Senha" required>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </FormField>
                <FormField label="Confirmar Senha" required>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    required
                  />
                </FormField>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Criando conta...' : 'Criar conta'}
                </Button>
              </form>
            )}
          </div>
        </div>

        <p className="text-white/50 text-xs text-center max-w-xs">
          Ao criar uma conta, você poderá salvar seu progresso e retomar a inscrição a qualquer momento.
        </p>
      </div>
    </InscricaoLayout>
  )
}
