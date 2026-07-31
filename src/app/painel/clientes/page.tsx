import {
    CalendarDays,
    History,
    MessageCircle,
    Search,
    UserRound,
  } from "lucide-react";
  import Link from "next/link";
  import { redirect } from "next/navigation";
  
  import { buttonVariants } from "@/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { createAdminClient } from "@/lib/supabase/admin";
  import { createClient } from "@/lib/supabase/server";
  
  type ClientesPageProps = {
    searchParams: Promise<{
      busca?: string;
    }>;
  };
  
  type ClientRecord = {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    cpf_cnpj: string | null;
    created_at: string;
  };
  
  type AppointmentRecord = {
    id: string;
    client_id: string;
    appointment_date: string;
    start_time: string;
    status: string;
    payment_status: string | null;
    total_amount_cents: number;
  };
  
  type GroupedClient = {
    key: string;
    representativeClientId: string;
    name: string;
    phone: string;
    email: string | null;
    cpfCnpj: string | null;
    clientIds: string[];
    confirmedAppointments: number;
    pendingAppointments: number;
    totalConfirmedCents: number;
    nextAppointment: AppointmentRecord | null;
    lastAppointment: AppointmentRecord | null;
  };
  
  function onlyDigits(value: string | null | undefined) {
    return String(value ?? "").replace(/\D/g, "");
  }
  
  function normalizeText(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }
  
  function formatCurrency(valueInCents: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valueInCents / 100);
  }
  
  function formatDate(value: string) {
    const [year, month, day] = value.split("-").map(Number);
  
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(year, month - 1, day, 12));
  }
  
  function formatTime(value: string) {
    return value.slice(0, 5);
  }
  
  function getTodayString() {
    const today = new Date();
  
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
  
    return `${year}-${month}-${day}`;
  }
  
  function getClientKey(client: ClientRecord) {
    const phone = onlyDigits(client.phone);
  
    if (phone) {
      return `phone:${phone}`;
    }
  
    const cpfCnpj = onlyDigits(client.cpf_cnpj);
  
    if (cpfCnpj) {
      return `document:${cpfCnpj}`;
    }
  
    return `client:${client.id}`;
  }
  
  export default async function ClientesPage({
    searchParams,
  }: ClientesPageProps) {
    const parameters = await searchParams;
  
    const searchTerm =
      typeof parameters.busca === "string"
        ? parameters.busca.trim()
        : "";
  
    const authenticatedSupabase = await createClient();
  
    const {
      data: { user },
    } = await authenticatedSupabase.auth.getUser();
  
    if (!user) {
      redirect("/login");
    }
  
    const { data: profile } = await authenticatedSupabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();
  
    if (!profile?.company_id) {
      redirect("/painel");
    }
  
    const adminSupabase = createAdminClient();
  
    const { data: clientsData, error: clientsError } =
      await adminSupabase
        .from("clients")
        .select(`
          id,
          name,
          phone,
          email,
          cpf_cnpj,
          created_at
        `)
        .eq("company_id", profile.company_id)
        .order("created_at", {
          ascending: false,
        });
  
    const clients =
      (clientsData as ClientRecord[] | null) ?? [];
  
    const clientIds = clients.map((client) => client.id);
  
    let appointments: AppointmentRecord[] = [];
    let appointmentsError = false;
  
    if (clientIds.length > 0) {
      const { data, error } = await adminSupabase
        .from("appointments")
        .select(`
          id,
          client_id,
          appointment_date,
          start_time,
          status,
          payment_status,
          total_amount_cents
        `)
        .eq("company_id", profile.company_id)
        .in("client_id", clientIds)
        .order("appointment_date", {
          ascending: false,
        })
        .order("start_time", {
          ascending: false,
        });
  
      appointments =
        (data as AppointmentRecord[] | null) ?? [];
  
      appointmentsError = Boolean(error);
    }
  
    const appointmentsByClientId = new Map<
      string,
      AppointmentRecord[]
    >();
  
    for (const appointment of appointments) {
      const currentAppointments =
        appointmentsByClientId.get(
          appointment.client_id,
        ) ?? [];
  
      currentAppointments.push(appointment);
  
      appointmentsByClientId.set(
        appointment.client_id,
        currentAppointments,
      );
    }
  
    const groupedClientsMap = new Map<
      string,
      GroupedClient
    >();
  
    for (const client of clients) {
      const key = getClientKey(client);
  
      const existingClient = groupedClientsMap.get(key);
  
      if (existingClient) {
        existingClient.clientIds.push(client.id);
  
        if (!existingClient.email && client.email) {
          existingClient.email = client.email;
        }
  
        if (!existingClient.cpfCnpj && client.cpf_cnpj) {
          existingClient.cpfCnpj = client.cpf_cnpj;
        }
  
        continue;
      }
  
      groupedClientsMap.set(key, {
        key,
        representativeClientId: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        cpfCnpj: client.cpf_cnpj,
        clientIds: [client.id],
        confirmedAppointments: 0,
        pendingAppointments: 0,
        totalConfirmedCents: 0,
        nextAppointment: null,
        lastAppointment: null,
      });
    }
  
    const today = getTodayString();
  
    for (const groupedClient of groupedClientsMap.values()) {
      const clientAppointments =
        groupedClient.clientIds.flatMap(
          (clientId) =>
            appointmentsByClientId.get(clientId) ?? [],
        );
  
      const confirmedAppointments =
        clientAppointments.filter(
          (appointment) =>
            appointment.status === "confirmed" ||
            appointment.payment_status === "received",
        );
  
      const pendingAppointments =
        clientAppointments.filter(
          (appointment) =>
            appointment.status === "pending_payment",
        );
  
      groupedClient.confirmedAppointments =
        confirmedAppointments.length;
  
      groupedClient.pendingAppointments =
        pendingAppointments.length;
  
      groupedClient.totalConfirmedCents =
        confirmedAppointments.reduce(
          (total, appointment) =>
            total + appointment.total_amount_cents,
          0,
        );
  
      const futureActiveAppointments =
        clientAppointments
          .filter(
            (appointment) =>
              appointment.appointment_date >= today &&
              (appointment.status === "confirmed" ||
                appointment.status === "pending_payment"),
          )
          .sort((first, second) => {
            const firstKey = `${first.appointment_date}-${first.start_time}`;
            const secondKey = `${second.appointment_date}-${second.start_time}`;
  
            return firstKey.localeCompare(secondKey);
          });
  
      groupedClient.nextAppointment =
        futureActiveAppointments[0] ?? null;
  
      const previousAppointments =
        clientAppointments
          .filter(
            (appointment) =>
              appointment.appointment_date < today &&
              (appointment.status === "confirmed" ||
                appointment.payment_status === "received"),
          )
          .sort((first, second) => {
            const firstKey = `${first.appointment_date}-${first.start_time}`;
            const secondKey = `${second.appointment_date}-${second.start_time}`;
  
            return secondKey.localeCompare(firstKey);
          });
  
      groupedClient.lastAppointment =
        previousAppointments[0] ?? null;
    }
  
    const normalizedSearchTerm =
      normalizeText(searchTerm);
  
    const groupedClients = Array.from(
      groupedClientsMap.values(),
    )
      .filter((client) => {
        if (!normalizedSearchTerm) {
          return true;
        }
  
        const searchableContent = normalizeText(
          [
            client.name,
            client.phone,
            client.email ?? "",
            client.cpfCnpj ?? "",
          ].join(" "),
        );
  
        return searchableContent.includes(
          normalizedSearchTerm,
        );
      })
      .sort((first, second) =>
        first.name.localeCompare(second.name, "pt-BR"),
      );
  
    const totalConfirmedAppointments =
      groupedClients.reduce(
        (total, client) =>
          total + client.confirmedAppointments,
        0,
      );
  
    const totalConfirmedRevenue =
      groupedClients.reduce(
        (total, client) =>
          total + client.totalConfirmedCents,
        0,
      );
  
    const hasError =
      Boolean(clientsError) || appointmentsError;
  
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/painel"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar ao painel
          </Link>
  
          <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-semibold">
                Clientes
              </h1>
  
              <p className="mt-2 text-muted-foreground">
                Consulte contatos, agendamentos e histórico
                das suas clientes.
              </p>
            </div>
  
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border bg-background px-4 py-3">
                <p className="text-muted-foreground">
                  Clientes
                </p>
  
                <p className="text-xl font-semibold">
                  {groupedClients.length}
                </p>
              </div>
  
              <div className="rounded-lg border bg-background px-4 py-3">
                <p className="text-muted-foreground">
                  Atendimentos
                </p>
  
                <p className="text-xl font-semibold">
                  {totalConfirmedAppointments}
                </p>
              </div>
  
              <div className="rounded-lg border bg-background px-4 py-3">
                <p className="text-muted-foreground">
                  Total
                </p>
  
                <p className="text-xl font-semibold">
                  {formatCurrency(totalConfirmedRevenue)}
                </p>
              </div>
            </div>
          </div>
  
          <Card className="mt-8">
            <CardContent className="pt-6">
              <form
                method="get"
                className="flex flex-col gap-3 sm:flex-row"
              >
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
  
                  <Input
                    name="busca"
                    defaultValue={searchTerm}
                    placeholder="Buscar por nome, WhatsApp ou e-mail"
                    className="pl-9"
                  />
                </div>
  
                <button
                  type="submit"
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Buscar
                </button>
  
                {searchTerm ? (
                  <Link
                    href="/painel/clientes"
                    className={buttonVariants({
                      variant: "outline",
                    })}
                  >
                    Limpar
                  </Link>
                ) : null}
              </form>
            </CardContent>
          </Card>
  
          {hasError ? (
            <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Não foi possível carregar todos os dados das
              clientes.
            </p>
          ) : null}
  
          {!hasError && groupedClients.length === 0 ? (
            <Card className="mt-6">
              <CardContent className="py-14 text-center">
                <UserRound className="mx-auto size-10 text-muted-foreground" />
  
                <p className="mt-4 font-medium">
                  {searchTerm
                    ? "Nenhuma cliente encontrada."
                    : "Nenhuma cliente cadastrada ainda."}
                </p>
  
                <p className="mt-2 text-sm text-muted-foreground">
                  As clientes aparecerão aqui depois dos
                  agendamentos.
                </p>
              </CardContent>
            </Card>
          ) : null}
  
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {groupedClients.map((client) => {
              const phoneDigits = onlyDigits(client.phone);
  
              return (
                <Card key={client.key}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{client.name}</CardTitle>
  
                        <CardDescription className="mt-1">
                          {client.phone || "WhatsApp não informado"}
                        </CardDescription>
                      </div>
  
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {client.confirmedAppointments}{" "}
                        {client.confirmedAppointments === 1
                          ? "atendimento"
                          : "atendimentos"}
                      </span>
                    </div>
                  </CardHeader>
  
                  <CardContent>
                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">
                          Total em serviços confirmados
                        </p>
  
                        <p className="text-lg font-semibold">
                          {formatCurrency(
                            client.totalConfirmedCents,
                          )}
                        </p>
                      </div>
  
                      {client.nextAppointment ? (
                        <div className="rounded-lg border border-green-600/30 bg-green-600/10 p-3">
                          <p className="flex items-center gap-2 font-medium text-green-700">
                            <CalendarDays className="size-4" />
                            Próximo agendamento
                          </p>
  
                          <p className="mt-1">
                            {formatDate(
                              client.nextAppointment
                                .appointment_date,
                            )}
                            {" às "}
                            {formatTime(
                              client.nextAppointment
                                .start_time,
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg border bg-muted/30 p-3 text-muted-foreground">
                          Nenhum próximo agendamento.
                        </div>
                      )}
  
                      {client.lastAppointment ? (
                        <div>
                          <p className="text-muted-foreground">
                            Último atendimento
                          </p>
  
                          <p className="font-medium">
                            {formatDate(
                              client.lastAppointment
                                .appointment_date,
                            )}
                          </p>
                        </div>
                      ) : null}
  
                      {client.pendingAppointments > 0 ? (
                        <p className="text-amber-700">
                          {client.pendingAppointments} pagamento(s)
                          aguardando confirmação.
                        </p>
                      ) : null}
                    </div>
  
                    <Link
                      href={`/painel/clientes/${client.representativeClientId}`}
                      className={buttonVariants({
                        className: "mt-5 w-full gap-2",
                      })}
                    >
                      <History className="size-4" />
                      Ver histórico
                    </Link>
  
                    {phoneDigits ? (
                      <a
                        href={`https://wa.me/${phoneDigits}`}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonVariants({
                          variant: "outline",
                          className: "mt-3 w-full gap-2",
                        })}
                      >
                        <MessageCircle className="size-4" />
                        Abrir WhatsApp
                      </a>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    );
  }