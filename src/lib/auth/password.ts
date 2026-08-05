export const MIN_PASSWORD_LENGTH = 8;

export function isValidPassword(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function getApplicationUrl() {
  return String(
    process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000",
  ).replace(/\/$/, "");
}
