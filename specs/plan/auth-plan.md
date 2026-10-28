# Plano de Implementação: Autenticação e Gestão de Usuários

Este documento detalha as tarefas estruturadas para implementar a funcionalidade de Autenticação, respeitando a especificação base em `specs/auth.md` e as diretrizes arquiteturais definidas em `AGENT.md`.

## 1. Backend (NestJS 11)
- [x] **Configuração do Banco de Dados (Prisma/TypeORM)**: Criar e aplicar migration para a entidade `User` contendo `id` (UUID), `email` (único), `nome`, `senha` (hash), `ativo` (boolean, default `false`) e `role` (enum: `admin`, `user`).
- [x] **Seed Administrativo**: Criar script de seed para garantir que um administrador padrão (ex: `admin@ueg.br`) exista no sistema com status ativo.
- [x] **Módulo de Usuários (`UsersModule`)**:
  - Implementar DTOs com `class-validator`.
  - Criar `UsersService` e `UsersController` para lidar com regras de criação, busca, listagem, ativação e bloqueio.
  - Disparar a `BusinessException` formatada ao lidar com erros conhecidos.
- [x] **Módulo de Autenticação (`AuthModule`)**:
  - Implementar estratégia de Passport Local + JWT.
  - Controlar o ciclo de vida da sessão configurado para expirar em 60 minutos.
- [x] **Endpoints de Auth**:
  - `POST /auth/register`: Cadastro, garantindo criação inativa. Redirecionar logica para erro `AUTH_EMAIL_EXISTS`.
  - `POST /auth/login`: Validação com bcrypt e checagem de conta inativa (`AUTH_USER_INACTIVE` / `AUTH_INVALID_CREDENTIALS`).
  - `POST /auth/forgot-password`: Gerar token único e notificar o envio do e-mail.
  - `POST /auth/reset-password`: Consumir o token de reset e alterar a senha.
- [x] **Guards & Decorators**:
  - Implementar `JwtAuthGuard` (proteger rotas).
  - Implementar `RolesGuard` e decorator `@Roles('admin')` para áreas restritas.
- [x] **Endpoints Administrativos**:
  - `GET /users`: Retornar listagem de usuários.
  - `PATCH /users/:id/activate`: Alternar status `ativo` para `true`.
  - `POST /users/:id/reset-password`: Disparar via back-end o e-mail de recuperação para um usuário específico.

## 2. Frontend (Angular 20+)
- [x] **Serviço de Autenticação (`AuthService`)**:
  - Gerenciar a persistência do JWT.
  - Usar **Signals** para expor e manter reativamente o estado do usuário (se está logado, perfil, role).
- [x] **Interceptors e Guards**:
  - Implementar `AuthInterceptor` para anexar o Bearer Token do JWT em cada requisição à API.
  - Implementar `AuthGuard` para bloquear navegação em rotas protegidas e redirecionar para a página de "Acesso Necessário" ou Login.
- [x] **Páginas / Componentes (Standalone, TailwindCSS v4, Design Premium)**:
  - [x] **Login**: Formulário validado. Comportamento para sessão expirada ou erro de inatividade (`AUTH_USER_INACTIVE`).
  - [x] **Cadastro**: Criar conta, alertando o usuário sobre a necessidade de ativação pelo administrador.
  - [x] **Esqueci minha senha**: Entrada simples e aviso genérico de sucesso visando segurança.
  - [x] **Nova Senha**: Tela que recebe via query params o token temporário.
  - [x] **Acesso Necessário / Erro de Autenticação**: Tela amigável exibida antes do redirecionamento para áreas protegidas.
- [x] **Layout Compartilhado**:
  - [x] **Header**: Atualizar via signal o estado exibindo o nome do usuário logado de forma reativa.
- [x] **Área Administrativa (Admin)**:
  - [x] **Listagem de Usuários**: Tabela/grid moderna com funcionalidades para "Ativar" um usuário e "Enviar Redefinição de Senha".

## 3. Utilitários (Utilities)
- [x] **Backend - Serviço de E-mail (SMTP)**: Utilitário isolado e integrável que consome variáveis de ambiente (Google SMTP) para disparo do link temporário.
- [x] **Backend - Hash Provider**: Serviço/Wrapper sobre a biblioteca `bcrypt` responsável por centralizar o hashing e validação das senhas.
- [x] **Backend - Gerador de Tokens (Recovery)**: Implementação temporária de cache/redis ou serviço criptográfico assinado para garantir a validade única de links de reset.
- [x] **Frontend - Error Handler**: Função utilitária que mapeia códigos de erro recebidos via backend (`AUTH_USER_INACTIVE`, `AUTH_SESSION_EXPIRED`) para mensagens ricas amigáveis (Toasts/Alerts).

## 4. Testes Unitários e de Integração (TDD Mandatório)
- [x] **Backend (Jest)**:
  - [x] **AuthService**: Mock do gerador de JWT e do comparador de Bcrypt; Testar fluxos de credencial incorreta, conta inativa, sucesso.
  - [x] **UsersService**: Cobertura das regras de negócio como prevenção de e-mail duplicado e validações de admin na aprovação/reset.
  - [x] **Utilitários**: Testar que utilitários de hash realmente retornam resultados mascarados.
- [x] **Frontend (Vitest / Jasmine + TestBed)**:
  - [x] **AuthService**: Utilizar `HttpTestingController` para simular as respostas do backend (200 OK ou 4xx).
  - [x] **Guards**: Testar se o guard corretamente barra a navegação e executa o redirecionamento (via `RouterTestingHarness`).
  - [x] **Componentes**: Focar na reatividade de formulários baseados em Signals, testando se os inputs disparam erros, e se as mensagens de feedback aparecem na DOM.
