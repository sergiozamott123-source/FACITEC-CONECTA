import { useEffect, useState } from 'react'
import { KeyRound, ShieldCheck, UserPlus } from 'lucide-react'
import { orientadorService } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function GerenciarUsuariosOrientadores() {
  const [orientadores, setOrientadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [erro, setErro] = useState(null)
  const [resultado, setResultado] = useState(null) // { nome, email, senhaTemporaria }

  async function carregar() {
    setLoading(true)
    try {
      const { data } = await orientadorService.list()
      setOrientadores(data ?? [])
    } catch (err) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function chamarFuncao(action, orientador) {
    setErro(null)
    setBusyId(orientador.id)
    try {
      const { data, error } = await supabase.functions.invoke('criar-acesso-orientador', {
        body: { action, orientador_id: orientador.id },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setResultado({ nome: orientador.nome_completo, ...data })
      await carregar()
    } catch (err) {
      setErro(err.message || 'Não foi possível concluir a operação.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Usuários orientadores</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Crie o acesso ao Portal do Orientador para cada orientador já cadastrado, ou gere uma nova senha temporária.
        </p>
      </div>

      {erro && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {erro}
        </div>
      )}

      {resultado && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-900 space-y-1">
          <p className="font-semibold">Acesso pronto para {resultado.nome}</p>
          <p>E-mail de login: <span className="font-mono">{resultado.email}</span></p>
          <p>Senha temporária: <span className="font-mono">{resultado.senhaTemporaria}</span></p>
          <p className="text-xs text-green-700">
            Anote e repasse ao orientador agora — esta senha não será mostrada novamente.
          </p>
          <button
            type="button"
            onClick={() => setResultado(null)}
            className="text-xs text-green-700 underline mt-1"
          >
            Fechar
          </button>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Nome</th>
              <th className="text-left font-medium px-4 py-2.5">Código</th>
              <th className="text-left font-medium px-4 py-2.5">Acesso</th>
              <th className="text-right font-medium px-4 py-2.5">Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Carregando...</td></tr>
            )}
            {!loading && orientadores.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Nenhum orientador cadastrado.</td></tr>
            )}
            {orientadores.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="px-4 py-2.5">{o.nome_completo}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{o.codigo_orientador ?? '—'}</td>
                <td className="px-4 py-2.5">
                  {o.auth_user_id
                    ? <Badge variant="success" className="text-xs">Ativo</Badge>
                    : <Badge variant="secondary" className="text-xs">Sem acesso</Badge>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {o.auth_user_id ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === o.id || !o.codigo_orientador}
                      onClick={() => chamarFuncao('resetar_senha', o)}
                    >
                      <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                      {busyId === o.id ? 'Gerando...' : 'Redefinir senha'}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === o.id || !o.codigo_orientador}
                      onClick={() => chamarFuncao('criar', o)}
                      title={!o.codigo_orientador ? 'Orientador sem código de acesso cadastrado' : undefined}
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                      {busyId === o.id ? 'Criando...' : 'Criar acesso'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5" />
        A conta é criada com um e-mail de acesso derivado do código do orientador — a senha temporária deve ser repassada por um canal seguro.
      </p>
    </div>
  )
}
