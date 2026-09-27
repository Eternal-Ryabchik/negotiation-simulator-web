import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSimulator } from '@/hooks/use-simulator';
import { useNegotiation, useTurnTimer } from '@/hooks/use-negotiation';
import { llmReady, partnerReply } from '@/lib/arena/llm';
import type { Analysis, Metrics, ModeId } from '@/lib/arena/types';

export interface ChatMsg {
  id: number;
  who: 'user' | 'partner';
  text: string;
  note?: string;
  reaction?: string;
  analysis?: Analysis;
  delta?: Metrics;
  explanation?: string;
  viaLlm?: boolean;
}

/** Переговоры свободным текстом («Диалог», «Онлайн»): анализ реплики → ветка графа → ответ собеседника. */
export function useChatSession(modeId: ModeId, onPartnerLine?: (text: string) => void) {
  const { llm } = useSimulator();
  const n = useNegotiation(modeId);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 1, who: 'partner', text: n.node.line, note: n.node.emotion },
  ]);
  const [typing, setTyping] = useState(false);
  const [emotion, setEmotion] = useState(n.node.emotion);
  const idRef = useRef(2);
  const nextId = () => idRef.current++;

  const deliver = useCallback(
    async (userText: string, scripted: string, isFinal: boolean, nextEmotion: string, reaction: string) => {
      let text = scripted;
      let viaLlm = false;
      if (llmReady(llm) && llm.liveReplies) {
        try {
          text = await partnerReply(
            llm,
            n.scenario,
            messages.map((m) => ({ who: m.who, text: m.text })),
            userText,
            scripted,
            isFinal,
          );
          viaLlm = true;
        } catch (e) {
          toast('ИИ недоступен — ответ из сценария', { description: e instanceof Error ? e.message : undefined });
        }
      } else {
        await new Promise((r) => window.setTimeout(r, 700 + Math.min(1400, scripted.length * 12)));
      }
      setTyping(false);
      setEmotion(nextEmotion);
      setMessages((m) => [...m, { id: nextId(), who: 'partner', text, note: nextEmotion, reaction, viaLlm }]);
      onPartnerLine?.(text);
    },
    [llm, n.scenario, messages, onPartnerLine],
  );

  const send = useCallback(
    (raw: string, source: 'text' | 'timeout' = 'text') => {
      const body = raw.trim();
      if ((source === 'text' && !body) || typing || n.ended) return;
      const res = n.move(source, body);
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          who: 'user',
          text: source === 'timeout' ? '…(пауза — время на ответ вышло)' : body,
          note: res.record.analysis.strategy,
          analysis: res.record.analysis,
          delta: res.delta,
          explanation: res.record.explanation,
        },
      ]);
      setTyping(true);
      void deliver(body || '(молчание)', res.next.line, !!res.next.ending, res.next.emotion, res.choice.reaction);
      if (n.level.instantFeedback) {
        const d = res.delta;
        const fmt = (v: number) => (v > 0 ? `+${v}` : `${v}`);
        toast(res.record.analysis.strategy, {
          description: `Аргументация ${fmt(d.argument)} · Доверие ${fmt(d.trust)} · Напряжение ${fmt(d.tension)}`,
        });
      }
    },
    [typing, n, deliver],
  );

  const timeLeft = useTurnTimer(n.level.turnSeconds, !typing && !n.ended, n.turns.length, () => send('', 'timeout'));

  return { ...n, messages, typing, emotion, send, timeLeft };
}
