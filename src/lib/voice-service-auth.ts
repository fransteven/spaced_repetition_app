import { timingSafeEqual } from 'node:crypto';

export function isVoiceServiceRequest(request: Request): boolean {
  const secret = process.env.VOICE_SERVICE_TOKEN;
  const authorization = request.headers.get('authorization');
  if (!secret || !authorization?.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
