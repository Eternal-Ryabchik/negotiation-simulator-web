import React, { useMemo, useState } from 'react';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LEVELS, MODES, OUTCOME_META, levelById, toneById } from '@/lib/simulator-data';
import { useSimulator } from '@/hooks/use-simulator';
import { recommendationsFor } from '@/lib/arena/engine';
import { coachFeedback, llmReady } from '@/lib/arena/llm';
import { rankFor } from '@/lib/arena/storage';
import ScreenHeader from './ScreenHeader';
import MetricsPanel from './MetricsPanel';
import { DeltaChips, KindBadge } from './SessionParts';

const TONE_CLASS = {
  trust: 'bg-trust-soft text-trust',
  argument: 'bg-argument-soft text-argument',
  tension: 'bg-tension-soft text-tension',
} as const;

const ResultScreen: React.FC = () => {
  const { result, scenarios, history, llm, go, setLevel, setScenario, startSimulation, pickMode } = useSimulator();
  const [coach, setCoach] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);

  const scenario = scenarios.find((s) => s.id === result?.scenarioId);
  const recs = useMemo(() => (result ? recommendationsFor(result) : []), [result]);

  if (!result) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <p className="text-muted-foreground">Результатов пока нет — пройдите переговоры.</p>
        <Button onClick={() => go('home')}>На главную</Button>
      </div>
    );
  }

  const meta = OUTCOME_META[result.ending.outcome];
  const level = levelById(result.level);
  const mode = MODES.find((m) => m.id === result.mode);
  const totalXp = history.reduce((s, r) => s + r.xp, 0);
  const rank = rankFor(totalXp);
  const nextLevel = LEVELS[Math.min(LEVELS.findIndex((l) => l.id === level.id) + 1, LEVELS.length - 1)];
  const chartData = result.skills.map((s) => ({ axis: s.axis.split(' ')[0], full: s.axis, value: s.value }));

  const endings = scenario
    ? Object.values(scenario.graph.nodes).filter((n) => n.ending).map((n) => n.ending!)
    : [];
  const uniqueEndings = Array.from(new Map(endings.map((e) => [e.outcome, e])).values()).sort(
    (a, b) => OUTCOME_META[b.outcome].score - OUTCOME_META[a.outcome].score,
  );

  const restart = () => {
    if (scenario) setScenario(scenario.id);
    setLevel(result.level);
    startSimulation();
  };

  const askCoach = async () => {
    if (!scenario) return;
    setCoachLoading(true);
    try {
      setCoach(await coachFeedback(llm, scenario, result));
    } catch (e) {
      toast.error('ИИ-разбор недоступен', { description: e instanceof Error ? e.message : 'Проверьте ключ в настройках администратора.' });
    } finally {
      setCoachLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <ScreenHeader
        step={4}
        title="Разбор переговоров"
        subtitle={`${result.scenarioTitle} · «${mode?.title ?? ''}» · ${level.title} · собеседник: ${toneById(result.tone).label.toLowerCase()}`}
        back="home"
      />

      <div className="mx-auto max-w-[1240px] px-5 py-8 md:px-8">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <div className="rounded-xl border border-border bg-card p-6 md:p-7">
            <div className="flex flex-wrap items-center gap-4">
              <div className={cn('flex h-20 w-20 flex-none flex-col items-center justify-center rounded-xl', TONE_CLASS[meta.tone])}>
                <span className="font-display text-3xl font-extrabold leading-none">{result.grade}</span>
                <span className="mt-1 text-[11px] font-medium tabular-nums">{result.score} / 100</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn('mb-1.5 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium', TONE_CLASS[meta.tone])}>
                  <Icon name={meta.icon} size={13} />
                  {meta.label}
                </div>
                <h2 className="font-display text-xl font-extrabold tracking-tight md:text-2xl">{result.ending.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{result.ending.text}</p>
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-5">
              <MetricsPanel metrics={result.metrics} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="text-xs text-muted-foreground">Прогресс цели</div>
                <div className="mt-0.5 font-display text-sm font-extrabold tabular-nums">{result.goalProgress}%</div>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="text-xs text-muted-foreground">Ходов · подсказок</div>
                <div className="mt-0.5 font-display text-sm font-extrabold tabular-nums">
                  {result.turns.length} · {result.hintsUsed}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="text-xs text-muted-foreground">Опыт</div>
                <div className="mt-0.5 font-display text-sm font-extrabold tabular-nums">+{result.xp} XP</div>
                <div className="text-[11px] text-muted-foreground">{rank.title}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-1 font-display text-sm font-extrabold tracking-tight">Диаграмма навыков</h3>
            <p className="mb-2 text-xs text-muted-foreground">Рассчитана по вашим фактическим репликам</p>
            <div className="h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData} outerRadius="70%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Radar dataKey="value" stroke="hsl(var(--foreground))" fill="hsl(var(--argument))" fillOpacity={0.22} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
              {chartData.map((d) => (
                <div key={d.full} className="flex justify-between gap-2">
                  <span className="truncate">{d.full}</span>
                  <span className="font-display font-extrabold tabular-nums text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {uniqueEndings.length > 0 && (
          <div className="mt-5 rounded-xl border border-border bg-card p-6">
            <h3 className="mb-1 flex items-center gap-2 font-display text-sm font-extrabold tracking-tight">
              <Icon name="GitBranch" size={15} />
              Возможные финалы сценария
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">Исход зависит от ваших ходов. Попробуйте пройти сценарий к лучшему финалу.</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {uniqueEndings.map((e) => {
                const reached = e.outcome === result.ending.outcome;
                const m = OUTCOME_META[e.outcome];
                return (
                  <div
                    key={e.outcome}
                    className={cn('rounded-lg border p-3 text-xs', reached ? 'border-foreground bg-background' : 'border-border opacity-70')}
                  >
                    <div className={cn('mb-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium', TONE_CLASS[m.tone])}>
                      <Icon name={m.icon} size={11} />
                      {reached ? 'Ваш финал' : m.label}
                    </div>
                    <div className="font-display font-extrabold leading-tight">{e.title}</div>
                  </div>
                );
              })}
            </div>
            {scenario && result.path.length > 1 && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="mr-1 text-muted-foreground">Ваш путь:</span>
                {result.path.map((id, i) => (
                  <React.Fragment key={`${id}-${i}`}>
                    <span className="rounded-md bg-muted px-2 py-0.5 font-medium">{scenario.graph.nodes[id]?.stage ?? 'Финал'}</span>
                    {i < result.path.length - 1 && <Icon name="ChevronRight" size={12} className="text-steel" />}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-extrabold tracking-tight">
              <Icon name="ListOrdered" size={15} />
              Разбор по ходам
            </h3>
            {result.turns.length === 0 && <p className="text-xs text-muted-foreground">Вы завершили сессию без ходов.</p>}
            <ol className="space-y-4">
              {result.turns.map((t, i) => (
                <li key={i} className="rounded-lg border border-border bg-background p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-display font-extrabold text-foreground">Ход {i + 1}</span>
                    <span>· {t.stage}</span>
                    <KindBadge kind={t.kind} className="ml-auto" />
                  </div>
                  <p className="text-xs italic leading-relaxed text-muted-foreground">«{t.partnerLine}»</p>
                  <p className="mt-2 rounded-md bg-foreground px-3 py-2 text-sm leading-relaxed text-background">{t.userText}</p>
                  <div className="mt-3">
                    <DeltaChips delta={t.delta} />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t.explanation}</p>
                  {t.source === 'text' && t.analysis.tips.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {t.analysis.tips.map((tip) => (
                        <li key={tip} className="flex gap-1.5 text-[11px] text-muted-foreground">
                          <Icon name="Lightbulb" size={12} className="mt-0.5 flex-none text-argument" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                  {t.best && (
                    <div className="mt-3 rounded-md border border-dashed border-border p-3 text-xs leading-relaxed">
                      <div className="mb-1 flex items-center gap-1.5 font-medium">
                        <Icon name="Sparkles" size={12} className="text-trust" />
                        Сильнее было бы: <KindBadge kind={t.best.kind} />
                      </div>
                      «{t.best.text}»
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-extrabold tracking-tight">
                <Icon name="Lightbulb" size={15} className="text-argument" />
                Рекомендации
              </h3>
              <ul className="space-y-2.5">
                {recs.map((r) => (
                  <li key={r} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                    <Icon name="ArrowRight" size={13} className="mt-0.5 flex-none text-foreground" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-extrabold tracking-tight">
                <Icon name="Sparkles" size={15} />
                Разбор от ИИ-тренера
              </h3>
              {coach ? (
                <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{coach}</p>
              ) : llmReady(llm) ? (
                <>
                  <p className="mb-3 text-xs text-muted-foreground">Развёрнутый разбор ваших реплик с примерами более сильных формулировок.</p>
                  <Button size="sm" onClick={askCoach} disabled={coachLoading || !scenario} className="gap-2">
                    <Icon name={coachLoading ? 'Loader2' : 'Sparkles'} size={14} className={cn(coachLoading && 'animate-spin')} />
                    {coachLoading ? 'Анализирую…' : 'Получить разбор'}
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Необязательная функция: подключите LLM в{' '}
                  <button onClick={() => go('admin')} className="underline underline-offset-2">
                    кабинете администратора
                  </button>
                  . Офлайн-разбор выше работает без ключей.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-5">
          <Badge variant="secondary" className="gap-1.5 font-medium">
            <Icon name="Award" size={13} />
            Оценка {result.grade} · {result.score} баллов
          </Badge>
          <div className="ml-auto flex flex-wrap gap-2.5">
            <Button variant="outline" onClick={restart} className="gap-2">
              <Icon name="RotateCcw" size={15} />
              Повторить сценарий
            </Button>
            {level.id !== 'expert' && (
              <Button
                onClick={() => {
                  if (scenario) setScenario(scenario.id);
                  setLevel(nextLevel.id);
                  toast.success(`Уровень повышен: ${nextLevel.title}`, { description: nextLevel.summary });
                  startSimulation();
                }}
                className="gap-2 font-display font-extrabold"
              >
                Следующий уровень
                <Icon name="ArrowUpRight" size={16} />
              </Button>
            )}
            <Button variant="outline" onClick={() => pickMode(result.mode)} className="gap-2">
              <Icon name="LayoutGrid" size={15} />
              Другой сценарий
            </Button>
            <Button variant="ghost" onClick={() => go('profile')} className="gap-2 text-muted-foreground">
              <Icon name="UserRound" size={15} />
              Мой прогресс
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultScreen;
