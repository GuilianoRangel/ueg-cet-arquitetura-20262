# Configuração de E-mail (Google SMTP)

Para que o sistema envie e-mails de recuperação de senha, siga os passos abaixo para configurar as credenciais do Google.

## Passos no Google Account

1. Acesse sua [Conta Google](https://myaccount.google.com/).
2. Vá em **Segurança**.
3. Ative a **Verificação em duas etapas** (obrigatório).
4. Procure por **Senhas de app**. https://myaccount.google.com/apppasswords
5. Em "Selecionar app", escolha `Outro (nome personalizado)` e digite `Monorepo UEG`.
6. Clique em **Gerar**.
7. Copie a senha de 16 caracteres gerada.

## Configuração no Projeto

No arquivo `.env` do backend (`apps/backend/.env`), adicione as seguintes chaves:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app-de-16-caracteres
SMTP_FROM=Monorepo UEG <seu-email@gmail.com>
```

> [!WARNING]
> Nunca compartilhe seu arquivo `.env` ou a senha de app gerada.
