"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCompanyAsaasCredentials } from "@/lib/asaas/company-client";
import { asaasRequest } from "@/lib/asaas/request";
import { createClient } from "@/lib/supabase/server";

export type FinancialWebhookState = {
  error?: string;
  success?: string;
};

type AsaasWebhook = {
  id?: string;
  name?: string;
  url?: string;
  enabled?: boolean;
  interrupted?: boolean;
};

type AsaasWebhookListResponse = {
  data?: AsaasWebhook[];
};

const WEBHOOK_NAME = "BeautyFlow Pagamentos";

const PAYMENT_EVENTS = [
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_REFUNDED",
  "PAYMENT_DELETED",
  "PAYMENT_OVERDUE",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
];

function getWebhookConfiguration(email: string) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  const authToken =
    process.env.ASAAS_WEBHOOK_TOKEN?.trim();

  if (!appUrl) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL não foi configurada.",
    );
  }

  if (!authToken || authToken.length < 32) {
    throw new Error(
      "ASAAS_WEBHOOK_TOKEN precisa ter pelo menos 32 caracteres.",
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(appUrl);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_APP_URL possui um endereço inválido.",
    );
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error(
      "O webhook precisa utilizar um endereço HTTPS.",
    );
  }

  const webhookUrl =
    `${parsedUrl.origin}/api/webhooks/asaas`;

  return {
    webhookUrl,
    payload: {
      name: WEBHOOK_NAME,
      url: webhookUrl,
      email,
      enabled: true,
      interrupted: false,
      apiVersion: 3,
      authToken,
      sendType: "SEQUENTIALLY",
      events: PAYMENT_EVENTS,
    },
  };
}

export async function configurarWebhookFinanceiro(
  _previousState: FinancialWebhookState,
  _formData: FormData,
): Promise<FinancialWebhookState> {
  void _previousState;
  void _formData;

  const authenticatedSupabase =
    await createClient();

  const {
    data: { user },
  } = await authenticatedSupabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.email) {
    return {
      error:
        "Sua conta do BeautyFlow não possui um e-mail válido.",
    };
  }

  const { data: profile } =
    await authenticatedSupabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

  if (!profile?.company_id) {
    return {
      error:
        "Não foi possível identificar sua empresa.",
    };
  }

  let credentials: Awaited<
    ReturnType<typeof getCompanyAsaasCredentials>
  >;

  try {
    credentials =
      await getCompanyAsaasCredentials(
        profile.company_id,
      );
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível acessar a conta financeira.",
    };
  }

  if (!credentials.usingSubaccount) {
    return {
      error:
        "A empresa ainda não possui uma subconta Asaas conectada.",
    };
  }

  let configuration: ReturnType<
    typeof getWebhookConfiguration
  >;

  try {
    configuration =
      getWebhookConfiguration(user.email);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível preparar o webhook.",
    };
  }

  try {
    const webhookList =
      await asaasRequest<AsaasWebhookListResponse>({
        apiUrl: credentials.apiUrl,
        apiKey: credentials.apiKey,
        path: "/webhooks?offset=0&limit=100",
        method: "GET",
      });

    const webhooks = Array.isArray(
      webhookList.data,
    )
      ? webhookList.data
      : [];

    const existingWebhook = webhooks.find(
      (webhook) =>
        webhook.name === WEBHOOK_NAME ||
        webhook.url ===
          configuration.webhookUrl,
    );

    if (existingWebhook?.id) {
      await asaasRequest<Record<string, unknown>>({
        apiUrl: credentials.apiUrl,
        apiKey: credentials.apiKey,
        path: `/webhooks/${existingWebhook.id}`,
        method: "PUT",
        body: configuration.payload,
      });

      revalidatePath("/painel/financeiro");

      return {
        success:
          "Webhook da subconta atualizado e ativado.",
      };
    }

    await asaasRequest<Record<string, unknown>>({
      apiUrl: credentials.apiUrl,
      apiKey: credentials.apiKey,
      path: "/webhooks",
      method: "POST",
      body: configuration.payload,
    });

    revalidatePath("/painel/financeiro");

    return {
      success:
        "Webhook automático criado na subconta.",
    };
  } catch (error) {
    console.error(
      "Erro ao configurar webhook da subconta:",
      error instanceof Error
        ? error.message
        : "Erro desconhecido",
    );

    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível configurar o webhook.",
    };
  }
}