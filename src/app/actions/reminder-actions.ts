'use server';

import { auth } from '@/lib/auth';
import { inngest } from '@/inngest/client';

export interface SendDigestNowResult {
  success: boolean;
  error?: string;
}

/**
 * Manual digest trigger ("Send now" button). Emits an Inngest event rather than
 * sending inline so the delivery shows up in the Inngest run history alongside
 * the cron runs.
 */
export async function sendDigestNowAction(): Promise<SendDigestNowResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    await inngest.send({
      name: 'app/study-digest.send',
      data: { userId: session.user.id },
    });
    return { success: true };
  } catch (error) {
    console.error('[sendDigestNowAction]', error);
    return { success: false, error: 'Could not queue the digest. Try again.' };
  }
}
