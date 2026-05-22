import { google } from 'googleapis';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { accounts } from '@/lib/db/schema';
import { ServiceError } from '@/lib/services/service-error';

async function getGoogleOAuthClient(userId: string) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'google')));

  if (!account?.access_token) {
    throw new ServiceError('FORBIDDEN', 'Google account not linked');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await db
        .update(accounts)
        .set({
          access_token: tokens.access_token,
          expires_at: tokens.expiry_date
            ? Math.floor(tokens.expiry_date / 1000)
            : account.expires_at,
        })
        .where(
          and(
            eq(accounts.userId, userId),
            eq(accounts.provider, 'google')
          )
        );
    }
  });

  return oauth2Client;
}

export async function createBucketEvents(
  userId: string,
  events: Array<{
    summary: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    recurrence: string[];
  }>
): Promise<string[]> {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const createdIds: string[] = [];

  for (const event of events) {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        start: event.start,
        end: event.end,
        recurrence: event.recurrence,
      },
    });

    if (response.data.id) {
      createdIds.push(response.data.id);
    }
  }

  return createdIds;
}

export async function deleteBucketEvents(
  userId: string,
  eventIds: string[]
): Promise<void> {
  if (eventIds.length === 0) return;

  const oauth2Client = await getGoogleOAuthClient(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  for (const eventId of eventIds) {
    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });
    } catch {
      // Ignore errors for already-deleted or missing events
    }
  }
}
