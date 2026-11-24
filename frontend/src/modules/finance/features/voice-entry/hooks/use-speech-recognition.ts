import { useEffect, useRef, useState } from "react";
import type { SpeechRecognitionConstructor, SpeechRecognitionLike } from "../types.ts";

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Allow it in your browser settings and try again.",
  "service-not-allowed": "Microphone access is blocked. Allow it in your browser settings and try again.",
  "no-speech": "Didn't catch that. Tap the microphone and try again.",
  "audio-capture": "No microphone was found.",
  network: "Speech recognition needs an internet connection.",
};

function recognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

// Chrome on Android can repeat earlier words in each new result ("coffee", "coffee 85"),
// so a result that already contains the text so far replaces it instead of being appended.
export function joinResults(parts: string[]): string {
  return parts.reduce((text, part) => {
    const next = part.trim();
    if (next.toLowerCase().startsWith(text.toLowerCase())) return next;
    if (!next || text.toLowerCase().endsWith(next.toLowerCase())) return text;
    return `${text} ${next}`;
  }, "");
}

type Options = { lang?: string; onFinalTranscript: (text: string) => void };

export function useSpeechRecognition({ lang = "en-US", onFinalTranscript }: Options) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const onFinal = useRef(onFinalTranscript);
  const Recognition = recognitionConstructor();

  useEffect(() => {
    onFinal.current = onFinalTranscript;
  }, [onFinalTranscript]);
  useEffect(() => () => recognition.current?.abort(), []);

  function start() {
    if (!Recognition || recognition.current) return;
    const instance = new Recognition();
    instance.lang = lang;
    instance.interimResults = true;
    instance.continuous = false;
    instance.maxAlternatives = 1;
    let finalText = "";
    instance.onresult = (event) => {
      const results = Array.from(event.results);
      finalText = joinResults(
        results.filter((result) => result.isFinal).map((result) => result[0].transcript),
      );
      setTranscript(joinResults(results.map((result) => result[0].transcript)));
    };
    instance.onerror = (event) => {
      if (event.error === "aborted") return;
      setError(ERROR_MESSAGES[event.error] ?? "Speech recognition stopped. Please try again.");
    };
    instance.onend = () => {
      recognition.current = null;
      setListening(false);
      if (finalText.trim()) onFinal.current(finalText.trim());
    };
    recognition.current = instance;
    setTranscript("");
    setError(null);
    setListening(true);
    instance.start();
  }

  function stop() {
    recognition.current?.stop();
  }

  return { supported: Boolean(Recognition), listening, transcript, error, start, stop };
}
