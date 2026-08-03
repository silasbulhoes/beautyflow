import {
    ArrowLeft,
    Database,
    Mail,
    ShieldCheck,
    UserRoundCheck,
  } from "lucide-react";
  import type { Metadata } from "next";
  import Link from "next/link";
  
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import {
    PRIVACY_NOTICE_UPDATED_AT,
    PRIVACY_NOTICE_VERSION,
  } from "@/lib/privacy";
  
  export const metadata: Metadata = {
    title: "Aviso de Privacidade | BeautyFlow",
    description:
      "Informações sobre o tratamento de dados pessoais no BeautyFlow.",
  };
  
  function getPrivacyContactEmail() {
    return String(
      process.env.PRIVACY_CONTACT_EMAIL ?? "",
    ).trim();
  }
  
  export default function PrivacyPage() {
    const privacyContactEmail =
      getPrivacyContactEmail();
  
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar ao BeautyFlow
          </Link>
  
          <div className="mt-8">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <ShieldCheck className="size-6 text-primary" />
              </div>
  
              <div>
                <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                  Privacidade e proteção de dados
                </p>
  
                <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
                  Aviso de Privacidade
                </h1>
  
                <p className="mt-3 text-muted-foreground">
                  Este aviso explica como os dados pessoais
                  são utilizados durante o agendamento e o
                  pagamento de serviços pelo BeautyFlow.
                </p>
              </div>
            </div>
  
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border bg-background px-3 py-1">
                Versão {PRIVACY_NOTICE_VERSION}
              </span>
  
              <span className="rounded-full border bg-background px-3 py-1">
                Atualizado em {PRIVACY_NOTICE_UPDATED_AT}
              </span>
            </div>
          </div>
  
          <div className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  1. Quem trata seus dados
                </CardTitle>
  
                <CardDescription>
                  Participantes envolvidos na prestação do
                  serviço.
                </CardDescription>
              </CardHeader>
  
              <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                <p>
                  O estabelecimento ou profissional que
                  oferece o serviço é responsável pelas
                  decisões relacionadas ao atendimento,
                  agendamento e relacionamento com suas
                  clientes.
                </p>
  
                <p>
                  O BeautyFlow fornece a plataforma
                  tecnológica utilizada para organizar
                  agendamentos, clientes e pagamentos.
                </p>
  
                <p>
                  Dependendo da operação realizada, o
                  estabelecimento e o BeautyFlow poderão
                  assumir responsabilidades distintas no
                  tratamento dos dados pessoais.
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="size-5" />
                  2. Dados que podem ser coletados
                </CardTitle>
              </CardHeader>
  
              <CardContent className="text-sm leading-7 text-muted-foreground">
                <ul className="space-y-2">
                  <li>
                    • Nome completo para identificação da
                    cliente.
                  </li>
  
                  <li>
                    • CPF ou CNPJ necessário ao
                    processamento do pagamento.
                  </li>
  
                  <li>
                    • Número de WhatsApp para comunicações
                    relacionadas ao agendamento.
                  </li>
  
                  <li>
                    • E-mail, quando informado pela
                    cliente.
                  </li>
  
                  <li>
                    • Serviço, data, horário e valores do
                    agendamento.
                  </li>
  
                  <li>
                    • Identificadores e situação do
                    pagamento.
                  </li>
  
                  <li>
                    • Registros técnicos necessários à
                    segurança e ao funcionamento do
                    sistema.
                  </li>
                </ul>
  
                <p className="mt-5">
                  O BeautyFlow não armazena o número
                  completo do cartão nem o código de
                  segurança. O pagamento eletrônico é
                  realizado no ambiente do prestador de
                  pagamentos.
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader>
                <CardTitle>
                  3. Para que os dados são utilizados
                </CardTitle>
              </CardHeader>
  
              <CardContent className="text-sm leading-7 text-muted-foreground">
                <ul className="space-y-2">
                  <li>
                    • Criar, confirmar, remarcar ou cancelar
                    o agendamento.
                  </li>
  
                  <li>
                    • Processar o sinal e identificar o
                    pagamento.
                  </li>
  
                  <li>
                    • Evitar reserva duplicada do mesmo
                    horário.
                  </li>
  
                  <li>
                    • Permitir a comunicação entre a
                    cliente e o estabelecimento.
                  </li>
  
                  <li>
                    • Manter o histórico de atendimento e
                    financeiro do estabelecimento.
                  </li>
  
                  <li>
                    • Prevenir fraude, abuso e uso indevido
                    da plataforma.
                  </li>
  
                  <li>
                    • Cumprir obrigações legais,
                    regulatórias e exercer direitos em
                    processos administrativos ou
                    judiciais.
                  </li>
                </ul>
  
                <p className="mt-5">
                  O tratamento necessário para criar o
                  agendamento e processar o pagamento pode
                  ser fundamentado na execução de contrato
                  ou em procedimentos preliminares
                  solicitados pela própria cliente.
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader>
                <CardTitle>
                  4. Compartilhamento dos dados
                </CardTitle>
              </CardHeader>
  
              <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                <p>
                  Os dados podem ser compartilhados apenas
                  quando necessário com:
                </p>
  
                <ul className="space-y-2">
                  <li>
                    • O estabelecimento ou profissional
                    responsável pelo atendimento.
                  </li>
  
                  <li>
                    • O Asaas, para criação e processamento
                    do pagamento.
                  </li>
  
                  <li>
                    • Fornecedores de banco de dados,
                    hospedagem, autenticação e
                    infraestrutura tecnológica.
                  </li>
  
                  <li>
                    • Autoridades públicas, quando houver
                    obrigação legal ou ordem válida.
                  </li>
                </ul>
  
                <p>
                  O BeautyFlow não vende os dados pessoais
                  das clientes e não os disponibiliza para
                  publicidade de terceiros.
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader>
                <CardTitle>
                  5. Prazo de armazenamento
                </CardTitle>
              </CardHeader>
  
              <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                <p>
                  Os dados serão mantidos pelo período
                  necessário para realizar o agendamento,
                  processar o pagamento, prestar suporte,
                  manter o histórico do estabelecimento e
                  cumprir obrigações legais ou
                  regulatórias.
                </p>
  
                <p>
                  Após o encerramento das finalidades, os
                  dados poderão ser eliminados,
                  anonimizados ou mantidos de forma
                  restrita quando a conservação for
                  permitida ou exigida pela legislação.
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRoundCheck className="size-5" />
                  6. Direitos da titular
                </CardTitle>
              </CardHeader>
  
              <CardContent className="text-sm leading-7 text-muted-foreground">
                <p>
                  A cliente pode solicitar, conforme
                  aplicável:
                </p>
  
                <ul className="mt-4 space-y-2">
                  <li>
                    • Confirmação da existência de
                    tratamento.
                  </li>
  
                  <li>• Acesso aos seus dados.</li>
  
                  <li>
                    • Correção de dados incompletos,
                    inexatos ou desatualizados.
                  </li>
  
                  <li>
                    • Informação sobre compartilhamentos.
                  </li>
  
                  <li>
                    • Anonimização, bloqueio ou eliminação
                    de dados desnecessários ou tratados em
                    desconformidade.
                  </li>
  
                  <li>
                    • Eliminação dos dados tratados com
                    consentimento, quando essa for a base
                    utilizada e não existir motivo legal
                    para conservação.
                  </li>
  
                  <li>
                    • Revisão das decisões exclusivamente
                    automatizadas, quando aplicável.
                  </li>
                </ul>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader>
                <CardTitle>
                  7. Segurança da informação
                </CardTitle>
              </CardHeader>
  
              <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                <p>
                  O BeautyFlow utiliza controles de acesso,
                  autenticação, separação dos dados por
                  estabelecimento, proteção de credenciais
                  e outras medidas técnicas e
                  administrativas destinadas a reduzir
                  riscos de acesso indevido, perda,
                  alteração ou divulgação não autorizada.
                </p>
  
                <p>
                  Nenhum sistema é completamente imune a
                  incidentes, mas medidas de prevenção,
                  identificação e resposta são adotadas de
                  acordo com os riscos da operação.
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="size-5" />
                  8. Canal de privacidade
                </CardTitle>
  
                <CardDescription>
                  Utilize este canal para dúvidas ou
                  solicitações relacionadas aos seus dados.
                </CardDescription>
              </CardHeader>
  
              <CardContent>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/privacidade/solicitacao"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
                  >
                    Enviar solicitação de dados
                  </Link>
  
                  {privacyContactEmail ? (
                    <a
                      href={`mailto:${privacyContactEmail}`}
                      className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-5 text-sm font-medium shadow-xs transition-colors hover:bg-muted"
                    >
                      Enviar e-mail
                    </a>
                  ) : null}
                </div>
  
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  A solicitação poderá exigir confirmação
                  da identidade da titular para evitar que
                  dados sejam entregues ou alterados por
                  pessoa não autorizada.
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader>
                <CardTitle>
                  9. Alterações deste aviso
                </CardTitle>
              </CardHeader>
  
              <CardContent className="text-sm leading-7 text-muted-foreground">
                Este aviso poderá ser atualizado para
                refletir mudanças no BeautyFlow, nas
                operações de tratamento ou na legislação.
                A data e a versão mais recentes ficarão
                disponíveis no início desta página.
              </CardContent>
            </Card>
          </div>
  
          <footer className="mt-8 border-t py-6 text-center text-sm text-muted-foreground">
            BeautyFlow — Aviso de Privacidade versão{" "}
            {PRIVACY_NOTICE_VERSION}
          </footer>
        </div>
      </main>
    );
  }