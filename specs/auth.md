# Especificação Técnica: Autenticação e Gestão de Usuários

Esta especificação detalha o funcionamento da feature de autenticação para o projeto Monorepo UEG.

## 1. Regras de Negócio

### Autenticação e Cadastro
- **Provedor**: E-mail e Senha (via Passport Local + JWT).
- **Auto-cadastro**: Permitido para usuários comuns.
- **Estado Inicial**: Usuários recém-cadastrados são criados com status `ativo: false` (bloqueados).
- **Aprovação**: Somente um Administrador pode ativar novos usuários.
- **Administrador Padrão**: O sistema deve garantir a existência de um administrador pré-cadastrado (ex: `admin@ueg.br`).

### Perfil do Usuário
- `id`: UUID gerado automaticamente.
- `email`: Único, obrigatório, formato válido.
- `nome`: Obrigatório.
- `senha`: Armazenada com hash (bcrypt).
- `ativo`: Boolean (default: false).
- `perfis`: Relação N:N com `Perfil`. Cada perfil agrega uma coleção de permissões granulares (`roles: string[]`). O usuário adquire a união de todas as permissões de seus perfis ativos.
- `versao`: Inteiro incremental para controle de concorrência otimista (optimistic locking).
- `ultimoUsuarioId`: UUID do usuário que realizou a última alteração.
- **Proteção do Último Administrador**: Não é permitido desativar, excluir ou remover o perfil Administrador do único administrador ativo do sistema (`USER_LAST_ADMIN`).

### Recuperação de Senha
- **Hash de uso único**: Link enviado por e-mail contendo um token temporário.
- **SMTP**: Configurado via Google SMTP (ver [Instruções de SMTP](docs/smtp-config.md)).
- **Reset Administrativo**: O administrador pode disparar um e-mail de reset de senha para qualquer usuário através da listagem.

## 2. Casos de Uso

### Fluxo de Login
1. Usuário informa e-mail e senha.
2. Sistema valida credenciais.
3. Se o usuário não estiver ativo, o login é negado com mensagem de conta pendente de aprovação.
4. Se bem-sucedido, gera um token JWT.

### Acesso Não Autorizado
- Tentativa de acesso a rotas protegidas sem JWT válido deve redirecionar para uma página de "Acesso Necessário" com link para login.

### Recuperação de Senha
1. Usuário solicita recuperação informando e-mail.
2. Sistema envia e-mail com link (mesmo se o e-mail não existir, por segurança a mensagem de sucesso é genérica).
3. Usuário clica no link, define nova senha e é redirecionado para login.

## 3. Critérios de Aceitação

- [x] Login funcional com e-mail/senha.
- [x] Cadastro retorna erro sem vazar informações se o e-mail já existir (`AUTH_EMAIL_EXISTS`).
- [x] Sessão gerenciada com JWT curto (60 minutos) validado por `JwtAuthGuard`.
- [x] Nome do usuário logado exibido no cabeçalho e roles carregadas dinamicamente via `GET /auth/me/roles`.
- [x] Página de acesso negado/redirecionamento para rotas protegidas sem autenticação ou permissão (`authGuard`, `roleGuard`).
- [x] Proteção contra desativação/exclusão do último administrador ativo (`USER_LAST_ADMIN`).

## 4. Cenários de Erro

| Cenário | Comportamento Esperado | Código Erro (Sugerido) |
| :--- | :--- | :--- |
| Credenciais Incorretas | Exibir "E-mail/senha não confere" | `AUTH_INVALID_CREDENTIALS` |
| Conta Inativa | Exibir "Conta aguardando liberação do administrador" | `AUTH_USER_INACTIVE` |
| E-mail Duplicado | Redirecionar para Login | `AUTH_EMAIL_EXISTS` |
| Sessão Expirada | Redirecionar para Login com aviso de expiração | `AUTH_SESSION_EXPIRED` |
