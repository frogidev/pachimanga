export type ProviderErrorKind =
  | 'offline'
  | 'network'
  | 'refused'
  | 'rate_limited'
  | 'relay_unavailable'
  | 'missing'
  | 'upstream';

export type ProviderErrorInfo = {
  kind: ProviderErrorKind;
  title: string;
  message: string;
  retryable: boolean;
};

function textOf(error: unknown) {
  if (typeof error === 'string') return error;
  return error instanceof Error ? error.message : '';
}

export function classifyProviderError(error: unknown, options: { offline?: boolean } = {}): ProviderErrorInfo {
  if (options.offline) {
    return {
      kind: 'offline',
      title: 'You are offline',
      message: 'Reconnect, then retry. Pachimanga will not bypass provider or account controls.',
      retryable: true,
    };
  }

  const raw = textOf(error).trim();
  const message = raw.toLowerCase();

  if (/(http\s*403|\b403\b|refus(?:e|ed|ing)|rejected)/i.test(message)) {
    return {
      kind: 'refused',
      title: 'Provider refused the request',
      message: 'The provider returned HTTP 403. Retry later; Pachimanga will not bypass access controls.',
      retryable: true,
    };
  }

  if (/(http\s*429|\b429\b|rate.?limit)/i.test(message)) {
    return {
      kind: 'rate_limited',
      title: 'Provider rate limit reached',
      message: 'The provider asked clients to slow down. Wait before retrying.',
      retryable: true,
    };
  }

  if (/relay/i.test(message) && /(unavailable|network|timeout|timed out|failed|http\s*5\d\d|not configured|incomplete)/i.test(message)) {
    return {
      kind: 'relay_unavailable',
      title: 'Provider relay unavailable',
      message: 'The private relay is not currently available. Retry later; no direct bypass will be attempted.',
      retryable: true,
    };
  }

  if (/(http\s*404|\b404\b|not found|missing|removed)/i.test(message)) {
    return {
      kind: 'missing',
      title: 'Chapter or title is unavailable',
      message: 'The provider reports that this item is missing or was removed.',
      retryable: false,
    };
  }

  if (/(network|timed?\s*out|timeout|fetch failed|econn|enet|socket|eai_again)/i.test(message)) {
    return {
      kind: 'network',
      title: 'Network request failed',
      message: 'The provider could not be reached. Check the connection and retry.',
      retryable: true,
    };
  }

  return {
    kind: 'upstream',
    title: 'Provider request failed',
    message: 'The upstream provider returned an unexpected error. Retry later if the problem is temporary.',
    retryable: true,
  };
}

export function providerErrorHttpStatus(kind: ProviderErrorKind) {
  if (kind === 'refused') return 403;
  if (kind === 'rate_limited') return 429;
  if (kind === 'missing') return 404;
  if (kind === 'offline' || kind === 'network' || kind === 'relay_unavailable') return 503;
  return 502;
}

export function providerErrorPayload(error: unknown) {
  const info = classifyProviderError(error);
  return {
    error: {
      kind: info.kind,
      title: info.title,
      message: info.message,
      retryable: info.retryable,
    },
  };
}
