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

    const message =
      Array.isArray(responseData?.errors) &&
      responseData.errors[0]?.description
        ? responseData.errors[0].description
        : responseData?.message ??
          responseData?.description ??
          "O Asaas recusou a operação.";

    throw new Error(message);
  }

  return responseData as T;
}