import { describe, expect, it } from "vitest";
import { getApplicationUrl, isValidPassword } from "./password";

describe("password helpers", () => {
  it("rejeita senha menor que oito caracteres", () => {
    expect(isValidPassword("1234567")).toBe(false);
  });

  it("aceita senha com oito ou mais caracteres", () => {
    expect(isValidPassword("12345678")).toBe(true);
  });

  it("remove barra final da URL usada no link de recuperação", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://beautyflow.example/";
    expect(getApplicationUrl()).toBe("https://beautyflow.example");
    process.env.NEXT_PUBLIC_APP_URL = previous;
  });

  it("prefere a origem segura da requisição no Preview", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://beautyflow-seven.vercel.app";
    expect(getApplicationUrl("https://preview-beautyflow.vercel.app")).toBe("https://preview-beautyflow.vercel.app");
  });

  it("ignora protocolos inválidos na origem da requisição", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://beautyflow-seven.vercel.app";
    expect(getApplicationUrl("javascript:alert(1)")).toBe("https://beautyflow-seven.vercel.app");
  });
});
