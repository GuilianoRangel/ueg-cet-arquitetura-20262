# NestJS Rules

- **NestJS 11**: Estrutura modular limpa e orquestração de rotas utilizando a versão 11. (Consulte a Skill [nestjs-best-practices](../skills/nestjs-best-practices/SKILL.md) para padrões arquiteturais e boas práticas).
- **TypeScript Strict**: Tipagem forte mandatória em todas as partes do código.
- **🚫 Proibição Estrita do Tipo `any`**: O uso de `any` é terminantemente proibido.
  - Toda e qualquer propriedade de DTO, entidade de banco, parâmetros, retornos de controllers e services devem ser explicitamente tipados.
  - Para contextos de requisição Express em Guards/Interceptors, use a assinatura genérica do NestJS para obter tipagem segura (ex: `context.switchToHttp().getRequest<{ user?: User }>()`) em vez de conversões genéricas usando `any`.
- **TDD / Jest**: Todo service contendo lógica de negócio ou guard de segurança deve possuir cobertura de testes unitários desenvolvida em Jest. (Consulte a Skill [nestjs-testing-expert](../skills/nestjs-testing-expert/SKILL.md) para mock de dependências e padrões de teste backend).

---

## 🏗️ 1. Arquitetura e Estrutura Modular
- **Divisão por Domínio**: Organizar o código por módulos de domínio autônomos (ex: `src/users/`), contendo `module`, `controller`, `service`, `entities` e `dto`.
- **Responsabilidades Separadas (SRP)**:
  - **Controllers**: Apenas recebem requisições, chamam o service correspondente e retornam a resposta. Sem lógica de negócio complexa.
  - **Services**: Concentram toda a lógica de negócio, regras de validação lógica e persistência.
- **Injeção de Dependências (DI)**: Todos os providers devem ser injetados via construtor. Evitar a instanciação manual com `new` para classes registradas no contêiner.

---

## 🔒 2. Validação e Segurança
- **DTOs com Validação**: Payloads de entrada devem usar `class-validator` e `class-transformer` para validar e converter tipos de entrada de forma explícita.
- **Pipes de Validação**: Utilizar o `ValidationPipe` global do NestJS configurado para barrar payloads inválidos e realizar transformações automáticas.
- **Guards e Decorators**: Usar guards especializados (como `JwtAuthGuard` e `RolesGuard`) para controle de acessibilidade a rotas protegidas, controlando permissões por roles.
- **Segurança de Segredos**: Nunca inclua chaves privadas, senhas ou segredos diretamente no código-fonte. Utilize o `@nestjs/config` para obter variáveis do arquivo `.env` de forma tipada.

---

## ❌ 3. Tratamento de Erros e Exceções (BusinessException)
- **BusinessException**: Toda regra de negócio violada deve lançar uma `BusinessException` (em `src/common/exceptions/business.exception.ts`). Não utilize `HttpException` crua nas regras do service.
- **Códigos de Erro Padronizados**: Toda exceção de negócio deve conter uma mensagem inteligível e um código único padronizado em caixa alta (ex: `AUTH_EMAIL_EXISTS`, `AUTH_USER_INACTIVE`, `USER_NOT_FOUND`).
- **Integração com o Frontend**: Estes códigos devem coincidir exatamente com os tratados pelo frontend (ex: função `parseAuthError()`) para correta exibição de alertas ao usuário.
- **Mapeamento HTTP**: A `BusinessException` deve retornar o código HTTP adequado (padrão 400 BAD_REQUEST), mapeada de forma limpa pelo `ExceptionFilter` da aplicação.

---

## 🧪 4. Testes (TDD)
- **TDD Mandatório**: Escrever testes no arquivo `.spec.ts` antes ou junto à implementação.
- **Mock de Dependências**: Utilizar `Test.createTestingModule` do NestJS mockando dependências externas (como Repositórios do TypeORM ou `MailerService`) para garantir que os testes unitários sejam isolados e rápidos.
- **Cenários**: Cobrir no mínimo 100% das rotas de sucesso e falhas/erros de validação lógica mapeados.
- **Diretrizes Detalhadas**: Para padrões avançados de testes e mock de injeção de dependências no NestJS, consulte a Skill [nestjs-testing-expert/SKILL.md](../skills/nestjs-testing-expert/SKILL.md).
