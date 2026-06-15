import { FileText, Pencil } from 'lucide-react'

const DOC_LABELS = {
  plano_trabalho: 'Plano de Trabalho',
  carta_anuencia: 'Carta de Anuência',
  historico_escolar: 'Histórico Escolar',
  doc_identidade: 'Documento de Identidade',
  comprovante_matricula: 'Comprovante de Matrícula',
}

function Section({ title, step, onEdit, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <button
          onClick={() => onEdit(step)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Pencil className="w-3 h-3" />
          Editar
        </button>
      </div>
      <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {children}
      </dl>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground mt-0.5 break-words">{value || '—'}</dd>
    </div>
  )
}

export function Step5Revisao({ formData, onGoTo }) {
  const { orientador, projeto, aluno, documentos } = formData
  const docsEnviados = Object.entries(documentos).filter(([, v]) => v)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Revisão da Inscrição</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Verifique todas as informações antes de enviar.
        </p>
      </div>

      <Section title="Orientador" step={1} onEdit={onGoTo}>
        <Field label="Nome" value={orientador.nome_completo} />
        <Field label="E-mail" value={orientador.email} />
        <Field label="Titulação" value={orientador.titulacao} />
        <Field label="CPF" value={orientador.cpf} />
        <Field label="Telefone" value={orientador.telefone} />
        <Field label="Instituição" value={orientador.instituicao} />
      </Section>

      <Section title="Projeto" step={2} onEdit={onGoTo}>
        <Field label="Título" value={projeto.titulo} />
        <Field label="Área do Conhecimento" value={projeto.area_conhecimento} />
        <Field label="Palavras-chave" value={projeto.palavras_chave} />
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Resumo</dt>
          <dd className="text-sm text-foreground mt-0.5 leading-relaxed">{projeto.resumo || '—'}</dd>
        </div>
      </Section>

      <Section title="Aluno" step={3} onEdit={onGoTo}>
        <Field label="Nome" value={aluno.nome_completo} />
        <Field label="CPF" value={aluno.cpf} />
        <Field label="RG" value={aluno.rg} />
        <Field label="E-mail" value={aluno.email} />
        <Field label="Telefone" value={aluno.telefone} />
        <Field label="Escola" value={aluno.escola} />
        <Field label="Série/Ano" value={aluno.serie} />
        <Field label="Período" value={aluno.periodo_bolsa} />
      </Section>

      <div className="space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-semibold text-foreground">Documentos</h3>
          <button
            onClick={() => onGoTo(4)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Pencil className="w-3 h-3" />
            Editar
          </button>
        </div>
        {docsEnviados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento enviado.</p>
        ) : (
          <div className="grid gap-2">
            {docsEnviados.map(([key, path]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span className="text-muted-foreground shrink-0">{DOC_LABELS[key]}:</span>
                <span className="font-medium truncate">{path.split('/').pop().replace(/_\d+\./, '.')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
