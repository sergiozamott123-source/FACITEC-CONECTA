import { useEffect, useRef, useState } from 'react'
import { KeyRound, ShieldCheck, UserPlus, FileText, CheckCircle2, Upload } from 'lucide-react'
import { orientadorService } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const BUCKET_CONTRATOS = 'contratos-orientadores'

function sanitizarNomeArquivo(nome) {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9.\-_]/g, '_')
}

export function GerenciarUsuariosOrientadores() {
  const [orientadores, setOrientadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [uploadingId, setUploadingId] = useState(null)
  const [erro, setErro] = useState(null)
  const [resultado, setResultado] = useState(null) // { nome, email, senhaTemporaria }
  const [verTodos, setVerTodos] = useState(false)

  // Orientador "de verdade" (selecionado na edição, não mero inscrito): tem
  // codigo_orientador atribuído — codigo_facitec está sempre vazio nesta
  // tabela e orientador.status não distingue selecionado de inscrito.
  const orientadoresExibidos = verTodos ? orientadores : orientadores.filter(o => o.codigo_orientador)

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

  async function handleUploadContrato(orientador, file) {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setErro('Envie o contrato em formato PDF.')
      return
    }
    setErro(null)
    setUploadingId(orientador.id)
    try {
      const nomeArquivo = sanitizarNomeArquivo(file.name)
      const path = `${orientador.id}/${nomeArquivo}`
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_CONTRATOS)
        .upload(path, file, { upsert: true, contentType: 'application/pdf' })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from(BUCKET_CONTRATOS).getPublicUrl(path)

      const { error: updateError } = await supabase
        .from('orientador')
        .update({ contrato_url: publicUrl, nome_arquivo_contrato: file.name })
        .eq('id', orientador.id)
      if (updateError) throw updateError

      await carregar()
    } catch (err) {
      setErro(err.message || 'Não foi possível enviar o contrato.')
    } finally {
      setUploadingId(null)
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? 'Carregando...' : `${orientadoresExibidos.length} orientador(es)`}
        </p>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <span>Ver todos os inscritos</span>
          <span
            role="switch"
            aria-checked={verTodos}
            onClick={() => setVerTodos(v => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${verTodos ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${verTodos ? 'translate-x-5' : 'translate-x-1'}`} />
          </span>
        </label>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Nome</th>
              <th className="text-left font-medium px-4 py-2.5">Código</th>
              <th className="text-left font-medium px-4 py-2.5">Acesso</th>
              <th className="text-left font-medium px-4 py-2.5">Contrato</th>
              <th className="text-right font-medium px-4 py-2.5">Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Carregando...</td></tr>
            )}
            {!loading && orientadoresExibidos.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Nenhum orientador {verTodos ? 'cadastrado' : 'selecionado nesta edição'}.</td></tr>
            )}
            {orientadoresExibidos.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="px-4 py-2.5">{o.nome_completo}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{o.codigo_orientador ?? '—'}</td>
                <td className="px-4 py-2.5">
                  {o.auth_user_id
                    ? <Badge variant="success" className="text-xs">Ativo</Badge>
                    : <Badge variant="secondary" className="text-xs">Sem acesso</Badge>}
                </td>
                <td className="px-4 py-2.5">
                  <ContratoCell
                    orientador={o}
                    uploading={uploadingId === o.id}
                    onUpload={file => handleUploadContrato(o, file)}
                  />
                </td>
                <td className="px-4 py-2.5 text-right">
                  {o.auth_user_id ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === o.id || !o.email}
                      onClick={() => chamarFuncao('resetar_senha', o)}
                    >
                      <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                      {busyId === o.id ? 'Gerando...' : 'Redefinir senha'}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === o.id || !o.email}
                      onClick={() => chamarFuncao('criar', o)}
                      title={!o.email ? 'Orientador sem e-mail cadastrado' : undefined}
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
        A conta é criada com o e-mail cadastrado do orientador — a senha temporária deve ser repassada por um canal seguro.
      </p>
    </div>
  )
}

function ContratoCell({ orientador, uploading, onUpload }) {
  const inputRef = useRef()

  return (
    <div className="flex items-center gap-2">
      {orientador.contrato_url ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
          <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={orientador.nome_arquivo_contrato}>
            {orientador.nome_arquivo_contrato ?? 'contrato.pdf'}
          </span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">Não enviado</span>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {orientador.contrato_url ? <FileText className="w-3.5 h-3.5 mr-1.5" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
        {uploading ? 'Enviando...' : orientador.contrato_url ? 'Substituir' : 'Enviar contrato assinado'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
