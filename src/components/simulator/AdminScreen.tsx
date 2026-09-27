import React, { useMemo, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LEVELS, SPHERES, TONES, levelById, toneById } from '@/lib/simulator-data';
import { useSimulator } from '@/hooks/use-simulator';
import { SPHERE_PRESETS, keywordsFrom, toScenario } from '@/lib/arena/generator';
import {
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_URL,
  DEFAULT_OPENAI_MODEL,
  complete,
  generateSlots,
  listOllamaModels,
  llmReady,
} from '@/lib/arena/llm';
import type { LlmProvider, LlmSettings } from '@/lib/arena/storage';
import type { ScenarioConfig, ScenarioSlots } from '@/lib/arena/types';
import ScreenHeader from './ScreenHeader';
import GraphPreview from './GraphPreview';

const ICONS = ['MessagesSquare', 'Handshake', 'BadgeRussianRuble', 'CalendarClock', 'Flame', 'Briefcase', 'Users', 'ShoppingCart', 'Building2', 'GraduationCap', 'HeartPulse', 'Truck'];

const SLOT_FIELDS: { key: keyof ScenarioSlots; label: string; hint: string }[] = [
  { key: 'objection', label: 'Первое возражение собеседника', hint: 'Прямая речь, с которой собеседник открывает разговор' },
  { key: 'hiddenInterest', label: 'Скрытый интерес', hint: 'Раскрывается, только если игрок задаёт вопросы' },
  { key: 'constraint', label: 'Ограничение собеседника', hint: 'Что он не может изменить (бюджет, дата, политика)' },
  { key: 'concessionDemand', label: 'Чего будет добиваться под давлением', hint: 'Уступка, на которую игрок может согласиться — и проиграть' },
  { key: 'userOffer', label: 'Взаимовыгодное предложение игрока', hint: 'Лучший вариант решения, к которому ведёт сценарий' },
  { key: 'argumentFact', label: 'Сильный факт в пользу игрока', hint: 'Цифра, кейс, результат' },
  { key: 'guarantee', label: 'Проверяемая гарантия', hint: 'Обязательство, закрывающее риск собеседника' },
];

const blankConfig = (sphere = 'Продажи'): ScenarioConfig => {
  const p = SPHERE_PRESETS[sphere] ?? SPHERE_PRESETS['Другое'];
  return {
    id: `custom-${Date.now()}`,
    title: p.topic ?? 'Новый сценарий',
    sphere,
    topic: p.topic ?? '',
    icon: 'MessagesSquare',
    userRole: p.userRole ?? '',
    userGoal: p.userGoal ?? '',
    difficulty: 'practic',
    partner: { name: '', role: '', company: '', tone: 'neutral', goals: [], ...p.partner },
    slots: { ...p.slots },
    keywords: [],
    briefing: [],
  };
};

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({ label, hint, children, className }) => (
  <div className={cn('space-y-1.5', className)}>
    <Label className="text-xs font-medium">{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

/* ------------------------------------------------------------------ */

const ScenarioList: React.FC<{ onEdit: (cfg: ScenarioConfig) => void }> = ({ onEdit }) => {
  const { scenarios, customConfigs, deleteScenario, saveScenario, setScenario, go } = useSimulator();
  const [open, setOpen] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(customConfigs, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'arena-scenarios.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      const list: ScenarioConfig[] = Array.isArray(data) ? data : [data];
      let n = 0;
      for (const cfg of list) {
        if (!cfg?.title || !cfg?.partner || !cfg?.slots) continue;
        toScenario(cfg);
        saveScenario({ ...cfg, builtIn: false, handcrafted: false, id: cfg.id?.startsWith('custom-') ? cfg.id : `custom-${Date.now()}-${n}` });
        n++;
      }
      toast.success(`Импортировано сценариев: ${n}`);
    } catch {
      toast.error('Не удалось прочитать файл', { description: 'Ожидается JSON, экспортированный из «Арены переговоров».' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm text-muted-foreground">
          {scenarios.length} сценариев: {scenarios.filter((s) => s.handcrafted).length} авторских, {scenarios.filter((s) => s.builtIn && !s.handcrafted).length} сгенерированных,{' '}
          {customConfigs.length} ваших.
        </p>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
          <Icon name="Upload" size={14} /> Импорт
        </Button>
        <Button variant="outline" size="sm" onClick={exportAll} disabled={!customConfigs.length} className="gap-1.5">
          <Icon name="Download" size={14} /> Экспорт своих
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = '';
          }}
        />
      </div>

      {scenarios.map((s) => (
        <div key={s.id} className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-3 p-4">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-muted">
              <Icon name={s.icon} size={17} fallback="MessagesSquare" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-display text-sm font-extrabold">{s.title}</span>
                {s.handcrafted ? (
                  <Badge variant="secondary" className="h-5 text-[10px]">Авторский</Badge>
                ) : s.builtIn ? (
                  <Badge variant="outline" className="h-5 text-[10px]">Из генератора</Badge>
                ) : (
                  <Badge className="h-5 text-[10px]">Свой</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {s.sphere} · {s.partner.role} · {toneById(s.partner.tone).label} · {levelById(s.difficulty).title}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setOpen(open === s.id ? null : s.id)} className="gap-1.5">
                <Icon name="GitBranch" size={14} /> Граф
              </Button>
              {!s.handcrafted && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const { graph, ...cfg } = s;
                    onEdit(s.builtIn ? { ...cfg, id: `custom-${Date.now()}`, title: `${s.title} (копия)`, builtIn: false } : customConfigs.find((c) => c.id === s.id)!);
                  }}
                  className="gap-1.5"
                >
                  <Icon name={s.builtIn ? 'Copy' : 'Pencil'} size={14} /> {s.builtIn ? 'Копия' : 'Изменить'}
                </Button>
              )}
              {!s.builtIn && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Удалить сценарий «${s.title}»?`)) deleteScenario(s.id);
                  }}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <Icon name="Trash2" size={14} />
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  setScenario(s.id);
                  go('setup');
                }}
                className="gap-1.5"
              >
                <Icon name="Play" size={14} /> Запустить
              </Button>
            </div>
          </div>
          {open === s.id && (
            <div className="border-t border-border p-4">
              <GraphPreview graph={s.graph} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */

const Constructor: React.FC<{ draft: ScenarioConfig; setDraft: React.Dispatch<React.SetStateAction<ScenarioConfig>> }> = ({ draft, setDraft }) => {
  const { saveScenario, setScenario, go, llm } = useSimulator();
  const [goalsText, setGoalsText] = useState(draft.partner.goals.join('\n'));
  const [briefText, setBriefText] = useState(draft.briefing.join('\n'));
  const [aiBusy, setAiBusy] = useState(false);
  const preview = useMemo(() => toScenario(draft), [draft]);

  const set = <K extends keyof ScenarioConfig>(k: K, v: ScenarioConfig[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setPartner = <K extends keyof ScenarioConfig['partner']>(k: K, v: ScenarioConfig['partner'][K]) =>
    setDraft((d) => ({ ...d, partner: { ...d.partner, [k]: v } }));
  const setSlot = (k: keyof ScenarioSlots, v: string) => setDraft((d) => ({ ...d, slots: { ...d.slots, [k]: v } }));

  const applyPreset = (sphere: string) => {
    const b = blankConfig(sphere);
    setDraft((d) => ({ ...b, id: d.id }));
    setGoalsText(b.partner.goals.join('\n'));
    setBriefText('');
    toast.success(`Шаблон «${sphere}» применён`, { description: 'Отредактируйте поля под свою задачу.' });
  };

  const aiFill = async () => {
    setAiBusy(true);
    try {
      const slots = await generateSlots(llm, {
        sphere: draft.sphere,
        topic: draft.topic,
        userRole: draft.userRole,
        userGoal: draft.userGoal,
        partnerRole: draft.partner.role,
        goals: lines(goalsText),
      });
      setDraft((d) => ({ ...d, slots }));
      toast.success('ИИ заполнил детали сценария');
    } catch (e) {
      toast.error('Не удалось сгенерировать', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setAiBusy(false);
    }
  };

  const missing = [
    !draft.title.trim() && 'название',
    !draft.topic.trim() && 'тема',
    !draft.userRole.trim() && 'роль игрока',
    !draft.partner.name.trim() && 'имя собеседника',
    !draft.partner.role.trim() && 'роль собеседника',
    ...SLOT_FIELDS.filter((f) => !draft.slots[f.key].trim()).map((f) => f.label.toLowerCase()),
  ].filter(Boolean) as string[];

  const save = (launch: boolean) => {
    if (missing.length) {
      toast.error('Заполните обязательные поля', { description: missing.join(', ') });
      return;
    }
    const goals = lines(goalsText);
    const briefing = lines(briefText);
    const cfg: ScenarioConfig = {
      ...draft,
      builtIn: false,
      handcrafted: false,
      partner: { ...draft.partner, goals },
      briefing: briefing.length ? briefing : [draft.slots.argumentFact, `Ваше лучшее предложение: ${draft.slots.userOffer}`],
      keywords: keywordsFrom(`${draft.topic} ${Object.values(draft.slots).join(' ')} ${goals.join(' ')}`),
      createdAt: draft.createdAt ?? new Date().toISOString(),
    };
    saveScenario(cfg);
    toast.success('Сценарий сохранён', { description: 'Он появился в списке сценариев и сохранится после перезагрузки.' });
    if (launch) {
      setScenario(cfg.id);
      go('setup');
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-1 font-display text-sm font-extrabold">1. Контекст</h3>
          <p className="mb-4 text-xs text-muted-foreground">Выберите сферу — поля заполнятся шаблоном, который можно изменить.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Сфера">
              <Select value={draft.sphere} onValueChange={applyPreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPHERES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Иконка">
              <div className="flex flex-wrap gap-1">
                {ICONS.map((i) => (
                  <button
                    key={i}
                    onClick={() => set('icon', i)}
                    className={cn('flex h-8 w-8 items-center justify-center rounded-md border', draft.icon === i ? 'border-foreground bg-foreground text-background' : 'border-border')}
                  >
                    <Icon name={i} size={14} />
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Название сценария">
              <Input value={draft.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <Field label="Тема переговоров">
              <Input value={draft.topic} onChange={(e) => set('topic', e.target.value)} />
            </Field>
            <Field label="Роль игрока">
              <Input value={draft.userRole} onChange={(e) => set('userRole', e.target.value)} />
            </Field>
            <Field label="Цель игрока">
              <Input value={draft.userGoal} onChange={(e) => set('userGoal', e.target.value)} />
            </Field>
          </div>
          <Field label="Сложность по умолчанию" className="mt-4">
            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => set('difficulty', l.id)}
                  className={cn('rounded-lg border p-2 text-left text-xs', draft.difficulty === l.id ? 'border-foreground bg-background' : 'border-border')}
                >
                  <div className="font-display font-extrabold">{l.title}</div>
                  <div className="text-muted-foreground">{l.timer}</div>
                </button>
              ))}
            </div>
          </Field>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 font-display text-sm font-extrabold">2. Собеседник</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Имя">
              <Input value={draft.partner.name} onChange={(e) => setPartner('name', e.target.value)} />
            </Field>
            <Field label="Роль / должность">
              <Input value={draft.partner.role} onChange={(e) => setPartner('role', e.target.value)} />
            </Field>
            <Field label="Компания">
              <Input value={draft.partner.company} onChange={(e) => setPartner('company', e.target.value)} />
            </Field>
          </div>
          <Field label="Тон собеседника" hint="Влияет на стартовые доверие и напряжение, реплики и силу реакций" className="mt-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPartner('tone', t.id)}
                  className={cn('rounded-lg border p-3 text-left text-xs', draft.partner.tone === t.id ? 'border-foreground bg-background' : 'border-border')}
                >
                  <div className="font-display font-extrabold">{t.label}</div>
                  <div className="text-muted-foreground">{t.description}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    Старт: доверие {t.start.trust} · напряжение {t.start.tension}
                  </div>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Цели собеседника" hint="По одной на строку. Используются ИИ-собеседником и в брифинге администратора" className="mt-4">
            <Textarea value={goalsText} onChange={(e) => setGoalsText(e.target.value)} className="min-h-[70px] text-sm" />
          </Field>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h3 className="mr-auto font-display text-sm font-extrabold">3. Сюжет переговоров</h3>
            <Button variant="outline" size="sm" onClick={aiFill} disabled={!llmReady(llm) || aiBusy} className="gap-1.5" title={llmReady(llm) ? '' : 'Подключите LLM на вкладке «ИИ»'}>
              <Icon name={aiBusy ? 'Loader2' : 'Sparkles'} size={14} className={cn(aiBusy && 'animate-spin')} />
              Сгенерировать с ИИ
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {SLOT_FIELDS.map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint}>
                <Textarea value={draft.slots[f.key]} onChange={(e) => setSlot(f.key, e.target.value)} className="min-h-[64px] text-sm" />
              </Field>
            ))}
          </div>
          <Field label="Брифинг для игрока" hint="Факты, которые игрок видит перед стартом. По одному на строку" className="mt-4">
            <Textarea value={briefText} onChange={(e) => setBriefText(e.target.value)} className="min-h-[70px] text-sm" />
          </Field>
        </section>

        <div className="flex flex-wrap gap-2.5">
          <Button onClick={() => save(true)} className="gap-2 font-display font-extrabold">
            Сохранить и запустить
            <Icon name="Play" size={15} />
          </Button>
          <Button variant="outline" onClick={() => save(false)} className="gap-2">
            <Icon name="Save" size={15} /> Сохранить
          </Button>
          {missing.length > 0 && <span className="self-center text-xs text-muted-foreground">Не заполнено: {missing.length}</span>}
        </div>
      </div>

      <aside className="xl:sticky xl:top-[80px] xl:self-start">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-1 flex items-center gap-2 font-display text-sm font-extrabold">
            <Icon name="Eye" size={15} /> Предпросмотр сгенерированного графа
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">Обновляется при каждом изменении полей. Каждый тип ответа игрока ведёт в свою ветку.</p>
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <GraphPreview graph={preview.graph} compact />
          </div>
        </div>
      </aside>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const LlmSettingsPanel: React.FC = () => {
  const { llm, setLlm } = useSimulator();
  const [draft, setDraft] = useState<LlmSettings>(llm);
  const [testing, setTesting] = useState(false);
  const [models, setModels] = useState<string[] | null>(null);

  const set = <K extends keyof LlmSettings>(k: K, v: LlmSettings[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const scanOllama = async (url = draft.ollamaUrl) => {
    try {
      const found = await listOllamaModels(url || DEFAULT_OLLAMA_URL);
      setModels(found);
      if (!found.length) toast.error('Ollama запущена, но моделей нет', { description: `Выполните: ollama pull ${DEFAULT_OLLAMA_MODEL}` });
      else if (!found.includes(draft.model)) set('model', found.includes(DEFAULT_OLLAMA_MODEL) ? DEFAULT_OLLAMA_MODEL : found[0]);
    } catch {
      setModels([]);
      toast.error('Ollama не найдена', { description: 'Установите Ollama и запустите её (см. README, раздел «Бесплатный локальный ИИ»).' });
    }
  };

  const pickProvider = (id: LlmProvider) => {
    setDraft((d) => ({ ...d, provider: id, model: id === d.provider ? d.model : '', liveReplies: id === d.provider ? d.liveReplies : id !== 'ollama' }));
    if (id === 'ollama') void scanOllama();
  };

  const test = async () => {
    setTesting(true);
    try {
      const reply = await complete(draft, 'Отвечай одним словом по-русски.', 'Скажи «готово».');
      toast.success('Подключение работает', { description: `Ответ модели: ${reply.slice(0, 60)}` });
    } catch (e) {
      toast.error('Не удалось подключиться', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <Field label="Провайдер">
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['off', 'Выключен', 'Офлайн-движок, без сети и ключей'],
                ['ollama', 'Ollama (локально)', 'Бесплатно, без ключа и интернета'],
                ['anthropic', 'Claude (Anthropic)', 'Облако, нужен API-ключ'],
                ['openai', 'OpenAI-совместимый', 'OpenRouter, LM Studio, vLLM и др.'],
              ] as [LlmProvider, string, string][]
            ).map(([id, title, desc]) => (
              <button
                key={id}
                onClick={() => pickProvider(id)}
                className={cn('rounded-lg border p-3 text-left text-xs', draft.provider === id ? 'border-foreground bg-background' : 'border-border')}
              >
                <div className="flex items-center gap-1.5 font-display font-extrabold">
                  {title}
                  {id === 'ollama' && <Badge className="h-4 px-1.5 text-[10px]">бесплатно</Badge>}
                </div>
                <div className="text-muted-foreground">{desc}</div>
              </button>
            ))}
          </div>
        </Field>
        {draft.provider === 'ollama' && (
          <>
            <Field label="Адрес Ollama" hint="Сервер Ollama запускается автоматически после установки">
              <div className="flex gap-2">
                <Input value={draft.ollamaUrl} onChange={(e) => set('ollamaUrl', e.target.value)} placeholder={DEFAULT_OLLAMA_URL} />
                <Button variant="outline" onClick={() => void scanOllama()} className="flex-none gap-1.5">
                  <Icon name="RefreshCw" size={14} /> Найти модели
                </Button>
              </div>
            </Field>
            <Field label="Модель" hint={`Рекомендуется ${DEFAULT_OLLAMA_MODEL} — хорошо понимает русский и работает даже на ноутбучной видеокарте`}>
              {models && models.length > 0 ? (
                <Select value={draft.model || models[0]} onValueChange={(v) => set('model', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={draft.model} onChange={(e) => set('model', e.target.value)} placeholder={DEFAULT_OLLAMA_MODEL} />
              )}
            </Field>
          </>
        )}
        {(draft.provider === 'anthropic' || draft.provider === 'openai') && (
          <>
            <Field label="API-ключ" hint="Хранится только в этом браузере (localStorage) и отправляется напрямую провайдеру.">
              <Input type="password" value={draft.apiKey} onChange={(e) => set('apiKey', e.target.value)} placeholder={draft.provider === 'anthropic' ? 'sk-ant-…' : 'sk-…'} />
            </Field>
            <Field label="Модель" hint={`По умолчанию: ${draft.provider === 'anthropic' ? DEFAULT_ANTHROPIC_MODEL : DEFAULT_OPENAI_MODEL}`}>
              <Input value={draft.model} onChange={(e) => set('model', e.target.value)} placeholder={draft.provider === 'anthropic' ? DEFAULT_ANTHROPIC_MODEL : DEFAULT_OPENAI_MODEL} />
            </Field>
            {draft.provider === 'openai' && (
              <Field label="Base URL" hint="Например https://openrouter.ai/api/v1 (у OpenRouter есть бесплатные модели с суффиксом :free)">
                <Input value={draft.baseUrl} onChange={(e) => set('baseUrl', e.target.value)} />
              </Field>
            )}
          </>
        )}
        {draft.provider !== 'off' && (
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
            <Switch checked={draft.liveReplies} onCheckedChange={(v) => set('liveReplies', v)} className="mt-0.5" />
            <span className="text-xs">
              <span className="font-display font-extrabold">Живые реплики собеседника</span>
              <span className="block text-muted-foreground">
                {draft.provider === 'ollama'
                  ? 'Экспериментально: модели на 3–7B параметров иногда искажают смысл реплики. Ответы с ошибками отфильтровываются, и вместо них показывается реплика сценария.'
                  : 'Модель переформулирует реплику сценария, откликаясь на слова игрока. Ветка и метрики не меняются.'}
              </span>
            </span>
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setLlm(draft);
              toast.success('Настройки сохранены');
            }}
            className="gap-2"
          >
            <Icon name="Save" size={15} /> Сохранить
          </Button>
          <Button variant="outline" onClick={test} disabled={!llmReady(draft) || testing} className="gap-2">
            <Icon name={testing ? 'Loader2' : 'PlugZap'} size={15} className={cn(testing && 'animate-spin')} />
            Проверить подключение
          </Button>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
        <h3 className="mb-2 font-display text-sm font-extrabold text-foreground">Что делает ИИ</h3>
        <ul className="space-y-2 text-xs">
          <li>• <b className="text-foreground">Живые реплики.</b> В «Диалоге» и «Онлайне» собеседник отвечает своими словами, откликаясь на вашу фразу. Смысл реплики, ветка сценария и метрики по-прежнему задаются графом — исход остаётся воспроизводимым.</li>
          <li>• <b className="text-foreground">Разбор от ИИ-тренера</b> на экране результатов — с переформулировками ваших реплик.</li>
          <li>• <b className="text-foreground">Генерация сюжета</b> в конструкторе по сфере, теме и целям собеседника.</li>
        </ul>
        <p className="mt-3 text-xs">
          Без ключа всё работает офлайн: анализ реплик, ветвление, обратная связь и прогресс не требуют внешних сервисов. При ошибке сети тренажёр автоматически
          переключается на реплики сценария.
        </p>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const AdminScreen: React.FC = () => {
  const [tab, setTab] = useState('list');
  const [draft, setDraft] = useState<ScenarioConfig>(() => blankConfig());
  const [draftKey, setDraftKey] = useState(0);

  const edit = (cfg: ScenarioConfig) => {
    setDraft(cfg);
    setDraftKey((k) => k + 1);
    setTab('builder');
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <ScreenHeader title="Кабинет администратора" subtitle="Сценарии, контекст симуляции и подключение ИИ" back="home" />
      <div className="mx-auto max-w-[1240px] px-5 py-8 md:px-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex h-auto flex-wrap">
            <TabsTrigger value="list" className="gap-1.5">
              <Icon name="LayoutList" size={14} /> Сценарии
            </TabsTrigger>
            <TabsTrigger value="builder" className="gap-1.5">
              <Icon name="Wand2" size={14} /> Конструктор
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5">
              <Icon name="Sparkles" size={14} /> ИИ
            </TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            <ScenarioList onEdit={edit} />
          </TabsContent>
          <TabsContent value="builder">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <p className="mr-auto text-sm text-muted-foreground">
                Задайте сферу, тему, тон и цели собеседника — генератор соберёт ветвящийся сценарий с пятью вариантами финала.
              </p>
              <Button variant="ghost" size="sm" onClick={() => edit(blankConfig())} className="gap-1.5">
                <Icon name="FilePlus" size={14} /> Новый
              </Button>
            </div>
            <Constructor key={draftKey} draft={draft} setDraft={setDraft} />
          </TabsContent>
          <TabsContent value="ai">
            <LlmSettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminScreen;
