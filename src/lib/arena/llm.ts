// Необязательный LLM-слой. Движок и граф сценария остаются источником истины (ветвление,
// метрики, финалы детерминированы), а модель лишь делает реплики собеседника живыми,
// пишет развёрнутый коучинг-разбор и помогает администратору заполнить сценарий.
// Любая ошибка → вызывающий код использует офлайн-вариант.
import { KIND_LABEL, toneById } from '@/lib/simulator-data';
import type { LlmSettings } from './storage';
import type { Scenario, ScenarioSlots, SessionResult } from './types';

export const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-5';
export const DEFAULT_OPENAI_MODEL = 'openai/gpt-4o-mini';
export const DEFAULT_OLLAMA_MODEL = 'qwen2.5:3b';
export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

/** Локальной Ollama ключ не нужен; облачным провайдерам — нужен. */
export const llmReady = (s: LlmSettings) => (s.provider === 'ollama' ? true : s.provider !== 'off' && !!s.apiKey.trim());

const ollamaRoot = (s: LlmSettings) => ((s.ollamaUrl ?? '').trim() || DEFAULT_OLLAMA_URL).replace(/\/v1\/?$/, '').replace(/\/+$/, '');

/** Список моделей, установленных в локальной Ollama (GET /api/tags). */
export async function listOllamaModels(baseUrl = DEFAULT_OLLAMA_URL, timeoutMs = 2500): Promise<string[]> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const root = baseUrl.replace(/\/v1\/?$/, '').replace(/\/+$/, '');
    const res = await fetch(`${root}/api/tags`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data?.models ?? []).map((m: { name: string }) => m.name);
  } finally {
    window.clearTimeout(timer);
  }
}

const TIMEOUT_MS = 30000;

async function completeAnthropic(s: LlmSettings, system: string, user: string): Promise<string> {
  // SDK загружается лениво — без включённого ИИ он не попадает в основной бандл.
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: s.apiKey.trim(), dangerouslyAllowBrowser: true, timeout: TIMEOUT_MS, maxRetries: 1 });
  const response = await client.beta.messages.create({
    model: s.model.trim() || DEFAULT_ANTHROPIC_MODEL,
    max_tokens: 4000,
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { effort: 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  });
  if (response.stop_reason === 'refusal') throw new Error('Модель отклонила запрос');
  const text = response.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim();
  if (!text) throw new Error('Пустой ответ модели');
  return text;
}

async function completeOpenAi(s: LlmSettings, system: string, user: string, json: boolean): Promise<string> {
  const ctrl = new AbortController();
  // Локальной модели при первом запросе нужно время на загрузку в память.
  const timer = window.setTimeout(() => ctrl.abort(), s.provider === 'ollama' ? TIMEOUT_MS * 3 : TIMEOUT_MS);
  const local = s.provider === 'ollama';
  const url = local ? `${ollamaRoot(s)}/v1` : s.baseUrl.replace(/\/+$/, '');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (s.apiKey.trim()) headers.Authorization = `Bearer ${s.apiKey.trim()}`;
  try {
    const res = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers,
      body: JSON.stringify({
        model: s.model.trim() || (local ? DEFAULT_OLLAMA_MODEL : DEFAULT_OPENAI_MODEL),
        temperature: 0.7,
        ...(local ? { max_tokens: 700 } : {}),
        ...(json ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text = String(data?.choices?.[0]?.message?.content ?? '').trim();
    if (!text) throw new Error('Пустой ответ модели');
    return text;
  } finally {
    window.clearTimeout(timer);
  }
}

export function complete(s: LlmSettings, system: string, user: string, json = false) {
  return s.provider === 'anthropic' ? completeAnthropic(s, system, user) : completeOpenAi(s, system, user, json);
}

const persona = (sc: Scenario) =>
  `Ты играешь роль в тренажёре деловых переговоров. Ты — ${sc.partner.name}, ${sc.partner.role} (${sc.partner.company}). ` +
  `Манера общения: ${toneById(sc.partner.tone).label.toLowerCase()} — ${toneById(sc.partner.tone).description.toLowerCase()}. ` +
  `Твои интересы: ${sc.partner.goals.join('; ')}. Собеседник: ${sc.userRole}. Тема: ${sc.topic}. ` +
  'Отвечай только по-русски, от первого лица, 1–3 предложения, без ремарок и кавычек.';

/** Переформулирует следующую реплику графа так, чтобы она естественно отвечала на слова игрока. */
export async function partnerReply(
  s: LlmSettings,
  sc: Scenario,
  history: { who: 'user' | 'partner'; text: string }[],
  userText: string,
  scriptedLine: string,
  isFinal: boolean,
) {
  const transcript = history.slice(-6).map((m) => `${m.who === 'user' ? 'Собеседник' : 'Ты'}: ${m.text}`).join('\n');
  const user =
    `Диалог до этого:\n${transcript}\n\nСобеседник только что сказал: «${userText}»\n\n` +
    `По сценарию твоя следующая реплика должна передавать ровно этот смысл: «${scriptedLine}».` +
    (isFinal ? ' Это финальная реплика разговора.' : '') +
    ' Сформулируй её естественно, откликнувшись на слова собеседника. Не меняй смысл, не добавляй новых условий и цифр.';
  const text = (await complete(s, persona(sc), user)).replace(/^[«"']+|[»"']+$/g, '').trim();
  // Малые модели иногда уходят в другой язык или «растекаются» — тогда остаётся реплика сценария.
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(text) || /[a-z]{4,}/i.test(text) || text.length > scriptedLine.length * 2.5 + 160) {
    throw new Error('Ответ модели отклонён фильтром качества');
  }
  return text;
}

export async function coachFeedback(s: LlmSettings, sc: Scenario, r: SessionResult) {
  const turns = r.turns
    .map((t, i) => `${i + 1}. Собеседник: «${t.partnerLine}»\n   Игрок (${KIND_LABEL[t.kind]}): «${t.userText}»`)
    .join('\n');
  const system =
    'Ты — опытный тренер по переговорам (Гарвардский метод, SPIN, BATNA). Пишешь разбор для участника тренажёра: ' +
    'по-русски, доброжелательно и конкретно, со ссылками на его реплики. Формат: 3 коротких раздела — «Что получилось», «Что улучшить», ' +
    '«Как сказать лучше» (2 переформулированные реплики игрока). Не более 220 слов, без markdown-заголовков, разделы начинай с названия и двоеточия.';
  const user =
    `Сценарий: ${sc.title}. Роль игрока: ${sc.userRole}. Цель: ${sc.userGoal}. Собеседник: ${sc.partner.role}, тон — ${toneById(sc.partner.tone).label}.\n` +
    `Итог: ${r.ending.title}. Оценка ${r.grade} (${r.score}/100). Доверие ${r.metrics.trust}, аргументация ${r.metrics.argument}, напряжение ${r.metrics.tension}.\n\nХоды:\n${turns}`;
  const text = await complete(s, system, user);
  // Малые модели иногда «переключаются» на другой язык посреди ответа — обрезаем по первому иероглифу.
  const cjk = text.search(/[\u3040-\u30ff\u4e00-\u9fff]/);
  const clean = (cjk >= 0 ? text.slice(0, text.lastIndexOf('\n', cjk) > 0 ? text.lastIndexOf('\n', cjk) : cjk) : text).trim();
  if (clean.length < 80) throw new Error('Ответ модели отклонён фильтром качества');
  return clean;
}

export async function generateSlots(
  s: LlmSettings,
  ctx: { sphere: string; topic: string; userRole: string; userGoal: string; partnerRole: string; goals: string[] },
): Promise<ScenarioSlots> {
  const system =
    'Ты — методист корпоративного обучения переговорам. Помогаешь собрать учебный сценарий. Отвечай строго одним JSON-объектом без пояснений.';
  const user =
    `Сфера: ${ctx.sphere}. Тема: ${ctx.topic}. Роль игрока: ${ctx.userRole}. Цель игрока: ${ctx.userGoal}. ` +
    `Собеседник: ${ctx.partnerRole}. Цели собеседника: ${ctx.goals.join('; ')}.\n` +
    'Верни JSON с ключами (значения — по-русски, одно предложение каждое): ' +
    'objection (первое возражение собеседника, прямая речь), hiddenInterest (скрытый интерес собеседника, со строчной буквы), ' +
    'constraint (ограничение собеседника, со строчной буквы), userOffer (взаимовыгодное предложение игрока, со строчной буквы), ' +
    'argumentFact (сильный факт в пользу игрока), concessionDemand (уступка, которой будет добиваться собеседник, со строчной буквы), ' +
    'guarantee (проверяемое обязательство, которое может дать игрок, со строчной буквы).\n' +
    'Формат ответа строго такой: {"objection": "...", "hiddenInterest": "...", "constraint": "...", "userOffer": "...", "argumentFact": "...", "concessionDemand": "...", "guarantee": "..."}';
  const text = await complete(s, system, user, true);
  const raw = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as Record<string, unknown>;
  // Модели пишут ключи по-разному (hiddenInterest / hidden_interest / HiddenInterest) — сопоставляем без учёта регистра и «_».
  const norm = (k: string) => k.replace(/[_\s-]/g, '').toLowerCase();
  const byNorm = new Map(Object.entries(raw).map(([k, v]) => [norm(k), v]));
  const keys: (keyof ScenarioSlots)[] = ['objection', 'hiddenInterest', 'constraint', 'userOffer', 'argumentFact', 'concessionDemand', 'guarantee'];
  const out = {} as ScenarioSlots;
  for (const k of keys) {
    const v = byNorm.get(norm(k));
    if (typeof v !== 'string' || !v.trim()) throw new Error(`Модель не заполнила поле ${k}`);
    out[k] = v.trim();
  }
  return out;
}
