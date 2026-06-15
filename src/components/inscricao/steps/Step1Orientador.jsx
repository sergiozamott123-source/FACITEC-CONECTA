import { FormField, Input, Select } from '@/components/common/FormField'

const TITULACOES = ['Graduado', 'Especialista', 'Mestre (MSc)', 'Doutor (Dr)', 'Pós-Doutor']

export function Step1Orientador({ data, onChange, errors = {} }) {
  const set = (field) => (e) => onChange({ [field]: e.target.value })

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Dados do Orientador</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Informações do professor/pesquisador responsável pelo projeto.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nome Completo" required error={errors.nome_completo} className="sm:col-span-2">
          <Input
            value={data.nome_completo}
            onChange={set('nome_completo')}
            placeholder="Nome completo do orientador"
          />
        </FormField>

        <FormField label="E-mail Institucional" required error={errors.email}>
          <Input
            type="email"
            value={data.email}
            onChange={set('email')}
            placeholder="email@instituicao.br"
          />
        </FormField>

        <FormField label="Titulação" required error={errors.titulacao}>
          <Select value={data.titulacao} onChange={set('titulacao')}>
            <option value="">Selecione...</option>
            {TITULACOES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormField>

        <FormField label="CPF" required error={errors.cpf}>
          <Input
            value={data.cpf}
            onChange={set('cpf')}
            placeholder="000.000.000-00"
            maxLength={14}
          />
        </FormField>

        <FormField label="Telefone" error={errors.telefone}>
          <Input
            value={data.telefone}
            onChange={set('telefone')}
            placeholder="(27) 00000-0000"
          />
        </FormField>

        <FormField label="Instituição de Vínculo" required error={errors.instituicao} className="sm:col-span-2">
          <Input
            value={data.instituicao}
            onChange={set('instituicao')}
            placeholder="Nome da instituição de vínculo"
          />
        </FormField>
      </div>
    </div>
  )
}
