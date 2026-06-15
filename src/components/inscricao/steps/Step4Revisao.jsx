import { FileText, Pencil } from 'lucide-react'

const DOC_LABELS = {
  pdf_projeto: 'PDF do Projeto',
  diploma: 'Diploma / Titulação',
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

function Field({ label, value, wide }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground mt-0.5 break-words leading-relaxed">{value || '—'}</dd>
    </div>
  )
}

function CriterioField({ codigo, titulo, value }) {
  return (
    <div className="sm:col-span-2 space-y-0.5">
      <dt className="text-xs text-muted-foreground">
        <span className="font-semibold text-primary">{codigo}</span> — {titulo}
      </dt>
      <dd className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{value || '—'}</dd>
    </div>
  )
}

export function Step4Revisao({ formData, onGoTo }) {
  const { orientador, projeto, documentos } = formData
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
        <Field label="Título" value={projeto.titulo} wide />
        <Field label="Eixo Temático" value={projeto.eixo_tematico} />
        <div>
          <dt className="text-xs text-muted-foreground">Ineditismo</dt>
          <dd className="text-sm font-medium text-foreground mt-0.5">
            {projeto.ineditismo_inedito === 'sim'
              ? 'Projeto inédito — nunca apresentado ao FACITEC'
              : 'Já apresentado ao FACITEC em edição anterior'}
          </dd>
          {projeto.ineditismo_inedito === 'nao' && projeto.ineditismo_diferencial && (
            <dd className="text-sm text-foreground mt-1 leading-relaxed border-l-2 border-primary/30 pl-2">
              {projeto.ineditismo_diferencial}
            </dd>
          )}
        </div>
        <Field label="Objetivos" value={projeto.objetivos} wide />
        <CriterioField codigo="C1" titulo="Relevância para a Realidade Escolar" value={projeto.c1_relevancia} />
        <CriterioField codigo="C2" titulo="Potencial de Impacto" value={projeto.c2_impacto} />
        <CriterioField codigo="C3" titulo="Viabilidade Técnica e Econômica" value={projeto.c3_viabilidade} />
        <CriterioField codigo="C4" titulo="Grau de Inovação e Criatividade" value={projeto.c4_inovacao} />
      </Section>

      <div className="space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-semibold text-foreground">Documentos</h3>
          <button
            onClick={() => onGoTo(3)}
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
