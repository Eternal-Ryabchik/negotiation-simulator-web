import type { LevelId, Metrics, ModeId, ToneId } from '@/lib/arena/types';

export type { LevelId, ModeId, ToneId };

export interface Mode {
  id: ModeId;
  title: string;
  tagline: string;
  description: string;
  level: string;
  duration: string;
  skills: string[];
  icon: string;
}

export const MODES: Mode[] = [
  {
    id: 'quiz',
    title: 'Вопрос-ответ',
    tagline: 'Выбор реплики из вариантов',
    description:
      'Собеседник задаёт вопрос или выдвигает возражение, вы выбираете одну из реплик. Каждый выбор ведёт по своей ветке сценария — к разным финалам.',
    level: 'Базовый',
    duration: '5–10 минут',
    skills: ['Работа с возражениями', 'Логика аргументации', 'Контроль эмоций'],
    icon: 'ListChecks',
  },
  {
    id: 'dialog',
    title: 'Диалог',
    tagline: 'Свободная переписка',
    description:
      'Вы пишете реплики сами. Анализатор разбирает каждую фразу: ясность, факты, эмпатию, тон — и по ней решает, куда пойдёт разговор.',
    level: 'Средний',
    duration: '10–15 минут',
    skills: ['Ясность формулировок', 'Эмпатия', 'Стратегическое мышление'],
    icon: 'MessagesSquare',
  },
  {
    id: 'phrases',
    title: 'Фразы',
    tagline: 'Сборка деловой формулировки',
    description:
      'Соберите точную деловую фразу из фрагментов. Среди них есть «ловушки» — оправдания и слова без обязательств. Правильных решений несколько.',
    level: 'Базовый',
    duration: '5–8 минут',
    skills: ['Деловой тон', 'Ясность формулировок', 'Точность слов'],
    icon: 'Blocks',
  },
  {
    id: 'online',
    title: 'Онлайн',
    tagline: 'Видеовстреча с собеседником',
    description:
      'Имитация видеоконференции: собеседник говорит голосом, вы отвечаете голосом или текстом. Напряжение видно по лицу, а не только в цифрах.',
    level: 'Продвинутый',
    duration: '10–15 минут',
    skills: ['Контроль эмоций', 'Убеждение вживую', 'Достижение цели'],
    icon: 'Video',
  },
];

export interface Level {
  id: LevelId;
  title: string;
  summary: string;
  points: string[];
  hints: string;
  timer: string;
  /** Множитель положительных изменений метрик. */
  gain: number;
  /** Множитель отрицательных изменений метрик. */
  loss: number;
  /** Сколько подсказок доступно; -1 — без ограничений. */
  hintLimit: number;
  /** Штраф к итоговому баллу за подсказку. */
  hintCost: number;
  /** Секунд на ход; 0 — без таймера. */
  turnSeconds: number;
  /** Показывать ли разбор сразу после хода (на «Эксперте» — только в итоговом отчёте). */
  instantFeedback: boolean;
  xpMultiplier: number;
}

export const LEVELS: Level[] = [
  {
    id: 'novice',
    title: 'Новичок',
    summary: 'Предсказуемая реакция собеседника',
    points: [
      'Собеседник прощает ошибки: штрафы смягчены',
      'Подсказки доступны без ограничений',
      'После каждого решения — подробный разбор',
      'Ограничений по времени нет',
    ],
    hints: 'Подсказки без ограничений',
    timer: 'Без таймера',
    gain: 1.2,
    loss: 0.75,
    hintLimit: -1,
    hintCost: 0,
    turnSeconds: 0,
    instantFeedback: true,
    xpMultiplier: 1,
  },
  {
    id: 'practic',
    title: 'Практик',
    summary: 'Собеседник адаптируется к вашим ответам',
    points: [
      'Реакции честные: ошибки стоят столько, сколько стоят',
      'Подсказки ограничены — 3 на сессию',
      'Разбор после каждого хода',
      'Таймер 90 секунд на ход',
    ],
    hints: '3 подсказки на сессию',
    timer: 'Таймер 90 сек на ход',
    gain: 1,
    loss: 1,
    hintLimit: 3,
    hintCost: 0,
    turnSeconds: 90,
    instantFeedback: true,
    xpMultiplier: 1.5,
  },
  {
    id: 'expert',
    title: 'Эксперт',
    summary: 'Давление, жёсткие реакции и цена ошибки',
    points: [
      'Ошибки бьют сильнее, успехи даются труднее',
      'Подсказка стоит 5 баллов итоговой оценки',
      'Разбор ходов — только в итоговом отчёте',
      'Таймер 60 секунд на ход',
    ],
    hints: 'Подсказка −5 баллов',
    timer: 'Таймер 60 сек на ход',
    gain: 0.85,
    loss: 1.35,
    hintLimit: -1,
    hintCost: 5,
    turnSeconds: 60,
    instantFeedback: false,
    xpMultiplier: 2,
  },
];

export interface Tone {
  id: ToneId;
  label: string;
  description: string;
  start: Metrics;
  gain: number;
  loss: number;
  opener: string;
}

export const TONES: Tone[] = [
  {
    id: 'friendly',
    label: 'Дружелюбный',
    description: 'Открыт к диалогу, легко идёт на контакт, прощает промахи',
    start: { argument: 30, trust: 60, tension: 20 },
    gain: 1.1,
    loss: 0.85,
    opener: 'Спасибо, что нашли время.',
  },
  {
    id: 'neutral',
    label: 'Деловой',
    description: 'Держит дистанцию, реагирует на факты и конкретику',
    start: { argument: 30, trust: 50, tension: 35 },
    gain: 1,
    loss: 1,
    opener: 'Давайте сразу к делу.',
  },
  {
    id: 'tough',
    label: 'Жёсткий',
    description: 'Давит, торгуется, доверие завоёвывается медленно',
    start: { argument: 30, trust: 40, tension: 50 },
    gain: 0.85,
    loss: 1.15,
    opener: 'У меня мало времени, поэтому сразу к сути.',
  },
  {
    id: 'aggressive',
    label: 'Конфликтный',
    description: 'Раздражён, перебивает, любая резкость вызывает эскалацию',
    start: { argument: 25, trust: 30, tension: 65 },
    gain: 0.8,
    loss: 1.3,
    opener: 'Скажу прямо: я пока не вижу смысла в этом разговоре.',
  },
];

export const toneById = (id: ToneId) => TONES.find((t) => t.id === id) ?? TONES[1];
export const levelById = (id: LevelId) => LEVELS.find((l) => l.id === id) ?? LEVELS[1];

export const SPHERES = [
  'Продажи',
  'Закупки',
  'HR и карьера',
  'Управление проектами',
  'Клиентский сервис',
  'Партнёрства',
  'Внутренние коммуникации',
  'Другое',
];

export const TENSION_LABEL: Record<number, string> = {
  1: 'Спокойное',
  2: 'Среднее',
  3: 'Высокое',
};

export const TONE_TENSION: Record<ToneId, 1 | 2 | 3> = {
  friendly: 1,
  neutral: 2,
  tough: 3,
  aggressive: 3,
};

export const PERSONA_PHOTO =
  'https://cdn.poehali.dev/projects/40d2e788-cb8c-4a41-809b-7c04a80aaabe/files/4ac89c64-d0a7-4072-a260-d6326968a8ff.jpg';

export const USER_PHOTO =
  'https://cdn.poehali.dev/projects/40d2e788-cb8c-4a41-809b-7c04a80aaabe/files/4ae3e2ad-bf9c-4ba2-8c4f-233e27f6cf75.jpg';

export const SKILL_AXES = [
  'Логика аргументации',
  'Ясность формулировок',
  'Деловой тон',
  'Эмпатия',
  'Умение задавать вопросы',
  'Работа с возражениями',
  'Стратегическое мышление',
  'Контроль эмоций',
  'Достижение цели',
];

export const KIND_LABEL: Record<string, string> = {
  aggressive: 'Давление',
  neutral: 'Нейтральный ответ',
  argued: 'Аргумент / предложение',
  question: 'Уточняющий вопрос',
};

export const OUTCOME_META: Record<string, { label: string; tone: 'trust' | 'argument' | 'tension'; icon: string; score: number }> = {
  winwin: { label: 'Взаимовыгодный результат', tone: 'trust', icon: 'CircleCheck', score: 100 },
  deal: { label: 'Договорённость достигнута', tone: 'trust', icon: 'CircleCheck', score: 80 },
  concession: { label: 'Договорённость с уступкой', tone: 'argument', icon: 'CircleDot', score: 55 },
  postponed: { label: 'Решение отложено', tone: 'argument', icon: 'CircleDot', score: 35 },
  fail: { label: 'Переговоры сорваны', tone: 'tension', icon: 'CircleAlert', score: 10 },
};
