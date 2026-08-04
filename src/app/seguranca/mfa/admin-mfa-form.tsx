"use client";

import {
  KeyRound,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type MfaMode =
  | "loading"
  | "enroll"
  | "verify"
  | "authenticated";

function getFriendlyError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("invalid") ||
    normalizedMessage.includes("code")
  ) {
    return "O código informado é inválido ou expirou. Aguarde o próximo código e tente novamente.";
  }

  if (
    normalizedMessage.includes("friendly name") ||
    normalizedMessage.includes("already exists")
  ) {
    return "Já existe uma configuração de autenticação incompleta. Atualize a página para gerar uma nova.";
  }

  if (
    normalizedMessage.includes("factor") ||
    normalizedMessage.includes("challenge")
  ) {
    return "Não foi possível validar o autenticador. Atualize a página e tente novamente.";
  }

  return "Não foi possível concluir a verificação de segurança.";
}

export function AdminMfaForm() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const initializedRef = useRef(false);

  const [mode, setMode] =
    useState<MfaMode>("loading");

  const [factorId, setFactorId] =
    useState("");

  const [qrCode, setQrCode] =
    useState("");

  const [secret, setSecret] =
    useState("");

  const [
    verificationCode,
    setVerificationCode,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    let componentIsMounted = true;

    async function initializeMfa() {
      try {
        setErrorMessage("");

        const assuranceResult =
          await supabase.auth.mfa
            .getAuthenticatorAssuranceLevel();

        if (assuranceResult.error) {
          throw assuranceResult.error;
        }

        if (
          assuranceResult.data.currentLevel ===
          "aal2"
        ) {
          if (componentIsMounted) {
            setMode("authenticated");

            router.replace(
              "/painel/admin/subcontas",
            );

            router.refresh();
          }

          return;
        }

        const factorsResult =
          await supabase.auth.mfa.listFactors();

        if (factorsResult.error) {
          throw factorsResult.error;
        }

        const verifiedTotpFactor =
          factorsResult.data.totp.find(
            (factor) =>
              factor.status === "verified",
          );

        if (verifiedTotpFactor) {
          if (componentIsMounted) {
            setFactorId(
              verifiedTotpFactor.id,
            );

            setMode("verify");
          }

          return;
        }

        const unverifiedFactors =
          factorsResult.data.totp.filter(
            (factor) =>
              factor.status !== "verified",
          );

        for (const factor of unverifiedFactors) {
          const unenrollResult =
            await supabase.auth.mfa.unenroll({
              factorId: factor.id,
            });

          if (unenrollResult.error) {
            console.error(
              "Não foi possível remover fator MFA incompleto:",
              unenrollResult.error.message,
            );
          }
        }

        const uniqueFriendlyName =
          `BeautyFlow Administrador ${Date.now()}`;

        const enrollmentResult =
          await supabase.auth.mfa.enroll({
            factorType: "totp",
            friendlyName: uniqueFriendlyName,
          });

        if (enrollmentResult.error) {
          throw enrollmentResult.error;
        }

        if (componentIsMounted) {
          setFactorId(
            enrollmentResult.data.id,
          );

          setQrCode(
            enrollmentResult.data.totp
              .qr_code,
          );

          setSecret(
            enrollmentResult.data.totp
              .secret,
          );

          setMode("enroll");
        }
      } catch (error) {
        const errorText =
          error instanceof Error
            ? error.message
            : "Erro desconhecido";

        console.error(
          "Erro ao inicializar MFA:",
          errorText,
        );

        if (componentIsMounted) {
          setErrorMessage(
            getFriendlyError(errorText),
          );

          setMode("verify");
        }
      }
    }

    void initializeMfa();

    return () => {
      componentIsMounted = false;
    };
  }, [router, supabase]);

  async function handleVerification(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedCode =
      verificationCode
        .replace(/\D/g, "")
        .slice(0, 6);

    if (normalizedCode.length !== 6) {
      setErrorMessage(
        "Digite o código de seis números exibido no aplicativo autenticador.",
      );

      return;
    }

    if (!factorId) {
      setErrorMessage(
        "O fator de autenticação não foi encontrado. Atualize a página.",
      );

      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const verificationResult =
        await supabase.auth.mfa
          .challengeAndVerify({
            factorId,
            code: normalizedCode,
          });

      if (verificationResult.error) {
        throw verificationResult.error;
      }

      const assuranceResult =
        await supabase.auth.mfa
          .getAuthenticatorAssuranceLevel();

      if (assuranceResult.error) {
        throw assuranceResult.error;
      }

      if (
        assuranceResult.data.currentLevel !==
        "aal2"
      ) {
        throw new Error(
          "A sessão não atingiu o nível de segurança necessário.",
        );
      }

      setMode("authenticated");

      router.replace(
        "/painel/admin/subcontas",
      );

      router.refresh();
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.message
          : "Erro desconhecido";

      console.error(
        "Erro ao verificar MFA:",
        errorText,
      );

      setErrorMessage(
        getFriendlyError(errorText),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  if (
    mode === "loading" ||
    mode === "authenticated"
  ) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center text-center">
        <LoaderCircle className="size-8 animate-spin text-primary" />

        <p className="mt-4 font-medium">
          Verificando segurança
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          Aguarde alguns instantes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mode === "enroll" ? (
        <>
          <div className="rounded-xl border border-blue-600/20 bg-blue-600/5 p-4">
            <div className="flex items-start gap-3">
              <Smartphone className="mt-0.5 size-5 shrink-0 text-blue-700" />

              <div>
                <p className="font-medium text-blue-800">
                  Configure seu aplicativo
                  autenticador
                </p>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Escaneie o QR Code usando o Google
                  Authenticator, Microsoft
                  Authenticator ou outro aplicativo
                  compatível.
                </p>
              </div>
            </div>
          </div>

          {qrCode ? (
            <div className="flex justify-center">
              <div
                role="img"
                aria-label="QR Code para configurar a autenticação em dois fatores"
                className="size-[252px] rounded-2xl border bg-white p-4 shadow-sm [&_svg]:size-full"
                dangerouslySetInnerHTML={{
                  __html: qrCode.trim(),
                }}
              />
            </div>
          ) : null}

          {secret ? (
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <KeyRound className="size-4" />
                Código para configuração manual
              </p>

              <p className="mt-3 break-all rounded-lg bg-background p-3 text-center font-mono text-sm">
                {secret}
              </p>

              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Use esse código somente quando não
                conseguir escanear o QR Code. Não
                compartilhe nem envie uma captura
                dessa tela.
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />

            <div>
              <p className="font-medium">
                Confirme sua identidade
              </p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Abra seu aplicativo autenticador e
                informe o código atual do
                BeautyFlow.
              </p>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleVerification}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="mfaCode">
            Código de verificação
          </Label>

          <Input
            id="mfaCode"
            name="mfaCode"
            value={verificationCode}
            onChange={(event) => {
              setVerificationCode(
                event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6),
              );
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            className="h-12 text-center font-mono text-xl tracking-[0.35em]"
            required
          />
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={
            submitting ||
            verificationCode.length !== 6 ||
            !factorId
          }
        >
          {submitting
            ? "Verificando..."
            : mode === "enroll"
              ? "Ativar autenticação"
              : "Confirmar código"}
        </Button>
      </form>

      <Button
        type="button"
        variant="ghost"
        className="w-full gap-2"
        onClick={handleSignOut}
      >
        <LogOut className="size-4" />
        Sair da conta
      </Button>
    </div>
  );
}