"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redefinirSenha, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = {};

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(redefinirSenha, initialState);
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Crie uma nova senha</CardTitle><CardDescription>Use pelo menos oito caracteres e não reutilize senhas antigas.</CardDescription></CardHeader>
        <CardContent>
          <form action={action} className="space-y-5">
            <div className="space-y-2"><Label htmlFor="password">Nova senha</Label><Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required /></div>
            <div className="space-y-2"><Label htmlFor="confirmation">Confirmar nova senha</Label><Input id="confirmation" name="confirmation" type="password" minLength={8} autoComplete="new-password" required /></div>
            {state.error ? <p aria-live="polite" className="text-sm text-destructive">{state.error}</p> : null}
            {state.success ? <p aria-live="polite" className="rounded-md border bg-muted px-3 py-2 text-sm">{state.success}</p> : null}
            {!state.success ? <Button className="w-full" disabled={pending}>{pending ? "Atualizando..." : "Atualizar senha"}</Button> : null}
            <Link href="/login" className="block text-center text-sm underline-offset-4 hover:underline">Voltar ao login</Link>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
