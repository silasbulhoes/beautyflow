"use client";

import { useActionState } from "react";

import {
  confirmarAgendamento,
  type ConfirmationState,
} from "./actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConfirmationFormProps = {
  slug: string;
  serviceId: string;
  scheduleId: string;
  appointmentDate: string;
};

const initialState: ConfirmationState = {};

export function ConfirmationForm({
  slug,
  serviceId,
  scheduleId,
  appointmentDate,
}: ConfirmationFormProps) {
  const action = confirmarAgendamento.bind(
    null,
    slug,
    serviceId,
    scheduleId,
    appointmentDate,
  );

  const [state, formAction, pending] = useActionState(
    action,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Nome completo</Label>

        <Input
          id="name"
          name="name"
          placeholder="Digite seu nome"
          autoComplete="name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">WhatsApp</Label>

        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="(61) 99999-9999"
          autoComplete="tel"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail — opcional</Label>

        <Input
          id="email"
          name="email"
          type="email"
          placeholder="voce@exemplo.com"
          autoComplete="email"
        />
      </div>

      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={pending}
      >
        {pending
          ? "Criando agendamento..."
          : "Continuar para pagamento"}
      </Button>
    </form>
  );
}