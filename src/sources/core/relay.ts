/** Private operation-limited relay shared by the sources that cannot be fetched from the hosting network. */
export function relayBase() {
  return process.env.WEEBCENTRAL_RELAY_URL?.trim().replace(/\/+$/, '') || null;
}

export function relayToken() {
  return process.env.WEEBCENTRAL_RELAY_TOKEN?.trim() || null;
}

export function isRelayConfigured() {
  return Boolean(relayBase() && relayToken());
}
