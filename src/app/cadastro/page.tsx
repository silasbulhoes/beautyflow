"use client";

import Link from "next/link";
import { useActionState } from "react";

import { cadastrar, type CadastroState } from "./actions";

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

const initialState: CadastroState = {};

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState(
    cadastrar,
    initialState,
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/" className="mb-4 text-lg font-semibold">
            BeautyFlow
          </Link>

          <CardTitle>Crie sua conta</CardTitle>

          <CardDescription>
            Comece a organizar seus agendamentos em poucos minutos.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={formAction} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Seu nome</Label>
              <Input
                id="name"
                name="name"
                placeholder="Digite seu nome"
                autoComplete="name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Nome do estúdio</Label>
              <Input
                id="businessName"
                name="businessName"
                placeholder="Ex.: Studio Bella Nails"
                required
              />
            </div>

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
                placeholder="Crie uma senha"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirmation">Confirmar senha</Label>
              <Input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} required />
            </div>

            <label className="flex items-start gap-3 text-sm">
              <input className="mt-1" type="checkbox" name="acceptedTerms" required />
              <span>Li e aceito os Termos de Uso do BeautyFlow.</span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input className="mt-1" type="checkbox" name="acceptedPrivacy" required />
              <span>Li e aceito o <Link href="/privacidade" className="underline">Aviso de Privacidade</Link>.</span>
            </label>

            {state.error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Criando conta..." : "Criar conta"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já possui uma conta?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Entrar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
