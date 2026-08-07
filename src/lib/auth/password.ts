export const MIN_PASSWORD_LENGTH = 8;

export function isValidPassword(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function getApplicationUrl(requestOrigin?: string | null) {
  if (requestOrigin) {
    try {
      const origin = new URL(requestOrigin);
      if (origin.protocol === "https:" || origin.protocol === "http:") return origin.origin;
    } catch {
      // Usa a URL configurada quando o cabeçalho não contém uma origem válida.
    }
  }
  return String(
    process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000",
  ).replace(/\/$/, "");
}
