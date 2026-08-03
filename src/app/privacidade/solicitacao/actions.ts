"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";

import { PRIVACY_NOTICE_VERSION } from "@/lib/privacy";
import { createAdminClient } from "@/lib/supabase/admin";

export type PrivacyRequestState = {
  error?: string;
};

const allowedRequesterRoles = [
  "client",
  "professional",
  "other",
] as const;

const allowedRequestTypes = [
  "confirmation",
  "access",
  "correction",
  "deletion",
  "anonymization",
  "sharing_information",
  "consent_revocation",
  "other",
] as const;

function normalizeText(
  value: FormDataEntryValue | null,
  maximumLength: number,
) {
  return String(value ?? "")
    .trim()
    .slice(0, maximumLength);
}

function normalizeEmail(
  value: FormDataEntryValue | null,
) {
  return normalizeText(value, 160).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

function isAllowedValue<T extends readonly string[]>(
  value: string,
  allowedValues: T,
): value is T[number] {
  return allowedValues.includes(
    value as T[number],
  );
}

function createProtocol() {
  const dateKey = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");

  const randomPart = randomUUID()
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase();

  return `BF-${dateKey}-${randomPart}`;
}

export async function submitPrivacyRequest(
  _previousState: PrivacyRequestState,
  formData: FormData,
): Promise<PrivacyRequestState> {
  const honeypot = normalizeText(
    formData.get("website"),
    200,
  );

  if (honeypot) {
    return {
      error:
        "Não foi possível enviar a solicitação.",
    };
  }

  const requesterName = normalizeText(
    formData.get("requesterName"),
    120,
  );

  const requesterEmail = normalizeEmail(
    formData.get("requesterEmail"),
  );

  const requesterPhone = normalizeText(
    formData.get("requesterPhone"),
    30,
  );

  const requesterRole = normalizeText(
    formData.get("requesterRole"),
    40,
  );

  const requestType = normalizeText(
    formData.get("requestType"),
    50,
  );

  const companyReference = normalizeText(
    formData.get("companyReference"),
    160,
  );

  const details = normalizeText(
    formData.get("details"),
    3000,
  );

  const privacyAcknowledged =
    formData.get("privacyAcknowledged") === "on";

  const privacyNoticeVersion = normalizeText(
    formData.get("privacyNoticeVersion"),
    40,
  );

  if (requesterName.length < 3) {
    return {
      error: "Informe seu nome completo.",
    };
  }

  if (!isValidEmail(requesterEmail)) {
    return {
      error:
        "Informe um endereço de e-mail válido.",
    };
  }

  if (
    !isAllowedValue(
      requesterRole,
      allowedRequesterRoles,
    )
  ) {
    return {
      error:
        "Selecione sua relação com o BeautyFlow.",
    };
  }

  if (
    !isAllowedValue(
      requestType,
      allowedRequestTypes,
    )
  ) {
    return {
      error:
        "Selecione o tipo da solicitação.",
    };
  }

  if (details.length < 20) {
    return {
      error:
        "Explique sua solicitação com pelo menos 20 caracteres.",
    };
  }

  if (
    !privacyAcknowledged ||
    privacyNoticeVersion !==
      PRIVACY_NOTICE_VERSION
  ) {
    return {
      error:
        "Confirme a ciência do Aviso de Privacidade.",
    };
  }

  const supabase = createAdminClient();

  for (
    let attempt = 0;
    attempt < 3;
    attempt += 1
  ) {
    const protocol = createProtocol();

    const { error } = await supabase
      .from("privacy_requests")
      .insert({
        protocol,
        requester_name: requesterName,
        requester_email: requesterEmail,
        requester_phone:
          requesterPhone || null,
        requester_role: requesterRole,
        request_type: requestType,
        company_reference:
          companyReference || null,
        details,
        status: "received",
        identity_verified: false,
        privacy_notice_version:
          PRIVACY_NOTICE_VERSION,
        privacy_notice_acknowledged_at:
          new Date().toISOString(),
      });

    if (!error) {
      redirect(
        `/privacidade/solicitacao?enviado=1&protocolo=${encodeURIComponent(
          protocol,
        )}`,
      );
    }

    if (error.code !== "23505") {
      console.error(
        "Erro ao registrar solicitação de privacidade:",
        {
          code: error.code,
          message: error.message,
        },
      );

      return {
        error:
          "Não foi possível registrar sua solicitação. Tente novamente em alguns instantes.",
      };
    }
  }

  return {
    error:
      "Não foi possível gerar o protocolo. Tente novamente.",
  };
}