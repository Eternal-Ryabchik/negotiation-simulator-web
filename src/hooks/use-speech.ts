import { useCallback, useEffect, useRef, useState } from 'react';

// Минимальные типы Web Speech API (в lib.dom их нет).
interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

const getRecognitionCtor = (): (new () => Recognition) | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/** Распознавание речи (ru-RU). onText получает накопленный текст фразы. */
export function useSpeechInput(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const cb = useRef(onText);
  cb.current = onText;
  const supported = !!getRecognitionCtor();

  const stop = useCallback(() => {
    rec.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError('Браузер не поддерживает распознавание речи — используйте Chrome или Edge.');
      return false;
    }
    const r = new Ctor();
    r.lang = 'ru-RU';
    r.interimResults = true;
    r.continuous = true;
    let finalText = '';
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += `${res[0].transcript} `;
        else interim += res[0].transcript;
      }
      cb.current(`${finalText}${interim}`.trim());
    };
    r.onerror = (e) => {
      setError(e.error === 'not-allowed' ? 'Нет доступа к микрофону.' : `Ошибка распознавания: ${e.error}`);
      setListening(false);
    };
    r.onend = () => setListening(false);
    rec.current = r;
    setError(null);
    r.start();
    setListening(true);
    return true;
  }, []);

  useEffect(() => () => rec.current?.stop(), []);

  return { supported, listening, error, start, stop };
}

/** Озвучка реплик собеседника через speechSynthesis. */
export function useSpeechOutput() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ru-RU';
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('ru'));
      if (voice) u.voice = voice;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [supported],
  );

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { supported, speaking, speak, cancel };
}
