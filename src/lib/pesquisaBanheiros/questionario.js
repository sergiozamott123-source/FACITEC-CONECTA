// ============================================================
// QUESTIONÁRIO DA PESQUISA BANHEIROS PÚBLICOS (CDTIV)
// Para mudar perguntas, edite este arquivo. Cada opção pode ter
// "nat": a natureza do problema que ela indica. Essas marcações
// alimentam a classificação da ficha (ver ficha.js).
//
// Naturezas: limpeza, manutencao, abastecimento, equipamento,
//            contrato_gestao, vandalismo_seguranca
// ============================================================

export const NATUREZAS = {
  limpeza: 'Limpeza',
  manutencao: 'Manutenção',
  abastecimento: 'Abastecimento',
  equipamento: 'Equipamento',
  contrato_gestao: 'Contrato e gestão',
  vandalismo_seguranca: 'Vandalismo e segurança',
};

const NAO_SEI = { v: 'nao_sei', t: 'Não sei' };

const problemasServidor = [
  { v: 'sujeira', t: 'Sujeira, limpeza insuficiente', nat: 'limpeza' },
  { v: 'hidraulica', t: 'Entupimento, vazamento, descarga ou torneira quebrada', nat: 'manutencao' },
  { v: 'esgotamento', t: 'Tanque cheio, esgotamento ou sucção atrasada', nat: 'manutencao' },
  { v: 'eletrica', t: 'Falta de luz, problema elétrico ou estrutural', nat: 'manutencao' },
  { v: 'agua', t: 'Falta de água', nat: 'abastecimento' },
  { v: 'insumos', t: 'Falta de papel, sabão ou outros insumos', nat: 'abastecimento' },
  { v: 'capacidade', t: 'Poucas unidades para o movimento, filas', nat: 'equipamento' },
  { v: 'acessibilidade', t: 'Falta de acessibilidade', nat: 'equipamento' },
  { v: 'desgaste', t: 'Material que não resiste (maresia, sol, uso intenso)', nat: 'equipamento' },
  { v: 'fechado', t: 'Fica fechado sem motivo claro ou fora do horário', nat: 'contrato_gestao' },
  { v: 'fiscalizacao', t: 'Empresa não cumpre o combinado, falta fiscalização', nat: 'contrato_gestao' },
  { v: 'depredacao', t: 'Depredação ou furto de peças', nat: 'vandalismo_seguranca' },
  { v: 'inseguranca', t: 'Insegurança ou uso indevido', nat: 'vandalismo_seguranca' },
];

// ------------------------------------------------------------
// QUESTIONÁRIO: SERVIDORES, FISCAIS E GESTORES DAS SECRETARIAS
// ------------------------------------------------------------
export const SERVIDOR = {
  id: 'servidor',
  titulo: 'Servidores, fiscais e gestores',
  intro:
    'Para quem tem banheiros públicos sob sua responsabilidade ou fiscaliza contrato de limpeza, manutenção, locação ou compra de banheiro. Leva cerca de 10 minutos.',
  blocos: [
    {
      titulo: 'O que você tem e o que falha',
      perguntas: [
        { id: 'setor', tipo: 'texto', obrigatoria: true, rotulo: 'Qual é a sua secretaria, setor ou área?', dica: 'ex: Semus, Semmam, Setger, Semcid' },
        { id: 'locais', tipo: 'texto_longo', obrigatoria: true, rotulo: 'Quais banheiros públicos ficam sob sua responsabilidade e onde estão?', dica: 'Liste os locais: praias, parques, praças, terminais, feiras, eventos.' },
        { id: 'tipologias', tipo: 'multipla', obrigatoria: true, rotulo: 'De que tipo são?', opcoes: [
          { v: 'fixo', t: 'Fixo, ligado à rede de esgoto' },
          { v: 'movel', t: 'Móvel' },
          { v: 'quimico', t: 'Químico' },
          { v: 'conteiner', t: 'Contêiner' }, NAO_SEI ] },
        { id: 'quantidade', tipo: 'texto', rotulo: 'Quantos são, mais ou menos?', dica: 'Pode deixar em branco se não souber.' },
        { id: 'problemas', tipo: 'multipla', obrigatoria: true, rotulo: 'O que mais dá problema neles?', dica: 'Marque tudo que acontece com frequência.', opcoes: problemasServidor },
        { id: 'principal', tipo: 'unica', obrigatoria: true, rotulo: 'Desses, qual é o problema que mais pesa?', opcoesDe: 'problemas' },
        { id: 'frequencia', tipo: 'unica', obrigatoria: true, rotulo: 'Com que frequência esse problema principal acontece?', opcoes: [
          { v: 'diario', t: 'Todo dia' }, { v: 'semanal', t: 'Algumas vezes por semana' },
          { v: 'mensal', t: 'Algumas vezes por mês' }, { v: 'raro', t: 'Raramente' }, NAO_SEI ] },
        { id: 'como_descobre', tipo: 'multipla', obrigatoria: true, rotulo: 'Como você fica sabendo que deu problema?', opcoes: [
          { v: 'reclamacao', t: 'Reclamação direta de usuário' },
          { v: 'ouvidoria', t: 'Ouvidoria ou 156' },
          { v: 'ronda', t: 'Ronda ou vistoria da equipe' },
          { v: 'empresa', t: 'Aviso da empresa contratada' },
          { v: 'redes', t: 'Redes sociais ou imprensa' },
          { v: 'ninguem', t: 'Ninguém avisa, só descubro depois', nat: 'contrato_gestao' }, NAO_SEI ] },
        { id: 'tempo', tipo: 'unica', obrigatoria: true, rotulo: 'Quanto tempo costuma levar até resolver?', opcoes: [
          { v: 'mesmo_dia', t: 'No mesmo dia' }, { v: 'dias', t: 'De 1 a 3 dias' },
          { v: 'semana', t: 'Até uma semana' }, { v: 'mais_semana', t: 'Mais de uma semana' },
          { v: 'nao_resolve', t: 'Muitas vezes fica sem resolver', nat: 'contrato_gestao' }, NAO_SEI ] },
        { id: 'sazonalidade', tipo: 'multipla', obrigatoria: true, rotulo: 'Tem época em que piora?', opcoes: [
          { v: 'verao', t: 'Verão e alta temporada' }, { v: 'fds', t: 'Fins de semana e feriados' },
          { v: 'eventos', t: 'Dias de evento' }, { v: 'chuva', t: 'Período de chuva' },
          { v: 'nao_varia', t: 'Não varia' }, NAO_SEI ] },
      ],
    },
    {
      titulo: 'Quem opera e o que o contrato cobre',
      perguntas: [
        { id: 'operador', tipo: 'unica', obrigatoria: true, rotulo: 'Quem opera os banheiros na prática?', opcoes: [
          { v: 'servidor', t: 'Servidores da Prefeitura' }, { v: 'empresa', t: 'Empresa contratada' },
          { v: 'concessionario', t: 'Concessionário' }, { v: 'misto', t: 'Misto' }, NAO_SEI ] },
        { id: 'regime', tipo: 'unica', obrigatoria: true, rotulo: 'Os banheiros são:', opcoes: [
          { v: 'proprio', t: 'Próprios da Prefeitura' }, { v: 'locado', t: 'Locados' },
          { v: 'concedido', t: 'Concedidos' }, { v: 'terceirizado', t: 'Terceirizados' },
          { v: 'misto', t: 'Misto' }, NAO_SEI ] },
        { id: 'escopo', tipo: 'multipla', obrigatoria: true, rotulo: 'O que o contrato cobre?', opcoes: [
          { v: 'limpeza', t: 'Limpeza' }, { v: 'manutencao', t: 'Manutenção' },
          { v: 'insumos', t: 'Abastecimento de insumos' }, { v: 'esgotamento', t: 'Esgotamento ou sucção' },
          { v: 'locacao', t: 'Locação dos banheiros' }, { v: 'vigilancia', t: 'Vigilância' },
          { v: 'sem_contrato', t: 'Não há contrato', nat: 'contrato_gestao' }, NAO_SEI ] },
        { id: 'fora_escopo', tipo: 'texto_longo', rotulo: 'O que o contrato não cobre e acaba virando problema?', dica: 'Se não souber, pode deixar em branco.' },
        { id: 'trocas', tipo: 'texto_longo', rotulo: 'Já trocaram de fornecedor ou de modelo de banheiro? O que mudou com isso?', dica: 'Se não souber, pode deixar em branco.' },
        { id: 'hipotese', tipo: 'unica', obrigatoria: true, peso: 3, rotulo: 'Pensando no problema principal, qual destas explicações chega mais perto?', opcoes: [
          { v: 'frequencia', t: 'A frequência de limpeza não dá conta do movimento', nat: 'limpeza' },
          { v: 'preventiva', t: 'Falta manutenção preventiva, só se conserta quando quebra', nat: 'manutencao' },
          { v: 'insumo', t: 'Água ou insumos não chegam na hora certa', nat: 'abastecimento' },
          { v: 'equipamento', t: 'O equipamento não aguenta o uso ou o ambiente', nat: 'equipamento' },
          { v: 'fiscalizacao', t: 'Ninguém fiscaliza de perto ou o contrato foi mal desenhado', nat: 'contrato_gestao' },
          { v: 'vandalismo', t: 'Depredação e uso indevido', nat: 'vandalismo_seguranca' }, NAO_SEI ] },
        { id: 'registro', tipo: 'unica', obrigatoria: true, rotulo: 'Existe algum registro com números sobre esses problemas? (planilha, relatório da empresa, dados da ouvidoria)', opcoes: [
          { v: 'sim', t: 'Sim' }, { v: 'parcial', t: 'Em parte' }, { v: 'nao', t: 'Não' }, NAO_SEI ] },
      ],
    },
    {
      titulo: 'Quem sofre e o que mudaria',
      perguntas: [
        { id: 'usuarios', tipo: 'multipla', obrigatoria: true, rotulo: 'Quem usa esses banheiros e quem mais reclama?', opcoes: [
          { v: 'moradores', t: 'Moradores e banhistas' }, { v: 'turistas', t: 'Turistas' },
          { v: 'trabalhadores', t: 'Trabalhadores da região' }, { v: 'ambulantes', t: 'Ambulantes e feirantes' },
          { v: 'pcd', t: 'Pessoas com deficiência' }, { v: 'idosos', t: 'Idosos' },
          { v: 'familias', t: 'Famílias com crianças' }, { v: 'situacao_rua', t: 'Pessoas em situação de rua' } ] },
        { id: 'impacto', tipo: 'texto_longo', obrigatoria: true, rotulo: 'O que acontece hoje com quem chega e encontra o banheiro fechado ou sujo?' },
        { id: 'mudanca', tipo: 'texto_longo', obrigatoria: true, rotulo: 'Se o problema fosse resolvido, o que você veria de diferente na semana seguinte?' },
        { id: 'medida', tipo: 'texto_longo', rotulo: 'Como você saberia que melhorou? O que daria para contar ou medir?' },
        { id: 'comentario', tipo: 'texto_longo', rotulo: 'Quer acrescentar mais alguma coisa?' },
      ],
    },
  ],
};

export const QUESTIONARIO = SERVIDOR;

export function todasPerguntas(trilha = SERVIDOR) {
  return trilha.blocos.flatMap((b) => b.perguntas);
}

export function opcoesDa(pergunta, trilha = SERVIDOR) {
  if (!pergunta.opcoesDe) return pergunta.opcoes || [];
  const base = todasPerguntas(trilha).find((p) => p.id === pergunta.opcoesDe);
  return base ? base.opcoes : [];
}
