"use client";

import {
  CheckCircle2,
  FlaskConical,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
} from "react";

import {
  simularPagamentoSandbox,
  type SandboxPaymentState,
} from "./sandbox-payment-actions";

import { Button } from "@/components/ui/button";

type SandboxPaymentButtonProps = {
  appointmentId: string;
  slug: string;
};

const initialState: SandboxPaymentState = {};

export function SandboxPaymentButton({
  appointmentId,
  slug,
}: SandboxPaymentButtonProps) {
  const router = useRouter();

  const [state, formAction, pending] =
    useActionState(
      simularPagamentoSandbox,
      initialState,
    );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form
      action={formAction}
      className="mt-4 space-y-3"
    >
      <input
        type="hidden"
        name="appointmentId"
        value={appointmentId}
      />

      <input
        type="hidden"
        name="slug"
        value={slug}
      />

      <div className="rounded-lg border border-blue-600/30 bg-blue-600/10 p-4">
        <p className="flex items-center gap-2 font-medium text-blue-700">
          <FlaskConical className="size-4" />
          Ferramenta de teste
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          Use somente depois de gerar o Pix no checkout do
          Asaas Sandbox.
        </p>

        <Button
          type="submit"
          variant="outline"
          className="mt-4 w-full"
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Simulando pagamento...
            </>
          ) : (
            <>
              <FlaskConical className="size-4" />
              Simular pagamento no Sandbox
            </>
          )}
        </Button>
      </div>

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