"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  submitPrivacyRequest,
  type PrivacyRequestState,
} from "./actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRIVACY_NOTICE_VERSION } from "@/lib/privacy";

const initialState: PrivacyRequestState = {};

export function PrivacyRequestForm() {
  const [state, formAction, pending] =
    useActionState(
      submitPrivacyRequest,
      initialState,
    );

  return (
    <form
      action={formAction}
      className="space-y-5"
    >
      <div
        aria-hidden="true"
        className="absolute -left-[10000px] top-auto size-px overflow-hidden"
      >
        <Label htmlFor="website">
          Website
        </Label>

        <Input
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="requesterName">
          Nome completo
        </Label>

        <Input
          id="requesterName"
          name="requesterName"
          placeholder="Digite seu nome"
          autoComplete="name"
          maxLength={120}
          required
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="requesterEmail">
            E-mail para resposta
          </Label>

          <Input
            id="requesterEmail"
            name="requesterEmail"
            type="email"
            placeholder="voce@exemplo.com"
            autoComplete="email"
            maxLength={160}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="requesterPhone">
            WhatsApp — opcional
          </Label>

          <Input
            id="requesterPhone"
            name="requesterPhone"
            type="tel"
            placeholder="(61) 99999-9999"
            autoComplete="tel"
            maxLength={30}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">
            Você é
          </span>

          <select
            name="requesterRole"
            defaultValue=""
            required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="" disabled>
              Selecione
            </option>

            <option value="client">
              Cliente de um estúdio
            </option>

            <option value="professional">
              Profissional ou estúdio
            </option>

            <option value="other">
              Outra pessoa
            </option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">
            Tipo da solicitação
          </span>

          <select
            name="requestType"
            defaultValue=""
            required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="" disabled>
              Selecione
            </option>

            <option value="confirmation">
              Confirmar existência de dados
            </option>

            <option value="access">
              Acessar meus dados
            </option>

            <option value="correction">
              Corrigir meus dados
            </option>

            <option value="deletion">
              Solicitar exclusão
            </option>

            <option value="anonymization">
              Anonimização ou bloqueio
            </option>

            <option value="sharing_information">
              Informações sobre compartilhamento
            </option>

            <option value="consent_revocation">
              Revogação de consentimento
            </option>

            <option value="other">
              Outra solicitação
            </option>
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyReference">
          Nome do estúdio — opcional
        </Label>

        <Input
          id="companyReference"
          name="companyReference"
          placeholder="Informe o nome do estúdio relacionado"
          maxLength={160}
        />

        <p className="text-xs text-muted-foreground">
          Essa informação ajuda a localizar seus
          dados mais rapidamente.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="details">
          Detalhes da solicitação
        </Label>

        <textarea
          id="details"
          name="details"
          placeholder="Explique quais dados ou atendimentos estão relacionados à sua solicitação."
          minLength={20}
          maxLength={3000}
          required
          className="flex min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />

        <p className="text-xs text-muted-foreground">
          Não envie senhas, número completo de
          cartão ou documentos nesta etapa.
        </p>
      </div>

      <input
        type="hidden"
        name="privacyNoticeVersion"
        value={PRIVACY_NOTICE_VERSION}
      />

      <div className="rounded-lg border bg-muted/40 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
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
            e estou ciente de que os dados deste
            formulário serão utilizados para analisar
            e responder à solicitação.
          </span>
        </label>
      </div>

      <div className="rounded-lg border border-blue-600/20 bg-blue-600/5 p-4 text-sm leading-6 text-muted-foreground">
        Para impedir que dados sejam entregues ou
        alterados por pessoa não autorizada, poderemos
        solicitar informações adicionais para confirmar
        sua identidade.
      </div>

      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={pending}
      >
        {pending
          ? "Enviando solicitação..."
          : "Enviar solicitação"}
      </Button>
    </form>
  );
}