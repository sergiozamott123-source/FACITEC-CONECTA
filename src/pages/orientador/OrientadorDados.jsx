import { useState } from 'react'
import { Save, User } from 'lucide-react'
import { OrientadorSidebar } from './OrientadorSidebar'
import { usePortalOrientador } from '@/contexts/PortalOrientadorContext'
import { supabase } from '@/lib/supabase'

export function OrientadorDados() {
  const { orientador, setOrientador } = usePortalOrientador()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    nome_completo: orientador?.nome_completo ?? '',
    email: orientador?.email ?? '',
    cpf: orientador?.cpf ?? '',
    telefone: orientador?.telefone ?? '',
    instituicao: orientador?.instituicao ?? '',
  })

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)
    const { data, error: err } = await supabase
      .from('orientador')
      .update({
        nome_completo: form.nome_completo,
        telefone: form.telefone,
        instituicao: form.instituicao,
      })
      .eq('id', orientador.id)
      .select()
      .single()
    setSaving(false)
    if (err) { setError('Erro ao salvar. Tente novamente.'); return }
    setOrientador(data)
    setEditing(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  const campos = [
    { label: 'Nome completo', name: 'nome_completo', editable: true },
    { label: 'E-mail', name: 'email', editable: false, type: 'email' },
    { label: 'CPF', name: 'cpf', editable: false },
    { label: 'Telefone', name: 'telefone', editable: true },
    { label: 'Instituição', name: 'instituicao', editable: true },
  ]

  return (
    <div className="min-h-screen flex bg-gray-50">
      <OrientadorSidebar />

      <main className="flex-1 ml-[200px] p-6">
        <div className="max-w-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Meus dados</h1>
              <p className="text-sm text-gray-500 mt-0.5">Informações pessoais do orientador</p>
            </div>
            {!editing && (
              <button
                onClick={() => { setEditing(true); setSuccess(false) }}
                className="px-4 py-2 text-sm font-medium text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Editar
              </button>
            )}
          </div>

          {success && (
            <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              Dados atualizados com sucesso.
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white text-base font-bold">
                  {orientador?.nome_completo?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? <User className="w-5 h-5" />}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{orientador?.nome_completo ?? '—'}</p>
                <p className="text-xs text-gray-500">{orientador?.codigo_orientador ?? ''}</p>
              </div>
            </div>

            {editing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {campos.map(({ label, name, editable, type }) => (
                  <div key={name} className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">{label}</label>
                    <input
                      type={type ?? 'text'}
                      name={name}
                      value={form[name]}
                      onChange={handleChange}
                      disabled={!editable}
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        editable
                          ? 'border-gray-300 bg-white'
                          : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                      }`}
                    />
                    {!editable && (
                      <p className="text-[11px] text-gray-400">Este campo não pode ser alterado.</p>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <dl className="space-y-3">
                {campos.map(({ label, name }) => (
                  <div key={name} className="flex items-start gap-4">
                    <dt className="text-sm text-gray-500 w-32 shrink-0">{label}</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {orientador?.[name] || <span className="text-gray-400">Não informado</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
