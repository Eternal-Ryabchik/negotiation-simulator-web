import React from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { LEVELS, MODES, SKILL_AXES, TENSION_LABEL, TONE_TENSION, toneById } from '@/lib/simulator-data';
import { useSimulator } from '@/hooks/use-simulator';

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mb-2 font-display text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{children}</p>
);

export const HowItWorks: React.FC = () => {
  const { go, pickMode } = useSimulator();
  const steps = [
    { icon: 'SlidersHorizontal', t: 'Администратор задаёт контекст', d: 'Сфера, тема, сложность, тон, роль и цели собеседника — генератор соберёт ветвящийся сценарий.' },
    { icon: 'LayoutGrid', t: 'Участник выбирает формат', d: 'Режим, сценарий и уровень. Перед стартом — брифинг: роль, цель и известные факты.' },
    { icon: 'GitBranch', t: 'Переговоры с развилками', d: 'Каждая реплика меняет доверие, аргументацию и напряжение и ведёт по своей ветке к одному из финалов.' },
    { icon: 'FileBarChart', t: 'Разбор и прогресс', d: 'Оценка, диаграмма навыков, разбор каждого хода с более сильным вариантом, опыт и достижения.' },
  ];
  return (
    <section id="how" className="border-t border-border bg-card px-5 py-16 md:px-10 md:py-20 xl:px-[160px]">
      <Eyebrow>Как это работает</Eyebrow>
      <h2 className="mb-10 max-w-[22ch] font-display text-3xl font-extrabold leading-[1.05] tracking-tight md:text-[40px]">
        От настройки контекста до разбора — за 10 минут
      </h2>
      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.t} className="rounded-xl border border-border bg-background p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-foreground text-background">
                <Icon name={s.icon} size={17} />
              </span>
              <span className="font-display text-3xl font-extrabold text-accent">0{i + 1}</span>
            </div>
            <h3 className="font-display text-base font-extrabold tracking-tight">{s.t}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => pickMode('quiz')} className="gap-2 font-display font-extrabold">
          Пройти как участник <Icon name="ArrowRight" size={15} />
        </Button>
        <Button variant="outline" onClick={() => go('admin')} className="gap-2">
          <Icon name="SlidersHorizontal" size={15} /> Открыть кабинет администратора
        </Button>
      </div>
    </section>
  );
};

export const LevelsPreview: React.FC = () => {
  const { pickMode, setLevel } = useSimulator();

  return (
    <section id="levels" className="border-t border-border bg-card px-5 py-16 md:px-10 md:py-20 xl:px-[160px]">
      <Eyebrow>Сложность</Eyebrow>
      <h2 className="mb-10 max-w-[20ch] font-display text-3xl font-extrabold leading-[1.05] tracking-tight md:text-[40px]">
        Собеседник становится жёстче вместе с вами
      </h2>

      <div className="grid gap-5 md:grid-cols-3">
        {LEVELS.map((lvl, i) => (
          <div key={lvl.id} className="card-pick flex flex-col p-6">
            <div className="flex items-center gap-2">
              <span className="font-display text-4xl font-extrabold tracking-tight text-muted">0{i + 1}</span>
              <h3 className="font-display text-xl font-extrabold tracking-tight">{lvl.title}</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{lvl.summary}</p>
            <ul className="mt-4 space-y-2">
              {lvl.points.map((p) => (
                <li key={p} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                  <Icon name="Check" size={15} className="mt-0.5 flex-none text-trust" />
                  {p}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="mt-6 w-full gap-2"
              onClick={() => {
                pickMode('quiz');
                setLevel(lvl.id);
              }}
            >
              Выбрать уровень
              <Icon name="ArrowRight" size={15} />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
};

export const ScenariosPreview: React.FC = () => {
  const { pickMode, setScenario, scenarios } = useSimulator();

  return (
    <section id="scenarios" className="border-t border-border bg-background px-5 py-16 md:px-10 md:py-20 xl:px-[160px]">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>{scenarios.length} сценариев</Eyebrow>
          <h2 className="max-w-[18ch] font-display text-3xl font-extrabold leading-[1.05] tracking-tight md:text-[40px]">
            Разговоры, которых обычно избегают
          </h2>
        </div>
        <p className="max-w-[40ch] text-sm leading-relaxed text-muted-foreground">
          Продажи, закупки, HR, проекты, клиентский сервис. В каждом — до пяти финалов: от взаимовыгодной сделки до срыва переговоров.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((s) => {
          const tension = TONE_TENSION[s.partner.tone];
          return (
            <button
              key={s.id}
              onClick={() => {
                pickMode('dialog');
                setScenario(s.id);
              }}
              className="card-pick p-5"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-muted text-foreground">
                  <Icon name={s.icon} size={17} fallback="MessagesSquare" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-extrabold leading-tight tracking-tight">{s.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{s.userGoal}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Icon name="Flame" size={12} className="text-tension" />
                  {TENSION_LABEL[tension]} · {toneById(s.partner.tone).label.toLowerCase()}
                </span>
                <span>{s.sphere}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export const ProgressSection: React.FC = () => {
  const { scenarios, go } = useSimulator();
  return (
    <section id="progress" className="border-t border-border bg-card px-5 py-16 md:px-10 md:py-20 xl:px-[160px]">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <Eyebrow>Оценка и прогресс</Eyebrow>
          <h2 className="max-w-[18ch] font-display text-3xl font-extrabold leading-[1.05] tracking-tight md:text-[40px]">
            Девять параметров вместо «хорошо получилось»
          </h2>
          <p className="mt-5 max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
            Анализатор разбирает каждую реплику: факты, предложения, обязательства, эмпатию, вопросы, давление и слова без обязательств.
            Уважительный тон и поиск взаимовыгодного решения дают больше баллов, чем продавленная уступка.
          </p>
          <div className="mt-7 flex flex-wrap gap-6">
            {[
              { v: '9', l: 'параметров оценки' },
              { v: String(scenarios.length), l: 'сценариев' },
              { v: String(MODES.length), l: 'режима тренировки' },
            ].map((s) => (
              <div key={s.l}>
                <div className="font-display text-3xl font-extrabold tracking-tight">{s.v}</div>
                <div className="text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={() => go('profile')} className="mt-7 gap-2">
            <Icon name="UserRound" size={15} /> Мой прогресс
          </Button>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {SKILL_AXES.map((axis, i) => {
            const v = [78, 71, 84, 66, 80, 62, 74, 69, 76][i];
            return (
              <div key={axis} className="rounded-lg border border-border bg-background p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-muted-foreground">{axis}</span>
                  <span className="font-display text-sm font-extrabold tabular-nums">{v}</span>
                </div>
                <div className="metric-track">
                  <div className="metric-fill bg-foreground" style={{ width: `${v}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const TeamsSection: React.FC = () => {
  const { go } = useSimulator();

  return (
    <section id="teams" className="border-t border-border px-5 py-16 md:px-10 md:py-20 xl:px-[160px]" style={{ background: 'var(--hero-x-panel)' }}>
      <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-2 font-display text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--hero-x-panel-num)' }}>
            Для HR и L&amp;D
          </p>
          <h2 className="max-w-[20ch] font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-white md:text-[40px]">
            Один тренажёр — под любую аудиторию
          </h2>
          <p className="mt-5 max-w-[46ch] text-sm leading-relaxed" style={{ color: 'var(--hero-x-panel-text)' }}>
            Соберите сценарий под свой отдел за пять минут: задайте сферу, тему, тон и цели собеседника. Генератор построит граф с развилками и
            пятью финалами, а ИИ (по желанию) допишет сюжет и оживит реплики.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button onClick={() => go('admin')} className="gap-2 bg-white font-display font-extrabold text-foreground hover:bg-white/90">
              Создать сценарий
              <Icon name="ArrowRight" size={16} />
            </Button>
          </div>
        </div>

        <ul className="space-y-3">
          {[
            { icon: 'Wand2', t: 'Конструктор сценариев', d: 'Шаблоны по сферам, предпросмотр графа, импорт и экспорт JSON' },
            { icon: 'FileBarChart', t: 'Разбор после каждой сессии', d: 'Оценка, навыки, путь по графу и более сильные реплики' },
            { icon: 'ShieldCheck', t: 'Работает без интернета', d: 'Офлайн-анализатор, ИИ подключается по желанию' },
          ].map((f) => (
            <li key={f.t} className="flex gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
              <Icon name={f.icon} size={18} className="mt-0.5 flex-none text-white" />
              <div>
                <div className="font-display text-sm font-extrabold text-white">{f.t}</div>
                <div className="text-xs" style={{ color: 'var(--hero-x-panel-text)' }}>
                  {f.d}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export const SiteFooter: React.FC = () => (
  <footer className="border-t border-border bg-background px-5 py-10 md:px-10 xl:px-[160px]">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="font-display text-sm font-extrabold tracking-[0.18em]">
        ТАК<span style={{ color: 'var(--hero-x-blue-deep)' }}>Т</span>
      </div>
      <p className="text-xs text-muted-foreground">Арена переговоров · симулятор деловых переговоров · {new Date().getFullYear()}</p>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <a href="#modes" className="hover:text-foreground">Режимы</a>
        <a href="#scenarios" className="hover:text-foreground">Сценарии</a>
        <a href="#teams" className="hover:text-foreground">Для команд</a>
      </div>
    </div>
  </footer>
);
