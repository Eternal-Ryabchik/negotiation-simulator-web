import React, { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { USER_PHOTO } from '@/lib/simulator-data';
import { useChatSession } from '@/hooks/use-chat-session';
import { useSpeechInput, useSpeechOutput } from '@/hooks/use-speech';
import ScreenHeader from './ScreenHeader';
import MetricsPanel from './MetricsPanel';
import { DeltaChips, GoalProgress, KindBadge, TimerBadge, initials } from './SessionParts';

const OnlineScreen: React.FC = () => {
  const voice = useSpeechOutput();
  const [voiceOn, setVoiceOn] = useState(true);
  const [cam, setCam] = useState(true);
  const [text, setText] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const onPartnerLine = useCallback((line: string) => {
    if (voiceOn) voice.speak(line);
  }, [voiceOn, voice]);

  const s = useChatSession('online', onPartnerLine);
  const { scenario, level, metrics } = s;
  const mic = useSpeechInput((t) => setText(t.slice(0, 420)));

  useEffect(() => {
    const t = window.setInterval(() => setElapsed((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (mic.error) toast.error(mic.error);
  }, [mic.error]);

  const time = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  const partnerMsgs = s.messages.filter((m) => m.who === 'partner');
  const lastPartner = partnerMsgs[partnerMsgs.length - 1];
  const lastUser = [...s.messages].reverse().find((m) => m.who === 'user');
  const tensionHigh = metrics.tension >= 65;
  const trustHigh = metrics.trust >= 70;

  const submit = () => {
    if (mic.listening) mic.stop();
    s.send(text);
    setText('');
  };

  const toggleMic = () => {
    if (mic.listening) return mic.stop();
    voice.cancel();
    if (!mic.start()) toast.error('Голосовой ввод недоступен', { description: 'Используйте Chrome или Edge и разрешите доступ к микрофону.' });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ScreenHeader
        step={3}
        title={scenario.title}
        subtitle={`Режим «Онлайн» · ${level.title}`}
        back="setup"
        right={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 font-medium tabular-nums">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-destructive" />
              {time}
            </Badge>
            <TimerBadge left={s.ended ? null : s.timeLeft} />
          </div>
        }
      />

      <div className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-[1240px] gap-4 px-5 py-3 md:px-8 lg:grid-cols-[1fr_200px]">
          <MetricsPanel metrics={metrics} compact />
          <GoalProgress value={s.progress} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-6 md:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-panel">
          <div className="relative aspect-[4/3] w-full sm:aspect-[16/9]">
            {scenario.partner.photo ? (
              <img
                src={scenario.partner.photo}
                alt={scenario.partner.name}
                className={cn(
                  'h-full w-full object-cover object-[center_18%] transition-all duration-700',
                  s.typing && 'brightness-90',
                  tensionHigh && 'saturate-[0.65] contrast-[1.08]',
                  voice.speaking && 'scale-[1.01]',
                )}
              />
            ) : (
              <div
                className={cn(
                  'flex h-full w-full items-center justify-center transition-colors duration-700',
                  tensionHigh ? 'bg-gradient-to-br from-[#3a1f14] to-[#171b22]' : trustHigh ? 'bg-gradient-to-br from-[#12302a] to-[#171b22]' : 'bg-gradient-to-br from-[#2a3345] to-[#171b22]',
                )}
              >
                <span
                  className={cn(
                    'flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/15 bg-white/10 font-display text-4xl font-extrabold text-white transition-transform md:h-36 md:w-36',
                    voice.speaking && 'scale-105 border-white/40',
                  )}
                >
                  {initials(scenario.partner.name)}
                </span>
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/35" />

            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-md bg-black/55 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-trust" />
                {voice.speaking ? 'Говорит' : 'Подключён'}
              </span>
              <span
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur',
                  tensionHigh ? 'bg-tension/80' : 'bg-black/55',
                )}
              >
                <Icon name={tensionHigh ? 'TriangleAlert' : 'Smile'} size={12} />
                {s.typing ? 'Пауза, обдумывает' : s.emotion}
              </span>
              {trustHigh && (
                <span className="flex animate-fade-in items-center gap-1.5 rounded-md bg-trust/85 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur">
                  <Icon name="ThumbsUp" size={12} />
                  Доверие укрепляется
                </span>
              )}
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="font-display text-lg font-extrabold tracking-tight text-white">{scenario.partner.name}</div>
                <div className="text-xs text-white/70">
                  {scenario.partner.role} · {scenario.partner.company}
                </div>
              </div>
              <div className="h-20 w-28 overflow-hidden rounded-lg border-2 border-white/25 bg-black/50 md:h-28 md:w-44">
                {cam ? (
                  <img src={USER_PHOTO} alt="Вы" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-white/60">
                    <Icon name="VideoOff" size={22} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 px-5 py-4">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-panel-foreground/60">Субтитры</div>
            {lastPartner?.reaction && <p className="mb-1 text-xs italic text-panel-foreground/70">{lastPartner.reaction}</p>}
            <p className="min-h-[52px] font-display text-base font-bold leading-snug text-white md:text-lg">
              {s.typing ? '…' : `«${lastPartner?.text ?? ''}»`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-5 py-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMic}
              className={cn('gap-1.5 text-white hover:bg-white/10 hover:text-white', mic.listening && 'bg-destructive/85 hover:bg-destructive')}
            >
              <Icon name={mic.listening ? 'MicOff' : 'Mic'} size={15} />
              {mic.listening ? 'Говорите… (стоп)' : 'Ответить голосом'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (voiceOn) voice.cancel();
                setVoiceOn((v) => !v);
              }}
              disabled={!voice.supported}
              className="gap-1.5 text-white hover:bg-white/10 hover:text-white"
            >
              <Icon name={voiceOn ? 'Volume2' : 'VolumeX'} size={15} />
              {voiceOn ? 'Звук' : 'Без звука'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCam((v) => !v)}
              className={cn('gap-1.5 text-white hover:bg-white/10 hover:text-white', !cam && 'bg-destructive/85 hover:bg-destructive')}
            >
              <Icon name={cam ? 'Video' : 'VideoOff'} size={15} />
              Камера
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={s.hintsLeft <= 0 || s.ended}
              onClick={() => {
                const h = s.takeHint();
                if (h.ok) toast('Подсказка', { description: h.text });
                else toast.error(h.text);
              }}
              className="gap-1.5 text-white hover:bg-white/10 hover:text-white"
            >
              <Icon name="Lightbulb" size={15} />
              Подсказка
            </Button>
            <Button
              size="sm"
              onClick={() => {
                voice.cancel();
                s.finish();
              }}
              disabled={!s.turns.length || s.typing}
              className="ml-auto gap-1.5 bg-destructive font-display font-extrabold text-destructive-foreground hover:bg-destructive/90"
            >
              <Icon name="PhoneOff" size={15} />
              {s.ended ? 'Завершить и открыть разбор' : 'Завершить встречу'}
            </Button>
          </div>
        </div>

        {lastUser?.analysis && level.instantFeedback && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs">
            <span className="text-muted-foreground">Ваш последний ход:</span>
            <KindBadge kind={lastUser.analysis.kind} />
            {lastUser.delta && <DeltaChips delta={lastUser.delta} />}
            {lastUser.analysis.tips[0] && <span className="basis-full text-muted-foreground">{lastUser.analysis.tips[0]}</span>}
          </div>
        )}

        {!s.ended ? (
          <div className="mt-4 rounded-xl border border-border bg-card p-4">
            <Textarea
              value={text}
              maxLength={420}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
              }}
              placeholder="Ответьте собеседнику голосом или текстом. Ctrl + Enter — отправить"
              className="min-h-[76px] resize-none bg-background text-sm"
            />
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {mic.supported ? 'Голосовой ввод работает в Chrome и Edge' : 'Голосовой ввод недоступен в этом браузере'}
              </span>
              <Button onClick={submit} disabled={!text.trim() || s.typing} className="ml-auto gap-2 font-display font-extrabold">
                Ответить
                <Icon name="Send" size={15} />
              </Button>
            </div>
          </div>
        ) : (
          !s.typing && (
            <div className="mt-4 animate-fade-in rounded-xl border border-border bg-card p-5 text-center">
              <div className="font-display text-lg font-extrabold">{s.node.ending?.title}</div>
              <Button
                onClick={() => {
                  voice.cancel();
                  s.finish();
                }}
                className="mt-3 gap-2 font-display font-extrabold"
              >
                Разбор переговоров
                <Icon name="ArrowRight" size={16} />
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default OnlineScreen;
