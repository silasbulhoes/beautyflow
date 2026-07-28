"use client";

import Link from "next/link";
import { useActionState } from "react";

import { entrar, type LoginState } from "./actions";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(entrar, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/" className="mb-4 text-lg font-semibold">
            BeautyFlow
          </Link>

          <CardTitle>Entrar</CardTitle>

          <CardDescription>
            Acesse sua agenda e gerencie seus atendimentos.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={formAction} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>

              <Input
                id="email"
                name="email"
                type="email"
                placeholder="voce@exemplo.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>

              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Digite sua senha"
                autoComplete="current-password"
                required
              />
            </div>

            {state.error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Entrando..." : "Entrar"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Ainda não possui uma conta?{" "}
              <Link
                href="/cadastro"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Criar conta
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}