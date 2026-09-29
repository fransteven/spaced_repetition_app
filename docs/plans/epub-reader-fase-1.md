# Plan — Lector EPUB · Fase 1

> Estado: **implementado** (fase 1). Pendiente: configurar `BLOB_READ_WRITE_TOKEN`.
> Alcance: subir EPUB → biblioteca → lector tipo Kindle con progreso, resaltados y notas.
> Fuera de alcance (fases siguientes): traducción, creación de cards, RAG, PDF.

---

## 0. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Formato inicial | EPUB (PDF en fase 4) |
| Almacenamiento | Vercel Blob |
| Traducción (fase 2) | Estilo Google Translate: el usuario elige idioma origen → destino |
| Motor de render | `epubjs` (npm) usado directo, sin `react-reader`, para controlar la UI según DESIGN.md |
| Colores de resaltado | 4 tokens nuevos: amarillo, verde, azul, rosa (§8.1) |
| Navegación | "Library" como 5.º ítem en sidebar y bottom nav |
| Tema del lector | **Sepia estilo Apple Books (default)** · Auto · Claro · Oscuro (§8.1) |
| Tipografía del lector | Iowan Old Style (Apple) → Literata como fallback; composición estilo Apple Books (§8.2) |
| Límites | 100 MB por archivo · 50 libros por usuario |

---

## 1. Flujo de usuario

```
/library ──[Subir EPUB]──► upload directo navegador → Vercel Blob
                            │
                            ▼
                  POST /api/books (confirmar)
                  crea fila books(status='processing')
                  dispara evento Inngest app/book.uploaded
                            │
                            ▼
          Inngest book-process: validar → metadata → portada → texto por capítulo
                  status='ready' | 'failed'
                            │
                            ▼
/library muestra portada + progreso ──► /read/[id] (inmersivo, sin shell)
      seleccionar texto → [Resaltar ●●●●] [Nota] [Copiar]
      panel de anotaciones · índice (TOC) · ajustes de tipografía
      progreso guardado automáticamente (CFI + %)
```

---

## 2. Las dos versiones del libro

| Versión | Dónde | Uso |
|---|---|---|
| Archivo EPUB original | Vercel Blob `books/{userId}/{bookId}.epub` | Render en el lector |
| Texto plano por capítulo | Tabla `book_sections` | Fase 2 (contexto para cards/traducción) y fase 3 (chunks + embeddings) |

La extracción de texto se hace ya en fase 1 porque es barata y deja listo el terreno para el RAG.

---

## 3. Schema (Drizzle) — `src/lib/db/schema.ts`

```ts
export const bookStatusEnum = pgEnum('book_status', ['processing', 'ready', 'failed']);

export const books = pgTable('books', {
  id:               uuid('id').defaultRandom().primaryKey(),
  user_id:          uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title:            text('title').notNull(),            // del nombre de archivo hasta procesar
  author:           text('author'),
  language:         text('language'),                   // dc:language (BCP-47), default de traducción en fase 2
  blob_pathname:    text('blob_pathname').notNull().unique(),
  cover_pathname:   text('cover_pathname'),
  file_size:        integer('file_size').notNull(),
  status:           bookStatusEnum('status').notNull().default('processing'),
  error:            text('error'),                      // mensaje seguro para el usuario
  locations_json:   text('locations_json'),             // cache de epub.js locations (evita recalcular %)
  last_cfi:         text('last_cfi'),
  progress:         real('progress').notNull().default(0), // 0..1
  last_read_at:     timestamp('last_read_at'),
  created_at:       timestamp('created_at').defaultNow().notNull(),
  updated_at:       timestamp('updated_at').defaultNow().notNull(),
}, (t) => [index('books_user_idx').on(t.user_id, t.last_read_at)]);

// Versión texto del libro — un registro por ítem del spine.
export const bookSections = pgTable('book_sections', {
  id:          uuid('id').defaultRandom().primaryKey(),
  book_id:     uuid('book_id').references(() => books.id, { onDelete: 'cascade' }).notNull(),
  spine_index: integer('spine_index').notNull(),
  href:        text('href').notNull(),
  title:       text('title'),                           // desde el TOC si existe
  text:        text('text').notNull(),
}, (t) => [uniqueIndex('book_sections_book_spine_idx').on(t.book_id, t.spine_index)]);

export const highlightColorEnum = pgEnum('highlight_color', ['yellow', 'green', 'blue', 'pink']);

// Resaltado + nota opcional. Una nota siempre cuelga de un rango de texto.
export const bookAnnotations = pgTable('book_annotations', {
  id:            uuid('id').defaultRandom().primaryKey(),
  book_id:       uuid('book_id').references(() => books.id, { onDelete: 'cascade' }).notNull(),
  user_id:       uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  cfi_range:     text('cfi_range').notNull(),           // EPUB CFI — ancla estable
  quote:         text('quote').notNull(),               // texto seleccionado (para listado y fase 2)
  chapter_label: text('chapter_label'),
  color:         highlightColorEnum('color').notNull().default('yellow'),
  note:          text('note'),
  created_at:    timestamp('created_at').defaultNow().notNull(),
  updated_at:    timestamp('updated_at').defaultNow().notNull(),
}, (t) => [index('book_annotations_book_idx').on(t.book_id)]);

export const readerThemeEnum = pgEnum('reader_theme', ['auto', 'light', 'dark', 'sepia']);
export const readerFontEnum  = pgEnum('reader_font',  ['book', 'sans', 'original']); // ver §8.2

// Preferencias de lectura por usuario (sincronizadas entre dispositivos).
export const readerPreferences = pgTable('reader_preferences', {
  user_id:     uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).primaryKey(),
  font_scale:  real('font_scale').notNull().default(1),     // 0.8 – 1.6
  font_family: readerFontEnum('font_family').notNull().default('book'),
  line_height: real('line_height').notNull().default(1.55),
  justify:     boolean('justify').notNull().default(false),
  theme:       readerThemeEnum('theme').notNull().default('sepia'),
  updated_at:  timestamp('updated_at').defaultNow().notNull(),
});
```

Migración: `npx drizzle-kit generate` → `npx drizzle-kit migrate` (nunca `push`).

> Actualizar AGENTS.md §4.2 con las tablas nuevas cuando se implementen.

---

## 4. Almacenamiento — Vercel Blob

- Dependencia: `@vercel/blob`. Env nueva: `BLOB_READ_WRITE_TOKEN`.
- **Subida directa desde el cliente** (`upload()` de `@vercel/blob/client`). Así no pasa el archivo por la función de Vercel y se evita el límite de 4.5 MB de body.
- `src/lib/blob.ts` (solo servidor): `buildBookPathname`, `deleteBookBlobs`, `readBookBlob`.
- **El URL del blob nunca llega al cliente.** El lector descarga el archivo por `GET /api/books/[id]/file`, que valida sesión y ownership y hace stream. Si la cuenta soporta blobs privados se usan; si no, blob público con sufijo aleatorio y el URL queda solo en el servidor.
- No se usa el callback `onUploadCompleted`, porque no dispara en localhost sin túnel. Se confirma explícitamente con `POST /api/books`, que verifica el blob con `head()`.

Límites: `application/epub+zip`, máximo **100 MB** por archivo, máximo **50 libros** por usuario. El límite de libros se valida en `onBeforeGenerateToken` (para no subir en vano) y otra vez en la confirmación. Las constantes viven en `src/lib/books/limits.ts`.

---

## 5. API routes y server actions

Todas siguen AGENTS.md §6.4: auth primero, Zod, envelope `{ data, error }`, try/catch, lógica en services.

| Método + ruta | Body | Qué hace |
|---|---|---|
| `POST /api/books/upload` | protocolo `handleUpload` | Genera token de subida. `onBeforeGenerateToken`: sesión, pathname `books/{userId}/…`, content-type y tamaño máximo |
| `POST /api/books` | `{ pathname, filename }` | Verifica el prefijo del usuario y `head()` → inserta `books` → `inngest.send('app/book.uploaded')` |
| `GET /api/books/[id]/file` | — | Ownership → stream del EPUB (`Cache-Control: private`) |
| `GET /api/books/[id]/cover` | — | Ownership → stream de la portada |
| `PATCH /api/books/[id]` | `{ title?, author? }` | Editar metadata |
| `DELETE /api/books/[id]` | — | Borra los blobs (libro y portada) y luego la fila (cascade a secciones y anotaciones) |

Server actions (`src/app/actions/reader-actions.ts`, mismo patrón `ActionResult` que `cards.ts`):

- `saveReadingProgressAction({ bookId, cfi, progress })` — debounce de 2 s en el cliente
- `saveBookLocationsAction({ bookId, locationsJson })` — solo la primera vez
- `createAnnotationAction`, `updateAnnotationAction` (color, nota), `deleteAnnotationAction`
- `updateReaderPreferencesAction`

Zod en `src/lib/validations.ts`: `ConfirmBookUploadSchema`, `UpdateBookSchema`, `ReadingProgressSchema`, `CreateAnnotationSchema`, `UpdateAnnotationSchema`, `ReaderPreferencesSchema`.

---

## 6. Services

- `src/lib/services/book-service.ts`: `listBooksForUser`, `getBookForReader` (con anotaciones y preferencias), `assertBookOwnership`, `confirmBookUpload`, `updateBookMetadata`, `saveReadingProgress`, `deleteBook`, `markBookReady` / `markBookFailed`.
- `src/lib/services/annotation-service.ts`: CRUD con verificación de ownership.
- `src/lib/services/reader-preferences-service.ts`: get con defaults y upsert.

---

## 7. Procesamiento (Inngest) — `book-process`

Evento `app/book.uploaded` `{ bookId }`. Cada paso es un `step.run` (se reintenta por separado):

1. **fetch + validar**: leer el blob; que sea ZIP y que `mimetype` sea `application/epub+zip`. Protección contra zip bombs: límite de tamaño descomprimido total (p. ej. 300 MB) y de número de entradas.
2. **metadata**: `META-INF/container.xml` → OPF → `dc:title`, `dc:creator`, `dc:language`, spine, manifest y portada.
3. **portada**: subir a `covers/{userId}/{bookId}.{ext}` si existe.
4. **texto**: por cada ítem del spine, XHTML → texto plano → `book_sections` (insert por lotes).
5. **ready**: `status='ready'`. Ante cualquier error final: `status='failed'` con un mensaje seguro.

Dependencias: `fflate` (unzip), `fast-xml-parser` (OPF/NCX/nav) y `node-html-parser` (XHTML → texto). Código en `src/lib/epub/parse.ts` (solo servidor, funciones puras testeables).

---

## 8. UI

### Rutas
- `/library` → `src/app/(dashboard)/library/page.tsx` (Server Component, dentro del shell).
- `/read/[id]` → `src/app/(dashboard)/read/[id]/page.tsx`, **inmersivo**: `dashboard-shell.tsx` ya oculta el shell para `/study`; se extiende la condición a `/read`.
- `middleware.ts`: agregar `'/library/:path*'` y `'/read/:path*'` al matcher.
- Navegación: agregar "Library" (`BookOpen`) a `PRIMARY_NAV` en `nav-config.ts` y a `mobile-nav.tsx`.

### Componentes
`src/components/library/`
- `library-grid.tsx`: grilla de `BookCard` (`gap-4 sm:gap-6`).
- `book-card.tsx`: `Surface tone="card"`, portada, título y autor, `MasteryThread` con el progreso, `Pill` según estado (processing/failed).
- `upload-book-button.tsx` (client): input de archivo → `upload()` → confirmación → `router.refresh()`. Formulario con react-hook-form + zod (tipo y tamaño del archivo).
- Estado vacío: `EmptyState` ("Sube tu primer libro").

`src/components/reader/` (todo client, porque epub.js necesita el DOM)
- `reader-view.tsx`: crea `ePub(arrayBuffer)` y `rendition` con `flow: 'paginated'` y `allowScriptedContent: false`; mantiene el CFI actual; pinta las anotaciones con `rendition.annotations.highlight`.
- `reader-top-bar.tsx`: volver, título, capítulo actual, botones de TOC, anotaciones y ajustes.
- `reader-progress.tsx`: `MasteryThread` + % abajo (`.tabular`).
- `selection-toolbar.tsx`: popover flotante sobre la selección (`shadow-ambient-lg`, `rounded-2xl`). Se diseña extensible para agregar "Traducir" y "Crear card" en fase 2.
- `annotation-editor.tsx`: nota con react-hook-form + zod.
- `annotations-sheet.tsx`: lista agrupada por capítulo; al hacer clic salta al CFI.
- `toc-sheet.tsx`: índice del libro.
- `reader-settings-popover.tsx`: tema (Sepia/Auto/Claro/Oscuro), tamaño de fuente, familia (Libro/Sans/Original, §8.2), interlineado y justificado.
- Navegación: flechas del teclado, clic o tap en los bordes y swipe en móvil.

### Tema dentro del iframe
epub.js renderiza en un iframe al que no llegan las clases de Tailwind. `reader-theme.ts` lee los tokens CSS resueltos (`getComputedStyle(document.documentElement)`) y los inyecta con `rendition.themes.register/override`. Se re-aplica cuando cambia el tema (`next-themes`) o la preferencia del lector. Es la única vía posible; no requiere hex hardcodeados.

### 8.1 Tokens nuevos (`globals.css` + DESIGN.md)

Se agregan en `:root` y `.dark`, se mapean en `@theme inline` y se documentan en una sección nueva de DESIGN.md: "Lector: resaltados y tema sepia". Son de uso exclusivo del lector.

**Resaltados** (el color lo elige el usuario para organizar; no representa estado FSRS):

| Token | Uso |
|---|---|
| `--highlight-yellow` / `-green` / `-blue` / `-pink` | Fondo del resaltado en el texto |
| `--on-highlight` | Texto sobre el resaltado (contraste ≥ 4.5:1) |

- En modo claro y sepia: tonos pastel, aplicados con `mix-blend-mode: multiply` dentro del iframe para no tapar el texto.
- En oscuro: tonos profundos con opacidad, texto en `--on-highlight`.
- Los swatches del toolbar de selección y del panel de anotaciones usan los mismos tokens (`bg-highlight-yellow`, etc.).

**Sepia** (tema propio del lector, independiente del tema de la app, **tema por defecto**). Los valores están tomados de Apple Books (muestreados de una captura):

| Token | Valor | Uso | Contraste vs fondo |
|---|---|---|---|
| `--reader-sepia-surface` | `#F1E3CA` | Fondo de la página | — |
| `--reader-sepia-surface-container` | `#FEF3E2` | Pills de la barra superior, popovers y paneles | — |
| `--reader-sepia-on-surface` | `#35271A` | Texto del libro | ≈ 12:1 |
| `--reader-sepia-on-surface-variant` | `#6E6350` | Título en la barra, "47 de 387", capítulo | ≈ 4.7:1 |

> Apple Books usa `#847861` para el texto secundario, pero sobre `#F1E3CA` da ≈ 3.4:1 y no cumple el 4.5:1 de DESIGN.md §10. Por eso se oscurece a `#6E6350`.

### 8.2 Tipografía del lector (estilo Apple Books)

**Familias** (`reader_preferences.font_family`):

| Opción | Stack | Notas |
|---|---|---|
| `book` (default) | `"Iowan Old Style", "Charter", "Literata", Georgia, serif` | En macOS/iOS usa Iowan Old Style del sistema (la fuente de Apple Books; no se puede redistribuir, así que solo se referencia). En el resto de dispositivos cae a **Literata** (OFL, diseñada para lectura larga en pantalla), self-hosted en `public/fonts/literata/` |
| `sans` | `Inter, system-ui, sans-serif` | La misma Inter de la app |
| `original` | Fuente embebida por la editorial | No se sobrescribe `font-family` |

- Fraunces **no** se usa para el cuerpo: es display y cansa en textos largos.
- Literata se carga dentro del iframe con un `@font-face` inyectado por `rendition.hooks.content` (las clases de `next/font` no llegan al iframe). Solo pesos 400/400i/600, en `woff2`.

**Composición** (inyectada con `rendition.themes`):

| Propiedad | Valor | Por qué |
|---|---|---|
| Tamaño base | `1.25rem` × `font_scale` (0.8–1.6) | En la captura el cuerpo es grande (≈ 20 px lógicos) |
| Interlineado | `1.55` (ajustable 1.3–2.0) | Medido en la captura |
| Alineación | `start` (izquierda) con `hyphens: auto`; justificado opcional | Apple Books: bandera derecha + guiones ("Indi-/ana") |
| `lang` | `books.language` en `<html>` del iframe | Necesario para que `hyphens: auto` use el diccionario correcto |
| Párrafos | Se respeta el CSS del EPUB; se normaliza `margin` solo si viene en 0 | En la captura hay espacio entre párrafos |
| Medida | ≈ 60–70 caracteres por columna | Legibilidad |
| Doble columna | `spread: 'auto'` de epub.js desde ≈ 1024 px de ancho en horizontal; una columna en móvil y tablet vertical | Como la vista de dos páginas de la captura |
| Márgenes | Laterales amplios (`px-6 sm:px-12 lg:px-16`) y gutter entre columnas ≈ 64 px | Aire alrededor del texto |
| Ligaduras | `font-variant-ligatures: common-ligatures`, `text-rendering: optimizeLegibility` | "fi", "fl" como en la captura |

**Chrome del lector** (fuera del iframe, con tokens y primitivos):
- Barra superior: grupo de pills a la izquierda (TOC, anotaciones) · título del libro centrado en `text-label-md` normal case, color `on-surface-variant` · pills a la derecha (Aa ajustes; en fase 2, búsqueda). Pills `rounded-full bg-surface-container`.
- Abajo al centro: "47 de 387" en `text-body-sm .tabular`, color `on-surface-variant`. Las "páginas" salen de `book.locations` (≈ 1 600 caracteres por posición), estables entre dispositivos y tamaños de fuente.
- Tap en el centro oculta o muestra el chrome (modo lectura limpia). Sin animaciones continuas (DESIGN.md §8, regla de recall).

Implementación: el contenedor del lector recibe `data-reader-theme="sepia"`, que redefine `--background`, `--card`, `--foreground`, etc. con los valores sepia **solo dentro del lector**. Así los primitivos (`Surface`, `MasteryThread`, `Pill`) funcionan sin cambios y sin clases `dark:` (DESIGN.md §10). "Auto" sigue a `next-themes`; "Claro" y "Oscuro" fuerzan ese tema solo en el lector.

---

## 9. Seguridad

- Ownership en toda lectura y escritura de libros y anotaciones; el `userId` sale siempre de la sesión.
- El token de subida restringe pathname, tipo y tamaño; la confirmación re-verifica el prefijo `books/{session.user.id}/`.
- El EPUB puede traer `<script>`: `allowScriptedContent: false` + iframe sandbox de epub.js.
- Validación de zip bomb en el procesamiento.
- Libros privados por usuario; agregar la cláusula de contenido subido a los términos.

---

## 10. Orden de implementación

1. Schema + migración + `@vercel/blob` + env.
2. `src/lib/blob.ts`, services y validaciones.
3. Rutas de upload, confirmación, file, cover y delete.
4. `src/lib/epub/parse.ts` + función Inngest `book-process`.
5. `/library` (grilla, subida, estados, borrar).
6. `/read/[id]`: render, paginación, progreso, locations y TOC.
7. Selección → resaltados y notas → panel de anotaciones.
8. Tokens nuevos (§8.1) + Literata self-hosted + tipografía y composición (§8.2) + ajustes de lectura + tema en el iframe (incluido sepia).
9. Nav, middleware y actualización de AGENTS.md.

## 11. Verificación (no hay test runner)

- `npx tsc --noEmit`, `npm run lint`, `npx next build`.
- Manual con 3 EPUB: uno chico, uno grande (> 20 MB, con imágenes) y uno sin portada ni TOC.
- Casos: subida > 100 MB rechazada; archivo `.epub` falso → `failed`; reabrir → vuelve al CFI; resaltado persiste tras recargar; borrar libro borra el blob; otro usuario → 403/404.
- Responsive: 360 px (tap en bordes, toolbar de selección no se sale de la pantalla, bottom nav con 5 ítems), 768 px y 1440 px.
- Temas: los 4 del lector × modo claro/oscuro de la app; contraste de los resaltados en cada uno.
- El libro 51 o un archivo de más de 100 MB se rechazan antes de subir.

---

## 12. Preguntas resueltas

1. **Colores de resaltado:** 4 tokens nuevos → §8.1.
2. **Nav móvil:** "Library" se agrega como 5.º ítem. Hay que verificar a 360 px que los 5 ítems quepan con targets ≥ 44 px; si no, se ocultan las etiquetas y quedan solo los iconos.
3. **Tema sepia:** sí → §8.1 y columna `reader_preferences.theme`.
4. **Límites:** 100 MB por archivo y 50 libros por usuario → §4.

---

## Anexo — Adelanto de la fase 2 (para no cerrar puertas)

- **Traducción estilo Google:** panel con selector origen → destino ("Detectar" por defecto; se sugiere `books.language`). El último par elegido se guarda por libro (`books.translate_from`, `books.translate_to`). Gemini traduce la selección con el párrafo como contexto; cache en `translation_cache` (clave `sha256(texto + from + to)`).
- **Crear card desde la selección:** Gemini propone pregunta y respuesta → el usuario edita → `card-service`. La tabla `card_sources (card_id, annotation_id)` enlaza la card con el resaltado, y en `/study` aparece el botón "Abrir en el libro" → `/read/[id]?cfi=…`.
