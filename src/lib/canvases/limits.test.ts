import { describe, expect, it } from 'vitest';

import { CreateCanvasSchema } from '@/lib/validations';
import { MAX_CANVAS_SIZE_BYTES, titleFromFilename, utf8ByteLength } from './limits';

describe('canvas limits', () => {
  it('measures UTF-8 bytes, not characters', () => {
    expect(utf8ByteLength('ñ')).toBe(2);
    expect(utf8ByteLength('🧠')).toBe(4);
  });

  it('rejects HTML over 2 MB in bytes even when under 2 M characters', () => {
    const html = 'ñ'.repeat(MAX_CANVAS_SIZE_BYTES / 2 + 1);
    expect(html.length).toBeLessThan(MAX_CANVAS_SIZE_BYTES);
    expect(CreateCanvasSchema.safeParse({ html }).success).toBe(false);
    expect(CreateCanvasSchema.safeParse({ html: 'a'.repeat(MAX_CANVAS_SIZE_BYTES) }).success).toBe(true);
  });

  it('rejects empty HTML', () => {
    expect(CreateCanvasSchema.safeParse({ html: '  \n ' }).success).toBe(false);
  });

  it('derives a title from the file name', () => {
    expect(titleFromFilename('Entropía explicada.HTML')).toBe('Entropía explicada');
    expect(titleFromFilename('canvas.htm')).toBe('canvas');
  });
});
