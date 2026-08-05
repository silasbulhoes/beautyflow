"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ReconnectValidationState,
  validarReconexaoAsaas,
} from "./actions";

const initialState: ReconnectValidationState = {};

export function ReconnectForm() {
  const [state, action, pending] = useActionState(
    validarReconexaoAsaas,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Nome empresarial esperado</span>
          <Input name="expectedName" required autoComplete="off" />
        </label>
        <label className="space-y-1 text-sm">
          <span>E-mail financeiro esperado</span>
          <Input
            name="expectedEmail"
            type="email"
            required
            defaultValue="170114317@aluno.unb.br"
            autoComplete="off"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Account ID esperado</span>
          <Input name="expectedAccountId" required autoComplete="off" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Wallet ID esperado</span>
          <Input name="expectedWalletId" required autoComplete="off" />
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span>Nova chave de API da conta existente</span>
        <Input
          name="apiKey"
          type="password"
          required
          autoComplete="new-password"
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Esta etapa faz apenas GET em dados comerciais e carteira. A chave fica
        somente na requisição e não é salva, exibida ou registrada.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Validando..." : "Validar sem salvar"}
      </Button>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-700">{state.success}</p>
      ) : null}
      {state.identity ? (
        <dl className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Nome retornado</dt><dd>{state.identity.name || "Não retornado"}</dd></div>
          <div><dt className="text-muted-foreground">E-mail retornado</dt><dd>{state.identity.email || "Não retornado"}</dd></div>
          <div><dt className="text-muted-foreground">Account ID retornado</dt><dd>{state.identity.accountId || "Não retornado"}</dd></div>
          <div><dt className="text-muted-foreground">Wallet ID retornado</dt><dd>{state.identity.walletId || "Não retornado"}</dd></div>
        </dl>
      ) : null}
    </form>
  );
}
