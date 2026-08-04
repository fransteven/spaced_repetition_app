/**
 * functions.ts — Inngest functions: daily study reminder digest.
 */

import { inngest } from './client';
import {
  sendDueDigests,
  sendDigestForUser,
} from '@/lib/services/reminder-digest-service';

// Daily cron at 8:00 AM Colombia time (America/Bogota, UTC-5 year round).
export const dailyStudyDigest = inngest.createFunction(
  {
    id: 'daily-study-digest',
    name: 'Daily study reminder digest',
    triggers: [{ cron: 'TZ=America/Bogota 0 8 * * *' }],
  },
  async ({ step }) => {
    const results = await step.run('send-digests', () =>
      sendDueDigests(new Date())
    );
    return { digests: results.length, results };
  }
);

// Manual trigger from the "Send now" button on /reminders.
export const sendDigestNow = inngest.createFunction(
  {
    id: 'send-digest-now',
    name: 'Send study digest now',
    triggers: [{ event: 'app/study-digest.send' }],
  },
  async ({ event, step }) => {
    const userId = event.data.userId as string;
    return step.run('send-digest', () =>
      sendDigestForUser(userId, new Date(), { force: true })
    );
  }
);
