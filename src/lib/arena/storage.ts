// Хранение в localStorage: пользовательские сценарии, история сессий, настройки LLM.
// Все обращения обёрнуты в try/catch — в приватном режиме приложение продолжит работать в памяти.
import type { ScenarioConfig, SessionResult } from './types';

const KEYS = {
  scenarios: 'arena.scenarios.v1',
  history: 'arena.history.v1',
  llm: 'arena.llm.v1',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* хранилище недоступно — остаёмся в памяти */
  }
}

export const loadCustomScenarios = () => read<ScenarioConfig[]>(KEYS.scenarios, []);
export const saveCustomScenarios = (list: ScenarioConfig[]) => write(KEYS.scenarios, list);

export const loadHistory = () => read<SessionResult[]>(KEYS.history, []);
export const saveHistory = (list: SessionResult[]) => write(KEYS.history, list.slice(0, 50));

export type LlmProvider = 'off' | 'ollama' | 'anthropic' | 'openai';

export interface LlmSettings {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  /** Адрес локального сервера Ollama. */
  ollamaUrl: string;
  /** Переписывать реплики собеседника моделью (для малых локальных моделей — экспериментально). */
  liveReplies: boolean;
}

export const DEFAULT_LLM: LlmSettings = {
  provider: 'off',
  apiKey: '',
  model: '',
  baseUrl: 'https://openrouter.ai/api/v1',
  ollamaUrl: 'http://localhost:11434',
  liveReplies: true,
};

export const loadLlm = () => ({ ...DEFAULT_LLM, ...read<Partial<LlmSettings>>(KEYS.llm, {}) });
/** Настраивал ли пользователь ИИ вручную — тогда автоопределение Ollama не вмешивается. */
export const hasSavedLlm = () => {
  try {
    return localStorage.getItem(KEYS.llm) !== null;
  } catch {
    return true;
  }
};
export const saveLlm = (s: LlmSettings) => write(KEYS.llm, s);

/* ---------------- Геймификация ---------------- */

export const RANKS = [
  { xp: 0, title: 'Стажёр' },
  { xp: 150, title: 'Переговорщик' },
  { xp: 450, title: 'Уверенный практик' },
  { xp: 1000, title: 'Эксперт' },
  { xp: 2000, title: 'Мастер переговоров' },
];

export function rankFor(xp: number) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const cur = RANKS[i];
  const next = RANKS[i + 1];
  const progress = next ? Math.round(((xp - cur.xp) / (next.xp - cur.xp)) * 100) : 100;
  return { index: i, title: cur.title, next, progress };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  test: (h: SessionResult[]) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', title: 'Первый раунд', description: 'Завершите первую сессию', icon: 'Flag', test: (h) => h.length >= 1 },
  { id: 'winwin', title: 'Win-win', description: 'Достигните взаимовыгодного результата', icon: 'Handshake', test: (h) => h.some((r) => r.ending.outcome === 'winwin') },
  { id: 'calm', title: 'Холодная голова', description: 'Пройдите сессию без единого агрессивного хода', icon: 'Snowflake', test: (h) => h.some((r) => r.turns.length >= 3 && r.turns.every((t) => t.kind !== 'aggressive')) },
  { id: 'curious', title: 'Сократ', description: 'Задайте 3 уточняющих вопроса за одну сессию', icon: 'HelpCircle', test: (h) => h.some((r) => r.turns.filter((t) => t.kind === 'question').length >= 3) },
  { id: 'writer', title: 'Своими словами', description: 'Завершите сессию в режиме «Диалог» или «Онлайн»', icon: 'PenLine', test: (h) => h.some((r) => r.mode === 'dialog' || r.mode === 'online') },
  { id: 'expert', title: 'Под давлением', description: 'Получите оценку A или B на уровне «Эксперт»', icon: 'Award', test: (h) => h.some((r) => r.level === 'expert' && (r.grade === 'A' || r.grade === 'B')) },
  { id: 'tough', title: 'Укротитель', description: 'Договоритесь с конфликтным собеседником', icon: 'Flame', test: (h) => h.some((r) => r.tone === 'aggressive' && (r.ending.outcome === 'winwin' || r.ending.outcome === 'deal')) },
  { id: 'explorer', title: 'Исследователь', description: 'Пройдите 4 разных сценария', icon: 'Compass', test: (h) => new Set(h.map((r) => r.scenarioId)).size >= 4 },
];
