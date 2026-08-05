let refreshPromise;
export async function api(path, body, options = {}) {
  const response = await fetch(path, {
    method: options.method || (body === undefined ? "GET" : "POST"),
    headers: body === undefined ? options.headers : { "Content-Type": "application/json", ...options.headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: options.signal,
    credentials: "same-origin",
  });

  if (response.status === 401 && !options.skipRefresh && path !== "/api/auth/refresh") {
    refreshPromise ||= fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" }).finally(() => { refreshPromise = null; });
    const refreshed = await refreshPromise;
    if (refreshed.ok) return api(path, body, { ...options, skipRefresh: true });
  }

  const data = await response.json().catch(() => ({ ok: false, error: "invalid_api_response" }));
  if (!response.ok || data.ok === false) {
    const error = new Error(data.message || data.error || `Request failed: ${response.status}`);
    error.code = data.error || "request_failed";
    error.status = response.status;
    error.details = data.details;
    throw error;
  }
  return data;
}
