# Project AI Guidelines (AGENT.md)

Este arquivo define as **Skills** e **Rules** que devem ser rigorosamente seguidas por qualquer agente de Inteligência Artificial (como o Antigravity) atuando neste monorepo. O objetivo é manter o padrão de código, a arquitetura e a consistência técnica do projeto de ponta a ponta.

Antes de propor qualquer modificação ou iniciar uma implementação estrutural, o agente DEVE consultar o documento de [Especificação Arquitetural](specs/arquitetura.md) assim como as regras e os fluxos descritos na pasta `.agents`.

## 📚 Rules (Regras do Projeto)
As regras definem as diretrizes arquiteturais, padrões de código e convenções do monorepo. Elas estão localizadas no diretório `.agents/rules/`.

- **[Regras Globais do Monorepo](.agents/rules/general.md)**
  - Define o stack principal: Nest.js 11 (Backend), Angular 20+ (Frontend).
  - Configurações do `pnpm workspaces` e Turborepo.
  - Princípios mandatórios de Clean Code e Clean Architecture.
  - Regras de compartilhamento de código (apenas em `packages/`) e formatação de commits (Conventional Commits).

- **[Regras do Backend (NestJS)](.agents/rules/nestjs.md)**
  - Padrões de injeção de dependência e divisão modular por domínio.
  - Uso mandatório de DTOs (validados com class-validator) e tratamento global via `ExceptionFilter`.
  - Exceções padronizadas, exigindo que regras de negócio disparem uma `BusinessException` que retorna erros HTTP formatados.

- **[Regras do Frontend (Angular)](.agents/rules/angular.md)**
  - Angular **Standalone Components** apenas (sem NgModules).
  - Estilização exclusiva com **TailwindCSS** (v4) e controle de estado reativo via **Signals**.
  - **Uso de SCSS**: O projeto está configurado no `angular.json` para usar **SCSS** como padrão para componentes (`schematics.style: "scss"`). Ao separar estilos de componentes, utilize arquivos `.scss` e referencie-os via `styleUrl`.
  - **MANDATÓRIO:** Toda construção ou refatoração de interface DEVE usar as especificações e componentes catalogados no **[Design System UEG](specs/design-system.md)** (`<ui-button>`, `<ui-card>`, etc). Fica proibido o uso de marcação HTML crua com estilos soltos que não obedeçam o Design System.
  - Componentização guiada por Container vs Presentational e padrões estritos de nomenclatura (`-list`, `-form`, `-detail`, etc).
  - Exigência de prever tratamentos de UX (Loading, Erro, Vazio) em todas as telas.
  - **Feedback Rápido (Toasts)**: Para exibir notificações temporárias que desaparecem automaticamente (sucesso, erro ou informação), injete o `ToastService` (`import { ToastService } from '../shared/components/ui/toast.service'`) e invoque os métodos `success()`, `error()` ou `info()`. Evite o uso de `alert()` ou `confirm()` nativos do navegador.

---

## 🛠 Skills (Habilidades e Comportamentos do Agente)
As skills definem as abordagens práticas na hora de codificar ou resolver problemas. O projeto implementa várias *Skills* em `.agents/skills/` que instruem como o agente deve agir nas implementações.

As principais skills ativadas são:

- **`angular-testing`**: Padrões de testes unitários e de integração para Angular, cobrindo componentes usando Signals, OnPush e HTTP Interactions.
- **`nestjs-testing-expert` & `nestjs-best-practices`**: Melhores práticas arquiteturais em NestJS, junto de abordagens para manter boa cobertura de testes utilizando Jest.
- **`tailwind-design-system` & `frontend-design`**: Foco em desenvolver interfaces premium, modernas e robustas, construindo design systems escaláveis com TailwindCSS.
- **`clean-code`**: Escrever e refatorar "códigos que funcionam" para "códigos limpos".
- **`ai-integration.md` / `new-feature.md`**: Fluxos engessados sobre como o agente deve abordar a construção de integrações ou de novas funcionalidades (exigindo **TDD** como passo inicial e obrigatório, tanto no Back quanto no Front).

> [!IMPORTANT]  
> **INSTRUÇÃO CRÍTICA PARA O AGENTE DE IA:**
> 1. Toda e qualquer alteração de código ou sugestão DEVE respeitar estas restrições.
> 2. Ao assumir uma nova tarefa complexa neste repositório, faça a leitura dos arquivos de regra para atualizar o seu contexto antes de gerar o plano de implementação.
> 3. **Planejamento de Ações**: Ao criar ou atualizar o plano de implementação (`implementation_plan.md`), o agente DEVE incluir explicitamente no planejamento quais **Skills** ativas deverão ser utilizadas na tarefa.
> 4. **Ambiente de Execução (NVM)**: O agente DEVE sempre carregar explicitamente o NVM e a estrutura do pnpm do usuário para a execução de todos os comandos do terminal linux:
>    `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && export PNPM_HOME="/home/guiliano/.local/share/pnpm" && export PATH="$PNPM_HOME:$PATH" && <comando>`
> 5. **Proibição Estrita do Tipo `any`**: O agente NÃO deve utilizar o tipo `any` no TypeScript em nenhuma assinatura, retorno, método ou variável do monorepo, a menos que seja explicitamente orientado pelo usuário a fazê-lo.
> 6. Use as *Skills* ativas (como design frontend de alta qualidade e TDD) a seu favor para alinhar suas entregas com a expectativa profissional do usuário.
