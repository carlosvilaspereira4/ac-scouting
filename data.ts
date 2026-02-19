export const POSICOES: Record<string, { label: string; abbr: string; competencias: string[] }> = {
  GR:  { label: 'Guarda-Redes',   abbr: 'GR',  competencias: ['Defesa a remate','Defesa em cruzamentos','Defesa da profundidade','Construção a partir de trás'] },
  DC:  { label: 'Defesa Central', abbr: 'DC',  competencias: ['Defesa em cruzamentos','Defesa do espaço nas costas','Duelos','Saída para pressionar','Construção sob pressão','Construção com espaço e tempo'] },
  LD:  { label: 'Lateral / Ala',  abbr: 'L',   competencias: ['Defesa 1v1','Defesa da profundidade','Defesa em cruzamentos','Saltar à pressão','Participação na construção','Contribuição no último terço'] },
  MD:  { label: 'Médio Defensivo',abbr: 'MD',  competencias: ['Defesa da zona','Capacidade de pressão','Duelos','Movimento para receber','Retenção de bola','Progressão de bola'] },
  MC:  { label: 'Médio Centro',   abbr: 'MC',  competencias: ['Movimento para receber','Retenção de bola','Progressão de bola','Chegada a zonas de finalização','Duelos','Defesa da zona','Capacidade de pressão'] },
  MAO: { label: 'Médio Ofensivo', abbr: 'MOF', competencias: ['Movimento para receber','Progressão de bola','Criação de oportunidades','Chegada a zonas de finalização','Finalização','Capacidade de pressão','Defesa da zona'] },
  EX:  { label: 'Extremo',        abbr: 'EX',  competencias: ['Drible','Cruzamento','Organização de jogo','Penetração em profundidade','Finalização','Alta pressão','Regresso defensivo'] },
  AV:  { label: 'Avançado',       abbr: 'AV',  competencias: ['Jogo como homem-alvo','Penetração em profundidade','Organização de jogo','Finalização','Capacidade de pressão','Defesa da zona'] },
}

export const TOOLTIPS: Record<string, string> = {
  'Defesa a remate': 'Evitar golos a partir das oportunidades criadas pelo adversário — realizando defesas, bloqueando remates de curta distância e vencendo situações de 1v1 quando o adversário fica em posição de finalização.',
  'Defesa em cruzamentos': 'Intercetar cruzamentos com base num posicionamento pró-ativo, boas condições físicas (altura, força), bom alcance e sentido de timing.',
  'Defesa da profundidade': 'Intercetar passes em profundidade com posicionamento pró-ativo — reconhecer quando avançar em sprint para a bola e quando manter a posição, usando velocidade e mobilidade.',
  'Construção a partir de trás': 'Ser o primeiro jogador em posse fora da baliza, tomar boas decisões risco-benefício, jogar curto quando possível e longo quando necessário, e executar com precisão.',
  'Defesa do espaço nas costas': 'Reconhecer quando não existe pressão sobre a bola e que corredores podem receber nas costas da linha defensiva, recuando e fechando o espaço atrás.',
  'Duelos': 'Disputar duelos pelas costas do avançado, no ar e em situações de 1v1 ou lado a lado.',
  'Saída para pressionar': 'Reconhecer quando o defesa central deve pressionar lateralmente ou em frente, e executar essas ações com eficácia.',
  'Construção sob pressão': 'Encontrar soluções para escapar à pressão adversária, tomar boas decisões risco-benefício e encontrar saídas pelo jogo interior, exterior ou longo.',
  'Construção com espaço e tempo': 'Encontrar médios livres nas entrelinhas com passes curtos ou médios, ou encontrar corredores em profundidade e alas com passes de mudança de corredor.',
  'Defesa 1v1': 'Não ser ultrapassado em situações frontais de 1v1 — maioritariamente contra alas — e sempre que possível interceptar a bola.',
  'Saltar à pressão': 'Reconhecer quando abandonar a linha defensiva para pressionar em frente, para limitar o espaço e tempo do adversário e idealmente recuperar a bola em contra-ataque.',
  'Participação na construção': 'Capacidade de receber e encontrar soluções contra adversários em alta pressão — incluindo escapar à pressão do ala com combinações de passe-e-movimento e dribles.',
  'Contribuição no último terço': 'Contribuir para a criação de oportunidades com sobreposições, cruzamentos, dribles, passes criativos, corredores em profundidade e remates.',
  'Defesa da zona': 'Capacidade de defender e proteger a "sua" zona como médio. Para os médios defensivos, é sobretudo a zona à frente dos defesas centrais.',
  'Capacidade de pressão': 'Cobrir distâncias, perseguir adversários, fazer contacto e disputar a bola para recuperar a posse.',
  'Movimento para receber': 'Movimento sem bola para se posicionar e receber um passe — incluindo encontrar espaço entre adversários ou escapar à marcação.',
  'Retenção de bola': 'Capacidade de manter a bola na equipa, mesmo sob pressão de um ou vários adversários, ou ao receber uma bola de difícil controlo.',
  'Progressão de bola': 'Capacidade de progredir com a bola em direção à baliza adversária, através de passes ou dribles.',
  'Criação de oportunidades': 'A forma máxima de progressão — inclui passes e cruzamentos que colocam direta ou indiretamente colegas em posições de finalização.',
  'Chegada a zonas de finalização': 'Capacidade de chegar a zonas perigosas dentro ou perto da área adversária.',
  'Finalização': 'Converter oportunidades em golos — encontrar posições de remate de qualidade e ser eficaz nessas situações.',
  'Drible': 'Capacidade de ultrapassar adversários em 1v1 frontal, mas também de conduzir a bola para espaço aberto, escapar à pressão ou progredir para a baliza.',
  'Cruzamento': 'Capacidade de criar situações de perigo e colocar colegas em posições de finalização com cruzamentos a partir do corredor.',
  'Organização de jogo': 'Capacidade de encontrar espaço entre linhas, jogar combinações rápidas, encontrar soluções criativas para a frente e criar oportunidades com passes de rotura.',
  'Penetração em profundidade': 'Capacidade de fazer corredores nas costas dos defesas para receber a bola atrás da linha defensiva.',
  'Alta pressão': 'Capacidade de reduzir espaço e tempo ao adversário com ações de pressão de alta intensidade, forçando a bola longa ou idealmente recuperando a posse.',
  'Regresso defensivo': 'Capacidade de acompanhar adversários, encurtar a distância para o lateral, fazer corridas de recuperação e pressionar o portador da bola.',
  'Jogo como homem-alvo': 'Capacidade de receber bolas com um adversário colado nas costas, fazer jogo de apoio, disputar duelos e ser eficaz no jogo aéreo.',
}

export const GRADES = ['A', 'B', 'C', 'D', 'E'] as const
export type Grade = typeof GRADES[number]

export const GRADE_COLORS: Record<Grade, string> = {
  A: '#00c853', B: '#69c21a', C: '#ffb300', D: '#ff6d00', E: '#d32f2f',
}
export const GRADE_PCT: Record<Grade, number> = {
  A: 100, B: 75, C: 50, D: 30, E: 10,
}
export const GRADE_RGB: Record<Grade, [number,number,number]> = {
  A: [0,200,83], B: [105,194,26], C: [255,179,0], D: [255,109,0], E: [211,47,47],
}

export function calcOverall(ratings: Record<string, { grade: Grade | null; obs: string }>, posicao: string): Grade | null {
  const pos = POSICOES[posicao]
  if (!pos) return null
  const graded = pos.competencias.filter(c => ratings[c]?.grade)
  if (!graded.length) return null
  const avg = graded.reduce((s, c) => s + GRADES.indexOf(ratings[c].grade!), 0) / graded.length
  return GRADES[Math.round(avg)]
}

export interface Player {
  id: string
  firestoreId: string | null
  nome: string
  idade: string
  nacionalidade: string
  clube: string
  posicao: string
  posicaoEspecifica: string
  pe: string
  numero: string
  jogo: string
  resumo: string
  photo: string | null
  ratings: Record<string, { grade: Grade | null; obs: string }>
  data: string
  savedState: 'unsaved' | 'saving' | 'saved' | 'error'
}

export interface SavedReport {
  firestoreId: string
  nome: string
  idade: string
  nacionalidade: string
  clube: string
  posicao: string
  posicaoEspecifica: string
  pe: string
  numero: string
  jogo: string
  resumo: string
  ratings: Record<string, { grade: Grade | null; obs: string }>
  data: string
  criadoEm?: { seconds: number }
}
