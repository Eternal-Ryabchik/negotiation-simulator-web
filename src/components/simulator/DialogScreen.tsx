import React, { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { USER_PHOTO } from '@/lib/simulator-data';
import { useSimulator } from '@/hooks/use-simulator';
import { useChatSession } from '@/hooks/use-chat-session';
import { useSpeechInput } from '@/hooks/use-speech';
import { llmReady } from '@/lib/arena/llm';
import ScreenHeader from './ScreenHeader';
import MetricsPanel from './MetricsPanel';
import { AnalysisGrid, BriefingCard, DeltaChips, GoalProgress, KindBadge, PartnerAvatar, TimerBadge } from './SessionParts';

const MAX_LEN = 420;

const STARTERS = [
  { label: 'Вопрос', text: 'Помогите мне понять: что для вас сейчас важнее всего в этом вопросе?' },
  { label: 'Эмпатия', text: 'Понимаю, почему для вас это важно. ' },
  { label: 'Предложение', text: 'Предлагаю такой вариант: ' },
  { label: 'Гарантия', text: 'Готов зафиксировать в договоре: ' },
];

const DialogScreen: React.FC = () => {
  const { llm } = useSimulator();
  const s = useChatSession('dialog');
  const { scenario, level, metrics } = s;
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const mic = useSpeechInput((t) => setText(t.slice(0, MAX_LEN)));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [s.messages, s.typing]);

  const submit = () => {
    if (mic.listening) mic.stop();
    s.send(text);
    setText('');
  };

  const toggleMic = () => {
    if (mic.listening) return mic.stop();
    if (!mic.start()) toast.error('Голосовой ввод недоступен', { description: 'Используйте Chrome или Edge и разрешите доступ к микрофону.' });
  };

  useEffect(() => {
    if (mic.error) toast.error(mic.error);
  }, [mic.error]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ScreenHeader
        step={3}
        title={scenario.title}
        subtitle={`Режим «Диалог» · ${level.title}${llmReady(llm) && llm.liveReplies ? ' · ИИ-собеседник' : ''}`}
        back="setup"
        right={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 font-medium">
              <Icon name="MessagesSquare" size={13} />
              Ход {s.turns.length + (s.ended ? 0 : 1)}
            </Badge>
            <TimerBadge left={s.ended ? null : s.timeLeft} />
          </div>
        }
      />

      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-3 md:px-8 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-3">
            <PartnerAvatar partner={scenario.partner} className="h-10 w-10" />
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-extrabold tracking-tight">{scenario.partner.name}</div>
              <div className="truncate text-xs text-muted-foreground">{scenario.partner.role}</div>
            </div>
            <Badge className="ml-1 gap-1.5 border-0 bg-accent font-medium text-accent-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-tension" />
              {s.typing ? 'Обдумывает…' : s.emotion}
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_160px] lg:w-[560px]">
            <MetricsPanel metrics={metrics} compact />
            <GoalProgress value={s.progress} />
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1240px] flex-1 gap-6 px-5 py-6 md:px-8 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          {s.messages.map((m) => (
            <div key={m.id} className={cn('flex animate-fade-in gap-3', m.who === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              {m.who === 'user' ? (
                <Avatar className="h-8 w-8 flex-none border border-border">
                  <AvatarImage src={USER_PHOTO} alt="" />
                  <AvatarFallback>Вы</AvatarFallback>
                </Avatar>
              ) : (
                <PartnerAvatar partner={scenario.partner} className="h-8 w-8 flex-none" />
              )}
              <div className={cn('min-w-0 max-w-[80%]', m.who === 'user' && 'text-right')}>
                {m.reaction && <p className="mb-1.5 text-xs italic text-muted-foreground">{m.reaction}</p>}
                <div
                  className={cn(
                    'inline-block rounded-xl px-4 py-3 text-left text-sm leading-relaxed',
                    m.who === 'user' ? 'rounded-tr-sm bg-foreground text-background' : 'rounded-tl-sm border border-border bg-card',
                  )}
                >
                  {m.text}
                </div>
                <div className={cn('mt-1.5 flex flex-wrap items-center gap-1.5', m.who === 'user' && 'justify-end')}>
                  {m.analysis && <KindBadge kind={m.analysis.kind} />}
                  {m.note && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{m.note}</span>
                  )}
                  {m.viaLlm && (
                    <span className="flex items-center gap-1 rounded-md bg-argument-soft px-2 py-0.5 text-[11px] font-medium text-argument">
                      <Icon name="Sparkles" size={11} /> ИИ
                    </span>
                  )}
                </div>
                {m.analysis && level.instantFeedback && (
                  <div className="mt-2 space-y-2.5 rounded-lg border border-border bg-card p-3 text-left">
                    <div className="font-display text-xs font-extrabold tracking-tight">Разбор реплики · {m.analysis.toneLabel}</div>
                    <AnalysisGrid a={m.analysis} />
                    {m.delta && <DeltaChips delta={m.delta} />}
                    {m.analysis.signals.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.analysis.signals.map((sig) => (
                          <span key={sig} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {sig}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.analysis.tips.map((t) => (
                      <p key={t} className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                        <Icon name="Lightbulb" size={12} className="mt-0.5 flex-none text-argument" />
                        {t}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {s.typing && (
            <div className="flex animate-fade-in gap-3">
              <PartnerAvatar partner={scenario.partner} className="h-8 w-8 flex-none" />
              <div className="flex items-center gap-1 rounded-xl rounded-tl-sm border border-border bg-card px-4 py-3.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-steel" style={{ animationDelay: `${i * 0.18}s` }} />
                ))}
              </div>
            </div>
          )}

          {s.ended && !s.typing && (
            <div className="animate-fade-in rounded-xl border border-border bg-card p-5 text-center">
              <div className="font-display text-lg font-extrabold">{s.node.ending?.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">Переговоры завершены. Разбор покажет, как каждая реплика повлияла на исход.</p>
              <Button onClick={s.finish} className="mt-4 gap-2 font-display font-extrabold">
                Разбор переговоров
                <Icon name="ArrowRight" size={16} />
              </Button>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <aside className="hidden lg:sticky lg:top-[80px] lg:block lg:self-start">
          <BriefingCard scenario={scenario} level={level} />
        </aside>
      </div>

      {!s.ended && (
        <div className="sticky bottom-0 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto max-w-[1240px] px-5 py-3 md:px-8">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {STARTERS.map((st) => (
                <button
                  key={st.label}
                  onClick={() => setText((t) => (t ? `${t} ${st.text}` : st.text))}
                  className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  + {st.label}
                </button>
              ))}
            </div>
            <Textarea
              value={text}
              maxLength={MAX_LEN}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
              }}
              placeholder="Напишите свою реплику. Ctrl + Enter — отправить"
              className="min-h-[76px] resize-none bg-background text-sm"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggleMic} className={cn('gap-1.5', mic.listening && 'border-tension text-tension')}>
                <Icon name={mic.listening ? 'MicOff' : 'Mic'} size={14} />
                {mic.listening ? 'Стоп' : 'Голос'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={s.hintsLeft <= 0}
                onClick={() => {
                  const h = s.takeHint();
                  if (h.ok) toast('Подсказка', { description: h.text });
                  else toast.error(h.text);
                }}
                className="gap-1.5"
              >
                <Icon name="Lightbulb" size={14} />
                Подсказка{Number.isFinite(s.hintsLeft) ? ` (${s.hintsLeft})` : ''}
              </Button>
              <Button variant="ghost" size="sm" onClick={s.finish} disabled={!s.turns.length} className="gap-1.5 text-muted-foreground">
                <Icon name="Flag" size={14} />
                Завершить
              </Button>
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                {text.length} / {MAX_LEN}
              </span>
              <Button onClick={submit} disabled={!text.trim() || s.typing} className="gap-2 font-display font-extrabold">
                Отправить
                <Icon name="Send" size={15} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DialogScreen;
