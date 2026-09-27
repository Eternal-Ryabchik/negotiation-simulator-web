// Движок симуляции: чистые функции без React. Один граф обслуживает все режимы:
// в «Вопрос-ответ» ход — это выбранный вариант, в «Диалоге» и «Онлайне» — класс,
// который анализатор присвоил свободной реплике.
import { KIND_LABEL, OUTCOME_META, SKILL_AXES, levelById, toneById, type Level } from '@/lib/simulator-data';
import { analyzeText } from './analyzer';
import type {
  Analysis,
  Choice,
  Ending,
  GraphNode,
  LevelId,
  Metrics,
  ModeId,
  MoveKind,
  Scenario,
  SessionResult,
  TurnRecord,
} from './types';

export const MAX_TURNS = 8;

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export const startMetrics = (scenario: Scenario): Metrics => ({ ...toneById(scenario.partner.tone).start });

/** Масштабирует изменения метрик с учётом уровня, тона и качества формулировки. */
export function scaleDelta(delta: Metrics, level: Level, scenario: Scenario, quality = 1): Metrics {
  const tone = toneById(scenario.partner.tone);
  const gain = level.gain * tone.gain * quality;
  const loss = level.loss * tone.loss * (quality < 1 ? 2 - quality : 1 / quality);
  const f = (v: number, positiveIsGood: boolean) => {
    const good = positiveIsGood ? v > 0 : v < 0;
    return Math.round(v * (good ? gain : loss));
  };
  return { argument: f(delta.argument, true), trust: f(delta.trust, true), tension: f(delta.tension, false) };
}

export const applyDelta = (m: Metrics, d: Metrics): Metrics => ({
  argument: clamp(m.argument + d.argument),
  trust: clamp(m.trust + d.trust),
  tension: clamp(m.tension + d.tension),
});

export const bestChoice = (node: GraphNode): Choice | undefined =>
  [...node.options].sort(
    (a, b) => b.delta.trust + b.delta.argument - b.delta.tension - (a.delta.trust + a.delta.argument - a.delta.tension),
  )[0];

export const choiceFor = (node: GraphNode, kind: MoveKind): Choice =>
  node.options.find((o) => o.kind === kind) ?? node.options.find((o) => o.kind === 'neutral') ?? node.options[0];

/** Оценка готового варианта ответа (режим «Вопрос-ответ») тем же анализатором. */
export const analyzeChoice = (choice: Choice, scenario: Scenario): Analysis => ({
  ...analyzeText(choice.text, scenario.keywords),
  kind: choice.kind,
});

/** Качество формулировки → множитель к изменению метрик (0.5–1.35). */
export const qualityOf = (a: Analysis) => {
  const q = (a.clarity + a.persuasion + a.empathy + a.relevance) / 240;
  return Math.max(0.5, Math.min(1.35, q));
};

export interface MoveOutcome {
  choice: Choice;
  delta: Metrics;
  record: TurnRecord;
}

export function resolveMove(params: {
  scenario: Scenario;
  node: GraphNode;
  levelId: LevelId;
  source: TurnRecord['source'];
  text: string;
  kind?: MoveKind;
}): MoveOutcome {
  const { scenario, node, levelId, source, text } = params;
  const level = levelById(levelId);

  let analysis: Analysis;
  let choice: Choice;
  let quality = 1;

  if (source === 'choice') {
    choice = choiceFor(node, params.kind ?? 'neutral');
    analysis = analyzeChoice(choice, scenario);
  } else if (source === 'timeout') {
    choice = choiceFor(node, 'neutral');
    analysis = { ...analyzeText('', scenario.keywords), kind: 'neutral', tips: ['Время на ход вышло: пауза в переговорах читается как неуверенность.'] };
    quality = 0.6;
  } else {
    analysis = analyzeText(text, scenario.keywords);
    choice = choiceFor(node, analysis.kind);
    quality = qualityOf(analysis);
  }

  const delta = scaleDelta(choice.delta, level, scenario, quality);
  if (source === 'timeout') delta.tension += 6;
  if (source === 'text' && analysis.kind !== 'aggressive' && analysis.signals.includes('Давление')) delta.tension += 5;

  const best = bestChoice(node);
  const record: TurnRecord = {
    nodeId: node.id,
    stage: node.stage,
    partnerLine: node.line,
    userText: source === 'timeout' ? '— (время вышло)' : text || choice.text,
    source,
    kind: analysis.kind,
    analysis,
    delta,
    reaction: choice.reaction,
    explanation: choice.explanation,
    best: best && best.kind !== analysis.kind ? { kind: best.kind, text: best.text } : undefined,
  };
  return { choice, delta, record };
}

/** Финал, если лимит ходов исчерпан раньше, чем граф дошёл до концовки. */
export function forcedEnding(m: Metrics): GraphNode {
  const e: Ending =
    m.trust >= 65 && m.argument >= 55
      ? { outcome: 'deal', title: 'Договорённость по итогам встречи', text: 'Время вышло, но собеседник готов двигаться дальше: доверие и аргументы на вашей стороне.' }
      : m.trust >= 45
        ? { outcome: 'postponed', title: 'Решение отложено', text: 'Встреча закончилась без договорённости. Не хватило конкретного предложения и фиксации следующего шага.' }
        : { outcome: 'fail', title: 'Переговоры не дали результата', text: 'Доверие так и не сложилось, и собеседник закончил разговор.' };
  return {
    id: 'forced_end',
    stage: 'Финал',
    emotion: e.outcome === 'fail' ? 'Отстранённость' : 'Нейтралитет',
    line: e.outcome === 'deal' ? 'Время вышло, но давайте продолжим — пришлите предложение письменно.' : 'К сожалению, время вышло. Вернёмся к этому позже.',
    progress: e.outcome === 'deal' ? 75 : 30,
    options: [],
    ending: e,
  };
}

/** Взаимовыгодный финал при низком доверии понижается: сделка «на бумаге» без доверия хрупка. */
export function finalEnding(node: GraphNode, m: Metrics): Ending {
  const e = node.ending!;
  if (e.outcome === 'winwin' && m.trust < 50) {
    return { outcome: 'deal', title: 'Договорённость без запаса доверия', text: `${e.text} Но доверие осталось низким — такая договорённость хрупкая.` };
  }
  return e;
}

export const gradeFrom = (score: number) => (score >= 88 ? 'A' : score >= 76 ? 'B' : score >= 62 ? 'C' : score >= 48 ? 'D' : 'E');

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 50);

export function buildResult(p: {
  scenario: Scenario;
  mode: ModeId;
  levelId: LevelId;
  turns: TurnRecord[];
  path: string[];
  metrics: Metrics;
  goalProgress: number;
  ending: Ending;
  hintsUsed: number;
}): SessionResult {
  const level = levelById(p.levelId);
  const outcomeScore = OUTCOME_META[p.ending.outcome].score;
  const raw = 0.4 * outcomeScore + 0.2 * p.metrics.argument + 0.25 * p.metrics.trust + 0.15 * (100 - p.metrics.tension);
  const score = clamp(raw - p.hintsUsed * level.hintCost);

  const a = p.turns.map((t) => t.analysis);
  const questions = p.turns.filter((t) => t.kind === 'question').length;
  const aggressive = p.turns.filter((t) => t.kind === 'aggressive').length;
  const share = p.turns.length ? questions / p.turns.length : 0;

  const values = [
    avg(a.map((x) => x.persuasion)),
    avg(a.map((x) => x.clarity)),
    avg(a.map((x) => x.politeness)),
    avg(a.map((x) => x.empathy)),
    25 + share * 150,
    (p.metrics.trust + p.metrics.argument) / 2,
    outcomeScore * 0.7 + avg(a.map((x) => x.relevance)) * 0.3,
    100 - p.metrics.tension * 0.6 - aggressive * 15,
    p.goalProgress,
  ];

  return {
    id: `${Date.now()}`,
    date: new Date().toISOString(),
    scenarioId: p.scenario.id,
    scenarioTitle: p.scenario.title,
    mode: p.mode,
    level: p.levelId,
    tone: p.scenario.partner.tone,
    turns: p.turns,
    path: p.path,
    metrics: p.metrics,
    goalProgress: p.goalProgress,
    ending: p.ending,
    score,
    grade: gradeFrom(score),
    skills: SKILL_AXES.map((axis, i) => ({ axis, value: Math.max(5, clamp(values[i])) })),
    hintsUsed: p.hintsUsed,
    xp: Math.round(score * level.xpMultiplier),
  };
}

export function hintFor(node: GraphNode): string {
  const best = bestChoice(node);
  if (!best) return 'Зафиксируйте договорённость и следующий шаг.';
  const base: Record<MoveKind, string> = {
    question: 'Сейчас сильнее всего сработает уточняющий вопрос: выясните, что стоит за позицией собеседника.',
    argued: 'Сейчас нужен конкретный ход: предложение, подкреплённое фактом, или проверяемое обязательство.',
    neutral: 'Сохраняйте спокойный тон и не спешите с уступками.',
    aggressive: 'Не поддавайтесь на давление.',
  };
  return `${base[best.kind]} Тип хода: «${KIND_LABEL[best.kind]}».`;
}

/** Рекомендации по итогам сессии — строятся из фактических ходов игрока. */
export function recommendationsFor(r: SessionResult): string[] {
  const out: string[] = [];
  const kinds = r.turns.map((t) => t.kind);
  const tips = r.turns.flatMap((t) => t.analysis.tips);
  if (kinds.includes('aggressive')) out.push('Вы использовали давление. В следующий раз вместо ультиматума задайте вопрос о причине позиции собеседника.');
  if (!kinds.includes('question')) out.push('Вы ни разу не задали уточняющий вопрос. Интересы собеседника — главный ресурс для взаимовыгодного решения.');
  if (r.ending.outcome === 'concession') out.push('Не соглашайтесь на уступку без встречного условия: «если… то…» — лучшая формула торга.');
  if (r.ending.outcome === 'postponed') out.push('Завершайте встречу фиксацией следующего шага: кто, что и к какому сроку делает.');
  if (r.metrics.tension >= 55) out.push('Напряжение осталось высоким. Признавайте позицию собеседника («понимаю, почему это важно») перед возражением.');
  if (r.metrics.trust < 55) out.push('Подкрепляйте обещания проверяемыми обязательствами — сроками в договоре, статусами, цифрами.');
  for (const t of tips) if (out.length < 5 && !out.includes(t)) out.push(t);
  if (!out.length) out.push('Отличная сессия. Попробуйте тот же сценарий на уровень сложнее или с более жёстким собеседником.');
  return out.slice(0, 5);
}
