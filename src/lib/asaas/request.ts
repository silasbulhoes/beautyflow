import "server-only";

type AsaasRequestOptions = {
  apiUrl: string;
  apiKey: string;
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

export async function asaasRequest<T>({
  apiUrl,
  apiKey,
  path,
  method = "GET",
  body,
}: AsaasRequestOptions): Promise<T> {
  const response = await fetch(
    `${apiUrl}${path.startsWith("/") ? path : `/${path}`}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey,
      },
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
      cache: "no-store",
    },
  );

  const responseData = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    console.error("Erro na API do Asaas:", {
      path,
      status: response.status,
      response: responseData,
    });

    const errors = Array.isArray(responseData?.errors)
      ? responseData.errors
      : [];
    const descriptions = errors
      .map((item: unknown) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const errorItem = item as {
          code?: unknown;
          description?: unknown;
        };
        const description =
          typeof errorItem.description === "string"
            ? errorItem.description.trim()
            : "";
        const code =
          typeof errorItem.code === "string"
            ? errorItem.code.trim()
            : "";

        if (!description) {
          return null;
        }

        return code
          ? `${description} (${code})`
          : description;
      })
      .filter((item: string | null): item is string =>
        Boolean(item),
      );

    const message =
      descriptions.join(" ") ||
      responseData?.message ||
      responseData?.description ||
      `O Asaas recusou a operação (HTTP ${response.status}).`;

    throw new Error(message);
  }

  return responseData as T;
}
