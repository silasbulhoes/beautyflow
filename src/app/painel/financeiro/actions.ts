"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  decryptSecret,
  encryptSecret,
} from "@/lib/security/encryption";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FinancialAccountState = {
  error?: string;
  success?: string;
};

type AsaasErrorResponse = {
  errors?: Array<{
    code?: string;
    description?: string;
  }>;
  message?: string;
  error?: string;
  description?: string;
};

type AsaasSubaccountResponse = {
  id?: string;
  walletId?: string;
  apiKey?: string;
};

type AsaasPixKey = {
  id?: string;
  key?: string;
  type?: string;
  status?: string;
};

type AsaasPixKeyListResponse = {
  data?: AsaasPixKey[];
};

type EnsurePixKeyResult = {
  created: boolean;
  active: boolean;
  status: string | null;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function readText(
  formData: FormData,
  field: string,
) {
  return String(formData.get(field) ?? "").trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getAsaasErrorMessage(
  response: AsaasErrorResponse,
  status: number,
) {
  const descriptions =
    response.errors
      ?.map((error) => error.description)
      .filter(
        (description): description is string =>
          Boolean(description),
      ) ?? [];

  if (descriptions.length > 0) {
    return descriptions.join(" ");
  }

  if (response.description) {
    return response.description;
  }

  if (response.message) {
    return response.message;
  }

  if (response.error) {
    return response.error;
  }

  if (status === 400) {
    return "O Asaas recusou algum dado informado.";
  }

  if (status === 401) {
    return "A chave de API do Asaas é inválida.";
  }

  if (status === 403) {
    return "A conta não possui permissão para realizar esta operação.";
  }

  if (status === 409) {
    return "Já existe um cadastro utilizando algum dos dados informados.";
  }

  if (status >= 500) {
    return "O Asaas está temporariamente indisponível.";
  }

  return `O Asaas recusou a operação. Código HTTP: ${status}.`;
}

async function readAsaasResponse<T>(
  response: Response,
): Promise<T & AsaasErrorResponse> {
  return response
    .json()
    .catch(() => ({})) as Promise<
    T & AsaasErrorResponse
  >;
}

async function ensurePixKey({
  apiUrl,
  apiKey,
}: {
  apiUrl: string;
  apiKey: string;
}): Promise<EnsurePixKeyResult> {
  const listResponse = await fetch(
    `${apiUrl}/pix/addressKeys?limit=100`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        access_token: apiKey,
      },
      cache: "no-store",
    },
  );

  const listData =
    await readAsaasResponse<AsaasPixKeyListResponse>(
      listResponse,
    );

  if (!listResponse.ok) {
    throw new Error(
      getAsaasErrorMessage(
        listData,
        listResponse.status,
      ),
    );
  }

  const existingKeys = Array.isArray(listData.data)
    ? listData.data
    : [];

  const activeKey = existingKeys.find(
    (pixKey) =>
      pixKey.status?.toUpperCase() === "ACTIVE",
  );

  if (activeKey) {
    return {
      created: false,
      active: true,
      status: "ACTIVE",
    };
  }

  const awaitingKey = existingKeys.find((pixKey) => {
    const status = pixKey.status?.toUpperCase();

    return (
      status === "AWAITING_ACTIVATION" ||
      status === "AWAITING_APPROVAL" ||
      status === "PENDING"
    );
  });

  if (awaitingKey) {
    return {
      created: false,
      active: false,
      status: awaitingKey.status ?? null,
    };
  }

  const keyWithError = existingKeys.find(
    (pixKey) =>
      pixKey.status?.toUpperCase() === "ERROR",
  );

  if (keyWithError) {
    throw new Error(
      "A chave Pix apresentou erro durante a ativação no Asaas.",
    );
  }

  const createResponse = await fetch(
    `${apiUrl}/pix/addressKeys`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        access_token: apiKey,
      },
      body: JSON.stringify({
        type: "EVP",
      }),
      cache: "no-store",
    },
  );

  const createData =
    await readAsaasResponse<AsaasPixKey>(
      createResponse,
    );

  if (!createResponse.ok) {
    throw new Error(
      getAsaasErrorMessage(
        createData,
        createResponse.status,
      ),
    );
  }

  const createdStatus =
    createData.status?.toUpperCase() ?? null;

  return {
    created: true,
    active: createdStatus === "ACTIVE",
    status: createData.status ?? null,
  };
}

async function getAuthenticatedCompanyId() {
  const authenticatedSupabase =
    await createClient();

  const {
    data: { user },
  } = await authenticatedSupabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } =
    await authenticatedSupabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

  if (!profile?.company_id) {
    throw new Error(
      "Não foi possível identificar sua empresa.",
    );
  }

  return {
    companyId: profile.company_id,
  };
}

export async function criarChavePix(
  _previousState: FinancialAccountState,
  _formData: FormData,
): Promise<FinancialAccountState> {
  void _previousState;
  void _formData;

  let companyId: string;

  try {
    const authenticatedCompany =
      await getAuthenticatedCompanyId();

    companyId = authenticatedCompany.companyId;
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível identificar sua empresa.",
    };
  }

  const adminSupabase = createAdminClient();

  const { data: company, error: companyError } =
    await adminSupabase
      .from("companies")
      .select(`
        id,
        asaas_account_id,
        asaas_api_key_encrypted
      `)
      .eq("id", companyId)
      .maybeSingle();

  if (companyError) {
    console.error(
      "Erro ao consultar empresa:",
      companyError,
    );

    return {
      error:
        "Não foi possível consultar a conta financeira.",
    };
  }

  if (!company) {
    return {
      error: "Empresa não encontrada.",
    };
  }

  if (
    !company.asaas_account_id ||
    !company.asaas_api_key_encrypted
  ) {
    return {
      error:
        "A empresa ainda não possui uma subconta conectada.",
    };
  }

  const asaasApiUrl =
    process.env.ASAAS_API_URL?.replace(/\/$/, "");

  if (!asaasApiUrl) {
    return {
      error:
        "A URL da integração com o Asaas não foi configurada.",
    };
  }

  let subaccountApiKey: string;

  try {
    subaccountApiKey = decryptSecret(
      company.asaas_api_key_encrypted,
    );
  } catch (error) {
    console.error(
      "Erro ao descriptografar chave da subconta:",
      error instanceof Error
        ? error.message
        : "Erro desconhecido",
    );

    return {
      error:
        "Não foi possível acessar a credencial da subconta.",
    };
  }

  try {
    const result = await ensurePixKey({
      apiUrl: asaasApiUrl,
      apiKey: subaccountApiKey,
    });

    revalidatePath("/painel/financeiro");

    if (!result.active) {
      return {
        success:
          "A chave Pix existe, mas ainda está aguardando ativação no Asaas. Aguarde alguns minutos e clique novamente para verificar.",
      };
    }

    return {
      success: result.created
        ? "Chave Pix criada e ativada com sucesso."
        : "A subconta já possui uma chave Pix ativa.",
    };
  } catch (error) {
    console.error(
      "Erro ao configurar chave Pix da subconta:",
      error instanceof Error
        ? error.message
        : "Erro desconhecido",
    );

    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível criar a chave Pix.",
    };
  }
}

export async function criarContaFinanceira(
  _previousState: FinancialAccountState,
  formData: FormData,
): Promise<FinancialAccountState> {
  void _previousState;

  const name = readText(formData, "name");
  const email = readText(formData, "email");

  const cpfCnpj = onlyDigits(
    readText(formData, "cpfCnpj"),
  );

  const birthDate = readText(
    formData,
    "birthDate",
  );

  const companyType = readText(
    formData,
    "companyType",
  );

  const mobilePhone = onlyDigits(
    readText(formData, "mobilePhone"),
  );

  const incomeValueText = readText(
    formData,
    "incomeValue",
  ).replace(",", ".");

  const address = readText(
    formData,
    "address",
  );

  const addressNumber = readText(
    formData,
    "addressNumber",
  );

  const complement = readText(
    formData,
    "complement",
  );

  const province = readText(
    formData,
    "province",
  );

  const postalCode = onlyDigits(
    readText(formData, "postalCode"),
  );

  const isIndividual = cpfCnpj.length === 11;
  const isBusiness = cpfCnpj.length === 14;

  const incomeValue = Number(incomeValueText);

  if (
    !name ||
    !email ||
    !cpfCnpj ||
    !mobilePhone ||
    !incomeValueText ||
    !address ||
    !addressNumber ||
    !province ||
    !postalCode
  ) {
    return {
      error: "Preencha todos os campos obrigatórios.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      error: "Informe um e-mail válido.",
    };
  }

  if (!isIndividual && !isBusiness) {
    return {
      error: "Informe um CPF ou CNPJ válido.",
    };
  }

  if (
    mobilePhone.length < 10 ||
    mobilePhone.length > 11
  ) {
    return {
      error: "Informe um celular com DDD.",
    };
  }

  if (postalCode.length !== 8) {
    return {
      error:
        "Informe um CEP válido com 8 números.",
    };
  }

  if (
    !Number.isFinite(incomeValue) ||
    incomeValue <= 0
  ) {
    return {
      error:
        "Informe uma renda ou um faturamento mensal válido.",
    };
  }

  if (
    isIndividual &&
    (!birthDate || !isValidDate(birthDate))
  ) {
    return {
      error:
        "Informe a data de nascimento da titular do CPF.",
    };
  }

  const allowedCompanyTypes = [
    "MEI",
    "LIMITED",
    "INDIVIDUAL",
    "ASSOCIATION",
  ];

  if (
    isBusiness &&
    !allowedCompanyTypes.includes(companyType)
  ) {
    return {
      error: "Selecione o tipo da empresa.",
    };
  }

  let companyId: string;

  try {
    const authenticatedCompany =
      await getAuthenticatedCompanyId();

    companyId = authenticatedCompany.companyId;
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível identificar sua empresa.",
    };
  }

  const adminSupabase = createAdminClient();

  const { data: company, error: companyError } =
    await adminSupabase
      .from("companies")
      .select(`
        id,
        asaas_account_id,
        asaas_wallet_id,
        asaas_account_status
      `)
      .eq("id", companyId)
      .maybeSingle();

  if (companyError) {
    console.error(
      "Erro ao buscar empresa:",
      companyError,
    );

    return {
      error:
        "Não foi possível consultar os dados da empresa.",
    };
  }

  if (!company) {
    return {
      error: "Empresa não encontrada.",
    };
  }

  if (
    company.asaas_account_id ||
    company.asaas_wallet_id ||
    company.asaas_account_status === "active" ||
    company.asaas_account_status === "pending"
  ) {
    return {
      error:
        "Esta empresa já possui uma conta financeira conectada.",
    };
  }

  const asaasApiUrl =
    process.env.ASAAS_API_URL?.replace(/\/$/, "");

  const asaasApiKey =
    process.env.ASAAS_API_KEY;

  if (!asaasApiUrl || !asaasApiKey) {
    return {
      error:
        "A integração financeira não está configurada.",
    };
  }

  const requestBody: Record<string, unknown> = {
    name,
    email,
    loginEmail: email,
    cpfCnpj,
    mobilePhone,
    incomeValue,
    address,
    addressNumber,
    province,
    postalCode,
  };

  if (complement) {
    requestBody.complement = complement;
  }

  if (isIndividual) {
    requestBody.birthDate = birthDate;
  }

  if (isBusiness) {
    requestBody.companyType = companyType;
  }

  let response: Response;

  try {
    response = await fetch(
      `${asaasApiUrl}/accounts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          access_token: asaasApiKey,
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error(
      "Erro de comunicação com o Asaas:",
      error instanceof Error
        ? error.message
        : "Erro desconhecido",
    );

    return {
      error:
        "Não foi possível comunicar com o Asaas.",
    };
  }

  const responseData =
    await readAsaasResponse<AsaasSubaccountResponse>(
      response,
    );

  if (!response.ok) {
    console.error(
      "Erro ao criar subconta Asaas:",
      {
        status: response.status,
        errors: responseData.errors,
        message: responseData.message,
        error: responseData.error,
        description: responseData.description,
      },
    );

    return {
      error: getAsaasErrorMessage(
        responseData,
        response.status,
      ),
    };
  }

  if (
    !responseData.id ||
    !responseData.walletId ||
    !responseData.apiKey
  ) {
    return {
      error:
        "A conta foi criada, mas o Asaas retornou dados incompletos. Não tente novamente antes de conferir o painel do Asaas.",
    };
  }

  let encryptedApiKey: string;

  try {
    encryptedApiKey = encryptSecret(
      responseData.apiKey,
    );
  } catch (error) {
    console.error(
      "Erro ao criptografar chave da subconta:",
      error instanceof Error
        ? error.message
        : "Erro desconhecido",
    );

    return {
      error:
        "A conta foi criada, mas não foi possível armazenar sua chave com segurança.",
    };
  }

  const {
    data: updatedCompany,
    error: updateError,
  } = await adminSupabase
    .from("companies")
    .update({
      asaas_account_id: responseData.id,
      asaas_wallet_id: responseData.walletId,
      asaas_api_key_encrypted: encryptedApiKey,
      asaas_account_status: "pending",
      asaas_onboarding_completed: false,
      asaas_connected_at: new Date().toISOString(),
    })
    .eq("id", company.id)
    .is("asaas_account_id", null)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedCompany) {
    console.error(
      "Erro ao salvar subconta na empresa:",
      updateError,
    );

    return {
      error:
        "A conta foi criada no Asaas, mas não foi vinculada ao BeautyFlow. Não tente criar outra.",
    };
  }

  let pixConfigured = false;

  try {
    const pixResult = await ensurePixKey({
      apiUrl: asaasApiUrl,
      apiKey: responseData.apiKey,
    });

    pixConfigured = pixResult.active;
  } catch (error) {
    console.error(
      "Subconta criada, mas a chave Pix não foi configurada:",
      error instanceof Error
        ? error.message
        : "Erro desconhecido",
    );
  }

  revalidatePath("/painel/financeiro");
  revalidatePath("/painel");

  redirect(
    `/painel/financeiro?sucesso=1&pix=${
      pixConfigured ? "1" : "0"
    }`,
  );
}