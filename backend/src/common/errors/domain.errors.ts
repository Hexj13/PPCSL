export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
}

export class AccessDeniedError extends DomainError {
  readonly code = 'ACCESS_DENIED';
}

export class LimitExceededError extends DomainError {
  readonly code = 'LIMIT_EXCEEDED';
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
}
