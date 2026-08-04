// Compiles the design-sync Tailwind entry to a static stylesheet the converter
// can ship (cfg.cssEntry). Uses the repo's own @tailwindcss/postcss, so the
// output is the same CSS `next build` produces for these components.
//
//   node .design-sync/build-css.mjs
//
// in:  .design-sync/ds-tailwind.css   out: .design-sync/.cache/ds.css
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const HERE = dirname(fileURLToPath(import.meta.url));
const IN = join(HERE, 'ds-tailwind.css');
const OUT = join(HERE, '.cache', 'ds.css');

const css = readFileSync(IN, 'utf8');
const result = await postcss([tailwind({ optimize: { minify: false } })]).process(css, {
  from: IN,
  to: OUT,
});

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, result.css);
console.error(`  css: ${(statSync(OUT).size / 1024).toFixed(0)} KB -> ${resolve(OUT)}`);
for (const w of result.warnings()) console.error(`  ! ${w.toString()}`);
