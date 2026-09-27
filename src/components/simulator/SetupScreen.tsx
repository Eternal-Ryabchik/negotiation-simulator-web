import React, { useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LEVELS, MODES, TENSION_LABEL, TONE_TENSION, toneById } from '@/lib/simulator-data';
import { useSimulator } from '@/hooks/use-simulator';
import ScreenHeader from './ScreenHeader';
import { PartnerAvatar } from './SessionParts';

const SetupScreen: React.FC = () => {
  const { mode, level, scenario, scenarios, setLevel, setScenario, startSimulation, pickMode, go } = useSimulator();
  const [sphere, setSphere] = useState<string>('Все');

  const spheres = useMemo(() => ['Все', ...Array.from(new Set(scenarios.map((s) => s.sphere)))], [scenarios]);
  const list = sphere === 'Все' ? scenarios : scenarios.filter((s) => s.sphere === sphere);
  const tone = toneById(scenario.partner.tone);

  return (
    <div className="min-h-screen bg-background pb-32">
      <ScreenHeader
        step={2}
        title={mode ? `Режим «${mode.title}»` : 'Подготовка к переговорам'}
        subtitle="Выберите сценарий и уровень сложности — это определит поведение собеседника"
        back="home"
      />

      <div className="mx-auto max-w-[1240px] px-5 py-8 md:px-8">
        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg font-extrabold tracking-tight">Режим</h2>
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => pickMode(m.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  mode?.id === m.id ? 'border-foreground bg-foreground text-background' : 'border-border bg-card hover:border-foreground',
                )}
              >
                <Icon name={m.icon} size={15} />
                {m.title}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Сценарий переговоров</h2>
            <Button variant="outline" size="sm" onClick={() => go('admin')} className="gap-1.5">
              <Icon name="Plus" size={14} />
              Создать свой сценарий
            </Button>
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {spheres.map((s) => (
              <button
                key={s}
                onClick={() => setSphere(s)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  sphere === s ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((s) => {
              const active = scenario.id === s.id;
              const tension = TONE_TENSION[s.partner.tone];
              return (
                <button key={s.id} onClick={() => setScenario(s.id)} data-active={active} className="card-pick flex flex-col p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-muted">
                      <Icon name={s.icon} size={17} fallback="MessagesSquare" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base font-extrabold leading-tight tracking-tight">{s.title}</h3>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="text-[11px] text-muted-foreground">{s.sphere}</span>
                        {!s.builtIn && <Badge className="h-4 px-1.5 text-[10px]">Свой</Badge>}
                        {s.handcrafted && <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">Авторский</Badge>}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'flex h-5 w-5 flex-none items-center justify-center rounded-full border',
                        active ? 'border-foreground bg-foreground text-background' : 'border-border',
                      )}
                    >
                      {active && <Icon name="Check" size={12} />}
                    </span>
                  </div>

                  <dl className="mt-4 space-y-2 text-xs">
                    <div className="flex gap-2">
                      <dt className="w-[86px] flex-none text-muted-foreground">Ваша роль</dt>
                      <dd className="font-medium">{s.userRole}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-[86px] flex-none text-muted-foreground">Собеседник</dt>
                      <dd className="font-medium">{s.partner.role}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-[86px] flex-none text-muted-foreground">Цель</dt>
                      <dd className="font-medium">{s.userGoal}</dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      Напряжение
                      <span className="flex gap-0.5">
                        {[1, 2, 3].map((k) => (
                          <span key={k} className={cn('h-1.5 w-4 rounded-full', k <= tension ? 'bg-tension' : 'bg-accent')} />
                        ))}
                      </span>
                      {TENSION_LABEL[tension]}
                    </span>
                    <span>{toneById(s.partner.tone).label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 font-display text-lg font-extrabold tracking-tight">Уровень сложности</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {LEVELS.map((lvl) => {
              const active = level.id === lvl.id;
              return (
                <button key={lvl.id} onClick={() => setLevel(lvl.id)} data-active={active} className="card-pick p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-lg font-extrabold tracking-tight">{lvl.title}</h3>
                    <span
                      className={cn(
                        'flex h-5 w-5 flex-none items-center justify-center rounded-full border',
                        active ? 'border-foreground bg-foreground text-background' : 'border-border',
                      )}
                    >
                      {active && <Icon name="Check" size={12} />}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{lvl.summary}</p>
                  <ul className="mt-4 space-y-1.5">
                    {lvl.points.map((p) => (
                      <li key={p} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                        <Icon name="Dot" size={14} className="-ml-1 flex-none" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="gap-1 text-[11px] font-medium">
                      <Icon name="Lightbulb" size={11} /> {lvl.hints}
                    </Badge>
                    <Badge variant="secondary" className="gap-1 text-[11px] font-medium">
                      <Icon name="Timer" size={11} /> {lvl.timer}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold tracking-tight">
            <Icon name="FileText" size={18} />
            Брифинг перед встречей
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex gap-4">
              <PartnerAvatar partner={scenario.partner} className="h-14 w-14 flex-none" />
              <div className="min-w-0 text-sm">
                <div className="font-display font-extrabold">{scenario.partner.name}</div>
                <div className="text-xs text-muted-foreground">
                  {scenario.partner.role} · {scenario.partner.company}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Манера: {tone.label.toLowerCase()}.</span> {tone.description}.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Тема: <span className="text-foreground">{scenario.topic}</span>
                </p>
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Что вы знаете</div>
              <ul className="space-y-1.5">
                {scenario.briefing.map((b) => (
                  <li key={b} className="flex gap-2 text-xs leading-relaxed">
                    <Icon name="Check" size={13} className="mt-0.5 flex-none text-trust" />
                    {b}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">Интересы собеседника скрыты — выясняйте их вопросами.</p>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-4 px-5 py-4 md:px-8">
          <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{mode?.title ?? 'Режим не выбран'}</span> · {level.title} · {scenario.title}
          </div>
          <Button size="lg" onClick={startSimulation} disabled={!mode} className="gap-2 font-display font-extrabold">
            Начать переговоры
            <Icon name="ArrowRight" size={17} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
