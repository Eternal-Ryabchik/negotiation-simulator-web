import React from 'react';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MODES } from '@/lib/simulator-data';
import { useSimulator } from '@/hooks/use-simulator';

const ModeGrid: React.FC = () => {
  const { pickMode } = useSimulator();

  return (
    <section id="modes" className="border-t border-border bg-background px-5 py-16 md:px-10 md:py-20 xl:px-[160px]">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-2 font-display text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Шаг 1 — режим
          </p>
          <h2 className="max-w-[16ch] font-display text-3xl font-extrabold leading-[1.05] tracking-tight md:text-[40px]">
            Четыре способа тренировать переговоры
          </h2>
        </div>
        <p className="max-w-[38ch] text-sm leading-relaxed text-muted-foreground">
          Начните с выбора формата. Дальше — уровень сложности, сценарий и сами переговоры с разбором каждой реплики.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {MODES.map((mode, i) => (
          <article
            key={mode.id}
            className="card-pick group flex flex-col p-6 md:p-7"
            style={{ animation: `fade-in .5s ease-out ${i * 0.06}s both` }}
          >
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-foreground text-background transition-transform group-hover:scale-105">
                <Icon name={mode.icon} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl font-extrabold tracking-tight">{mode.title}</h3>
                <p className="text-sm text-muted-foreground">{mode.tagline}</p>
              </div>
              <Badge variant="secondary" className="flex-none font-medium">
                {mode.level}
              </Badge>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{mode.description}</p>

            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <Icon name="Clock" size={14} />
              {mode.duration}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {mode.skills.map((s) => (
                <span
                  key={s}
                  className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>

            <Button onClick={() => pickMode(mode.id)} className="mt-6 w-full gap-2 font-display font-extrabold">
              Начать
              <Icon name="ArrowRight" size={16} />
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ModeGrid;
