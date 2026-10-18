import { describe, expect, it } from 'vitest';
import { keepAlivePingDue } from './keep-ai-awake';

const MIN = 60_000;

describe('keepAlivePingDue', () => {
  const base = { mountedAt: 0, lastPing: 0, visible: true };

  it('pings once the last ping is 8 minutes old, well before Render sleeps (15 min)', () => {
    expect(keepAlivePingDue({ ...base, now: 7 * MIN })).toBe(false);
    expect(keepAlivePingDue({ ...base, now: 8 * MIN })).toBe(true);
  });

  it('never pings from a hidden tab', () => {
    expect(keepAlivePingDue({ ...base, now: 30 * MIN, visible: false })).toBe(false);
  });

  it('stops after three hours so a forgotten tab does not keep the service up', () => {
    expect(keepAlivePingDue({ ...base, lastPing: 170 * MIN, now: 180 * MIN })).toBe(true);
    expect(keepAlivePingDue({ ...base, lastPing: 175 * MIN, now: 181 * MIN + 2 * MIN })).toBe(false);
  });
});
