"use client";

import { useActionState } from "react";

import { criarServico, type ServiceState } from "./actions";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ServiceState = {};

export function ServiceForm() {
  const [state, formAction, pending] = useActionState(
    criarServico,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo serviço</CardTitle>

        <CardDescription>
          Informe o preço, a duração e o valor do sinal.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do serviço</Label>

            <Input
              id="name"
              name="name"
              placeholder="Ex.: Alongamento em gel"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>

            <Textarea
              id="description"
              name="description"
              placeholder="Descreva o serviço"
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
                defaultValue="120"
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
                placeholder="180,00"
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
                defaultValue="30"
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

          <Button type="submit" disabled={pending}>
            {pending ? "Cadastrando..." : "Cadastrar serviço"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}