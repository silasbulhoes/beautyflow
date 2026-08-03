import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

function loadEnvironmentFile() {
  const filePath = path.resolve(process.cwd(), ".env.local");

  if (!fs.existsSync(filePath)) {
    throw new Error(
      "O arquivo .env.local não foi encontrado.",
    );
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (
      !trimmedLine ||
      trimmedLine.startsWith("#") ||
      !trimmedLine.includes("=")
    ) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    const key = trimmedLine
      .slice(0, separatorIndex)
      .trim();

    let value = trimmedLine
      .slice(separatorIndex + 1)
      .trim();

    if (
      (value.startsWith('"') &&
        value.endsWith('"')) ||
      (value.startsWith("'") &&
        value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Corrige o escape usado no PowerShell para chaves $aact.
    value = value.replace(/^\\\$/, "$");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requiredEnvironmentVariable(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `A variável ${name} não foi configurada.`,
    );
  }

  return value;
}

function encryptSecret(value, encodedKey) {
  const key = Buffer.from(encodedKey, "base64");

  if (key.length !== 32) {
    throw new Error(
      "SUBACCOUNT_ENCRYPTION_KEY precisa ter 32 bytes em Base64.",
    );
  }

  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    key,
    iv,
    {
      authTagLength: 16,
    },
  );

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const authenticationTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64"),
    authenticationTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

async function readJsonResponse(response) {
  return response.json().catch(() => ({}));
}

function getAsaasErrorMessage(data, status) {
  const descriptions = Array.isArray(data?.errors)
    ? data.errors
        .map((error) => error?.description)
        .filter(Boolean)
    : [];

  if (descriptions.length > 0) {
    return descriptions.join(" ");
  }

  return (
    data?.message ??
    data?.description ??
    data?.error ??
    `Erro HTTP ${status}.`
  );
}

async function main() {
  loadEnvironmentFile();

  const email = process.argv[2]?.trim();

  if (!email) {
    throw new Error(
      'Informe o e-mail da subconta. Exemplo: node scripts/recover-asaas-subaccount.mjs "email@gmail.com"',
    );
  }

  const asaasApiUrl = requiredEnvironmentVariable(
    "ASAAS_API_URL",
  ).replace(/\/$/, "");

  const parentApiKey = requiredEnvironmentVariable(
    "ASAAS_API_KEY",
  );

  const supabaseUrl = requiredEnvironmentVariable(
    "NEXT_PUBLIC_SUPABASE_URL",
  );

  const supabaseSecretKey =
    requiredEnvironmentVariable(
      "SUPABASE_SECRET_KEY",
    );

  const encryptionKey =
    requiredEnvironmentVariable(
      "SUBACCOUNT_ENCRYPTION_KEY",
    );

  console.log("1/4 Procurando a subconta no Asaas...");

  const accountsUrl = new URL(
    `${asaasApiUrl}/accounts`,
  );

  accountsUrl.searchParams.set("email", email);
  accountsUrl.searchParams.set("limit", "100");

  const accountsResponse = await fetch(accountsUrl, {
    method: "GET",
    headers: {
      accept: "application/json",
      access_token: parentApiKey,
    },
  });

  const accountsData = await readJsonResponse(
    accountsResponse,
  );

  if (!accountsResponse.ok) {
    throw new Error(
      `Não foi possível listar as subcontas: ${getAsaasErrorMessage(
        accountsData,
        accountsResponse.status,
      )}`,
    );
  }

  const accounts = Array.isArray(accountsData?.data)
    ? accountsData.data
    : Array.isArray(accountsData)
      ? accountsData
      : [];

  const normalizedEmail = email.toLowerCase();

  const account = accounts.find(
    (item) =>
      String(item?.email ?? "").toLowerCase() ===
      normalizedEmail,
  );

  if (!account?.id) {
    throw new Error(
      "Nenhuma subconta foi encontrada com esse e-mail.",
    );
  }

  if (!account.walletId) {
    throw new Error(
      "A subconta foi encontrada, mas não possui walletId.",
    );
  }

  console.log("2/4 Subconta encontrada.");
  console.log("3/4 Gerando uma nova chave da subconta...");

  const accessTokenResponse = await fetch(
    `${asaasApiUrl}/accounts/${account.id}/accessTokens`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        access_token: parentApiKey,
      },
      body: JSON.stringify({
        name: "BeautyFlow",
      }),
    },
  );

  const accessTokenData = await readJsonResponse(
    accessTokenResponse,
  );

  if (!accessTokenResponse.ok) {
    throw new Error(
      `Não foi possível gerar a nova chave: ${getAsaasErrorMessage(
        accessTokenData,
        accessTokenResponse.status,
      )}`,
    );
  }

  const newApiKey =
    accessTokenData?.apiKey ??
    accessTokenData?.accessToken ??
    accessTokenData?.token;

  if (
    typeof newApiKey !== "string" ||
    !newApiKey
  ) {
    throw new Error(
      "O Asaas criou a credencial, mas não retornou a chave no formato esperado.",
    );
  }

  const encryptedApiKey = encryptSecret(
    newApiKey,
    encryptionKey,
  );

  const supabase = createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  console.log(
    "4/4 Salvando novamente no BeautyFlow...",
  );

  const { data: updatedCompany, error } =
    await supabase
      .from("companies")
      .update({
        asaas_account_id: account.id,
        asaas_wallet_id: account.walletId,
        asaas_api_key_encrypted:
          encryptedApiKey,
        asaas_account_status: "active",
        asaas_onboarding_completed: true,
        asaas_connected_at:
          new Date().toISOString(),
      })
      .eq("slug", "studio-beautyflow")
      .select("id")
      .maybeSingle();

  if (error) {
    throw new Error(
      `Não foi possível atualizar a empresa no Supabase: ${error.message}`,
    );
  }

  if (!updatedCompany) {
    throw new Error(
      "Nenhuma empresa com o slug studio-beautyflow foi encontrada.",
    );
  }

  console.log("");
  console.log(
    "Subconta recuperada e vinculada com sucesso.",
  );
  console.log(
    "A nova chave foi criptografada e não foi exibida.",
  );
}

main().catch((error) => {
  console.error("");
  console.error(
    error instanceof Error
      ? error.message
      : "Erro desconhecido.",
  );

  process.exitCode = 1;
});