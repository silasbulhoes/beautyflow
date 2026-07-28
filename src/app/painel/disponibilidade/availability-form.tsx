"use client";

import { useActionState } from "react";

import {
  adicionarHorario,
  type AvailabilityState,
} from "./actions";

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

const initialState: AvailabilityState = {};

export function AvailabilityForm() {
  const [state, formAction, pending] = useActionState(
    adicionarHorario,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adicionar período</CardTitle>

        <CardDescription>
          Escolha um dia da semana e informe o início e o fim do atendimento.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="weekday">Dia da semana</Label>

            <select
              id="weekday"
              name="weekday"
              defaultValue="1"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              required
            >
              <option value="0">Domingo</option>
              <option value="1">Segunda-feira</option>
              <option value="2">Terça-feira</option>
              <option value="3">Quarta-feira</option>
              <option value="4">Quinta-feira</option>
              <option value="5">Sexta-feira</option>
              <option value="6">Sábado</option>
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startTime">Horário inicial</Label>

              <Input
                id="startTime"
                name="startTime"
                type="time"
                defaultValue="08:00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">Horário final</Label>

              <Input
                id="endTime"
                name="endTime"
                type="time"
                defaultValue="10:00"
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
            {pending ? "Adicionando..." : "Adicionar horário"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}