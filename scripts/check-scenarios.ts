// Проверка целостности сценариев и анализатора: npm run check
import { BUILT_IN } from '../src/lib/arena/scenarios';
import { analyzeText } from '../src/lib/arena/analyzer';
import { resolveMove, applyDelta, startMetrics, finalEnding } from '../src/lib/arena/engine';
import type { MoveKind } from '../src/lib/arena/types';

let failed = 0;
const fail = (msg: string) => { failed++; console.error('  ✗', msg); };

for (const sc of BUILT_IN) {
  const { nodes, start } = sc.graph;
  if (!nodes[start]) fail(`${sc.id}: нет стартового узла`);
  const reachable = new Set<string>();
  const stack = [start];
  while (stack.length) {
    const id = stack.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const n = nodes[id];
    if (!n) { fail(`${sc.id}: ссылка на несуществующий узел ${id}`); continue; }
    if (!n.ending && n.options.length !== 4) fail(`${sc.id}/${id}: ожидалось 4 варианта`);
    const kinds = new Set(n.options.map((o) => o.kind));
    if (!n.ending && kinds.size !== 4) fail(`${sc.id}/${id}: типы ответов повторяются`);
    n.options.forEach((o) => stack.push(o.next));
  }
  for (const id of Object.keys(nodes)) if (!reachable.has(id)) fail(`${sc.id}: узел ${id} недостижим`);
  const outcomes = new Set([...reachable].map((id) => nodes[id]?.ending?.outcome).filter(Boolean));

  // Жадные стратегии: всегда один и тот же тип хода.
  const runs: string[] = [];
  for (const kind of ['question', 'argued', 'neutral', 'aggressive'] as MoveKind[]) {
    let node = nodes[start], m = startMetrics(sc), steps = 0;
    while (!node.ending && steps < 8) {
      const r = resolveMove({ scenario: sc, node, levelId: 'practic', source: 'choice', text: '', kind });
      m = applyDelta(m, r.delta);
      node = nodes[r.choice.next];
      steps++;
    }
    runs.push(`${kind}→${node.ending ? finalEnding(node, m).outcome : 'лимит'}(${steps})`);
  }
  console.log(`✓ ${sc.id.padEnd(9)} узлов ${Object.keys(nodes).length}, финалы: ${[...outcomes].join(', ')} | ${runs.join('  ')}`);
  if (outcomes.size < 4) fail(`${sc.id}: мало разных финалов`);
}

const samples: [string, MoveKind][] = [
  ['Это ваши проблемы, скидок не будет!!!', 'aggressive'],
  ['Что для вас сейчас важнее всего — срок или бюджет?', 'question'],
  ['Предлагаю разделить проект на два этапа: первый уложим в 4 млн, срок зафиксируем в договоре.', 'argued'],
  ['Ну, посмотрим, постараемся что-нибудь придумать.', 'neutral'],
  ['Понимаю ваши опасения. Давайте зафиксируем штраф за просрочку в договоре.', 'argued'],
];
for (const [text, want] of samples) {
  const a = analyzeText(text);
  const ok = a.kind === want;
  if (!ok) fail(`анализатор: «${text}» → ${a.kind}, ожидалось ${want}`);
  console.log(`${ok ? '✓' : '✗'} ${a.kind.padEnd(10)} ясн ${a.clarity} убед ${a.persuasion} эмп ${a.empathy} | ${text}`);
}

if (failed) { console.error(`\nОшибок: ${failed}`); process.exit(1); }
console.log('\nВсе проверки пройдены');
