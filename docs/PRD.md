# BeautyFlow — Documento de Requisitos do Produto

## 1. Visão do produto

O BeautyFlow é uma plataforma SaaS de agendamento e gestão voltada inicialmente para nail designers autônomas.

A plataforma permitirá que a cliente escolha um serviço, consulte horários disponíveis, realize o agendamento e pague um sinal sem precisar conversar diretamente com a profissional pelo WhatsApp.

A profissional terá um painel para gerenciar serviços, horários, clientes, agendamentos e pagamentos.

---

## 2. Problema

Grande parte das profissionais da beleza administra o negócio manualmente pelo WhatsApp.

Isso exige que a profissional:

- responda repetidamente perguntas sobre preços;

- informe horários disponíveis;

- envie dados para pagamento do sinal;

- confirme pagamentos;

- registre horários manualmente;

- envie lembretes;

- reorganize a agenda quando houver cancelamentos.

Esse processo consome tempo, favorece erros e dificulta o crescimento do negócio.

---

## 3. Proposta de valor

> Sua agenda funcionando sozinha.

O BeautyFlow deverá ajudar a profissional a:

- reduzir mensagens repetitivas;

- diminuir faltas;

- receber sinais de forma organizada;

- evitar conflitos de horário;

- oferecer uma experiência mais profissional;

- visualizar melhor sua agenda e seus recebimentos.

---

## 4. Público-alvo inicial

O MVP será criado para:

- nail designers;

- manicures autônomas;

- profissionais que trabalham sozinhas;

- profissionais que recebem clientes com horário marcado;

- profissionais que atualmente administram a agenda pelo WhatsApp.

No futuro, a plataforma poderá atender:

- lash designers;

- designers de sobrancelhas;

- cabeleireiros;

- barbeiros;

- esteticistas;

- massoterapeutas;

- salões e clínicas de estética.

---

## 5. Usuários do sistema

### Profissional

É a cliente pagante do BeautyFlow.

Poderá:

- criar uma conta;

- cadastrar seu negócio;

- cadastrar serviços;

- definir preços e duração;

- configurar horários;

- visualizar agendamentos;

- bloquear períodos;

- acompanhar sinais e valores restantes.

### Cliente final

É a pessoa que agenda um atendimento com a profissional.

Poderá:

- acessar o link público;

- visualizar serviços e preços;

- escolher data e horário;

- informar seus dados;

- pagar o sinal;

- receber a confirmação do agendamento.

### Administrador do BeautyFlow

Gerenciará futuramente:

- empresas cadastradas;

- planos;

- assinaturas;

- suporte;

- bloqueios;

- indicadores gerais.

---

## 6. Fluxo principal da cliente

1. Acessar o link público da profissional.

2. Escolher um serviço.

3. Visualizar preço, duração e descrição.

4. Escolher uma data disponível.

5. Escolher um horário disponível.

6. Informar nome e telefone.

7. Conferir o resumo.

8. Pagar o sinal.

9. Receber a confirmação.

10. Ter o horário bloqueado na agenda.

---

## 7. Horários iniciais de validação

A primeira profissional utilizará inicialmente estes horários:

- 08:00 às 10:00;

- 10:00 às 12:00;

- 13:00 às 15:00;

- 15:00 às 17:00.

Entretanto, o sistema não deverá ficar preso a esses quatro horários. A arquitetura deverá permitir horários configuráveis e serviços com durações diferentes.

---

## 8. Funcionalidades do MVP

### Conta e negócio

- cadastro da profissional;

- login;

- recuperação de senha;

- criação do perfil do estúdio;

- criação de link público exclusivo.

### Serviços

- cadastrar serviço;

- editar serviço;

- desativar serviço;

- definir nome;

- definir descrição;

- definir preço;

- definir duração;

- definir porcentagem do sinal.

### Disponibilidade

- configurar dias de atendimento;

- configurar início e fim do expediente;

- configurar intervalos;

- bloquear datas;

- bloquear horários;

- impedir dois agendamentos conflitantes.

### Agendamento

- página pública do estúdio;

- seleção de serviço;

- seleção de data;

- seleção de horário;

- cadastro da cliente;

- resumo;

- agendamento pendente;

- confirmação após pagamento.

### Pagamento

- calcular sinal;

- gerar pagamento Pix;

- registrar status do pagamento;

- reservar horário temporariamente;

- confirmar horário após o pagamento;

- liberar horário quando o pagamento expirar.

### Painel

- agenda do dia;

- agenda semanal;

- informações da cliente;

- serviço agendado;

- sinal recebido;

- valor restante;

- cancelamento;

- remarcação;

- conclusão do atendimento.

---

## 9. Fora do MVP

Não serão implementados inicialmente:

- inteligência artificial;

- estoque;

- programa de fidelidade;

- marketplace;

- aplicativo nativo;

- múltiplas unidades;

- emissão de nota fiscal;

- comissões;

- campanhas de marketing;

- relatórios avançados;

- chatbot de WhatsApp.

---

## 10. Critérios de sucesso do MVP

O MVP será considerado validado quando:

- a esposa do fundador conseguir utilizá-lo na rotina real;

- as clientes conseguirem agendar sem ajuda;

- o sistema impedir conflitos de horário;

- o pagamento do sinal confirmar o agendamento;

- a profissional reduzir o atendimento manual;

- outras profissionais demonstrarem interesse em utilizar ou pagar pelo sistema.