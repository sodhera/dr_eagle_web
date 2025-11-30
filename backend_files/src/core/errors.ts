export class DomainError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "DomainError";
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

export class AuthError extends DomainError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AuthError";
  }
}

export class AccessDeniedError extends DomainError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AccessDeniedError";
  }
}

export class NormalizationError extends DomainError {
  constructor(sourceId: string, message: string, options?: { cause?: unknown }) {
    super(`Normalization failed for source ${sourceId}: ${message}`, options);
    this.name = "NormalizationError";
  }
}

export class StreamUnavailableError extends DomainError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StreamUnavailableError";
  }
}
