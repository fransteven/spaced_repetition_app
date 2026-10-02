import { isInternalServiceRequest } from '@/lib/internal-service-auth';

export function isVoiceServiceRequest(request: Request): boolean {
  return isInternalServiceRequest(request, 'VOICE_SERVICE_TOKEN');
}
