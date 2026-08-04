/**
 * study-digest.ts — HTML template for the daily study digest email.
 * Inline styles only (email clients ignore Tailwind); hex values mirror the
 * DESIGN.md palette: primary #3525cd, tertiary #005338, on-surface #191c1d.
 */

import { format } from 'date-fns';

export interface DigestItem {
  deck_id: string;
  deck_name: string;
  program_name: string;
  bucket: string;
  cards: number;
}

const BUCKET_COLOR: Record<string, string> = {
  Struggling: '#b3261e',
  Intermediate: '#3525cd',
  Mastered: '#005338',
};

function appUrl(): string {
  return process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
}

function renderRow(item: DigestItem, base: string): string {
  const color = BUCKET_COLOR[item.bucket] ?? '#191c1d';
  return `
    <tr>
      <td style="padding:12px 8px;color:#191c1d;">
        <strong>${item.deck_name}</strong><br />
        <span style="color:#5f6368;font-size:12px;">${item.program_name}</span>
      </td>
      <td style="padding:12px 8px;color:${color};font-weight:600;">${item.bucket}</td>
      <td style="padding:12px 8px;text-align:center;color:#191c1d;">${item.cards}</td>
      <td style="padding:12px 8px;text-align:right;">
        <a href="${base}/study/${item.deck_id}" style="color:#3525cd;text-decoration:none;font-weight:600;">Study →</a>
      </td>
    </tr>`;
}

export function renderStudyDigestEmail(
  userName: string,
  items: DigestItem[],
  refDate: Date
): string {
  const base = appUrl();
  const totalCards = items.reduce((sum, i) => sum + i.cards, 0);
  const dateLabel = format(refDate, 'EEEE, MMMM d, yyyy');

  return `
    <div style="font-family:Inter,Arial,Helvetica,sans-serif;background:#f8f9fa;padding:32px 16px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
        <h1 style="font-size:24px;letter-spacing:-0.02em;color:#191c1d;margin:0 0 4px;">Today's review</h1>
        <p style="color:#5f6368;font-size:13px;margin:0 0 24px;">${dateLabel} · ${totalCards} cards across ${items.length} ${items.length === 1 ? 'bucket' : 'buckets'}</p>
        <p style="color:#191c1d;font-size:14px;line-height:1.6;margin:0 0 20px;">Hi ${userName}, these buckets are due today based on their memory strength.</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f3f4f5;">
              <th style="padding:10px 8px;text-align:left;color:#5f6368;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Deck</th>
              <th style="padding:10px 8px;text-align:left;color:#5f6368;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Bucket</th>
              <th style="padding:10px 8px;text-align:center;color:#5f6368;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Cards</th>
              <th style="padding:10px 8px;text-align:right;color:#5f6368;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Action</th>
            </tr>
          </thead>
          <tbody>${items.map((i) => renderRow(i, base)).join('')}</tbody>
        </table>
        <p style="color:#9aa0a6;font-size:11px;margin-top:32px;">Automated digest from NeuroCards. Manage your programs at <a href="${base}/reminders" style="color:#3525cd;text-decoration:none;">${base}/reminders</a>.</p>
      </div>
    </div>`;
}
