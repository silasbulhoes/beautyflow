"use client";

import { useActionState } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  remarcarAgendamento,
  type RescheduleState,
} from "./actions";

type RescheduleFormProps = {
  appointmentId: string;
  appointmentDate: string;
  schedules: Array<{
    id: string;
    start_time: string;
    end_time: string;
  }>;
};

const initialState: RescheduleState = {};

function formatTime(value: string) {
  return value.slice(0, 5);
}

export function RescheduleForm({
  appointmentId,
  appointmentDate,
  schedules,
}: RescheduleFormProps) {
  const action = remarcarAgendamento.bind(
    null,
    appointmentId,
  );

  const [state, formAction, pending] = useActionState(
    action,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="appointmentDate"
        value={appointmentDate}
      />

      <div className="space-y-3">
        <p className="text-sm font-medium">
          Escolha o novo horário
        </p>

        {schedules.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-5 text-center">
            <p className="font-medium">
              Nenhum horário disponível.
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Escolha outra data.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {schedules.map((schedule) => (
              <label
                key={schedule.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-4 hover:bg-muted"
              >
                <input
                  type="radio"
                  name="scheduleId"
                  value={schedule.id}
                  required
                />

                <span className="font-medium">
                  {formatTime(schedule.start_time)}
                  {" às "}
                  {formatTime(schedule.end_time)}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={pending || schedules.length === 0}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Remarcando...
          </>
        ) : (
          <>
            <CalendarCheck className="size-4" />
            Confirmar remarcação
          </>
        )}
      </Button>
    </form>
  );
}