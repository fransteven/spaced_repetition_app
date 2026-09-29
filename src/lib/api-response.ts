import { NextResponse } from 'next/server';
import { ServiceError } from '@/lib/services/service-error';

type ErrorCode = 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'UNAVAILABLE' | 'INTERNAL_ERROR';

const STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  VALIDATION_ERROR: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNAVAILABLE: 409,
  INTERNAL_ERROR: 500,
};

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data, error: null }, { status });
}

export function fail(code: ErrorCode, message: string): NextResponse {
  return NextResponse.json({ data: null, error: { code, message } }, { status: STATUS[code] });
}

/** Maps ServiceError to its envelope; anything else is logged and hidden. */
export function failFromError(error: unknown, context: string, fallback: string): NextResponse {
  if (error instanceof ServiceError) return fail(error.code, error.message);
  console.error(context, error);
  return fail('INTERNAL_ERROR', fallback);
}
