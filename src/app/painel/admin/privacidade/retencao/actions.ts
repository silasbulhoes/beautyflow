"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RetentionResult = {
  run_id: string;
  anonymized_clients: number;
  cutoff_date: string;
};

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

export async function runPrivacyRetention(
  formData: FormData,
) {
  const user = await requireAdministrator();

  const confirmation = String(
    formData.get("confirmation") ?? "",
  )
    .trim()
    .toUpperCase();

  if (confirmation !== "ANONIMIZAR") {
    redirect(
      "/painel/admin/privacidade/retencao?erro=confirmacao",
    );
  }

  const adminSupabase = createAdminClient();

  const { data, error } =
    await adminSupabase.rpc(
      "run_privacy_retention",
      {
        p_days: 90,
        p_handled_by_email:
          user.email ?? "administrador",
      },
    );

  if (error) {
    console.error(
      "Erro ao executar retenção LGPD:",
      {
        code: error.code,
        message: error.message,
      },
    );

    redirect(
      "/painel/admin/privacidade/retencao?erro=execucao",
    );
  }

  const result = (
    Array.isArray(data)
      ? data[0]
      : data
  ) as RetentionResult | null;

  const anonymizedClients = Number(
    result?.anonymized_clients ?? 0,
  );

  revalidatePath(
    "/painel/admin/privacidade/retencao",
  );

  revalidatePath(
    "/painel/clientes",
  );

  revalidatePath(
    "/painel/agenda",
  );

  redirect(
    `/painel/admin/privacidade/retencao?executado=1&quantidade=${anonymizedClients}`,
  );
}