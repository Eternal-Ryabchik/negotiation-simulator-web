// Ядро «Арены переговоров»: общие типы сценариев, движка и отчётов.

export type LevelId = 'novice' | 'practic' | 'expert';
export type ToneId = 'friendly' | 'neutral' | 'tough' | 'aggressive';
export type ModeId = 'quiz' | 'dialog' | 'phrases' | 'online';

/** Тип хода игрока. Одинаков для выбора варианта и для свободного текста. */
export type MoveKind = 'aggressive' | 'neutral' | 'argued' | 'question';

export interface Metrics {
  argument: number;
  trust: number;
  tension: number;
}

export type OutcomeId = 'winwin' | 'deal' | 'concession' | 'postponed' | 'fail';

export interface Ending {
  outcome: OutcomeId;
  title: string;
  text: string;
}

export interface Choice {
  kind: MoveKind;
  text: string;
  delta: Metrics;
  /** Невербальная реакция собеседника (ремарка). */
  reaction: string;
  /** Разбор хода для обратной связи. */
  explanation: string;
  next: string;
}

export interface GraphNode {
  id: string;
  /** Короткое название этапа — для карты сценария. */
  stage: string;
  emotion: string;
  line: string;
  /** Процент продвижения к цели при попадании в узел. */
  progress: number;
  options: Choice[];
  ending?: Ending;
}

export interface ScenarioGraph {
  start: string;
  nodes: Record<string, GraphNode>;
}

export interface Partner {
  name: string;
  role: string;
  company: string;
  photo?: string;
  tone: ToneId;
  /** Цели/интересы собеседника (скрыты от игрока до вопросов). */
  goals: string[];
}

/** Слоты, из которых генератор собирает реплики. Задаются администратором. */
export interface ScenarioSlots {
  objection: string;
  hiddenInterest: string;
  constraint: string;
  userOffer: string;
  argumentFact: string;
  concessionDemand: string;
  guarantee: string;
}

export interface ScenarioConfig {
  id: string;
  title: string;
  sphere: string;
  topic: string;
  icon: string;
  userRole: string;
  userGoal: string;
  difficulty: LevelId;
  partner: Partner;
  slots: ScenarioSlots;
  /** Ключевые слова темы — для оценки релевантности свободных ответов. */
  keywords: string[];
  /** Факты брифинга, доступные игроку. */
  briefing: string[];
  builtIn?: boolean;
  handcrafted?: boolean;
  createdAt?: string;
}

export interface Scenario extends ScenarioConfig {
  graph: ScenarioGraph;
}

export interface Analysis {
  kind: MoveKind;
  clarity: number;
  persuasion: number;
  empathy: number;
  politeness: number;
  relevance: number;
  toneLabel: string;
  strategy: string;
  signals: string[];
  tips: string[];
}

export interface TurnRecord {
  nodeId: string;
  stage: string;
  partnerLine: string;
  userText: string;
  source: 'choice' | 'text' | 'timeout';
  kind: MoveKind;
  analysis: Analysis;
  delta: Metrics;
  reaction: string;
  explanation: string;
  best?: { kind: MoveKind; text: string };
}

export interface SessionResult {
  id: string;
  date: string;
  scenarioId: string;
  scenarioTitle: string;
  mode: ModeId;
  level: LevelId;
  tone: ToneId;
  turns: TurnRecord[];
  path: string[];
  metrics: Metrics;
  goalProgress: number;
  ending: Ending;
  score: number;
  grade: string;
  skills: { axis: string; value: number }[];
  hintsUsed: number;
  xp: number;
}
