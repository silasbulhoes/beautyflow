"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  confirmarAgendamento,
  type ConfirmationState,
} from "./actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRIVACY_NOTICE_VERSION } from "@/lib/privacy";

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

  const [state, formAction, pending] =
    useActionState(action, initialState);

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
        <Label htmlFor="cpfCnpj">CPF</Label>

        <Input
          id="cpfCnpj"
          name="cpfCnpj"
          inputMode="numeric"
          placeholder="000.000.000-00"
          autoComplete="off"
          maxLength={14}
          required
        />

        <p className="text-xs text-muted-foreground">
          Necessário para gerar o pagamento no Asaas.
        </p>
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
        <Label htmlFor="email">
          E-mail — opcional
        </Label>

        <Input
          id="email"
          name="email"
          type="email"
          placeholder="voce@exemplo.com"
          autoComplete="email"
        />
      </div>

      <input
        type="hidden"
        name="privacyNoticeVersion"
        value={PRIVACY_NOTICE_VERSION}
      />

      <div className="rounded-lg border bg-muted/40 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            id="privacyAcknowledged"
            name="privacyAcknowledged"
            type="checkbox"
            required
            className="mt-1 size-4 shrink-0 accent-current"
          />

          <span className="text-sm leading-6 text-muted-foreground">
            Li o{" "}
            <Link
              href="/privacidade"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline underline-offset-4"
            >
              Aviso de Privacidade
            </Link>{" "}
            e estou ciente de que meus dados serão
            utilizados para realizar o agendamento,
            processar o pagamento e permitir as
            comunicações relacionadas ao atendimento.
          </span>
        </label>
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