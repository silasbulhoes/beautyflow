"use client";

import {
  CheckCircle2,
  KeyRound,
  Loader2,
} from "lucide-react";
import { useActionState } from "react";

import {
  criarChavePix,
  type FinancialAccountState,
} from "./actions";

import { Button } from "@/components/ui/button";

const initialState: FinancialAccountState = {};

export function PixKeyButton() {
  const [state, formAction, pending] =
    useActionState(
      criarChavePix,
      initialState,
    );

  return (
    <form action={formAction} className="space-y-3">
      <Button
        type="submit"
        className="w-full"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Configurando Pix...
          </>
        ) : (
          <>
            <KeyRound className="size-4" />
            Configurar chave Pix
          </>
        )}
      </Button>

      {state.success ? (
        <div className="rounded-lg border border-green-600/30 bg-green-600/10 p-3 text-sm text-green-700">
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-4" />
            {state.success}
          </p>
        </div>
      ) : null}

      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}