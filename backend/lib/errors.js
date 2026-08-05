export class AppError extends Error {
  constructor(message, { code = "internal_error", status = 500, details, expose = status < 500, cause } = {}) {
    super(message, { cause });
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.expose = expose;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Request validation failed", details) {
    super(message, { code: "validation_error", status: 400, details });
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, { code: "unauthorized", status: 401 });
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(message, { code: "forbidden", status: 403 });
  }
}

export function normalizeError(error) {
  if (error instanceof AppError) return error;
  if (error instanceof SyntaxError) return new ValidationError("Invalid JSON body");
  return new AppError("An unexpected error occurred", { cause: error, expose: false });
}
