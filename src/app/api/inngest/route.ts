import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import {
  dailyStudyDigest,
  sendDigestNow,
  purgeVoiceTranscripts,
  processUploadedBook,
  indexBookForQuestions,
} from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [dailyStudyDigest, sendDigestNow, purgeVoiceTranscripts, processUploadedBook, indexBookForQuestions],
});
