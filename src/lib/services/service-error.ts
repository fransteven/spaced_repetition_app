export class ServiceError extends Error {
  public readonly code: 'NOT_FOUND' | 'FORBIDDEN';

  public constructor(code: 'NOT_FOUND' | 'FORBIDDEN', message: string) {
    super(message);
    this.code = code;
  }
}
