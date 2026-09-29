import React from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import type { Metrics } from '@/hooks/use-simulator';

interface BarProps {
  label: string;
  value: number;
  tone: 'argument' | 'trust' | 'tension';
  icon: string;
  compact?: boolean;
}

const TONE: Record<BarProps['tone'], { fill: string; text: string; soft: string }> = {
  argument: { fill: 'bg-argument', text: 'text-argument', soft: 'bg-argument-soft' },
  trust: { fill: 'bg-trust', text: 'text-trust', soft: 'bg-trust-soft' },
  tension: { fill: 'bg-tension', text: 'text-tension', soft: 'bg-tension-soft' },
};

export const MetricBar: React.FC<BarProps> = ({ label, value, tone, icon, compact }) => (
  <div className={cn('min-w-0', compact ? 'space-y-1' : 'space-y-1.5')}>
    {/* На узких экранах число стоит под подписью, а не наезжает на соседнюю метрику */}
    <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
      <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon name={icon} size={13} className={cn('hidden flex-none min-[420px]:block', TONE[tone].text)} />
        <span className="truncate">{label}</span>
      </span>
      <span className={cn('flex-none font-display text-sm font-extrabold tabular-nums', TONE[tone].text)}>
        {value}
      </span>
    </div>
    <div className="metric-track">
      <div className={cn('metric-fill', TONE[tone].fill)} style={{ width: `${value}%` }} />
    </div>
  </div>
);

interface PanelProps {
  metrics: Metrics;
  className?: string;
  compact?: boolean;
}

const MetricsPanel: React.FC<PanelProps> = ({ metrics, className, compact }) => (
  <div className={cn('grid grid-cols-3 gap-3 sm:gap-4', className)}>
    <MetricBar label="Аргументация" value={metrics.argument} tone="argument" icon="Scale" compact={compact} />
    <MetricBar label="Доверие" value={metrics.trust} tone="trust" icon="HeartHandshake" compact={compact} />
    <MetricBar label="Напряжение" value={metrics.tension} tone="tension" icon="Flame" compact={compact} />
  </div>
);

export default MetricsPanel;
