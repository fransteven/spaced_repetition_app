import { google } from 'googleapis';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { accounts, users } from '@/lib/db/schema';
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

export interface BucketSummary {
  name: string;
  cards: number;
  intervalDays: number;
}

export async function sendReminderCreatedEmail(
  userId: string,
  deckName: string,
  buckets: BucketSummary[]
): Promise<void> {
  const [user] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId));

  if (!user?.email) {
    throw new ServiceError('NOT_FOUND', 'User email not found');
  }

  const oauth2Client = await getGoogleOAuthClient(userId);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const bucketRows = buckets
    .map(
      (b) => `
        <tr>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;">${b.name}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">${b.cards}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">Every ${b.intervalDays} days</td>
        </tr>
      `
    )
    .join('');

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#111;">Study schedule created: ${deckName}</h2>
      <p>Hi ${user.name},</p>
      <p>Your spaced-repetition reminder program for <strong>${deckName}</strong> has been set up. Here is your bucket summary:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Bucket</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">Cards</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">Interval</th>
          </tr>
        </thead>
        <tbody>
          ${bucketRows}
        </tbody>
      </table>
      <p style="color:#6b7280;font-size:12px;">Events have been added to your Google Calendar.</p>
    </div>
  `;

  const rawMessage = [
    `To: ${user.email}`,
    'Subject: Study schedule created: ' + deckName,
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody,
  ].join('\r\n');

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
}
