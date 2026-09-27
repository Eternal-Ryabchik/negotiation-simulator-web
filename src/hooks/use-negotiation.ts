import { useCallback, useEffect, useRef, useState } from 'react';
import { useSimulator } from '@/hooks/use-simulator';
import {
  MAX_TURNS,
  applyDelta,
  buildResult,
  finalEnding,
  forcedEnding,
  hintFor,
  resolveMove,
  startMetrics,
  type MoveOutcome,
} from '@/lib/arena/engine';
import type { GraphNode, Metrics, ModeId, MoveKind, TurnRecord } from '@/lib/arena/types';

export interface MoveResult extends MoveOutcome {
  next: GraphNode;
  metrics: Metrics;
}

/** Состояние одной сессии переговоров по графу сценария. */
export function useNegotiation(modeId: ModeId) {
  const { scenario, level, finishSession } = useSimulator();
  const graph = scenario.graph;

  const [node, setNode] = useState<GraphNode>(graph.nodes[graph.start]);
  const [metrics, setMetrics] = useState<Metrics>(() => startMetrics(scenario));
  const [turns, setTurns] = useState<TurnRecord[]>([]);
  const [path, setPath] = useState<string[]>([graph.start]);
  const [hintsUsed, setHintsUsed] = useState(0);

  const ended = !!node.ending;

  const move = useCallback(
    (source: TurnRecord['source'], text: string, kind?: MoveKind): MoveResult => {
      const outcome = resolveMove({ scenario, node, levelId: level.id, source, text, kind });
      const nextMetrics = applyDelta(metrics, outcome.delta);
      let next = graph.nodes[outcome.choice.next] ?? forcedEnding(nextMetrics);
      if (!next.ending && turns.length + 1 >= MAX_TURNS) next = forcedEnding(nextMetrics);
      setMetrics(nextMetrics);
      setTurns((t) => [...t, outcome.record]);
      setPath((p) => [...p, next.id]);
      setNode(next);
      return { ...outcome, next, metrics: nextMetrics };
    },
    [scenario, node, level.id, metrics, graph, turns.length],
  );

  const hintsLeft = level.hintLimit < 0 ? Infinity : level.hintLimit - hintsUsed;

  const takeHint = useCallback((): { ok: boolean; text: string } => {
    if (hintsLeft <= 0) return { ok: false, text: 'Подсказки на эту сессию закончились.' };
    setHintsUsed((n) => n + 1);
    const cost = level.hintCost ? ` Списано ${level.hintCost} баллов итоговой оценки.` : '';
    return { ok: true, text: hintFor(node) + cost };
  }, [hintsLeft, level.hintCost, node]);

  /** Завершение: по достигнутому финалу или досрочно (кнопка «Завершить»). */
  const finish = useCallback(() => {
    const endNode = node.ending ? node : forcedEnding(metrics);
    const result = buildResult({
      scenario,
      mode: modeId,
      levelId: level.id,
      turns,
      path,
      metrics,
      goalProgress: endNode.progress,
      ending: finalEnding(endNode, metrics),
      hintsUsed,
    });
    finishSession(result);
  }, [node, metrics, scenario, modeId, level.id, turns, path, hintsUsed, finishSession]);

  return {
    scenario,
    level,
    node,
    metrics,
    turns,
    path,
    ended,
    progress: node.progress,
    hintsUsed,
    hintsLeft,
    move,
    takeHint,
    finish,
    turnNumber: turns.length + 1,
  };
}

/** Таймер хода: перезапускается при смене `resetKey`, вызывает onExpire по истечении. */
export function useTurnTimer(seconds: number, active: boolean, resetKey: unknown, onExpire: () => void) {
  const [left, setLeft] = useState(seconds);
  const cb = useRef(onExpire);
  cb.current = onExpire;

  useEffect(() => {
    setLeft(seconds);
  }, [seconds, resetKey]);

  useEffect(() => {
    if (!seconds || !active) return;
    if (left <= 0) {
      cb.current();
      return;
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left, active, seconds]);

  return seconds ? left : null;
}
