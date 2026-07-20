export class ServiceError extends Error {
  public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'UNAVAILABLE';

  public constructor(code: 'NOT_FOUND' | 'FORBIDDEN' | 'UNAVAILABLE', message: string) {
    super(message);
    this.code = code;
  }
}
