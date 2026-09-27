import React from 'react';
import { useSimulator } from '@/hooks/use-simulator';

const Hero: React.FC = () => {
  const { pickMode } = useSimulator();

  return (
    <main className="hero-stage relative overflow-hidden">
      {/* диагональные плоскости — перенос из исходного варианта */}
      <div
        aria-hidden
        className="hero-plane -right-20 -top-52 hidden h-[1000px] w-[250px] md:block"
        style={{ background: 'linear-gradient(180deg,var(--hero-x-blue) 0%,var(--hero-x-blue-deep) 100%)' }}
      />
      <div
        aria-hidden
        className="hero-plane right-[150px] -top-[260px] hidden h-[900px] w-[200px] opacity-90 md:block"
        style={{ background: 'linear-gradient(180deg,var(--hero-x-blue-deep) 0%,var(--hero-x-blue) 100%)' }}
      />
      <div
        aria-hidden
        className="hero-plane right-[290px] -top-[120px] hidden h-[720px] w-[400px] lg:block"
        style={{
          background:
            'linear-gradient(200deg,var(--hero-x-blue) 0%,var(--hero-x-teal) 70%,var(--hero-x-lime-plane) 100%)',
        }}
      />
      <div
        aria-hidden
        className="hero-plane left-10 top-[300px] hidden h-[290px] w-[170px] xl:block"
        style={{ background: 'linear-gradient(160deg,var(--hero-x-lime) 0%,var(--hero-x-teal) 100%)' }}
      />

      <div className="hero-root relative z-[3] px-5 pb-16 pt-10 md:px-10 md:pt-[58px] xl:pl-[160px] xl:pr-[160px]">
        <div className="max-w-[720px]">
          <h1 className="hero-h1 rise" style={{ animationDelay: '.05s' }}>
            Симулятор
            <br />
            деловых переговоров
          </h1>
          <p
            className="rise mt-[22px] max-w-[390px] text-[1.03em] leading-[1.5]"
            style={{ color: 'var(--hero-muted)', animationDelay: '.14s' }}
          >
            Безопасная практика переговоров: собеседник реагирует на ваши формулировки, сценарий ветвится, а после — разбор каждой реплики.
          </p>
          <div className="rise mt-[26px] flex flex-wrap gap-3" style={{ animationDelay: '.22s' }}>
            <button
              onClick={() => pickMode('quiz')}
              className="hero-btn bg-foreground px-[18px] py-3 text-[0.92em] text-background hover:opacity-90"
            >
              Начать симуляцию<span className="font-bold opacity-80">›</span>
            </button>
            <button
              onClick={() => document.querySelector('#modes')?.scrollIntoView({ behavior: 'smooth' })}
              className="hero-btn bg-card px-[18px] py-3 text-[0.92em] text-foreground shadow-[0_1px_2px_var(--hero-x-shadow)] hover:shadow-md"
            >
              Выбрать режим<span className="font-bold opacity-80">›</span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:mt-[76px] lg:grid-cols-2 lg:gap-[70px]">
          <div
            className="rise min-h-[300px] rounded-[10px] px-6 pb-[30px] pt-[22px] text-[0.82em] leading-[2.05]"
            style={{ background: 'var(--hero-x-panel)', animationDelay: '.22s' }}
          >
            {[
              { n: '1', el: <span style={{ color: 'var(--hero-x-panel-num)' }}>Клиент, Анна Тихонова</span> },
              {
                n: '2',
                el: (
                  <span style={{ color: 'var(--hero-x-panel-text)' }}>
                    «Ваше предложение на <span style={{ color: 'var(--hero-x-code-lime)' }}>20%</span> дороже,
                  </span>
                ),
              },
              {
                n: '3',
                el: <span className="pl-[22px]" style={{ color: 'var(--hero-x-panel-text)' }}>чем у конкурентов.»</span>,
              },
              {
                n: '4',
                el: (
                  <span style={{ color: 'var(--hero-x-panel-text)' }}>
                    <span style={{ color: 'var(--hero-x-code-blue)' }}>ход</span>: 1 · этап: позиция &nbsp;
                    <span style={{ color: 'var(--hero-x-code-blue)' }}>тон</span>: давление
                  </span>
                ),
              },
            ].map((l) => (
              <div key={l.n} className="flex gap-[18px]">
                <span
                  className="w-2 flex-none text-right"
                  style={{ color: 'var(--hero-x-panel-num)' }}
                >
                  {l.n}
                </span>
                {l.el}
              </div>
            ))}
          </div>

          <button
            onClick={() => pickMode('quiz')}
            className="rise min-h-[300px] rounded-[10px] bg-card px-[22px] pb-[26px] pt-5 text-left shadow-[0_10px_28px_var(--hero-x-shadow)] transition-transform hover:-translate-y-1"
            style={{ animationDelay: '.3s' }}
          >
            <div className="flex items-center gap-2 text-[0.85em] font-medium" style={{ color: 'var(--hero-muted)' }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-[15px] w-[15px]">
                <path d="M2 8h9M8 5l3 3-3 3M13 3v10" />
              </svg>
              Переговоры о цене · раунд 3
            </div>
            <div className="mt-1.5 font-display text-[1.85em] font-extrabold tracking-[-0.03em]">Доверие 72</div>
            <div className="relative mx-1 mt-5 h-[2px] bg-foreground">
              <span className="absolute left-0 top-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />
              <span
                className="absolute left-full top-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: 'var(--hero-x-teal)' }}
              />
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-5">
              <div>
                <div className="mb-1.5 text-[0.78em]" style={{ color: 'var(--hero-muted)' }}>Аргументация</div>
                <div
                  className="h-[38px] rounded-[var(--hero-radius)] border"
                  style={{
                    borderColor: 'var(--hero-x-blue)',
                    background:
                      'linear-gradient(90deg, color-mix(in srgb, var(--hero-x-teal) 30%, transparent) 0%, color-mix(in srgb, var(--hero-x-lime) 45%, transparent) 100%)',
                    boxShadow: '0 0 0 3px color-mix(in srgb, var(--hero-x-blue) 18%, transparent)',
                  }}
                />
              </div>
              <div>
                <div className="mb-1.5 text-[0.78em]" style={{ color: 'var(--hero-muted)' }}>Напряжение</div>
                <div
                  className="h-[38px] rounded-[var(--hero-radius)] border"
                  style={{ borderColor: 'var(--hero-x-line)', background: 'var(--hero-x-field)' }}
                />
              </div>
            </div>
            <div
              className="mt-5 h-[52px] rounded-[var(--hero-radius)] border"
              style={{ borderColor: 'var(--hero-x-line)', background: 'var(--hero-x-field)' }}
            />
          </button>
        </div>
      </div>
    </main>
  );
};

export default Hero;
