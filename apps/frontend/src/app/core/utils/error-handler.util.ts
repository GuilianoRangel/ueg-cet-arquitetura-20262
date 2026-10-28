export function parseAuthError(error: unknown): string {
  const errObj = error as { error?: { error?: string; message?: string | string[] } } | null | undefined;
  if (errObj?.error?.error === 'AUTH_USER_INACTIVE') {
    return 'Sua conta está aguardando liberação do administrador.';
  }
  if (errObj?.error?.error === 'AUTH_INVALID_CREDENTIALS') {
    return 'E-mail ou senha incorretos.';
  }
  if (errObj?.error?.error === 'AUTH_EMAIL_EXISTS') {
    return 'Este e-mail já está em uso.';
  }
  if (errObj?.error?.error === 'AUTH_INVALID_TOKEN') {
    return 'O token de recuperação é inválido ou expirou.';
  }
  if (errObj?.error?.message) {
    if (Array.isArray(errObj.error.message)) {
      return errObj.error.message.join(', ');
    }
    return errObj.error.message;
  }
  return 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
}
