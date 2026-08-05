const SENSITIVE_QUERY_KEYS = /^(code|state|token|access_token|refresh_token|id_token)$/i;

export function safeRequestUrl(value) {
  try {
    const url = new URL(String(value || ""), "https://internal.local");
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEYS.test(key)) url.searchParams.set(key, "[REDACTED]");
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "[INVALID_URL]";
  }
}
