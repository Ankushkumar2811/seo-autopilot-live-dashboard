export function success(data = {}, meta) {
  return { ok: true, ...data, ...(meta ? { meta } : {}) };
}

export function failure(code, message, details) {
  return { ok: false, error: code, ...(message ? { message } : {}), ...(details !== undefined ? { details } : {}) };
}
