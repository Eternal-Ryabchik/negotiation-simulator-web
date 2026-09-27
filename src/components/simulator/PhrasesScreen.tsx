import React, { useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSimulator } from '@/hooks/use-simulator';
import { analyzeText } from '@/lib/arena/analyzer';
import { applyDelta, buildResult, startMetrics } from '@/lib/arena/engine';
import type { Ending, Metrics, MoveKind, TurnRecord } from '@/lib/arena/types';
import ScreenHeader from './ScreenHeader';
import MetricsPanel, { MetricBar } from './MetricsPanel';

interface PhraseTask {
  id: string;
  brief: string;
  situation: string;
  fragments: string[];
  traps: Record<string, string>;
  keys: string[];
  solutions: string[][];
}

const TASKS: PhraseTask[] = [
  {
    id: 'deadline',
    situation: 'Клиент требует сдать проект на месяц раньше.',
    brief: 'Ответьте так, чтобы сохранить доверие и предложить реалистичный срок.',
    fragments: ['Предлагаю', 'обсудить', 'альтернативный', 'срок', 'который', 'позволит', 'сохранить', 'качество проекта'],
    traps: {
      'к сожалению': '«К сожалению» открывает фразу отказом — клиент слышит «нет» раньше, чем предложение.',
      'постараемся': '«Постараемся» — обещание без обязательств.',
      'мы не успеваем': '«Мы не успеваем» — это ваша проблема, а не решение для клиента.',
    },
    keys: ['Предлагаю', 'срок', 'качество проекта'],
    solutions: [
      ['Предлагаю', 'обсудить', 'альтернативный', 'срок', 'который', 'позволит', 'сохранить', 'качество проекта'],
      ['Предлагаю', 'обсудить', 'срок', 'который', 'позволит', 'сохранить', 'качество проекта'],
    ],
  },
  {
    id: 'price',
    situation: 'Закупщик: «У конкурентов на 20% дешевле».',
    brief: 'Обоснуйте цену через ценность, не оправдываясь и не снижая её.',
    fragments: ['Разница в цене', 'включает', 'годовое сопровождение', 'и', 'фиксированный срок', 'в договоре'],
    traps: {
      'просто': '«Просто» обесценивает ваш аргумент.',
      'такая у нас политика': '«Такая политика» — ссылка на правило вместо объяснения ценности.',
      'наверное': '«Наверное» разрушает уверенность всей фразы.',
    },
    keys: ['Разница в цене', 'включает', 'в договоре'],
    solutions: [
      ['Разница в цене', 'включает', 'годовое сопровождение', 'и', 'фиксированный срок', 'в договоре'],
      ['Разница в цене', 'включает', 'фиксированный срок', 'в договоре', 'и', 'годовое сопровождение'],
    ],
  },
  {
    id: 'conflict',
    situation: 'Раздражённый клиент: «Вы опять сорвали поставку!»',
    brief: 'Снимите напряжение и сразу переведите разговор к решению.',
    fragments: ['Понимаю', 'ваше недовольство', 'давайте', 'сегодня же', 'согласуем', 'план исправления'],
    traps: {
      'успокойтесь': '«Успокойтесь» почти всегда вызывает обратный эффект.',
      'вы сами': '«Вы сами…» — перекладывание вины на клиента.',
      'не по нашей вине': 'Оправдание до признания проблемы звучит как защита, а не как забота.',
    },
    keys: ['Понимаю', 'давайте', 'план исправления'],
    solutions: [
      ['Понимаю', 'ваше недовольство', 'давайте', 'сегодня же', 'согласуем', 'план исправления'],
      ['Понимаю', 'ваше недовольство', 'давайте', 'согласуем', 'план исправления', 'сегодня же'],
    ],
  },
];

const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const poolFor = (t: PhraseTask) => shuffle([...t.fragments, ...Object.keys(t.traps)]);

interface Verdict {
  score: number;
  clarity: number;
  persuasion: number;
  delta: Metrics;
  title: string;
  notes: string[];
  ok: boolean;
  kind: MoveKind;
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

function evaluate(task: PhraseTask, line: string[]): Verdict {
  const joined = line.join(' ');
  const a = analyzeText(joined);
  const exact = task.solutions.some((s) => s.join(' ') === joined);
  const traps = line.filter((w) => w in task.traps);
  const keyHits = task.keys.filter((k) => line.includes(k)).length / task.keys.length;
  const orderOk = line[0] === task.solutions[0][0];
  const missing = task.fragments.filter((f) => !line.includes(f));

  const score = exact ? 96 : clamp(28 + keyHits * 40 + (orderOk ? 12 : 0) - traps.length * 18 - missing.length * 3 + (a.persuasion - 50) / 5);
  const notes: string[] = traps.map((t) => task.traps[t]);
  if (exact) notes.unshift('Вы предложили решение, а не оправдание: инициатива, предмет обсуждения и польза для собеседника — в правильном порядке.');
  else {
    if (!orderOk) notes.push(`Начните с «${task.solutions[0][0]}» — так фраза сразу задаёт тон.`);
    if (keyHits < 1) notes.push(`Не хватает опорных частей: ${task.keys.filter((k) => !line.includes(k)).map((k) => `«${k}»`).join(', ')}.`);
    if (!traps.length && keyHits === 1 && orderOk) notes.push('Смысл считывается, но порядок слов можно сделать естественнее.');
  }

  const ok = score >= 70;
  const delta: Metrics = ok
    ? { argument: Math.round((score - 50) / 3), trust: Math.round((score - 55) / 3), tension: -Math.round((score - 50) / 4) }
    : { argument: Math.round((score - 55) / 5), trust: -4 - traps.length * 3, tension: 4 + traps.length * 4 };

  return {
    score,
    clarity: clamp(exact ? 94 : a.clarity - traps.length * 10),
    persuasion: clamp(exact ? 90 : a.persuasion - traps.length * 8),
    delta,
    title: score >= 90 ? 'Отличная формулировка' : score >= 70 ? 'Рабочий вариант' : score >= 50 ? 'Смысл размыт' : 'Фраза не решает задачу',
    notes: notes.slice(0, 3),
    ok,
    kind: traps.length ? 'aggressive' : ok ? 'argued' : 'neutral',
  };
}

const endingFor = (avg: number): Ending =>
  avg >= 85
    ? { outcome: 'winwin', title: 'Точные деловые формулировки', text: 'Ваши фразы предлагают решения, а не оправдания, и не содержат слов-ловушек.' }
    : avg >= 70
      ? { outcome: 'deal', title: 'Уверенный деловой тон', text: 'Большинство фраз рабочие. Шлифуйте порядок: инициатива → предмет → польза для собеседника.' }
      : avg >= 50
        ? { outcome: 'concession', title: 'Формулировки требуют доработки', text: 'Смысл угадывается, но слова-ловушки и порядок частей ослабляют позицию.' }
        : { outcome: 'fail', title: 'Фразы работают против вас', text: 'Оправдания и слова без обязательств подрывают доверие. Повторите задания.' };

const PhrasesScreen: React.FC = () => {
  const { scenario, level, finishSession } = useSimulator();
  const tasks = useMemo(() => {
    const first = TASKS.find((t) => t.id === scenario.id || (scenario.id === 'salary' && t.id === 'price'));
    return first ? [first, ...TASKS.filter((t) => t !== first)] : TASKS;
  }, [scenario.id]);

  const [index, setIndex] = useState(0);
  const task = tasks[index];
  const [bank, setBank] = useState<string[]>(() => poolFor(tasks[0]));
  const [line, setLine] = useState<string[]>([]);
  const [dragged, setDragged] = useState<{ from: 'bank' | 'line'; index: number } | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [metrics, setMetrics] = useState<Metrics>(() => startMetrics(scenario));
  const [turns, setTurns] = useState<TurnRecord[]>([]);
  const [attempts, setAttempts] = useState(0);

  const addWord = (w: string, i: number) => {
    if (verdict) return;
    setBank((b) => b.filter((_, idx) => idx !== i));
    setLine((l) => [...l, w]);
  };

  const removeWord = (i: number) => {
    if (verdict) return;
    const w = line[i];
    setLine((l) => l.filter((_, idx) => idx !== i));
    setBank((b) => [...b, w]);
  };

  const dropOnLine = (targetIndex: number | null) => {
    if (!dragged || verdict) return;
    if (dragged.from === 'bank') {
      const w = bank[dragged.index];
      setBank((b) => b.filter((_, idx) => idx !== dragged.index));
      setLine((l) => {
        const next = [...l];
        next.splice(targetIndex ?? next.length, 0, w);
        return next;
      });
    } else if (targetIndex !== null && targetIndex !== dragged.index) {
      setLine((l) => {
        const next = [...l];
        const [w] = next.splice(dragged.index, 1);
        next.splice(targetIndex > dragged.index ? targetIndex - 1 : targetIndex, 0, w);
        return next;
      });
    }
    setDragged(null);
  };

  const reset = (t: PhraseTask = task) => {
    setBank(poolFor(t));
    setLine([]);
    setVerdict(null);
  };

  const check = () => {
    if (!line.length) return;
    const v = evaluate(task, line);
    setVerdict(v);
    setAttempts((n) => n + 1);
    setMetrics((m) => applyDelta(m, v.delta));
    const a = analyzeText(line.join(' '));
    setTurns((ts) => [
      ...ts,
      {
        nodeId: `phrase-${task.id}`,
        stage: task.situation,
        partnerLine: task.brief,
        userText: line.join(' '),
        source: 'text',
        kind: v.kind,
        analysis: { ...a, kind: v.kind, clarity: v.clarity, persuasion: v.persuasion, tips: v.notes },
        delta: v.delta,
        reaction: v.title,
        explanation: v.notes.join(' '),
        best: v.score < 90 ? { kind: 'argued', text: task.solutions[0].join(' ') } : undefined,
      },
    ]);
    if (v.ok) toast.success(v.title, { description: `Оценка ${v.score} из 100` });
    else toast.error(v.title, { description: `Оценка ${v.score} из 100` });
  };

  const nextTask = () => {
    if (index + 1 >= tasks.length) {
      const avg = turns.reduce((s, t) => s + (t.analysis.persuasion + t.analysis.clarity) / 2, 0) / Math.max(1, turns.length);
      const ending = endingFor(avg);
      finishSession(
        buildResult({
          scenario,
          mode: 'phrases',
          levelId: level.id,
          turns,
          path: turns.map((t) => t.nodeId),
          metrics,
          goalProgress: Math.round(avg),
          ending,
          hintsUsed: 0,
        }),
      );
      return;
    }
    const t = tasks[index + 1];
    setIndex(index + 1);
    reset(t);
  };

  const hint = () =>
    toast('Подсказка', {
      description: `Начните с «${task.solutions[0][0]}». Опорные части: ${task.keys.map((k) => `«${k}»`).join(', ')}. Одна из заготовок — ловушка.`,
    });

  return (
    <div className="min-h-screen bg-background">
      <ScreenHeader
        step={3}
        title={scenario.title}
        subtitle={`Режим «Фразы» · ${level.title}`}
        back="setup"
        right={
          <Badge variant="outline" className="gap-1.5 font-medium">
            <Icon name="Blocks" size={13} />
            Задание {index + 1} из {tasks.length}
          </Badge>
        }
      />

      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1240px] px-5 py-3 md:px-8">
          <MetricsPanel metrics={metrics} compact />
        </div>
      </div>

      <div className="mx-auto max-w-[900px] px-5 py-8 md:px-8">
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="mb-2 font-display text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Ситуация</p>
          <p className="text-sm text-muted-foreground">{task.situation}</p>
          <h2 className="mx-auto mt-2 max-w-[34ch] font-display text-xl font-extrabold leading-snug tracking-tight md:text-2xl">{task.brief}</h2>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => dropOnLine(null)}
          className={cn(
            'mt-6 flex min-h-[124px] flex-wrap content-start items-start gap-2 rounded-xl border-2 border-dashed p-4 transition-colors',
            line.length ? 'border-border bg-card' : 'border-border bg-muted',
          )}
        >
          {!line.length && <p className="m-auto text-sm text-muted-foreground">Перетащите сюда фрагменты или нажмите на них ниже</p>}
          {line.map((w, i) => (
            <span
              key={`${w}-${i}`}
              draggable={!verdict}
              onDragStart={() => setDragged({ from: 'line', index: i })}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.stopPropagation();
                dropOnLine(i);
              }}
              className={cn(
                'group flex cursor-grab items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium active:cursor-grabbing',
                verdict && w in task.traps ? 'bg-tension text-white' : 'bg-foreground text-background',
              )}
            >
              {w}
              {!verdict && (
                <button onClick={() => removeWord(i)} aria-label={`Убрать «${w}»`} className="opacity-50 transition-opacity hover:opacity-100">
                  <Icon name="X" size={13} />
                </button>
              )}
            </span>
          ))}
        </div>

        {!verdict && (
          <div className="mt-4 flex flex-wrap gap-2">
            {bank.map((w, i) => (
              <button
                key={`${w}-${i}`}
                draggable
                onDragStart={() => setDragged({ from: 'bank', index: i })}
                onClick={() => addWord(w, i)}
                className="cursor-grab rounded-md border border-border bg-card px-3 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
              >
                {w}
              </button>
            ))}
            {!bank.length && <span className="text-xs text-muted-foreground">Все фрагменты использованы</span>}
          </div>
        )}

        {!verdict && (
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button onClick={check} disabled={!line.length} className="gap-2 font-display font-extrabold">
              Проверить ответ
              <Icon name="Check" size={16} />
            </Button>
            <Button variant="outline" onClick={hint} className="gap-2">
              <Icon name="Lightbulb" size={15} />
              Подсказка
            </Button>
            <Button variant="ghost" onClick={() => reset()} disabled={!line.length} className="gap-2 text-muted-foreground">
              <Icon name="RotateCcw" size={15} />
              Очистить
            </Button>
          </div>
        )}

        {verdict && (
          <div className="mt-6 animate-fade-in rounded-xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-lg font-display text-lg font-extrabold',
                  verdict.ok ? 'bg-trust-soft text-trust' : 'bg-tension-soft text-tension',
                )}
              >
                {verdict.score}
              </span>
              <div>
                <div className="font-display text-lg font-extrabold tracking-tight">{verdict.title}</div>
                <div className="text-xs text-muted-foreground">Оценка фразы из 100 баллов · попыток: {attempts}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <MetricBar label="Ясность" value={verdict.clarity} tone="argument" icon="Eye" />
              <MetricBar label="Убедительность" value={verdict.persuasion} tone="argument" icon="Scale" />
            </div>

            <ul className="mt-5 space-y-2">
              {verdict.notes.map((note) => (
                <li key={note} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                  <Icon name="ArrowRight" size={14} className="mt-1 flex-none text-foreground" />
                  {note}
                </li>
              ))}
            </ul>
            {verdict.score < 90 && (
              <p className="mt-4 rounded-md border border-border bg-background p-3 text-xs">
                <span className="font-medium">Эталон: </span>«{task.solutions[0].join(' ')}»
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button onClick={nextTask} className="gap-2 font-display font-extrabold">
                {index + 1 >= tasks.length ? 'К результатам' : 'Следующее задание'}
                <Icon name="ArrowRight" size={16} />
              </Button>
              <Button variant="outline" onClick={() => reset()} className="gap-2">
                <Icon name="RefreshCw" size={15} />
                Собрать заново
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhrasesScreen;
