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
});
