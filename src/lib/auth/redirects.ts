export function safeLocalPath(value: string | null, fallback = '/') {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

export function buildPasswordRecoveryRedirect(origin: string) {
  const confirmUrl = new URL('/auth/confirm', origin);
  confirmUrl.searchParams.set('next', '/auth?recovery=1');
  return confirmUrl.toString();
}

export function isPasswordRecoveryRequest(search: string) {
  return new URLSearchParams(search).get('recovery') === '1';
}
