"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/layout/PageShell";
import {
  createNearMiss,
  getNearMissPatterns,
  getNearMissSummary,
} from "@/lib/api/near-misses";
import { getMyHospital } from "@/lib/api/hospital";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ShieldAlert } from "lucide-react";
import type { NearMiss } from "@/lib/types";

const categories: NearMiss["category"][] = [
  "medication",
  "procedure",
  "communication",
  "equipment",
  "fall",
];
const severities: NearMiss["severity"][] = ["near_miss", "no_harm", "harm"];

const categoryLabel: Record<NearMiss["category"], string> = {
  medication: "Medicação",
  procedure: "Procedimento",
  communication: "Comunicação",
  equipment: "Equipamento",
  fall: "Queda",
};

const severityLabel: Record<NearMiss["severity"], string> = {
  near_miss: "Quase-erro",
  no_harm: "Sem dano",
  harm: "Com dano",
};

export default function NearMissesPage() {
  const qc = useQueryClient();
  const hospital = useQuery({ queryKey: ["hospital"], queryFn: getMyHospital });
  const patterns = useQuery({
    queryKey: ["near-miss-patterns"],
    queryFn: getNearMissPatterns,
  });
  const summary = useQuery({
    queryKey: ["near-miss-summary"],
    queryFn: getNearMissSummary,
  });

  const [form, setForm] = useState({
    category: "medication" as NearMiss["category"],
    severity: "near_miss" as NearMiss["severity"],
    wardId: "",
    description: "",
    isAnonymous: true,
  });

  const createMut = useMutation({
    mutationFn: () => createNearMiss(form),
    onSuccess: () => {
      setForm((f) => ({ ...f, description: "" }));
      qc.invalidateQueries({ queryKey: ["near-miss-patterns"] });
      qc.invalidateQueries({ queryKey: ["near-miss-summary"] });
    },
  });

  return (
    <PageShell
      title="Quase-erros"
      description="Reporte quase-erros para melhoria contínua. Classificação por IA é assíncrona."
    >
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <aside className="rounded-lg border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Reportar
          </h2>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={form.category}
              onValueChange={(v) =>
                setForm({ ...form, category: v as NearMiss["category"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {categoryLabel[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Severidade</Label>
            <Select
              value={form.severity}
              onValueChange={(v) =>
                setForm({ ...form, severity: v as NearMiss["severity"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {severities.map((s) => (
                  <SelectItem key={s} value={s}>
                    {severityLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ala (opcional)</Label>
            <Select
              value={form.wardId || "_none"}
              onValueChange={(v) => setForm({ ...form, wardId: !v || v === "_none" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem ala" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sem ala</SelectItem>
                {hospital.data?.wards.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              minLength={10}
              maxLength={2000}
              className="w-full rounded-md border bg-background p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Descreva o que aconteceu — mínimo 10 caracteres"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="anon"
              type="checkbox"
              checked={form.isAnonymous}
              onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
            />
            <Label htmlFor="anon" className="cursor-pointer">
              Reportar anonimamente
            </Label>
          </div>

          <Button
            className="w-full"
            disabled={form.description.length < 10 || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar reporte
          </Button>
          {createMut.isSuccess && (
            <p className="text-xs text-emerald-600 text-center">
              Reporte enviado. Classificação IA roda em segundo plano.
            </p>
          )}
        </aside>

        <main className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-3">Resumo (todo o histórico)</h2>
            {summary.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : summary.data ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Total" value={summary.data.total} />
                <Stat
                  label="Categoria líder"
                  value={(() => {
                    const top = summary.data.byCategory.sort((a, b) => b._count - a._count)[0];
                    if (!top) return "—";
                    return (categoryLabel as Record<string, string>)[top.category] ?? top.category;
                  })()}
                />
                <Stat
                  label="Severidade líder"
                  value={(() => {
                    const top = summary.data.bySeverity.sort((a, b) => b._count - a._count)[0];
                    if (!top) return "—";
                    return (severityLabel as Record<string, string>)[top.severity] ?? top.severity;
                  })()}
                />
              </div>
            ) : null}
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Últimos 30 dias</h2>
            {patterns.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : patterns.data && patterns.data.length > 0 ? (
              <div className="space-y-2">
                {patterns.data.map((nm) => (
                  <div key={nm.id} className="rounded-lg border bg-card p-4 text-sm">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{categoryLabel[nm.category]}</Badge>
                        <Badge variant="secondary">{severityLabel[nm.severity]}</Badge>
                        {nm.isAnonymous && (
                          <Badge variant="outline" className="text-[10px]">
                            Anônimo
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(nm.reportedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-foreground/80">{nm.description}</p>
                    {nm.aiClassificationJson != null && (
                      <p className="text-[10px] text-muted-foreground mt-2">
                        ✓ Classificado por IA
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Nenhum quase-erro nos últimos 30 dias.
              </p>
            )}
          </section>
        </main>
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
