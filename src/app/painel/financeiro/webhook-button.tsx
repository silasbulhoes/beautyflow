"use client";

import {
  CheckCircle2,
  Loader2,
  RadioTower,
} from "lucide-react";
import { useActionState } from "react";

import {
  configurarWebhookFinanceiro,
  type FinancialWebhookState,
} from "./webhook-actions";

import { Button } from "@/components/ui/button";

const initialState: FinancialWebhookState = {};

export function WebhookButton() {
  const [state, formAction, pending] =
    useActionState(
      configurarWebhookFinanceiro,
      initialState,
    );

  return (
    <form action={formAction} className="space-y-3">
      <Button
        type="submit"
        variant="outline"
        className="w-full"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Configurando webhook...
          </>
        ) : (
          <>
            <RadioTower className="size-4" />
            Configurar confirmação automática
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