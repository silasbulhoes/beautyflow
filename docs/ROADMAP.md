# Roadmap do BeautyFlow

## Fase 1 — Fundação

- Criar conta no GitHub
- Instalar Git
- Instalar Node.js
- Instalar Cursor
- Criar repositório
- Criar aplicação Next.js
- Criar documentação inicial
- Configurar versionamento

Status: concluída.

---

## Fase 2 — Base técnica

- Instalar shadcn/ui
- Configurar organização de pastas
- Criar projeto no Supabase
- Configurar variáveis de ambiente
- Configurar banco PostgreSQL
- Configurar Prisma
- Criar modelo inicial do banco
- Configurar autenticação

---

## Fase 3 — Cadastro da profissional

- Criar conta
- Fazer login
- Recuperar senha
- Criar empresa ou estúdio
- Informar nome do negócio
- Informar telefone
- Informar Instagram
- Criar link público do estúdio

---



## Fase 4 — Serviços

- Cadastrar serviço
- Editar serviço
- Desativar serviço
- Informar descrição
- Informar preço
- Informar duração
- Informar porcentagem do sinal

---



## Fase 5 — Disponibilidade

- Configurar dias de atendimento
- Configurar horários de funcionamento
- Configurar intervalo
- Bloquear dias específicos
- Bloquear horários específicos
- Impedir conflitos de agenda

---



## Fase 6 — Agendamento público

- Exibir página do estúdio
- Exibir serviços
- Escolher serviço
- Escolher data
- Escolher horário
- Informar dados da cliente
- Exibir resumo
- Criar agendamento pendente

---



## Fase 7 — Pagamento

- Integrar Mercado Pago
- Gerar Pix
- Calcular sinal
- Reservar horário temporariamente
- Confirmar pagamento
- Confirmar agendamento
- Liberar horário quando o pagamento expirar

---



## Fase 8 — Painel da profissional

- Exibir agenda do dia
- Exibir agenda da semana
- Exibir detalhes do atendimento
- Cancelar agendamento
- Remarcar agendamento
- Marcar atendimento como concluído
- Exibir valores recebidos e pendentes

---



## Fase 9 — Validação

- Colocar a esposa do fundador como primeira usuária
- Acompanhar o uso real
- Registrar dificuldades
- Corrigir erros
- Melhorar a experiência
- Convidar outras profissionais para testar

---



## Versão 2

Funcionalidades futuras:

- lembretes automáticos;
- integração com WhatsApp;
- lista de espera;
- programa de fidelidade;
- relatórios avançados;
- múltiplos profissionais;
- controle de comissão;
- estoque;
- inteligência artificial.

---

## Finalização para produção — 2026-08

- [x] Corrigir cancelamento para `cancelled` e tornar estorno idempotente.
- [x] Adicionar recuperação e alteração de senha.
- [x] Criar página pública de planos sem cobrança automática.
- [x] Preparar migration incremental de planos, billing, auditoria e reconciliação.
- [x] Criar reconciliação protegida para pagamentos pendentes.
- [ ] Revisar e aplicar migrations no Supabase após aprovação.
- [ ] Confirmar/reconectar a conta Asaas correta após aprovação.
- [ ] Ativar e testar billing da plataforma em Sandbox.
- [ ] Executar primeiro pagamento e estorno real após aprovação.
- [ ] Habilitar enforcement somente após período de observação.

