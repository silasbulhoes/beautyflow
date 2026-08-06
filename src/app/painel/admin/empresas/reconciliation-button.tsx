"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  AdminReconciliationState,
  reconciliarPagamentosPendentesAdmin,
} from "./actions";

const initialState: AdminReconciliationState = {};

export function ReconciliationButton() {
  const [state, action, pending] = useActionState(
    reconciliarPagamentosPendentesAdmin,
    initialState,
  );

  return (
    <form action={action} className="space-y-2">
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        onClick={(event) => {
          if (
            !window.confirm(
              "Reconciliar até 100 pagamentos pendentes com o Asaas agora?",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        {pending ? "Reconciliando..." : "Reconciliar pagamentos pendentes"}
      </Button>
      {state.error ? (
        <p className="max-w-md text-xs text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="max-w-md text-xs text-emerald-700">{state.success}</p>
      ) : null}
    </form>
  );
}
