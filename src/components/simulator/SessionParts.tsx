import React from 'react';
import Icon from '@/components/ui/icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { KIND_LABEL, toneById, type Level } from '@/lib/simulator-data';
import type { Analysis, Metrics, MoveKind, Partner, Scenario } from '@/lib/arena/types';

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const PartnerAvatar: React.FC<{ partner: Partner; className?: string }> = ({ partner, className }) => (
  <Avatar className={cn('border border-border', className)}>
    {partner.photo && <AvatarImage src={partner.photo} alt={partner.name} />}
    <AvatarFallback className="bg-foreground font-display font-extrabold text-background">{initials(partner.name)}</AvatarFallback>
  </Avatar>
);

export const TimerBadge: React.FC<{ left: number | null }> = ({ left }) =>
  left === null ? (
    <Badge variant="secondary" className="gap-1.5 font-medium">
      <Icon name="Timer" size={13} />∞
    </Badge>
  ) : (
    <Badge
      variant="secondary"
      className={cn('gap-1.5 font-medium tabular-nums', left <= 10 && 'animate-pulse-soft bg-tension-soft text-tension')}
    >
      <Icon name="Timer" size={13} />
      {left} сек
    </Badge>
  );

export const GoalProgress: React.FC<{ value: number; className?: string }> = ({ value, className }) => (
  <div className={cn('space-y-1', className)}>
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon name="Target" size={13} />
        Прогресс цели
      </span>
      <span className="font-display text-sm font-extrabold tabular-nums">{value}%</span>
    </div>
    <div className="metric-track">
      <div className="metric-fill bg-foreground" style={{ width: `${value}%` }} />
    </div>
  </div>
);

const KIND_STYLE: Record<MoveKind, string> = {
  aggressive: 'bg-tension-soft text-tension',
  neutral: 'bg-muted text-muted-foreground',
  argued: 'bg-argument-soft text-argument',
  question: 'bg-trust-soft text-trust',
};

export const KindBadge: React.FC<{ kind: MoveKind; className?: string }> = ({ kind, className }) => (
  <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium', KIND_STYLE[kind], className)}>
    {KIND_LABEL[kind]}
  </span>
);

export const DeltaChips: React.FC<{ delta: Metrics }> = ({ delta }) => (
  <div className="flex flex-wrap gap-2">
    {(
      [
        ['Аргументация', delta.argument, 'text-argument'],
        ['Доверие', delta.trust, 'text-trust'],
        ['Напряжение', delta.tension, 'text-tension'],
      ] as const
    ).map(([label, value, color]) => (
      <span key={label} className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium">
        {label}{' '}
        <span className={cn('font-display font-extrabold tabular-nums', color)}>{value > 0 ? `+${value}` : value}</span>
      </span>
    ))}
  </div>
);

export const AnalysisGrid: React.FC<{ a: Analysis; compact?: boolean }> = ({ a, compact }) => (
  <div className={cn('grid gap-1.5 text-[11px]', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
    {(
      [
        ['Ясность', a.clarity],
        ['Убедительность', a.persuasion],
        ['Эмпатия', a.empathy],
        ['По теме', a.relevance],
      ] as const
    ).map(([k, v]) => (
      <div key={k} className="rounded-md border border-border bg-background px-2 py-1.5">
        <div className="text-muted-foreground">{k}</div>
        <div className="font-display text-sm font-extrabold tabular-nums">{v}</div>
      </div>
    ))}
  </div>
);

export const BriefingCard: React.FC<{ scenario: Scenario; level: Level }> = ({ scenario, level }) => {
  const tone = toneById(scenario.partner.tone);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-extrabold tracking-tight">
          <Icon name="Target" size={15} />
          Ваша задача
        </h3>
        <dl className="space-y-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Роль</dt>
            <dd className="font-medium">{scenario.userRole}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Цель</dt>
            <dd className="font-medium">{scenario.userGoal}</dd>
          </div>
        </dl>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-extrabold tracking-tight">
          <Icon name="FileText" size={15} />
          Брифинг
        </h3>
        <ul className="space-y-2">
          {scenario.briefing.map((b) => (
            <li key={b} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <Icon name="Dot" size={14} className="-ml-1 flex-none text-foreground" />
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span>Собеседник</span>
          <span className="font-medium text-foreground">{tone.label}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span>Уровень</span>
          <span className="font-medium text-foreground">{level.title}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span>Подсказки</span>
          <span className="font-medium text-foreground">{level.hints}</span>
        </div>
      </div>
    </div>
  );
};
