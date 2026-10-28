export function parseAuthError(error: any): string {
  if (error?.error?.error === 'AUTH_USER_INACTIVE') {
    return 'Sua conta está aguardando liberação do administrador.';
  }
  if (error?.error?.error === 'AUTH_INVALID_CREDENTIALS') {
    return 'E-mail ou senha incorretos.';
  }
  if (error?.error?.error === 'AUTH_EMAIL_EXISTS') {
    return 'Este e-mail já está em uso.';
  }
  if (error?.error?.error === 'AUTH_INVALID_TOKEN') {
    return 'O token de recuperação é inválido ou expirou.';
  }
  if (error?.error?.message) {
    if (Array.isArray(error.error.message)) {
      return error.error.message.join(', ');
    }
    return error.error.message;
  }
  return 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
}
