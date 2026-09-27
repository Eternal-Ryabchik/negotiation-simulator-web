import React, { useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNegotiation, useTurnTimer, type MoveResult } from '@/hooks/use-negotiation';
import type { Choice } from '@/lib/arena/types';
import ScreenHeader from './ScreenHeader';
import MetricsPanel from './MetricsPanel';
import { BriefingCard, DeltaChips, GoalProgress, KindBadge, PartnerAvatar, TimerBadge } from './SessionParts';

// Порядок вариантов перемешивается детерминированно по id узла — чтобы «правильный» не стоял всегда на одном месте.
const orderFor = (id: string, options: Choice[]) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return [...options].sort((a, b) => ((h + a.kind.length * 7) % 5) - ((h + b.kind.length * 7) % 5) || a.kind.localeCompare(b.kind));
};

const QuizScreen: React.FC = () => {
  const n = useNegotiation('quiz');
  const { scenario, level, node, metrics } = n;
  const [picked, setPicked] = useState<Choice | null>(null);
  const [last, setLast] = useState<MoveResult | null>(null);

  const shownNode = last ? n.scenario.graph.nodes[last.record.nodeId] ?? node : node;
  const options = useMemo(() => orderFor(shownNode.id, shownNode.options), [shownNode]);

  const confirm = (choice: Choice | null) => {
    const res = n.move(choice ? 'choice' : 'timeout', choice?.text ?? '', choice?.kind);
    setLast(res);
    const d = res.delta;
    if (d.trust + d.argument - d.tension >= 12) toast.success('Сильный ход', { description: res.choice.reaction });
    else if (res.record.kind === 'aggressive' || d.tension > 8) toast.error('Напряжение выросло', { description: res.choice.reaction });
    else toast('Реакция собеседника', { description: res.choice.reaction });
  };

  const timeLeft = useTurnTimer(level.turnSeconds, !last && !n.ended, n.turns.length, () => {
    toast.error('Время вышло', { description: 'Пауза засчитана как нейтральный ответ.' });
    confirm(null);
  });

  const next = () => {
    setLast(null);
    setPicked(null);
  };

  const hint = () => {
    const h = n.takeHint();
    if (h.ok) toast('Подсказка', { description: h.text });
    else toast.error(h.text);
  };

  const showEnding = !last && n.ended;

  return (
    <div className="min-h-screen bg-background">
      <ScreenHeader
        step={3}
        title={scenario.title}
        subtitle={`Режим «Вопрос-ответ» · ${level.title}`}
        back="setup"
        right={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 font-medium">
              <Icon name="ListChecks" size={13} />
              Ход {n.turns.length + (last || showEnding ? 0 : 1)}
            </Badge>
            <TimerBadge left={timeLeft} />
          </div>
        }
      />

      <div className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-[1240px] gap-4 px-5 py-3 md:px-8 lg:grid-cols-[1fr_220px]">
          <MetricsPanel metrics={metrics} compact />
          <GoalProgress value={n.progress} />
        </div>
      </div>

      <div className="mx-auto grid max-w-[1240px] gap-6 px-5 py-8 md:px-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-center gap-3">
              <PartnerAvatar partner={scenario.partner} className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <div className="font-display text-base font-extrabold tracking-tight">{scenario.partner.name}</div>
                <div className="text-xs text-muted-foreground">
                  {scenario.partner.role} · {scenario.partner.company}
                </div>
              </div>
              <Badge className="gap-1.5 border-0 bg-accent font-medium text-accent-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-tension" />
                {last ? last.next.emotion : node.emotion}
              </Badge>
            </div>

            <div className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Этап: {shownNode.stage}
            </div>
            <blockquote className="mt-2 border-l-2 border-foreground pl-4 font-display text-lg font-bold leading-snug tracking-tight md:text-xl">
              «{shownNode.line}»
            </blockquote>

            {last && (
              <div className="mt-5 animate-fade-in space-y-3 rounded-lg border border-border bg-muted p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon name="Activity" size={15} className="text-argument" />
                  {last.choice.reaction}
                </div>
                <DeltaChips delta={last.delta} />
                {level.instantFeedback ? (
                  <>
                    <p className="text-sm leading-relaxed text-muted-foreground">{last.record.explanation}</p>
                    {last.record.best && (
                      <p className="rounded-md border border-border bg-card p-3 text-xs leading-relaxed">
                        <span className="font-medium">Сильнее здесь: </span>
                        <KindBadge kind={last.record.best.kind} className="mr-1" />«{last.record.best.text}»
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Уровень «Эксперт»: подробный разбор хода — в итоговом отчёте.</p>
                )}
              </div>
            )}

            {showEnding && node.ending && (
              <div className="mt-5 animate-fade-in rounded-lg border border-border bg-muted p-4">
                <div className="font-display text-base font-extrabold">{node.ending.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">Переговоры завершены. Посмотрите подробный разбор каждого хода.</p>
              </div>
            )}
          </div>

          {!showEnding && (
            <div className="space-y-3">
              {options.map((o) => {
                const isPicked = last ? last.choice === o : picked === o;
                const revealed = !!last;
                return (
                  <button
                    key={o.kind}
                    disabled={revealed}
                    onClick={() => setPicked(o)}
                    data-active={isPicked}
                    className={cn(
                      'card-pick w-full p-4 md:p-5',
                      revealed && !isPicked && 'opacity-45',
                      revealed && 'cursor-default hover:translate-y-0 hover:shadow-none',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border',
                          isPicked ? 'border-foreground bg-foreground text-background' : 'border-border',
                        )}
                      >
                        {isPicked && <Icon name="Check" size={12} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-relaxed">{o.text}</p>
                        {revealed && level.instantFeedback && <KindBadge kind={o.kind} className="mt-2" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {showEnding ? (
              <Button size="lg" onClick={n.finish} className="gap-2 font-display font-extrabold">
                Разбор переговоров
                <Icon name="ArrowRight" size={17} />
              </Button>
            ) : !last ? (
              <>
                <Button size="lg" disabled={!picked} onClick={() => confirm(picked)} className="gap-2 font-display font-extrabold">
                  Подтвердить ответ
                  <Icon name="Check" size={17} />
                </Button>
                <Button variant="outline" size="lg" disabled={n.hintsLeft <= 0} onClick={hint} className="gap-2">
                  <Icon name="Lightbulb" size={16} />
                  Подсказка{Number.isFinite(n.hintsLeft) ? ` (${n.hintsLeft})` : ''}
                </Button>
              </>
            ) : (
              <Button size="lg" onClick={next} className="gap-2 font-display font-extrabold">
                {last.next.ending ? 'Финал переговоров' : 'Следующий ход'}
                <Icon name="ArrowRight" size={17} />
              </Button>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-[80px] lg:self-start">
          <BriefingCard scenario={scenario} level={level} />
        </aside>
      </div>
    </div>
  );
};

export default QuizScreen;
