# Monorepo UEG2 — Autenticação e Gestão de Usuários (Starter/Stub Project)

Este repositório serve como um **projeto base (starter/stub project)** moderno e estruturado para o portal acadêmico da UEG, integrando as camadas de **Autenticação Segura** e **Gestão Administrativa** de ponta a ponta. A arquitetura foi concebida sob os pilares de alto desempenho, reatividade baseada em Signals e testes rigorosos (TDD).

---

## 📌 Como Usar como Stub/Starter Project

Para utilizar este projeto como ponto de partida para um novo repositório:

### Passo 1: Clonar o Repositório Base
Clone o repositório especificando a branch desejada e a pasta destino do seu novo projeto:
```bash
git clone -b clean-project-AI-workflow --single-branch https://github.com/GuilianoRangel/UEG-CET-PROGWEB1-20261-monorepo-ueg.git meu-novo-projeto
cd meu-novo-projeto
```

### Passo 2: Inicializar o seu Próprio Repositório Git
Você tem duas opções dependendo de como deseja gerenciar o histórico:

#### Opção A: Começar um Histórico Limpo (Recomendado)
Se deseja remover o histórico de commits deste template e iniciar do zero:
```bash
# Remove a pasta .git existente
rm -rf .git

# Inicializa um novo repositório
git init

# Adiciona todos os arquivos do stub
git add .
git commit -m "chore: initial commit from stub template"

# Conecta ao seu novo repositório remoto
git remote add origin <URL_DO_SEU_NOVO_REPOSITORIO>
git branch -M main
git push -u origin main
```

#### Opção B: Manter o Histórico e Rastrear Atualizações (Recomendado)
Se você deseja manter o histórico do template para poder puxar futuras atualizações e melhorias deste stub utilizando comandos de merge:

```bash
# 1. Renomeie a branch atual do template local para 'template-base' (servirá para rastrear atualizações)
git branch -m clean-project-AI-workflow template-base

# 2. Crie e acesse a sua branch principal de desenvolvimento (ex: main)
git checkout -b main

# 3. Remova o remote 'origin' antigo (aponta para o stub) e adicione o seu novo repositório
git remote remove origin
git remote add origin <URL_DO_SEU_NOVO_REPOSITORIO>

# 4. Adicione o repositório original do stub como 'upstream' para receber atualizações futuras
git remote add upstream https://github.com/GuilianoRangel/UEG-CET-PROGWEB1-20261-monorepo-ueg.git

# 5. Envie ambas as branches para o seu novo repositório
git push -u origin main
git push -u origin template-base
```

Dessa forma, você poderá utilizar o script automatizado `scripts/update-template.sh` para puxar atualizações futuras do stub diretamente para a sua branch de trabalho. Veja mais detalhes no guia [docs/template-update.md](file:///home/guiliano/workspace/monorepo-ueg2/docs/template-update.md).

---


## 🛠️ Stack Tecnológico

O ecossistema do monorepo é construído com as seguintes tecnologias de ponta:

* **Gerenciamento de Monorepo**: `pnpm workspaces` + **Turborepo** (orquestração rápida de tarefas e cache)
* **Backend**: **NestJS 11** (TypeScript, SQLite com TypeORM, Passport JWT, Bcrypt, Nodemailer)
* **Frontend**: **Angular 21** (Standalone Components, **TailwindCSS v4**, **Signals** e **computed** signals)
* **Testes (TDD)**: **Jest** (Backend) e **Vitest** (Frontend com TestBed)

---

## 📁 Estrutura do Projeto

O repositório adota a estrutura padrão de workspaces:

```
├── apps/
│   ├── backend/           # API REST modular desenvolvida em NestJS 11
│   └── frontend/          # Aplicação Web SPA desenvolvida em Angular 21
├── packages/              # Pacotes e configurações compartilhados do monorepo
│   ├── eslint-config/     # Padrões de análise estática e linting
│   ├── typescript-config/ # Configurações Typescript compartilhadas
│   └── utils/             # Funções utilitárias compartilhadas
├── specs/                 # Especificações técnicas e planos do sistema
│   ├── auth.md            # Especificação de requisitos da autenticação
│   ├── arquitetura.md     # Detalhes de arquitetura, fluxos Mermaid e Signals
│   └── plan/              # Planos de implementação passo a passo
├── docs/                  # Documentação do projeto e guias
│   ├── smtp-config.md     # Configuração de envio de e-mails
│   └── template-update.md # Guia de atualização a partir do template (stub)
├── scripts/               # Scripts utilitários de automação
│   └── update-template.sh # Script para mesclar atualizações do template upstream
├── .agents/               # Instruções críticas, regras de codificação e skills para IA
└── AGENT.md               # Guia de governança de Inteligência Artificial
```

---

## ⚙️ Pré-requisitos de Desenvolvimento

Antes de rodar o projeto localmente, certifique-se de possuir instalado em sua máquina:
1. **Node.js**: Recomendado a versão LTS estável. O monorepo possui suporte ao **NVM** (Node Version Manager) para controle de versões.
2. **PNPM**: Gerenciador de pacotes rápido e eficiente (v9.0.0 ou superior). Instale globalmente com `npm i -g pnpm`.

---

## 🚀 Como Iniciar (Primeiros Passos)

Siga os passos abaixo para preparar seu ambiente local:

### 1. Clonar o repositório
```bash
git clone https://github.com/GuilianoRangel/UEG-CET-PROGWEB1-20261-monorepo-ueg.git
cd monorepo-ueg2
```

### 2. Configurar o Ambiente de Versão do Node (NVM)
Caso possua o NVM instalado, ative o ambiente do repositório:
```bash
nvm use
```

### 3. Instalar Dependências do Monorepo
Instale todos os pacotes das aplicações (`apps`) e pacotes internos (`packages`) em uma única operação eficiente:
```bash
pnpm install
```

### 4. Iniciar o Ambiente de Desenvolvimento
```bash
pnpm dev
```
Ao iniciar, o backend criará automaticamente o **usuário administrador padrão** caso ele não exista:

| Campo | Valor |
| :--- | :--- |
| E-mail | `admin@ueg.br` |
| Senha | `admin123` |
| Role | `ADMIN` |

> ⚠️ **Altere a senha padrão do admin imediatamente em ambientes de produção.**

---

## 💻 Comandos Úteis do Workspace

Graças à integração do Turborepo, você pode executar tarefas globais a partir do diretório raiz:

| Comando | Descrição |
| :--- | :--- |
| `pnpm build` | Compila o backend e o frontend simultaneamente sem erros de type-check |
| `pnpm dev` | Inicia o backend (NestJS) e frontend (Angular) em paralelo com hot-reload ativo |
| `pnpm test` | Executa toda a suíte de testes unitários do monorepo (Jest no back, Vitest no front) |
| `pnpm lint` | Executa a varredura de erros de formatação e análise estática nos códigos |

### 🎯 Executando Comandos Filtrados (Por Aplicação)

Se você preferir atuar de forma focada em apenas um dos projetos, utilize os filtros do `pnpm`:

* **Apenas no Backend (NestJS)**:
  * Iniciar em desenvolvimento: `pnpm --filter backend dev`
  * Rodar testes unitários (Jest): `pnpm --filter backend test`
  * Compilar aplicação: `pnpm --filter backend build`

* **Apenas no Frontend (Angular)**:
  * Iniciar em desenvolvimento: `pnpm --filter frontend dev`
  * Rodar testes unitários (Vitest): `pnpm --filter frontend test`
  * Compilar aplicação: `pnpm --filter frontend build`

---

## 🛡️ Diretrizes de Qualidade e Governança de Código

Se você é um desenvolvedor humano ou um agente de Inteligência Artificial (IA), você **DEVE** seguir rigorosamente as regras abaixo:

1. **🚫 Sem `any` no TypeScript**: O uso de `any` está **terminantemente proibido** sob qualquer pretexto. Todas as assinaturas de métodos, retornos, controladores, serviços, guards e variáveis devem ser explicitamente e fortemente tipados.
2. **🧪 100% Cobertura em Testes (TDD)**: Toda alteração ou nova funcionalidade deve ser suportada por testes unitários correspondentes que garantam regressão zero.
3. **📚 Leitura Prévia de Governança**: Antes de iniciar uma sessão ou gerar planos de ação, consulte obrigatoriamente:
   - [AGENT.md](file:///home/guiliano/workspace/monorepo-ueg2/AGENT.md) — Regras e Skills de IA.
   - [specs/arquitetura.md](file:///home/guiliano/workspace/monorepo-ueg2/specs/arquitetura.md) — Fluxos de Segurança, tipagens corretas e reatividade baseada em Angular Signals.
