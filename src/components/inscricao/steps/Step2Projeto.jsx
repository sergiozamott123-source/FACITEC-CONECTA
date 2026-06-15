import { FormField, Input, Textarea, Select } from '@/components/common/FormField'

const EIXOS = [
  'Tecnologia e Inovação',
  'Meio Ambiente e Sustentabilidade',
  'Saúde e Qualidade de Vida',
  'Educação e Desenvolvimento Humano',
  'Mobilidade e Infraestrutura Urbana',
  'Inclusão Social e Cidadania',
  'Economia Criativa e Cultural',
]

function CriterioField({ codigo, titulo, descricao, value, onChange, error }) {
  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-sm font-semibold text-foreground">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold mr-2">
            {codigo}
          </span>
          {titulo}
          <span className="text-destructive ml-0.5">*</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 ml-8">{descricao}</p>
      </div>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Descreva aqui..."
        className="min-h-[90px]"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function Step2Projeto({ data, onChange, errors = {} }) {
  const set = (field) => (e) => onChange({ [field]: e.target.value })
  const setVal = (field) => (val) => onChange({ [field]: val })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Dados do Projeto</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Preencha as informações do projeto e responda aos quatro critérios de avaliação.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Título do Projeto" required error={errors.titulo} className="sm:col-span-2">
          <Input
            value={data.titulo}
            onChange={set('titulo')}
            placeholder="Título completo do projeto"
          />
        </FormField>

        <FormField label="Eixo Temático" required error={errors.eixo_tematico}>
          <Select value={data.eixo_tematico} onChange={set('eixo_tematico')}>
            <option value="">Selecione o eixo...</option>
            {EIXOS.map(e => <option key={e} value={e}>{e}</option>)}
          </Select>
        </FormField>

        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium text-foreground block">Ineditismo</label>
          <div className="space-y-2">
            {[
              { value: 'sim', label: 'Sim, o projeto é inédito — nunca foi apresentado ao FACITEC' },
              { value: 'nao', label: 'Não, este projeto já foi apresentado ao FACITEC em edição anterior' },
            ].map(opt => (
              <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="ineditismo_inedito"
                  value={opt.value}
                  checked={data.ineditismo_inedito === opt.value}
                  onChange={() => onChange({ ineditismo_inedito: opt.value, ineditismo_diferencial: '' })}
                  className="mt-0.5 accent-primary"
                />
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>

          {data.ineditismo_inedito === 'nao' && (
            <div className="mt-3 pl-5 border-l-2 border-primary/30 space-y-1.5">
              <label className="text-sm font-medium text-foreground block">
                O que há de novo nesta proposta em relação à edição anterior?
                <span className="text-destructive ml-0.5">*</span>
              </label>
              <Textarea
                value={data.ineditismo_diferencial}
                onChange={e => onChange({ ineditismo_diferencial: e.target.value })}
                placeholder="Descreva os avanços e diferenças em relação à edição anterior"
                className="min-h-[80px]"
              />
              {errors.ineditismo_diferencial && (
                <p className="text-xs text-destructive">{errors.ineditismo_diferencial}</p>
              )}
            </div>
          )}
        </div>

        <FormField label="Objetivos do Projeto" required error={errors.objetivos} className="sm:col-span-2">
          <Textarea
            value={data.objetivos}
            onChange={set('objetivos')}
            placeholder="Descreva os objetivos gerais e específicos do projeto"
          />
        </FormField>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Critérios de Avaliação</p>
        <p className="text-xs text-muted-foreground">
          Responda a cada critério com clareza e objetividade. Estes campos são avaliados pela banca.
        </p>
      </div>

      <div className="grid gap-5">
        <CriterioField
          codigo="C1"
          titulo="Relevância para a Realidade Escolar"
          descricao="Como o projeto aborda um problema real vivenciado na escola?"
          value={data.c1_relevancia}
          onChange={setVal('c1_relevancia')}
          error={errors.c1_relevancia}
        />
        <CriterioField
          codigo="C2"
          titulo="Potencial de Impacto"
          descricao="Como a solução pode melhorar a experiência de alunos, professores ou funcionários?"
          value={data.c2_impacto}
          onChange={setVal('c2_impacto')}
          error={errors.c2_impacto}
        />
        <CriterioField
          codigo="C3"
          titulo="Viabilidade Técnica e Econômica"
          descricao="Por que o projeto é viável com os recursos disponíveis?"
          value={data.c3_viabilidade}
          onChange={setVal('c3_viabilidade')}
          error={errors.c3_viabilidade}
        />
        <CriterioField
          codigo="C4"
          titulo="Grau de Inovação e Criatividade"
          descricao="O que diferencia este projeto de soluções já existentes?"
          value={data.c4_inovacao}
          onChange={setVal('c4_inovacao')}
          error={errors.c4_inovacao}
        />
      </div>
    </div>
  )
}
