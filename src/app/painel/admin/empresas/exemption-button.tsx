"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { concederIsencao, removerIsencao } from "./actions";
import type { ExemptionActionState } from "./actions";

const initialState: ExemptionActionState = {};

export function ExemptionButton({ companyId, exempt }: { companyId: string; exempt: boolean }) {
  const [grantState, grantAction, grantPending] = useActionState(concederIsencao, initialState);
  const [revokeState, revokeAction, revokePending] = useActionState(removerIsencao, initialState);
  const state = exempt ? revokeState : grantState;

  return (
    <details className="rounded-md border p-3">
      <summary className="cursor-pointer font-medium">{exempt ? "Remover isenção" : "Conceder isenção"}</summary>
      <form action={exempt ? revokeAction : grantAction} className="mt-4 grid max-w-xl gap-3">
        <input type="hidden" name="companyId" value={companyId} />
        {!exempt ? <div className="grid gap-1"><Label htmlFor={`plan-${companyId}`}>Plano gratuito concedido</Label><select id={`plan-${companyId}`} name="planCode" required className="h-9 rounded-md border bg-background px-3 text-sm"><option value="free">Free</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div> : null}
        <div className="grid gap-1"><Label htmlFor={`reason-${companyId}`}>Motivo</Label><Textarea id={`reason-${companyId}`} name="reason" minLength={5} maxLength={500} required /></div>
        {!exempt ? <div className="grid gap-1"><Label htmlFor={`ends-${companyId}`}>Data final (opcional)</Label><Input id={`ends-${companyId}`} name="endsAt" type="date" /><p className="text-xs text-muted-foreground">Sem data final, a isenção será permanente até remoção manual.</p></div> : <p className="text-xs text-muted-foreground">A mensalidade ficará pendente e desativada. Nenhuma cobrança será criada.</p>}
        <div className="grid gap-1"><Label htmlFor={`confirm-${companyId}`}>Digite {exempt ? "REMOVER ISENÇÃO" : "CONCEDER ISENÇÃO"}</Label><Input id={`confirm-${companyId}`} name="confirmation" required autoComplete="off" /></div>
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
        <Button type="submit" size="sm" variant="outline" disabled={grantPending || revokePending}>{grantPending || revokePending ? "Salvando..." : exempt ? "Remover isenção" : "Conceder isenção"}</Button>
      </form>
    </details>
  );
}
