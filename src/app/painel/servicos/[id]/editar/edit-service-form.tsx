"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
    editarServico,
    type ServiceState,
  } from "../../actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type EditServiceFormProps = {
  service: {
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    price_cents: number;
    deposit_percentage: number;
  };
};

const initialState: ServiceState = {};

export function EditServiceForm({
  service,
}: EditServiceFormProps) {
  const editarServicoComId = editarServico.bind(
    null,
    service.id,
  );

  const [state, formAction, pending] = useActionState(
    editarServicoComId,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do serviço</Label>

        <Input
          id="name"
          name="name"
          defaultValue={service.name}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>

        <Textarea
          id="description"
          name="description"
          defaultValue={service.description ?? ""}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="durationMinutes">
            Duração em minutos
          </Label>

          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min="1"
            defaultValue={service.duration_minutes}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Preço em reais</Label>

          <Input
            id="price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={(service.price_cents / 100).toFixed(2)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="depositPercentage">
            Sinal em %
          </Label>

          <Input
            id="depositPercentage"
            name="depositPercentage"
            type="number"
            min="0"
            max="100"
            defaultValue={service.deposit_percentage}
            required
          />
        </div>
      </div>

      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-md border border-green-600/30 bg-green-600/10 px-3 py-2 text-sm text-green-700">
          {state.success}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>

        <Button type="button" variant="outline">
          <Link href="/painel/servicos">
            Voltar
          </Link>
        </Button>
      </div>
    </form>
  );
}