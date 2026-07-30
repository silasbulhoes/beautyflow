"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { createAsaasCheckout } from "./actions";

type PaymentButtonProps = {
  appointmentId: string;
  slug: string;
};

const initialState = {
  error: "",
};

export function PaymentButton({
  appointmentId,
  slug,
}: PaymentButtonProps) {
  const [state, formAction, pending] = useActionState(
    createAsaasCheckout,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input
        type="hidden"
        name="appointmentId"
        value={appointmentId}
      />

      <input type="hidden" name="slug" value={slug} />

      <Button
        type="submit"
        className="w-full"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Abrindo pagamento...
          </>
        ) : (
          "Pagar sinal com Pix ou cartão"
        )}
      </Button>

      {state.error ? (
        <p className="text-center text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}