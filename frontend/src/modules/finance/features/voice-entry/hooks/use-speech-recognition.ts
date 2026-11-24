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
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index]!;
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      setTranscript((finalText + interim).trim());
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
