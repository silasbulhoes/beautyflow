"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ReconnectValidationState,
  ReconnectPersistenceState,
  persistirReconexaoAsaas,
  validarReconexaoAsaas,
} from "./actions";

const initialState: ReconnectValidationState = {};
const approvalPhrase = "RECONectar STUDIO BEAUTYFLOW";

function PersistenceForm({ approvalToken }: { approvalToken: string }) {
  const persistenceInitialState: ReconnectPersistenceState = {};
  const [state, action, pending] = useActionState(
    persistirReconexaoAsaas,
    persistenceInitialState,
  );

  return (
    <form action={action} className="space-y-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <input type="hidden" name="approvalToken" value={approvalToken} />
      <label className="flex items-start gap-2 text-sm">
        <input name="confirmed" value="yes" type="checkbox" required className="mt-1" />
        <span>Confirmo que revisei os valores atuais, os novos valores e o impacto de remover IDs antigos não comprovados.</span>
      </label>
      <label className="block space-y-1 text-sm">
        <span>Digite exatamente: <strong>{approvalPhrase}</strong></span>
        <Input name="confirmation" required autoComplete="off" />
      </label>
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Validando novamente..." : "Aprovar e persistir reconexão"}
      </Button>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
    </form>
  );
}

export function ReconnectForm() {
  const [state, action, pending] = useActionState(validarReconexaoAsaas, initialState);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <dl className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Empresa alvo</dt><dd>studio-beautyflow</dd></div>
          <div><dt className="text-muted-foreground">Nome esperado</dt><dd>SILAS RIBEIRO BULHOES DE SOUZA</dd></div>
          <div><dt className="text-muted-foreground">E-mail esperado</dt><dd>170114317@aluno.unb.br</dd></div>
        </dl>
        <label className="block space-y-1 text-sm">
          <span>Ambiente da conexao</span>
          <select name="environment" required defaultValue="sandbox" className="h-10 w-full rounded-md border bg-background px-3">
            <option value="sandbox">Sandbox (usar no Preview)</option>
            <option value="production">Producao (usar em Production)</option>
          </select>
          <span className="text-xs text-muted-foreground">O servidor recusara o ambiente que nao coincidir com ASAAS_ENVIRONMENT deste deployment.</span>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Nova chave de API da conta existente</span>
          <Input name="apiKey" type="password" required autoComplete="new-password" />
        </label>
        <p className="text-xs text-muted-foreground">
          A chave é validada diretamente no Asaas e transformada em um token autenticado com validade de dez minutos. Ela não é salva nesta etapa nem registrada em logs.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Preparando prévia..." : "Validar e preparar prévia"}
        </Button>
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
      </form>

      {state.preview ? (
        <div className="space-y-4">
          <h3 className="font-semibold">Prévia obrigatória — nenhuma escrita realizada</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            <dl className="space-y-2 rounded-lg border p-4 text-sm">
              <dt className="font-medium">Valores atuais</dt>
              <div><dt className="text-muted-foreground">Chave</dt><dd>{state.preview.current.apiKey}</dd></div>
              <div><dt className="text-muted-foreground">Account ID</dt><dd>{state.preview.current.accountId}</dd></div>
              <div><dt className="text-muted-foreground">Wallet ID</dt><dd>{state.preview.current.walletId}</dd></div>
              <div><dt className="text-muted-foreground">Status</dt><dd>{state.preview.current.status}</dd></div>
            </dl>
            <dl className="space-y-2 rounded-lg border p-4 text-sm">
              <dt className="font-medium">Novos valores validados</dt>
              <div><dt className="text-muted-foreground">Chave</dt><dd>{state.preview.next.apiKey}</dd></div>
              <div><dt className="text-muted-foreground">Account ID</dt><dd>{state.preview.next.accountId}</dd></div>
              <div><dt className="text-muted-foreground">Wallet ID</dt><dd>{state.preview.next.walletId}</dd></div>
              <div><dt className="text-muted-foreground">Status</dt><dd>{state.preview.next.status}</dd></div>
              <div><dt className="text-muted-foreground">Ambiente</dt><dd>{state.preview.environment}</dd></div>
            </dl>
          </div>
          <div className="rounded-lg border p-4 text-sm">
            <p className="font-medium">UPDATE que será executado</p>
            <code className="mt-2 block overflow-x-auto whitespace-pre-wrap break-all">{state.preview.updateStatement}</code>
          </div>
          <p className="text-sm text-amber-800">
            Como a API não comprovou accountId e walletId, os valores antigos serão definidos como NULL. Checkouts continuarão funcionando com a chave criptografada; recursos futuros que dependam de walletId, como split, deverão aguardar a recuperação oficial desse identificador.
          </p>
          {state.approvalToken ? <PersistenceForm approvalToken={state.approvalToken} /> : null}
        </div>
      ) : null}
    </div>
  );
}
