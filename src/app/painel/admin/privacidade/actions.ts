"use server";

import {
  revalidatePath,
} from "next/cache";
import { redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const allowedStatuses = [
  "received",
  "verifying_identity",
  "in_review",
  "awaiting_information",
  "completed",
  "denied",
] as const;

const allowedResponseChannels = [
  "email",
  "whatsapp",
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

function isAllowedValue<
  T extends readonly string[],
>(
  value: string,
  allowedValues: T,
): value is T[number] {
  return allowedValues.includes(
    value as T[number],
  );
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function requireAdministrator() {
  const authenticatedSupabase =
    await createClient();

  const {
    data: { user },
  } = await authenticatedSupabase.auth.getUser();

  if (
    !user ||
    !isAdminEmail(user.email)
  ) {
    redirect("/painel");
  }

  return user;
}

export async function updatePrivacyRequest(
  formData: FormData,
) {
  const user = await requireAdministrator();

  const requestId = normalizeText(
    formData.get("requestId"),
    50,
  );

  const status = normalizeText(
    formData.get("status"),
    50,
  );

  const identityVerified =
    formData.get("identityVerified") === "on";

  const internalNotes = normalizeText(
    formData.get("internalNotes"),
    5000,
  );

  const responseSummary = normalizeText(
    formData.get("responseSummary"),
    5000,
  );

  const responseChannel = normalizeText(
    formData.get("responseChannel"),
    30,
  );

  if (!isValidUuid(requestId)) {
    redirect(
      "/painel/admin/privacidade?erro=solicitacao",
    );
  }

  if (
    !isAllowedValue(
      status,
      allowedStatuses,
    )
  ) {
    redirect(
      `/painel/admin/privacidade/${requestId}?erro=status`,
    );
  }

  const isFinalStatus =
    status === "completed" ||
    status === "denied";

  if (
    responseChannel &&
    !isAllowedValue(
      responseChannel,
      allowedResponseChannels,
    )
  ) {
    redirect(
      `/painel/admin/privacidade/${requestId}?erro=resposta`,
    );
  }

  if (
    isFinalStatus &&
    responseSummary.length < 10
  ) {
    redirect(
      `/painel/admin/privacidade/${requestId}?erro=resposta`,
    );
  }

  if (
    isFinalStatus &&
    !responseChannel
  ) {
    redirect(
      `/painel/admin/privacidade/${requestId}?erro=resposta`,
    );
  }

  const now = new Date().toISOString();

  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("privacy_requests")
    .update({
      status,
      identity_verified:
        identityVerified,
      identity_verified_at:
        identityVerified ? now : null,
      internal_notes:
        internalNotes || null,
      response_summary:
        responseSummary || null,
      response_channel:
        responseChannel || null,
      responded_at:
        isFinalStatus ? now : null,
      handled_by_email:
        user.email ?? null,
      updated_at: now,
    })
    .eq("id", requestId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error(
      "Erro ao atualizar solicitação LGPD:",
      {
        code: error?.code,
        message: error?.message,
      },
    );

    redirect(
      `/painel/admin/privacidade/${requestId}?erro=salvar`,
    );
  }

  revalidatePath(
    "/painel/admin/privacidade",
  );

  revalidatePath(
    `/painel/admin/privacidade/${requestId}`,
  );

  redirect(
    `/painel/admin/privacidade/${requestId}?salvo=1`,
  );
}