import { describe, expect, it } from 'vitest';

import { DbIdSchema, SubmitReviewSchema } from './validations';

describe('DbIdSchema', () => {
  it('accepts any id a Postgres uuid column holds, including non-RFC 9562 ones', () => {
    expect(DbIdSchema.safeParse('4a587baa-bd0f-e5ba-ae53-425ce692bad6').success).toBe(true);
    expect(DbIdSchema.safeParse('d8056a10-acae-41b1-bb63-f1b36ed59e40').success).toBe(true);
  });

  it('rejects values that are not uuid-shaped', () => {
    expect(DbIdSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(DbIdSchema.safeParse('1').success).toBe(false);
    expect(DbIdSchema.safeParse("4a587baa-bd0f-e5ba-ae53-425ce692bad6' OR 1=1").success).toBe(false);
  });

  it('lets a review of a legacy card through', () => {
    const parsed = SubmitReviewSchema.safeParse({ card_id: '4a587baa-bd0f-e5ba-ae53-425ce692bad6', rating: 'good' });
    expect(parsed.success).toBe(true);
  });
});
