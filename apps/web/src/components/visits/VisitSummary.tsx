"use client";

import type { Visit } from "@/lib/types";

interface VisitSummaryProps {
  visit: Visit;
}

/**
 * Resumo estruturado da visita. Mostra transcript bruto + structuredJson
 * quando a visita está READY. Quando está PROCESSING, mostra placeholder.
 */
export function VisitSummary({ visit }: VisitSummaryProps) {
  if (visit.status === "PROCESSING" || visit.status === "RECORDING") {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm border-primary/20 bg-primary/5">
        <p className="text-sm text-muted-foreground italic">
          Áudio em processamento... os dados estruturados aparecerão aqui em instantes.
        </p>
      </div>
    );
  }

  if (visit.status === "ERROR") {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm border-destructive/20 bg-destructive/5">
        <p className="text-sm text-destructive font-medium">
          Falha ao processar o áudio desta visita.
        </p>
        {visit.transcriptRaw && (
          <p className="mt-2 text-xs text-muted-foreground">{visit.transcriptRaw}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visit.transcriptRaw && (
        <div className="rounded-xl border bg-card p-6 shadow-sm border-primary/20 bg-primary/5">
          <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">
            Transcrição
          </p>
          <p className="text-sm leading-relaxed text-foreground/90 italic">
            &ldquo;{visit.transcriptRaw}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
