# Arquitetura do BeautyFlow

## 1. Objetivo

Este documento descreve a arquitetura técnica do BeautyFlow.

O BeautyFlow será inicialmente desenvolvido como uma aplicação full-stack utilizando Next.js. Essa escolha reduz a complexidade do MVP e permite validar o produto mais rapidamente.

---

## 2. Tecnologias principais

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- PostgreSQL
- Prisma
- Mercado Pago
- Vercel

---

## 3. Estrutura da aplicação

O sistema será dividido em três áreas principais:

### Área pública

Parte acessada pelas clientes das profissionais.

Exemplos:

- página do estúdio;
- catálogo de serviços;
- escolha de data e horário;
- dados da cliente;
- pagamento do sinal;
- confirmação do agendamento.



### Painel da profissional

Parte protegida por login.

Exemplos:

- dashboard;
- agenda;
- serviços;
- clientes;
- configurações;
- pagamentos.



### Área administrativa do SaaS

Área reservada para a administração do BeautyFlow.

Exemplos futuros:

- gerenciamento de assinaturas;
- gerenciamento de empresas;
- suporte;
- métricas de uso;
- bloqueio de contas.

---



## 4. Arquitetura inicial

Fluxo principal:

Cliente ou profissional

↓

Aplicação Next.js

↓

Rotas e ações do servidor

↓

Supabase e PostgreSQL

↓

Integrações externas

- Mercado Pago
- serviço de e-mail
- WhatsApp

---



## 5. Multiempresa

O BeautyFlow será um sistema multiempresa.

Cada negócio cadastrado será tratado como uma empresa independente.

Toda informação importante deverá estar relacionada a um `company_id`.

Exemplos:

- serviços;
- clientes;
- profissionais;
- agendamentos;
- pagamentos;
- configurações.

Uma empresa nunca poderá visualizar ou alterar dados de outra empresa.

---



## 6. Segurança

- Nunca armazenar senhas diretamente no banco.
- Nunca colocar chaves secretas no código.
- Utilizar variáveis de ambiente.
- Validar dados no servidor.
- Verificar o acesso da empresa em todas as operações.
- Utilizar autenticação do Supabase.
- Proteger rotas administrativas.
- Aplicar políticas de segurança no banco.

---



## 7. Estrutura inicial de pastas

```text

beautyflow/

├── docs/

├── public/

├── src/

│   ├── app/

│   ├── components/

│   ├── lib/

│   ├── services/

│   ├── types/

│   └── validations/

├── .env.local

├── package.json

└── [README.md](http://README.md)
```

