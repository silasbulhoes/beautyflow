"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { alterarIsencao } from "./actions";

export function ExemptionButton({ companyId, exempt }: { companyId: string; exempt: boolean }) {
  const [pending, startTransition] = useTransition();
  return <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => {
    const impact = exempt ? "A empresa voltará ao estado pendente, sem cobrança automática até ativação administrativa." : "A empresa ficará isenta e nenhuma assinatura ou mensalidade poderá ser criada.";
    if (!window.confirm(`${impact} Deseja continuar?`)) return;
    startTransition(() => { void alterarIsencao(companyId, !exempt); });
  }}>{pending ? "Salvando..." : exempt ? "Remover isenção" : "Marcar como isenta"}</Button>;
}
