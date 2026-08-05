"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { solicitarRedefinicao, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = {};

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(
    solicitarRedefinicao,
    initialState,
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/" className="mb-4 text-lg font-semibold">BeautyFlow</Link>
          <CardTitle>Esqueci minha senha</CardTitle>
          <CardDescription>Enviaremos um link seguro para você criar uma nova senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            {state.error ? <p aria-live="polite" className="text-sm text-destructive">{state.error}</p> : null}
            {state.success ? <p aria-live="polite" className="rounded-md border bg-muted px-3 py-2 text-sm">{state.success}</p> : null}
            <Button className="w-full" disabled={pending} type="submit">
              {pending ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
            <Link href="/login" className="block text-center text-sm underline-offset-4 hover:underline">Voltar ao login</Link>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
