import React from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { OUTCOME_META } from '@/lib/simulator-data';
import type { ScenarioGraph } from '@/lib/arena/types';
import { KindBadge } from './SessionParts';

/** Карта сценария: этапы, реплики собеседника и куда ведёт каждый тип ответа. */
const GraphPreview: React.FC<{ graph: ScenarioGraph; compact?: boolean }> = ({ graph, compact }) => {
  const nodes = Object.values(graph.nodes);
  const steps = nodes.filter((n) => !n.ending);
  const endings = nodes.filter((n) => n.ending);
  const label = (id: string) => {
    const n = graph.nodes[id];
    if (!n) return id;
    return n.ending ? `Финал: ${n.ending.title}` : n.stage;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Icon name="GitBranch" size={12} /> {steps.length} этапов
        </span>
        <span className="flex items-center gap-1">
          <Icon name="Split" size={12} /> {steps.reduce((s, n) => s + n.options.length, 0)} развилок
        </span>
        <span className="flex items-center gap-1">
          <Icon name="Flag" size={12} /> {endings.length} финалов
        </span>
      </div>
      <div className={cn('grid gap-3', !compact && 'md:grid-cols-2')}>
        {steps.map((n) => (
          <div key={n.id} className={cn('rounded-lg border border-border bg-background p-3', n.id === graph.start && 'border-foreground')}>
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
              <span className="font-display font-extrabold">
                {n.id === graph.start && '▶ '}
                {n.stage}
              </span>
              <span className="text-muted-foreground">{n.emotion}</span>
            </div>
            <p className="text-xs italic leading-relaxed text-muted-foreground">«{n.line}»</p>
            <ul className="mt-2 space-y-1">
              {n.options.map((o) => (
                <li key={o.kind} className="flex items-center gap-1.5 text-[11px]">
                  <KindBadge kind={o.kind} className="flex-none" />
                  <Icon name="ArrowRight" size={11} className="flex-none text-steel" />
                  <span className="truncate">{label(o.next)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {endings.map((n) => {
          const m = OUTCOME_META[n.ending!.outcome];
          return (
            <span key={n.id} className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[11px]">
              <Icon name={m.icon} size={12} className={`text-${m.tone}`} />
              {n.ending!.title}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default GraphPreview;
