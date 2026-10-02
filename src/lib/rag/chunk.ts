/**
 * Splits a section's plain text (one paragraph per line) into retrieval
 * chunks of whole paragraphs. Neighbouring chunks share their boundary
 * paragraph so an idea split across chunks is still found.
 */

const TARGET_CHARS = 1400;
const MAX_CHARS = 2400; // a single huge paragraph is cut at sentence boundaries
const MIN_CHARS = 200;  // tiny trailing chunks are merged into the previous one

function splitLongParagraph(paragraph: string): string[] {
  if (paragraph.length <= MAX_CHARS) return [paragraph];
  const sentences = paragraph.match(/[^.!?…]+[.!?…]+["»”’)]*\s*|[^.!?…]+$/g) ?? [paragraph];
  const parts: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > TARGET_CHARS) {
      parts.push(current.trim());
      current = '';
    }
    current += sentence;
    while (current.length > MAX_CHARS) {
      parts.push(current.slice(0, MAX_CHARS));
      current = current.slice(MAX_CHARS);
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function chunkSectionText(text: string): string[] {
  const paragraphs = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap(splitLongParagraph);

  const chunks: string[] = [];
  let current: string[] = [];
  let length = 0;
  let carried = 0; // paragraphs at the start of `current` repeated from the previous chunk

  for (const paragraph of paragraphs) {
    if (length > 0 && length + paragraph.length > TARGET_CHARS) {
      chunks.push(current.join('\n'));
      const overlap = current[current.length - 1];
      current = overlap.length < TARGET_CHARS / 3 ? [overlap] : [];
      carried = current.length;
      length = current.reduce((sum, item) => sum + item.length, 0);
    }
    current.push(paragraph);
    length += paragraph.length;
  }

  const fresh = current.slice(carried);
  if (fresh.length > 0) {
    const tail = fresh.join('\n');
    const previous = chunks[chunks.length - 1];
    if (previous !== undefined && tail.length < MIN_CHARS && previous.length + tail.length <= MAX_CHARS) {
      chunks[chunks.length - 1] = `${previous}\n${tail}`;
    } else {
      chunks.push(current.join('\n'));
    }
  }

  return chunks;
}
