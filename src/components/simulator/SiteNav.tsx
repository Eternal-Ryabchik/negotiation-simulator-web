import React, { useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useSimulator } from '@/hooks/use-simulator';

const MENU = [
  { label: 'Как это работает', href: '#how' },
  { label: 'Режимы', href: '#modes' },
  { label: 'Сценарии', href: '#scenarios' },
  { label: 'Сложность', href: '#levels' },
  { label: 'Для команд', href: '#teams' },
];

const SiteNav: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { pickMode, go } = useSimulator();

  const jump = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <div
        className="flex h-9 flex-none items-center justify-center gap-1.5 px-4 text-center font-display text-[13px] font-bold tracking-tight"
        style={{ background: 'var(--hero-x-lime)', color: 'var(--hero-x-lime-ink)' }}
      >
        <span className="truncate">Арена переговоров: сценарии с развилками, конструктор для администратора и разбор каждой реплики</span>
        <span className="opacity-75">›</span>
      </div>

      <header
        className="relative z-30 flex h-[60px] flex-none items-center gap-8 border-b px-5 md:px-10 xl:pl-[160px]"
        style={{ background: 'var(--hero-x-navbar)', borderColor: 'var(--hero-x-line)' }}
      >
        <div className="mr-2 font-display text-[15px] font-extrabold tracking-[0.18em] xl:mr-6">
          ТАК<span style={{ color: 'var(--hero-x-blue-deep)' }}>Т</span>
        </div>

        <nav className="hidden lg:block">
          <ul className="flex gap-[30px] text-[15px] font-medium">
            {MENU.map((m) => (
              <li key={m.label} className="whitespace-nowrap">
                <a
                  href={m.href}
                  onClick={(e) => jump(e, m.href)}
                  className="transition-opacity hover:opacity-60"
                >
                  {m.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-5">
          <button onClick={() => go('admin')} className="hidden items-center gap-1.5 text-[15px] font-medium hover:opacity-60 md:flex">
            <Icon name="SlidersHorizontal" size={15} />
            Кабинет
          </button>
          <button onClick={() => go('profile')} className="hidden items-center gap-1.5 text-[15px] font-medium hover:opacity-60 sm:flex">
            <Icon name="UserRound" size={15} />
            Прогресс
          </button>
          <button
            onClick={() => pickMode('quiz')}
            className="hero-btn bg-foreground px-4 py-2 text-[14px] text-background hover:opacity-90"
          >
            Начать<span className="font-bold opacity-80">›</span>
          </button>
          <button
            className="lg:hidden"
            aria-label="Меню"
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'X' : 'Menu'} size={22} />
          </button>
        </div>
      </header>

      <div
        className={cn(
          'overflow-hidden border-b border-border bg-card transition-[max-height] duration-300 lg:hidden',
          open ? 'max-h-80' : 'max-h-0 border-b-0',
        )}
      >
        <ul className="flex flex-col px-5 py-2">
          {MENU.map((m) => (
            <li key={m.label}>
              <a
                href={m.href}
                onClick={(e) => jump(e, m.href)}
                className="block border-b border-border py-3 text-sm font-medium last:border-0"
              >
                {m.label}
              </a>
            </li>
          ))}
          <li>
            <button onClick={() => go('admin')} className="block w-full border-b border-border py-3 text-left text-sm font-medium">
              Кабинет администратора
            </button>
          </li>
          <li>
            <button onClick={() => go('profile')} className="block w-full py-3 text-left text-sm font-medium">
              Мой прогресс
            </button>
          </li>
        </ul>
      </div>
    </>
  );
};

export default SiteNav;
