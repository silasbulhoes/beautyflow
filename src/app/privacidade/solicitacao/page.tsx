import {
    ArrowLeft,
    CheckCircle2,
    ClipboardCheck,
    FileQuestion,
    ShieldCheck,
  } from "lucide-react";
  import type { Metadata } from "next";
  import Link from "next/link";
  
  import { PrivacyRequestForm } from "./privacy-request-form";
  
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  
  export const metadata: Metadata = {
    title:
      "Solicitação de dados pessoais | BeautyFlow",
    description:
      "Canal para solicitações relacionadas a dados pessoais tratados pelo BeautyFlow.",
  };
  
  type PrivacyRequestPageProps = {
    searchParams: Promise<{
      enviado?: string;
      protocolo?: string;
    }>;
  };
  
  function getSafeProtocol(
    value: string | undefined,
  ) {
    if (
      value &&
      /^BF-\d{8}-[A-F0-9]{8}$/.test(value)
    ) {
      return value;
    }
  
    return null;
  }
  
  export default async function PrivacyRequestPage({
    searchParams,
  }: PrivacyRequestPageProps) {
    const parameters = await searchParams;
  
    const protocol = getSafeProtocol(
      parameters.protocolo,
    );
  
    const wasSent =
      parameters.enviado === "1" &&
      Boolean(protocol);
  
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/privacidade"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar ao Aviso de Privacidade
          </Link>
  
          <div className="mt-8 flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <ShieldCheck className="size-6 text-primary" />
            </div>
  
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                Proteção de dados
              </p>
  
              <h1 className="mt-2 text-3xl font-semibold">
                Solicitação sobre dados pessoais
              </h1>
  
              <p className="mt-3 text-muted-foreground">
                Utilize este formulário para exercer
                direitos relacionados aos seus dados
                pessoais.
              </p>
            </div>
          </div>
  
          {wasSent && protocol ? (
            <Card className="mt-8 border-green-600/30">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 size-6 shrink-0 text-green-700" />
  
                  <div>
                    <CardTitle className="text-green-700">
                      Solicitação registrada
                    </CardTitle>
  
                    <CardDescription className="mt-2">
                      Guarde o protocolo abaixo para
                      acompanhar seu atendimento.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
  
              <CardContent>
                <div className="rounded-xl border bg-muted/40 p-5 text-center">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Protocolo
                  </p>
  
                  <p className="mt-2 break-all font-mono text-xl font-semibold">
                    {protocol}
                  </p>
                </div>
  
                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  A equipe poderá entrar em contato pelo
                  e-mail informado para confirmar sua
                  identidade ou solicitar informações
                  complementares.
                </p>
  
                <Link
                  href="/privacidade"
                  className="mt-6 inline-flex text-sm font-medium text-primary hover:underline"
                >
                  Voltar ao Aviso de Privacidade
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardContent className="flex gap-3 p-5">
                    <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-primary" />
  
                    <div>
                      <p className="font-medium">
                        Solicitação registrada
                      </p>
  
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Você receberá um protocolo ao
                        concluir o envio.
                      </p>
                    </div>
                  </CardContent>
                </Card>
  
                <Card>
                  <CardContent className="flex gap-3 p-5">
                    <FileQuestion className="mt-0.5 size-5 shrink-0 text-primary" />
  
                    <div>
                      <p className="font-medium">
                        Verificação de identidade
                      </p>
  
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Informações adicionais poderão ser
                        solicitadas antes da resposta.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
  
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>
                    Dados da solicitação
                  </CardTitle>
  
                  <CardDescription>
                    Não é necessário informar CPF ou
                    enviar documentos nesta primeira
                    etapa.
                  </CardDescription>
                </CardHeader>
  
                <CardContent>
                  <PrivacyRequestForm />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    );
  }