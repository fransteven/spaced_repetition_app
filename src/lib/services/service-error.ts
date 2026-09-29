export class ServiceError extends Error {
  public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'UNAVAILABLE' | 'VALIDATION_ERROR';

  public constructor(code: 'NOT_FOUND' | 'FORBIDDEN' | 'UNAVAILABLE' | 'VALIDATION_ERROR', message: string) {
    super(message);
    this.code = code;
  }
}
