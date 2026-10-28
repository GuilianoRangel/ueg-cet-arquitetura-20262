# Monorepo — Regras Globais

## 🛠️ Stack Tecnológica
- **Backend**: NestJS 11 (apps/backend)
- **Frontend**: Angular 21+ (apps/frontend)
- **Shared packages**: Localizados na pasta `packages/`
- **Gerenciador de Pacotes**: `pnpm` (versão 9.0.0+) com workspaces
- **Orquestrador de Tarefas**: Turborepo (`turbo`)

---

## 🔒 Regras de Arquitetura e Código
- **TypeScript Strict**: Obrigatório em todos os pacotes. É mandatória a ativação de `"strict": true`, `"noUnusedLocals": true`, e `"noUnusedParameters": true`.
- **🚫 Proibição Estrita do Tipo `any`**: O uso de `any` é estritamente proibido tanto no frontend quanto no backend. Todo elemento deve ser tipado de forma forte e explícita. Exceção única se houver uma orientação explícita do usuário em sua especificação.
- **Shared Code**: Todo código compartilhado entre frontend e backend deve residir exclusivamente em `packages/` (ex: `packages/utils`). Nunca faça importações de `apps/` de dentro de `packages/`.
- **Conventional Commits**: Siga o padrão para mensagens de commit: `feat(backend):`, `feat(frontend):`, `fix(utils):`, etc.
- **Clean Code e Clean Architecture**: Sempre siga as diretrizes de código limpo com enfoque no SRP (Single Responsibility Principle) e separação clara de camadas.

---

## 🧪 Qualidade e Testes (TDD Mandatório)
- **TDD Obrigatório**: Novos desenvolvimentos e alterações de lógica de negócio devem possuir testes unitários criados ANTES ou em paralelo com a implementação.
- **Cobertura**: Focar em 100% de cobertura nos testes unitários e de integração:
  - **Backend**: Utiliza **Jest**.
  - **Frontend**: Utiliza **Vitest** e `@angular/core/testing` (TestBed).

---

## 📋 Fluxo de Desenvolvimento de Novas Features
- **Planejamento Prévio Obrigatório**: É terminantemente proibido iniciar qualquer escrita de código sem que exista o documento de requisitos de negócio em `specs/[feature].md` e o roteiro técnico de execução em `specs/plan/[feature]-plan.md` (veja `specs/auth.md` e `specs/plan/auth-plan.md` como modelos).

---

## 📚 Referências de Skills (Diretrizes de IA)
Para obter detalhes de implementação avançados, melhores práticas e diretrizes específicas de testes e arquitetura, o agente de IA **DEVE** consultar e ler as seguintes documentações de Skill no repositório:
- **Angular (Frontend)**:
  - Para padrões de desenvolvimento, signals e estrutura de componentes Angular: [angular-dev](../skills/angular-dev/SKILL.md)
  - Para boas práticas de testes unitários e TestBed no frontend: [angular-testing](../skills/angular-testing/SKILL.md)
- **NestJS (Backend)**:
  - Para padrões de injeção de dependência, modularidade e clean backend: [nestjs-best-practices](../skills/nestjs-best-practices/SKILL.md)
  - Para padrões de testes unitários, e2e e mocks com Jest: [nestjs-testing-expert](../skills/nestjs-testing-expert/SKILL.md)
- **Estilo e Qualidade**:
  - Para padrões premium de design com TailwindCSS v4: [tailwind-design-system](../skills/tailwind-design-system/SKILL.md) e [frontend-design](../skills/frontend-design/SKILL.md)
  - Para aplicação de princípios Clean Code e SRP na prática: [clean-code](../skills/clean-code/SKILL.md)
