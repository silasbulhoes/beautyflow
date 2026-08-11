"use client";

import { useActionState, useState } from "react";
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
  const [environment, setEnvironment] = useState("sandbox");

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <dl className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Empresa alvo</dt><dd>studio-beautyflow</dd></div>
          <div><dt className="text-muted-foreground">Identidade</dt><dd>Separada por ambiente</dd></div>
          <div><dt className="text-muted-foreground">Critério forte preferido</dt><dd>CPF/CNPJ previamente cadastrado</dd></div>
        </dl>
        <label className="block space-y-1 text-sm">
          <span>Ambiente da conexao</span>
          <select name="environment" required value={environment} onChange={(event) => setEnvironment(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3">
            <option value="sandbox">Sandbox (usar no Preview)</option>
            <option value="production">Producao (usar em Production)</option>
          </select>
          <span className="text-xs text-muted-foreground">Esta seleção vale apenas para validar e armazenar a conexão. Operações financeiras continuam restritas ao ambiente do deployment.</span>
        </label>
        {environment === "production" ? (
          <label className="block space-y-1 text-sm">
            <span>E-mail financeiro esperado em Produção</span>
            <Input name="expectedProductionEmail" type="email" required autoComplete="off" />
            <span className="text-xs text-muted-foreground">No primeiro cadastro, este e-mail deve coincidir com o retornado pelo Asaas. Ele só será salvo após a segunda validação, MFA, confirmação explícita e auditoria.</span>
          </label>
        ) : null}
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
          <dl className="grid gap-2 rounded-lg border p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Ambiente</dt><dd>{state.preview.environment}</dd></div>
            <div><dt className="text-muted-foreground">Status cadastral</dt><dd>{state.preview.identity.registrationStatus}</dd></div>
            <div><dt className="text-muted-foreground">Titular retornado</dt><dd>{state.preview.identity.name || "(não retornado)"}</dd></div>
            <div><dt className="text-muted-foreground">E-mail retornado</dt><dd>{state.preview.identity.email}</dd></div>
            <div><dt className="text-muted-foreground">CPF/CNPJ retornado</dt><dd>{state.preview.identity.cpfCnpj}</dd></div>
            <div><dt className="text-muted-foreground">Comparação</dt><dd>{state.preview.identity.comparison}</dd></div>
          </dl>
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
