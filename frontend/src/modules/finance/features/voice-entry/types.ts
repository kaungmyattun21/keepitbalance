// The Web Speech API is not in TypeScript's DOM types yet; only the parts used here.
export type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
};

export type SpeechRecognitionEventLike = {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
};

export type SpeechRecognitionErrorEventLike = { readonly error: string };

export type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}
