import React, { useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MODES, OUTCOME_META, SKILL_AXES, levelById } from '@/lib/simulator-data';
import { useSimulator } from '@/hooks/use-simulator';
import { ACHIEVEMENTS, rankFor } from '@/lib/arena/storage';
import ScreenHeader from './ScreenHeader';

const ProfileScreen: React.FC = () => {
  const { history, openResult, pickMode, clearHistory } = useSimulator();
  const xp = history.reduce((s, r) => s + r.xp, 0);
  const rank = rankFor(xp);

  const skills = useMemo(
    () =>
      SKILL_AXES.map((axis) => {
        const vals = history.slice(0, 5).map((r) => r.skills.find((s) => s.axis === axis)?.value ?? 0);
        return { axis, value: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0 };
      }).sort((a, b) => a.value - b.value),
    [history],
  );

  const trend = useMemo(
    () => [...history].reverse().map((r, i) => ({ n: i + 1, score: r.score })),
    [history],
  );

  const best = history.reduce((m, r) => Math.max(m, r.score), 0);
  const wins = history.filter((r) => r.ending.outcome === 'winwin' || r.ending.outcome === 'deal').length;

  return (
    <div className="min-h-screen bg-background pb-16">
      <ScreenHeader title="Мой прогресс" subtitle="Опыт, достижения и история переговоров" back="home" />
      <div className="mx-auto max-w-[1240px] space-y-5 px-5 py-8 md:px-8">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-foreground font-display text-2xl font-extrabold text-background">
                {rank.index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">Ранг</div>
                <div className="font-display text-2xl font-extrabold tracking-tight">{rank.title}</div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {xp} XP{rank.next ? ` · до «${rank.next.title}» ${rank.next.xp - xp} XP` : ' · максимальный ранг'}
                </div>
              </div>
            </div>
            <div className="metric-track mt-5">
              <div className="metric-fill bg-foreground" style={{ width: `${rank.progress}%` }} />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              {[
                ['Сессий', history.length],
                ['Договорённостей', wins],
                ['Лучший балл', best],
              ].map(([l, v]) => (
                <div key={l} className="rounded-lg border border-border bg-background p-3">
                  <div className="font-display text-xl font-extrabold tabular-nums">{v}</div>
                  <div className="text-[11px] text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Опыт = балл сессии × множитель уровня (Новичок ×1, Практик ×1,5, Эксперт ×2). Сложные сценарии прокачивают быстрее.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-3 font-display text-sm font-extrabold">Динамика баллов</h3>
            {trend.length >= 2 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ left: -20, right: 8, top: 8 }}>
                    <XAxis dataKey="n" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip formatter={(v) => [`${v}`, 'Балл']} labelFormatter={(l) => `Сессия ${l}`} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Пройдите хотя бы две сессии, чтобы увидеть динамику.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-display text-sm font-extrabold">Достижения</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ACHIEVEMENTS.map((a) => {
              const got = a.test(history);
              return (
                <div key={a.id} className={cn('flex gap-3 rounded-lg border p-3', got ? 'border-foreground bg-background' : 'border-border opacity-55')}>
                  <span className={cn('flex h-9 w-9 flex-none items-center justify-center rounded-md', got ? 'bg-foreground text-background' : 'bg-muted')}>
                    <Icon name={got ? a.icon : 'Lock'} size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-sm font-extrabold">{a.title}</div>
                    <div className="text-[11px] text-muted-foreground">{a.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {history.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-1 font-display text-sm font-extrabold">Зоны роста</h3>
            <p className="mb-4 text-xs text-muted-foreground">Средние значения по последним 5 сессиям — от слабых к сильным.</p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {skills.map((s) => (
                <div key={s.axis} className="rounded-lg border border-border bg-background p-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-muted-foreground">{s.axis}</span>
                    <span className="font-display font-extrabold tabular-nums">{s.value}</span>
                  </div>
                  <div className="metric-track">
                    <div className={cn('metric-fill', s.value < 50 ? 'bg-tension' : s.value < 70 ? 'bg-argument' : 'bg-trust')} style={{ width: `${s.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h3 className="mr-auto font-display text-sm font-extrabold">История сессий</h3>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm('Удалить всю историю и опыт?')) clearHistory();
                }}
                className="gap-1.5 text-muted-foreground"
              >
                <Icon name="Trash2" size={14} /> Очистить
              </Button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">Здесь появятся ваши переговоры. Начните с режима «Вопрос-ответ» — он самый быстрый.</p>
              <Button onClick={() => pickMode('quiz')} className="gap-2">
                Начать <Icon name="ArrowRight" size={15} />
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {history.map((r) => {
                const m = OUTCOME_META[r.ending.outcome];
                return (
                  <button key={r.id} onClick={() => openResult(r)} className="flex w-full flex-wrap items-center gap-3 py-3 text-left transition-colors hover:bg-muted/50">
                    <span
                      className={cn(
                        'flex h-10 w-10 flex-none items-center justify-center rounded-lg font-display font-extrabold',
                        m.tone === 'trust' ? 'bg-trust-soft text-trust' : m.tone === 'argument' ? 'bg-argument-soft text-argument' : 'bg-tension-soft text-tension',
                      )}
                    >
                      {r.grade}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.scenarioTitle}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })} · {MODES.find((x) => x.id === r.mode)?.title} ·{' '}
                        {levelById(r.level).title} · {r.ending.title}
                      </div>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {r.score} · +{r.xp} XP
                    </span>
                    <Icon name="ChevronRight" size={15} className="text-steel" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
