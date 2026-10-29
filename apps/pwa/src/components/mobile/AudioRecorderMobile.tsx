"use client";

import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
import { Button } from "@/components/ui/button";
import { Mic, Square, RotateCcw, Upload, Loader2 } from "lucide-react";

interface AudioRecorderMobileProps {
  onUpload: (blob: Blob) => void;
  uploading?: boolean;
}

export function AudioRecorderMobile({ onUpload, uploading }: AudioRecorderMobileProps) {
  const { state, blob, duration, start, stop, reset } = useAudioRecorder();

  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-8 bg-background rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
      <div className="text-center space-y-2">
        <div className="text-4xl font-mono font-medium tracking-tighter">
          {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
          {state === "recording" ? "Gravando Round..." : "Toque para iniciar"}
        </p>
      </div>

      {/* Onda Visual Fake para Feedback */}
      <div className="flex items-center gap-1 h-12">
        {state === "recording" && [1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
          <div
            key={i}
            className="w-1 bg-primary rounded-full animate-pulse"
            style={{ 
              height: `${h * 10}%`,
              animationDelay: `${i * 0.1}s` 
            }}
          />
        ))}
      </div>

      <div className="relative flex items-center justify-center w-full max-w-[280px]">
        {state === "idle" && (
          <Button
            size="lg"
            className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            onClick={start}
          >
            <Mic className="h-8 w-8" />
          </Button>
        )}

        {state === "recording" && (
          <Button
            size="lg"
            variant="destructive"
            className="w-20 h-20 rounded-full shadow-lg animate-pulse"
            onClick={stop}
          >
            <Square className="h-8 w-8 fill-current" />
          </Button>
        )}

        {state === "stopped" && (
          <div className="flex gap-4 w-full">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 rounded-2xl h-14"
              onClick={reset}
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Repetir
            </Button>
            <Button
              size="lg"
              className="flex-1 rounded-2xl h-14 shadow-lg"
              disabled={uploading || !blob}
              onClick={() => blob && onUpload(blob)}
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
