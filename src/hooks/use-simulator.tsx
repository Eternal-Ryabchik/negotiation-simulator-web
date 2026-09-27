import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { LEVELS, MODES, levelById, type Level, type Mode } from '@/lib/simulator-data';
import { BUILT_IN } from '@/lib/arena/scenarios';
import { toScenario } from '@/lib/arena/generator';
import { DEFAULT_OLLAMA_MODEL, listOllamaModels } from '@/lib/arena/llm';
import {
  hasSavedLlm,
  loadCustomScenarios,
  loadHistory,
  loadLlm,
  saveCustomScenarios,
  saveHistory,
  saveLlm,
  type LlmSettings,
} from '@/lib/arena/storage';
import type { LevelId, ModeId, Scenario, ScenarioConfig, SessionResult } from '@/lib/arena/types';

export type { Metrics } from '@/lib/arena/types';

export type ScreenId = 'home' | 'setup' | 'quiz' | 'dialog' | 'phrases' | 'online' | 'result' | 'admin' | 'profile';

interface SimulatorState {
  screen: ScreenId;
  mode: Mode | null;
  level: Level;
  scenario: Scenario;
  scenarios: Scenario[];
  customConfigs: ScenarioConfig[];
  history: SessionResult[];
  result: SessionResult | null;
  llm: LlmSettings;
  sessionKey: number;
  go: (screen: ScreenId) => void;
  pickMode: (id: ModeId) => void;
  setLevel: (id: LevelId) => void;
  setScenario: (id: string) => void;
  startSimulation: () => void;
  finishSession: (r: SessionResult) => void;
  openResult: (r: SessionResult) => void;
  saveScenario: (cfg: ScenarioConfig) => void;
  deleteScenario: (id: string) => void;
  setLlm: (s: LlmSettings) => void;
  clearHistory: () => void;
}

const SimulatorContext = createContext<SimulatorState | null>(null);

export const SimulatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screen, setScreen] = useState<ScreenId>('home');
  const [mode, setMode] = useState<Mode | null>(null);
  const [level, setLevelState] = useState<Level>(LEVELS[1]);
  const [scenarioId, setScenarioId] = useState(BUILT_IN[0].id);
  const [customConfigs, setCustomConfigs] = useState<ScenarioConfig[]>(loadCustomScenarios);
  const [history, setHistory] = useState<SessionResult[]>(loadHistory);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [llm, setLlmState] = useState<LlmSettings>(loadLlm);
  const [sessionKey, setSessionKey] = useState(0);

  // При локальном запуске ищем Ollama: если она есть, ИИ-режим включается без настройки.
  // Не сохраняем в localStorage — ручные настройки в кабинете всегда приоритетнее.
  useEffect(() => {
    const local = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!local || hasSavedLlm()) return;
    listOllamaModels()
      .then((models) => {
        if (!models.length) return;
        const model = models.includes(DEFAULT_OLLAMA_MODEL) ? DEFAULT_OLLAMA_MODEL : models[0];
        setLlmState((s) => (s.provider === 'off' ? { ...s, provider: 'ollama', model, liveReplies: false } : s));
        toast.success('Найдена локальная модель', { description: `Ollama · ${model}: разбор от ИИ-тренера и генерация сценариев включены` });
      })
      .catch(() => {
        /* Ollama не запущена — работаем офлайн */
      });
  }, []);

  const scenarios = useMemo(() => {
    const custom: Scenario[] = [];
    for (const cfg of customConfigs) {
      try {
        custom.push(toScenario(cfg));
      } catch {
        /* повреждённая запись — пропускаем */
      }
    }
    return [...custom, ...BUILT_IN];
  }, [customConfigs]);

  const scenario = scenarios.find((s) => s.id === scenarioId) ?? BUILT_IN[0];

  const go = useCallback((next: ScreenId) => {
    setScreen(next);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const pickMode = useCallback(
    (id: ModeId) => {
      setMode(MODES.find((m) => m.id === id) ?? null);
      go('setup');
    },
    [go],
  );

  const setLevel = useCallback((id: LevelId) => setLevelState(levelById(id)), []);

  const setScenario = useCallback(
    (id: string) => {
      setScenarioId(id);
      const found = scenarios.find((s) => s.id === id);
      if (found) setLevelState(levelById(found.difficulty));
    },
    [scenarios],
  );

  const startSimulation = useCallback(() => {
    setSessionKey((k) => k + 1);
    go((mode?.id ?? 'quiz') as ScreenId);
  }, [go, mode]);

  const finishSession = useCallback(
    (r: SessionResult) => {
      setResult(r);
      setHistory((h) => {
        const next = [r, ...h];
        saveHistory(next);
        return next;
      });
      go('result');
    },
    [go],
  );

  const openResult = useCallback(
    (r: SessionResult) => {
      setResult(r);
      setScenarioId(r.scenarioId);
      setMode(MODES.find((m) => m.id === r.mode) ?? null);
      setLevelState(levelById(r.level));
      go('result');
    },
    [go],
  );

  const saveScenario = useCallback((cfg: ScenarioConfig) => {
    setCustomConfigs((list) => {
      const next = list.some((c) => c.id === cfg.id) ? list.map((c) => (c.id === cfg.id ? cfg : c)) : [cfg, ...list];
      saveCustomScenarios(next);
      return next;
    });
  }, []);

  const deleteScenario = useCallback((id: string) => {
    setCustomConfigs((list) => {
      const next = list.filter((c) => c.id !== id);
      saveCustomScenarios(next);
      return next;
    });
    setScenarioId((cur) => (cur === id ? BUILT_IN[0].id : cur));
  }, []);

  const setLlm = useCallback((s: LlmSettings) => {
    setLlmState(s);
    saveLlm(s);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  const value = useMemo<SimulatorState>(
    () => ({
      screen,
      mode,
      level,
      scenario,
      scenarios,
      customConfigs,
      history,
      result,
      llm,
      sessionKey,
      go,
      pickMode,
      setLevel,
      setScenario,
      startSimulation,
      finishSession,
      openResult,
      saveScenario,
      deleteScenario,
      setLlm,
      clearHistory,
    }),
    [screen, mode, level, scenario, scenarios, customConfigs, history, result, llm, sessionKey, go, pickMode, setLevel,
      setScenario, startSimulation, finishSession, openResult, saveScenario, deleteScenario, setLlm, clearHistory],
  );

  return <SimulatorContext.Provider value={value}>{children}</SimulatorContext.Provider>;
};

export const useSimulator = () => {
  const ctx = useContext(SimulatorContext);
  if (!ctx) throw new Error('useSimulator must be used inside SimulatorProvider');
  return ctx;
};
