import { Mic, Square } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useSpeechRecognition } from "../hooks/use-speech-recognition.ts";

type VoiceEntryButtonProps = {
  disabled?: boolean;
  onTranscript: (text: string) => void;
};

export function VoiceEntryButton({ disabled, onTranscript }: VoiceEntryButtonProps) {
  const { supported, listening, transcript, error, start, stop } = useSpeechRecognition({
    onFinalTranscript: onTranscript,
  });
  if (!supported) return null;

  return (
    <div className="grid min-w-0 gap-1.5">
      <Button
        type="button"
        variant={listening ? "default" : "outline"}
        size="sm"
        className="justify-self-start"
        disabled={disabled && !listening}
        aria-pressed={listening}
        onClick={listening ? stop : start}
      >
        {listening ? <Square aria-hidden /> : <Mic aria-hidden />}
        {listening ? "Listening… tap to stop" : "Speak transaction"}
      </Button>
      <p role="status" className="min-w-0 text-xs break-words text-muted-foreground">
        {transcript ? `Heard: “${transcript}”` : listening ? "Try “coffee 85 yesterday”." : ""}
      </p>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
