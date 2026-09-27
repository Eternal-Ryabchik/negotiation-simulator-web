import React from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSimulator, type ScreenId } from '@/hooks/use-simulator';

const STEPS = ['Режим', 'Сценарий', 'Переговоры', 'Разбор'];

interface Props {
  step?: 1 | 2 | 3 | 4;
  title: string;
  subtitle?: string;
  back?: ScreenId;
  right?: React.ReactNode;
}

const ScreenHeader: React.FC<Props> = ({ step, title, subtitle, back = 'home', right }) => {
  const { go } = useSimulator();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3.5 md:px-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => go(back)}
          className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Icon name="ArrowLeft" size={16} />
          Назад
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-extrabold tracking-tight md:text-lg">
            {title}
          </h1>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        {step && (
        <ol className="hidden items-center gap-2 xl:flex">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    active && 'border-foreground bg-foreground text-background',
                    done && 'border-border bg-muted text-muted-foreground',
                    !active && !done && 'border-border text-muted-foreground',
                  )}
                >
                  <span className="font-display font-extrabold">{n}.</span>
                  {label}
                </span>
                {n < STEPS.length && <Icon name="ChevronRight" size={13} className="text-steel" />}
              </li>
            );
          })}
        </ol>
        )}

        {right}
      </div>
    </header>
  );
};

export default ScreenHeader;
