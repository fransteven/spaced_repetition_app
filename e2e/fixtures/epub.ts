import JSZip from 'jszip';

/**
 * A small English EPUB built in memory: two chapters long enough to span several
 * pages on a phone, with plain words (no hyphenation tricks) so tests can find them.
 */

const WORDS = [
  'river', 'stone', 'quiet', 'harbor', 'lantern', 'meadow', 'garden', 'window', 'morning', 'distant',
  'careful', 'silver', 'forest', 'letter', 'bridge', 'gentle', 'island', 'winter', 'summer', 'candle',
];

function paragraph(chapter: number, index: number): string {
  const words: string[] = [];
  for (let i = 0; i < 70; i += 1) words.push(WORDS[(index * 7 + i * 3 + chapter) % WORDS.length]);
  const sentence = words.join(' ');
  const opening = index === 0 ? 'Early ' : 'The ';
  return `<p>${opening}${sentence}.</p>`;
}

// Markup a malicious book could carry: none of it may run once the iframe allows scripts.
const HOSTILE = `<script>window.parent.__bookScriptRan = 'script';</script>
<p id="hostile" onclick="window.parent.__bookScriptRan = 'onclick'">Hostile
  <a id="hostile-link" href="javascript:window.parent.__bookScriptRan='href'">link</a>
  <img id="hostile-img" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" onerror="window.parent.__bookScriptRan='onerror'" onload="window.parent.__bookScriptRan='onload'"/>
  <svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><script>window.parent.__bookScriptRan = 'svg';</script></svg>
</p>
<iframe id="hostile-frame" srcdoc="&lt;script&gt;parent.parent.__bookScriptRan='iframe'&lt;/script&gt;"></iframe>`;

function chapter(number: number): string {
  const body = Array.from({ length: 40 }, (_, index) => paragraph(number, index)).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head><title>Chapter ${number}</title>${number === 2 ? '<script>window.parent.__bookScriptRan = "head";</script>' : ''}</head>
<body><h1>Chapter ${number}</h1>
${number === 2 ? HOSTILE : ''}
${body}
</body></html>`;
}

const CONTAINER = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;

const OPF = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">neurocards-e2e-fixture</dc:identifier>
    <dc:title>E2E Fixture Book</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2026-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="ch1"/><itemref idref="ch2"/></spine>
</package>`;

const NAV = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head><title>Contents</title></head>
<body><nav epub:type="toc"><ol>
  <li><a href="ch1.xhtml">Chapter 1</a></li>
  <li><a href="ch2.xhtml">Chapter 2</a></li>
</ol></nav></body></html>`;

let cached: Promise<Buffer> | null = null;

export function fixtureEpub(): Promise<Buffer> {
  cached ??= (async () => {
    const zip = new JSZip();
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
    zip.file('META-INF/container.xml', CONTAINER);
    zip.file('OEBPS/content.opf', OPF);
    zip.file('OEBPS/nav.xhtml', NAV);
    zip.file('OEBPS/ch1.xhtml', chapter(1));
    zip.file('OEBPS/ch2.xhtml', chapter(2));
    return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' });
  })();
  return cached;
}
