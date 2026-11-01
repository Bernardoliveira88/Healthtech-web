"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { DEMO_USERS, isDemoMode } from "@/lib/api/demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  const signIn = async (userEmail: string, userPassword: string) => {
    setError(null);
    setLoading(true);

    try {
      const response = await login({ email: userEmail, password: userPassword });
      setAuth(response.user, response.token);
      router.push("/dashboard");
    } catch (err) {
      // Só 400/401 indicam credencial errada; erro de rede = API fora do ar.
      if (err instanceof ApiError) {
        setError(
          err.status === 400 || err.status === 401
            ? "E-mail ou senha inválidos."
            : `Erro no servidor (${err.status}). Tente novamente.`
        );
      } else {
        setError(
          `Não foi possível conectar à API (${process.env.NEXT_PUBLIC_API_URL}). Verifique se o backend está rodando.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50 shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
          RL
        </div>
        <CardTitle className="text-2xl">RoundLog</CardTitle>
        <CardDescription>
          {isDemoMode
            ? "Demonstração com dados fictícios: escolha um perfil para entrar"
            : "Faça login para acessar o sistema"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isDemoMode && (
          <div className="mb-6 space-y-2">
            {DEMO_USERS.map((user) => (
              <Button
                key={user.id}
                type="button"
                variant="outline"
                className="h-auto w-full flex-col items-start gap-0.5 py-3 text-left"
                disabled={loading}
                onClick={() => signIn(user.email, "demo")}
              >
                <span className="font-semibold">
                  {user.label} · {user.name}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user.description}
                </span>
              </Button>
            ))}
            <p className="pt-2 text-center text-xs text-muted-foreground">
              Nenhum dado é real nem sai do seu navegador. Recarregar a página reinicia os dados.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className={isDemoMode ? "hidden" : "space-y-4"}>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
