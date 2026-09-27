// Офлайн-анализатор реплики на русском языке. Работает без сети и ключей:
// распознаёт вопросы, факты, предложения, обязательства, эмпатию, давление и «слова-паразиты»,
// а по ним классифицирует ход и оценивает ясность, убедительность и эмпатию.
import type { Analysis, MoveKind } from './types';

const count = (text: string, patterns: RegExp[]) => patterns.reduce((n, p) => n + (p.test(text) ? 1 : 0), 0);

const QUESTION_START = /^(что|как|почему|зачем|какой|какая|какое|какие|каким|когда|сколько|где|кто|насколько|правильно ли|можно ли|готовы ли|верно ли|могли бы|подскажите|расскажите|уточните)/;

const EMPATHY = [
  /понима/, /слыш/, /соглас(ен|на|ны)/, /разделяю/, /ценю/, /важно для вас/, /ваш[аеиу]? (опасени|беспокойств|позици|ситуаци|задач)/,
  /справедлив/, /вы правы/, /представляю/, /сочувств/, /неприятно/,
];
const POLITE = [/пожалуйста/, /спасибо/, /благодар/, /извин/, /прошу прощения/, /будьте добры/, /уважаем/];
const FACT = [
  /\d/, /процент/, /рубл|₽|млн|тыс/, /недел|месяц|квартал|дн(я|ей)|срок/, /кейс|пример|опыт|статистик|данн(ые|ых)|результат|показател|за прошлый/,
];
const PROPOSAL = [
  /предлага/, /давайте/, /вариант/, /могу (дать|предложить|сделать)/, /готов[аы]? /, /можем/, /компромисс/, /этап/, /раздел/,
  /взамен/, /в обмен/, /если .{2,40} то/, /при условии/,
];
const COMMITMENT = [/зафиксир/, /в договор/, /гарантир/, /обязу/, /штраф/, /sla/, /отч[её]т/, /статус/, /еженедел/, /письменно/, /контрольн/];
const AGGRESSION = [
  /ваши проблемы/, /не мои проблемы/, /не наша проблема/, /не ваше дело/, /берите или/, /не нравится/, /ерунд/, /глупо/, /бред/,
  /смешно/, /вы не понимаете/, /вы обязаны/, /немедленно/, /ультиматум/, /никаких/, /без вариантов/, /не обсуждается/, /издеваетесь/,
  /шутите/, /абсурд/, /или .{1,30} или/, /не будет/, /мне всё равно|мне все равно/, /ваш выбор/, /сами виноваты/,
];
const HEDGE = [/наверное/, /может быть/, /возможно/, /постара(юсь|емся)/, /попробуем/, /обычно/, /вроде/, /как бы/, /не знаю/, /не уверен/, /в принципе/, /как-нибудь/, /что-нибудь/];

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function analyzeText(raw: string, keywords: string[] = []): Analysis {
  const text = raw.trim();
  const lower = text.toLowerCase().replace(/ё/g, 'е');
  const words = lower.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?…]+/).map((s) => s.trim()).filter(Boolean);
  const avgSentence = words.length / Math.max(1, sentences.length);

  const isQuestion = /\?/.test(text) || QUESTION_START.test(lower);
  const empathy = count(lower, EMPATHY);
  const polite = count(lower, POLITE);
  const facts = count(lower, FACT);
  const proposal = count(lower, PROPOSAL);
  const commitment = count(lower, COMMITMENT);
  let aggression = count(lower, AGGRESSION);
  const hedges = count(lower, HEDGE);
  const exclam = (text.match(/!/g) ?? []).length;
  const caps = (text.match(/[А-ЯЁA-Z]{4,}/g) ?? []).length;
  if (exclam >= 2) aggression += 1;
  if (caps >= 1) aggression += 1;

  const stemHits = keywords.filter((k) => lower.includes(k)).length;
  const relevance = keywords.length ? clamp(35 + stemHits * 18) : 60;

  const signals: string[] = [];
  if (isQuestion) signals.push('Вопрос');
  if (facts) signals.push('Факты и цифры');
  if (proposal) signals.push('Предложение');
  if (commitment) signals.push('Обязательство');
  if (empathy) signals.push('Эмпатия');
  if (polite) signals.push('Вежливость');
  if (hedges) signals.push('Неуверенные слова');
  if (aggression) signals.push('Давление');

  let kind: MoveKind;
  if (aggression >= 2 || (aggression >= 1 && !empathy && !polite)) kind = 'aggressive';
  else if (isQuestion && !(proposal && (facts || commitment))) kind = 'question';
  else if (facts + proposal + commitment >= 1 && words.length >= 6) kind = 'argued';
  else kind = 'neutral';

  let clarity = 62;
  if (words.length < 4) clarity -= 25;
  else if (words.length <= 45) clarity += 12;
  else if (words.length > 80) clarity -= 15;
  if (avgSentence > 28) clarity -= 12;
  clarity += Math.min(facts, 2) * 7 - hedges * 9;

  let persuasion = 35 + Math.min(facts, 3) * 11 + Math.min(proposal, 2) * 10 + Math.min(commitment, 2) * 12 - hedges * 8 - aggression * 12;
  if (isQuestion) persuasion += 6;
  if (words.length < 5) persuasion -= 12;

  let empathyScore = 38 + Math.min(empathy, 2) * 18 + (isQuestion ? 14 : 0) + Math.min(polite, 2) * 8 - aggression * 22;
  const politeness = clamp(70 + polite * 10 + empathy * 5 - aggression * 25 - exclam * 5);

  clarity = clamp(clarity);
  persuasion = clamp(persuasion);
  empathyScore = clamp(empathyScore);

  const toneLabel =
    kind === 'aggressive' ? 'Жёсткий, конфликтный' : empathy || polite ? 'Партнёрский' : hedges >= 2 ? 'Неуверенный' : kind === 'argued' ? 'Уверенный, деловой' : 'Нейтральный';

  const strategy =
    kind === 'aggressive'
      ? 'Давление'
      : kind === 'question'
        ? 'Выявление интересов'
        : commitment
          ? 'Гарантии и обязательства'
          : proposal
            ? 'Поиск взаимной выгоды'
            : facts
              ? 'Аргументация фактами'
              : 'Выжидание';

  const tips: string[] = [];
  if (aggression) tips.push('Уберите давление и оценочные слова — спорьте с проблемой, а не с человеком.');
  if (!facts && kind !== 'question') tips.push('Добавьте один конкретный факт: цифру, срок или пример.');
  if (hedges) tips.push('Слова «наверное», «постараемся», «обычно» звучат как отсутствие обязательств — замените их конкретикой.');
  if (!isQuestion && !empathy && kind !== 'argued') tips.push('Задайте уточняющий вопрос о том, что важно собеседнику.');
  if (words.length > 80) tips.push('Реплика слишком длинная — сократите до 2–3 предложений.');
  if (words.length < 4) tips.push('Слишком коротко: собеседнику не за что зацепиться.');
  if (kind === 'argued' && !commitment && !proposal) tips.push('Завершите аргумент предложением или следующим шагом.');
  if (keywords.length && stemHits === 0 && words.length > 6 && kind !== 'question') tips.push('Реплика уходит от темы переговоров — вернитесь к предмету разговора.');

  return { kind, clarity, persuasion, empathy: empathyScore, politeness, relevance, toneLabel, strategy, signals, tips: tips.slice(0, 3) };
}
