import type { AsaasEnvironment } from "@/lib/asaas/environment";

export type ExpectedAsaasIdentity = {
  name: string | null;
  email: string | null;
  cpfCnpj: string | null;
};

export type ReturnedAsaasIdentity = {
  name: string;
  email: string;
  cpfCnpj: string;
};

export function normalizeIdentityText(value: string) {
  return value.trim().toLocaleUpperCase("pt-BR");
}

export function onlyDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function validateAsaasConnectionIdentity(input: {
  environment: AsaasEnvironment;
  expected: ExpectedAsaasIdentity;
  returned: ReturnedAsaasIdentity;
  proposedProductionEmail?: string;
}) {
  const expectedDocument = onlyDigits(input.expected.cpfCnpj);
  const returnedDocument = onlyDigits(input.returned.cpfCnpj);
  const storedEmail = input.expected.email?.trim() ?? "";
  const proposedEmail = input.proposedProductionEmail?.trim() ?? "";
  const expectedEmail = storedEmail || (input.environment === "production" ? proposedEmail : "");

  if (expectedDocument) {
    if (!returnedDocument || returnedDocument !== expectedDocument) {
      throw new Error("O CPF/CNPJ retornado pelo Asaas não corresponde à identidade financeira esperada.");
    }
    return {
      matchedBy: "cpf_cnpj" as const,
      expectedEmail: storedEmail || null,
      expectedCpfCnpj: expectedDocument,
    };
  }

  if (!expectedEmail) {
    throw new Error("Informe o e-mail financeiro esperado para cadastrar a identidade de Produção.");
  }
  if (normalizeIdentityText(input.returned.email) !== normalizeIdentityText(expectedEmail)) {
    throw new Error("O e-mail retornado pelo Asaas não corresponde à identidade financeira esperada deste ambiente.");
  }
  if (input.expected.name && normalizeIdentityText(input.returned.name) !== normalizeIdentityText(input.expected.name)) {
    throw new Error("O nome retornado pelo Asaas não corresponde à identidade financeira esperada deste ambiente.");
  }

  return {
    matchedBy: "email" as const,
    expectedEmail,
    expectedCpfCnpj: null,
  };
}
