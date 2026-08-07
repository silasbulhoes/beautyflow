"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AppointmentActionState,
  registrarReembolsoManual,
} from "./actions";

const initialState: AppointmentActionState = {};

export function ManualRefundForm({ appointmentId }: { appointmentId: string }) {
  const action = registrarReembolsoManual.bind(null, appointmentId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div>
        <h3 className="font-medium">Registrar reembolso manual</h3>
        <p className="text-sm text-muted-foreground">
          Use somente depois de devolver o valor fora do BeautyFlow. Esta ação não chama o Asaas e cancela o atendimento em uma transação auditável.
        </p>
      </div>
      <label className="block space-y-1 text-sm">
        <span>Observação e forma de devolução</span>
        <textarea name="observation" required minLength={10} maxLength={1000} className="min-h-24 w-full rounded-lg border bg-background p-2" />
      </label>
      <label className="block space-y-1 text-sm">
        <span>URL HTTPS do comprovante (opcional)</span>
        <Input name="receiptUrl" type="url" inputMode="url" />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Digite exatamente: <strong>CONFIRMAR REEMBOLSO MANUAL</strong></span>
        <Input name="confirmation" required autoComplete="off" />
      </label>
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Registrando..." : "Confirmar reembolso manual"}
      </Button>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
    </form>
  );
}
