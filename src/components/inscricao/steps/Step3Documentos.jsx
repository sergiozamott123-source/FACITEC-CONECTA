import { useState } from 'react'
import { Upload, FileText, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const DOCS = [
  {
    key: 'pdf_projeto',
    label: 'PDF do Projeto',
    descricao: 'Documento completo do projeto de pesquisa (PDF)',
    required: true,
  },
  {
    key: 'diploma',
    label: 'Diploma ou Comprovante de Titulação do Orientador',
    descricao: 'Diploma de graduação ou pós-graduação (PDF ou imagem) — opcional',
    required: false,
  },
]

function FileUploadField({ label, descricao, required, value, onUpload, onRemove, error }) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const handleChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      await onUpload(file)
    } catch (err) {
      setUploadError(err.message ?? 'Erro ao enviar arquivo')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const displayName = value ? value.split('/').pop().replace(/_\d+\./, '.') : ''

  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </p>
        <p className="text-xs text-muted-foreground">{descricao}</p>
      </div>

      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-primary/30 bg-primary/5">
          <FileText className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm text-foreground flex-1 truncate">{displayName}</span>
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className={cn(
          'flex flex-col items-center gap-2 py-5 px-3 rounded-md border-2 border-dashed cursor-pointer transition-colors',
          uploading ? 'border-primary/50 bg-primary/5 cursor-default' : 'border-border hover:border-primary/50 hover:bg-muted/50',
          (error || uploadError) ? 'border-destructive/50' : ''
        )}>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
            onChange={handleChange}
            disabled={uploading}
          />
          {uploading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Upload className="w-5 h-5 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {uploading ? 'Enviando...' : 'Clique para selecionar (PDF, JPG, PNG)'}
          </span>
        </label>
      )}

      {(error || uploadError) && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error || uploadError}
        </div>
      )}
    </div>
  )
}

export function Step3Documentos({ data, onUpload, onRemove, errors = {} }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Documentos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Faça o upload dos documentos necessários para esta etapa. Os demais documentos serão solicitados após a seleção do projeto.
        </p>
      </div>

      <div className="grid gap-6">
        {DOCS.map(doc => (
          <FileUploadField
            key={doc.key}
            label={doc.label}
            descricao={doc.descricao}
            required={doc.required}
            value={data[doc.key]}
            onUpload={(file) => onUpload(doc.key, file)}
            onRemove={() => onRemove(doc.key)}
            error={errors[doc.key]}
          />
        ))}
      </div>
    </div>
  )
}
