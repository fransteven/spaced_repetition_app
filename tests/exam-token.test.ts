import assert from 'node:assert/strict';
import test from 'node:test';
import { signExamToken, verifyExamToken } from '../src/lib/exam/exam-token';

const userId = 'ff316c73-90bc-411a-8112-70397d80964b';
const cardId = 'ebfe57cf-a84a-4d09-80de-5dc4aa849b4c';
process.env.AUTH_SECRET = 'test-only-exam-token-secret';

test('exam token binds the student, card, schedule and expiry', () => {
  const token = signExamToken({
    userId, cardId, reps: 2,
    lastReview: '2026-09-22T12:00:00.000Z',
    cardUpdatedAt: '2026-09-21T12:00:00.000Z',
    expiresAt: Date.now() + 60_000,
  });

  assert.equal(verifyExamToken(token, userId, cardId).reps, 2);
  assert.throws(() => verifyExamToken(token, '573b8162-8833-4c6f-9e3f-2d08b336f7d0', cardId));
  assert.throws(() => verifyExamToken(`${token}tampered`, userId, cardId));
});

test('expired exam token cannot authorize a review', () => {
  const token = signExamToken({
    userId, cardId, reps: 0, lastReview: null,
    cardUpdatedAt: '2026-09-21T12:00:00.000Z',
    expiresAt: Date.now() - 1,
  });
  assert.throws(() => verifyExamToken(token, userId, cardId));
});
