"use client";

import { useActionState } from "react";
import { Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  cancelarAgendamento,
  type AppointmentActionState,
} from "./actions";

type CancelButtonProps = {
  appointmentId: string;
  paymentWasReceived: boolean;
};

const initialState: AppointmentActionState = {};

export function CancelButton({
  appointmentId,
  paymentWasReceived,
}: CancelButtonProps) {
  const action = cancelarAgendamento.bind(
    null,
    appointmentId,
  );

  const [state, formAction, pending] = useActionState(
    action,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="space-y-3"
      onSubmit={(event) => {
        const message = paymentWasReceived
          ? "O sinal já foi pago. O atendimento só será cancelado depois que o Asaas confirmar o estorno. Deseja continuar?"
          : "Deseja realmente cancelar este atendimento? Se houver um checkout de pagamento pendente, ele também será cancelado.";

        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      <Button
        type="submit"
        variant="outline"
        className="w-full text-destructive hover:text-destructive"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Cancelando...
          </>
        ) : (
          <>
            <XCircle className="size-4" />
            Cancelar atendimento
          </>
        )}
      </Button>

      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
