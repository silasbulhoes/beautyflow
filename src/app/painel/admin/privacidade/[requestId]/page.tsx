import {
    CheckCircle2,
    FileLock2,
    Mail,
    Phone,
    ShieldCheck,
    UserRound,
  } from "lucide-react";
  import Link from "next/link";
  import {
    notFound,
    redirect,
  } from "next/navigation";
  
  import { updatePrivacyRequest } from "../actions";
  
  import { Button } from "@/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { isAdminEmail } from "@/lib/admin-access";
  import { createAdminClient } from "@/lib/supabase/admin";
  import { createClient } from "@/lib/supabase/server";
  
  type PrivacyRequestDetailsPageProps = {
    params: Promise<{
      requestId: string;
    }>;
  
    searchParams: Promise<{
      salvo?: string;
      erro?: string;
    }>;
  };
  
  type PrivacyRequestRecord = {
    id: string;
    protocol: string;
    requester_name: string;
    requester_email: string;
    requester_phone: string | null;
    requester_role: string;
    request_type: string;
    company_reference: string | null;
    details: string;
    status: string;
    identity_verified: boolean;
    identity_verified_at: string | null;
    privacy_notice_version: string;
    privacy_notice_acknowledged_at: string;
    internal_notes: string | null;
    response_summary: string | null;
    response_channel: string | null;
    handled_by_email: string | null;
    created_at: string;
    updated_at: string;
    responded_at: string | null;
  };
  
  const brazilTimeZone = "America/Sao_Paulo";
  
  function isValidUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
  
  function formatDate(
    value: string | null,
  ) {
    if (!value) {
      return "Não registrado";
    }
  
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) {
      return "Não registrado";
    }
  
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: brazilTimeZone,
    }).format(date);
  }
  
  function getRequestTypeLabel(
    requestType: string,
  ) {
    switch (requestType) {
      case "confirmation":
        return "Confirmação da existência de tratamento";
  
      case "access":
        return "Acesso aos dados";
  
      case "correction":
        return "Correção dos dados";
  
      case "deletion":
        return "Exclusão dos dados";
  
      case "anonymization":
        return "Anonimização ou bloqueio";
  
      case "sharing_information":
        return "Informações sobre compartilhamento";
  
      case "consent_revocation":
        return "Revogação de consentimento";
  
      default:
        return "Outra solicitação";
    }
  }
  
  function getRequesterRoleLabel(
    requesterRole: string,
  ) {
    switch (requesterRole) {
      case "client":
        return "Cliente de um estúdio";
  
      case "professional":
        return "Profissional ou estúdio";
  
      default:
        return "Outra pessoa";
    }
  }
  
  function getErrorMessage(
    error: string | undefined,
  ) {
    switch (error) {
      case "status":
        return "Selecione uma situação válida.";
  
      case "resposta":
        return "Para concluir ou negar a solicitação, informe o canal e um resumo da resposta.";
  
      case "salvar":
        return "Não foi possível salvar as alterações.";
  
      default:
        return null;
    }
  }
  
  export default async function PrivacyRequestDetailsPage({
    params,
    searchParams,
  }: PrivacyRequestDetailsPageProps) {
    const routeParameters = await params;
    const queryParameters = await searchParams;
  
    const authenticatedSupabase =
      await createClient();
  
    const {
      data: { user },
    } = await authenticatedSupabase.auth.getUser();
  
    if (!user) {
      redirect("/login");
    }
  
    if (!isAdminEmail(user.email)) {
      notFound();
    }
  
    if (
      !isValidUuid(
        routeParameters.requestId,
      )
    ) {
      notFound();
    }
  
    const adminSupabase = createAdminClient();
  
    const { data } = await adminSupabase
      .from("privacy_requests")
      .select(`
        id,
        protocol,
        requester_name,
        requester_email,
        requester_phone,
        requester_role,
        request_type,
        company_reference,
        details,
        status,
        identity_verified,
        identity_verified_at,
        privacy_notice_version,
        privacy_notice_acknowledged_at,
        internal_notes,
        response_summary,
        response_channel,
        handled_by_email,
        created_at,
        updated_at,
        responded_at
      `)
      .eq(
        "id",
        routeParameters.requestId,
      )
      .maybeSingle();
  
    const request =
      data as PrivacyRequestRecord | null;
  
    if (!request) {
      notFound();
    }
  
    const errorMessage = getErrorMessage(
      queryParameters.erro,
    );
  
    return (
      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/painel/admin/privacidade"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar às solicitações
          </Link>
  
          <div className="mt-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FileLock2 className="size-6 text-primary" />
              </div>
  
              <div>
                <p className="font-mono text-sm text-muted-foreground">
                  {request.protocol}
                </p>
  
                <h1 className="mt-1 text-3xl font-semibold">
                  {getRequestTypeLabel(
                    request.request_type,
                  )}
                </h1>
  
                <p className="mt-2 text-muted-foreground">
                  Recebida em{" "}
                  {formatDate(
                    request.created_at,
                  )}
                </p>
              </div>
            </div>
          </div>
  
          {queryParameters.salvo === "1" ? (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-green-600/30 bg-green-600/10 p-4">
              <CheckCircle2 className="mt-0.5 size-5 text-green-700" />
  
              <p className="font-medium text-green-700">
                Solicitação atualizada com sucesso.
              </p>
            </div>
          ) : null}
  
          {errorMessage ? (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}
  
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Pessoa solicitante
                  </CardTitle>
                </CardHeader>
  
                <CardContent className="space-y-5">
                  <div className="flex items-start gap-3">
                    <UserRound className="mt-0.5 size-5 text-muted-foreground" />
  
                    <div>
                      <p className="font-medium">
                        {request.requester_name}
                      </p>
  
                      <p className="text-sm text-muted-foreground">
                        {getRequesterRoleLabel(
                          request.requester_role,
                        )}
                      </p>
                    </div>
                  </div>
  
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 size-5 text-muted-foreground" />
  
                    <a
                      href={`mailto:${request.requester_email}`}
                      className="break-all text-sm font-medium text-primary hover:underline"
                    >
                      {request.requester_email}
                    </a>
                  </div>
  
                  {request.requester_phone ? (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 size-5 text-muted-foreground" />
  
                      <p className="text-sm font-medium">
                        {request.requester_phone}
                      </p>
                    </div>
                  ) : null}
  
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Estúdio informado
                    </p>
  
                    <p className="mt-1 font-medium">
                      {request.company_reference ??
                        "Não informado"}
                    </p>
                  </div>
                </CardContent>
              </Card>
  
              <Card>
                <CardHeader>
                  <CardTitle>
                    Registro de privacidade
                  </CardTitle>
                </CardHeader>
  
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">
                      Versão do aviso
                    </p>
  
                    <p className="mt-1 font-medium">
                      {request.privacy_notice_version}
                    </p>
                  </div>
  
                  <div>
                    <p className="text-muted-foreground">
                      Ciência registrada em
                    </p>
  
                    <p className="mt-1 font-medium">
                      {formatDate(
                        request.privacy_notice_acknowledged_at,
                      )}
                    </p>
                  </div>
  
                  <div>
                    <p className="text-muted-foreground">
                      Identidade verificada em
                    </p>
  
                    <p className="mt-1 font-medium">
                      {formatDate(
                        request.identity_verified_at,
                      )}
                    </p>
                  </div>
  
                  <div>
                    <p className="text-muted-foreground">
                      Respondida em
                    </p>
  
                    <p className="mt-1 font-medium">
                      {formatDate(
                        request.responded_at,
                      )}
                    </p>
                  </div>
  
                  <div>
                    <p className="text-muted-foreground">
                      Último responsável
                    </p>
  
                    <p className="mt-1 break-all font-medium">
                      {request.handled_by_email ??
                        "Não registrado"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
  
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Detalhes enviados
                  </CardTitle>
  
                  <CardDescription>
                    Conteúdo informado pela pessoa
                    solicitante.
                  </CardDescription>
                </CardHeader>
  
                <CardContent>
                  <div className="whitespace-pre-wrap rounded-xl border bg-muted/30 p-4 text-sm leading-7">
                    {request.details}
                  </div>
                </CardContent>
              </Card>
  
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="size-5" />
                    Gerenciar atendimento
                  </CardTitle>
  
                  <CardDescription>
                    Essas informações são internas e não
                    ficam disponíveis publicamente.
                  </CardDescription>
                </CardHeader>
  
                <CardContent>
                  <form
                    action={updatePrivacyRequest}
                    className="space-y-5"
                  >
                    <input
                      type="hidden"
                      name="requestId"
                      value={request.id}
                    />
  
                    <label className="block space-y-2">
                      <span className="text-sm font-medium">
                        Situação
                      </span>
  
                      <select
                        name="status"
                        defaultValue={request.status}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <option value="received">
                          Recebida
                        </option>
  
                        <option value="verifying_identity">
                          Verificando identidade
                        </option>
  
                        <option value="in_review">
                          Em análise
                        </option>
  
                        <option value="awaiting_information">
                          Aguardando informações
                        </option>
  
                        <option value="completed">
                          Concluída
                        </option>
  
                        <option value="denied">
                          Negada
                        </option>
                      </select>
                    </label>
  
                    <div className="rounded-lg border bg-muted/40 p-4">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          name="identityVerified"
                          defaultChecked={
                            request.identity_verified
                          }
                          className="mt-1 size-4 shrink-0 accent-current"
                        />
  
                        <span>
                          <span className="block text-sm font-medium">
                            Identidade verificada
                          </span>
  
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            Marque somente após confirmar
                            que a pessoa é titular dos
                            dados ou representante
                            autorizado.
                          </span>
                        </span>
                      </label>
                    </div>
  
                    <label className="block space-y-2">
                      <span className="text-sm font-medium">
                        Anotações internas
                      </span>
  
                      <textarea
                        name="internalNotes"
                        defaultValue={
                          request.internal_notes ?? ""
                        }
                        maxLength={5000}
                        placeholder="Registre verificações, contatos realizados e decisões internas."
                        className="flex min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      />
                    </label>
  
                    <label className="block space-y-2">
                      <span className="text-sm font-medium">
                        Canal da resposta
                      </span>
  
                      <select
                        name="responseChannel"
                        defaultValue={
                          request.response_channel ?? ""
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <option value="">
                          Ainda não respondida
                        </option>
  
                        <option value="email">
                          E-mail
                        </option>
  
                        <option value="whatsapp">
                          WhatsApp
                        </option>
  
                        <option value="other">
                          Outro canal
                        </option>
                      </select>
                    </label>
  
                    <label className="block space-y-2">
                      <span className="text-sm font-medium">
                        Resumo da resposta
                      </span>
  
                      <textarea
                        name="responseSummary"
                        defaultValue={
                          request.response_summary ?? ""
                        }
                        maxLength={5000}
                        placeholder="Registre o que foi informado à pessoa solicitante."
                        className="flex min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      />
  
                      <span className="block text-xs text-muted-foreground">
                        Obrigatório quando a situação for
                        Concluída ou Negada.
                      </span>
                    </label>
  
                    <Button
                      type="submit"
                      className="w-full"
                    >
                      Salvar atendimento
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    );
  }