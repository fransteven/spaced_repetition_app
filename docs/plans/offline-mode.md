# Plan: Modo offline (lector + estudio) estilo "YouTube Premium"

## Context
NeuroCards es una app web: hoy todo requiere red. El lector descarga el EPUB entero en cada apertura
(`use-epub-reader.ts:671`, `fetch → arrayBuffer → ePub(buffer)`), las páginas `/read/[id]` y `/study/[id]`
son RSC dinámicas, y no existe service worker, IndexedDB ni OPFS. El usuario quiere **descargar libros y mazos
al navegador** y usarlos sin conexión, con una biblioteca descargada de **5 GB o más en total** (el límite por
libro de 100 MB se mantiene). Alcance: **lector + estudio** offline, sincronizando al volver la red.

Cuotas reales del navegador (por origen): Chrome/Edge ~60 % del disco; Safari 17+ ~60 % del disco
(sin el borrado a los 7 días si la app está instalada o el almacenamiento es persistente); Firefox hasta 50 %
con almacenamiento persistente. Con `navigator.storage.persist()` y OPFS, 5 GB+ es viable.

## Decisiones de arquitectura
- **Almacenamiento**
  - EPUB y portadas → **OPFS** (`navigator.storage.getDirectory()`), escritura en streaming con
    `createWritable()` (sin pico de memoria). Fallback: Blob en IndexedDB cuando `createWritable` no exista.
  - Metadatos, snapshot del lector, mazos/tarjetas/schedules y la **outbox** de sincronización → **IndexedDB**
    con la librería `idb` (~1 KB).
  - Imágenes de tarjetas (Cloudinary, `<img>` plano) → **Cache Storage** (`fetch` con `mode:'cors'`;
    nunca respuestas opacas, que en Chrome cuentan ~7 MB cada una).
  - `navigator.storage.persist()` al primer download + `estimate()` para mostrar uso/cuota y **bloquear
    una descarga que no cabe**.
- **Service worker escrito a mano** (Serwist exige webpack; Next 16 compila con Turbopack, según
  `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md:668`). Se sirve desde un route
  handler `src/app/sw.js/route.ts` que inyecta `BUILD_ID` (`VERCEL_GIT_COMMIT_SHA` o el timestamp del build),
  con `Service-Worker-Allowed: /` y `Cache-Control: no-cache`.
  - `install`: precachea los shells offline (`/offline`, `/offline/read`, `/offline/study`). Lee su HTML y
    extrae los `/_next/static/...` (JS/CSS/fuentes) para cachearlos en el mismo `shell-<BUILD_ID>`.
  - `activate`: borra los caches `shell-*` de builds anteriores. **Nunca** toca los caches de contenido
    (`images-v1`).
  - `fetch`: `/_next/static/*` con cache-first. Las navegaciones van network-first: si falla la red, una
    navegación a `/read/:id` redirige a `/offline/read?book=:id`, una a `/study/:id` a `/offline/study?deck=:id`
    y cualquier otra a `/offline`. Las imágenes cacheadas son cache-first. **Nunca** cachea `/api/*` ni las
    respuestas de Server Actions.
- **Shells offline**: rutas `src/app/offline/**`, estáticas y `'use client'`, que leen todo de IndexedDB/OPFS.
  No tienen datos de servidor ni auth (no exponen nada: el contenido sale del dispositivo). No pasan por el
  layout de `(dashboard)`, que hace consultas a la base de datos.
- **Sincronización idempotente**: cada mutación offline lleva un UUID de cliente (`crypto.randomUUID()`) y
  el servidor lo deduplica.

## Cambios en servidor (DB, servicios, rutas)
1. **Migración** (`npx drizzle-kit generate` y luego `migrate`; nunca editar a mano):
   - `review_logs.client_review_id uuid UNIQUE NULL`.
   - El id de `book_annotations` ya es uuid: se acepta un `id` de cliente.
2. **FSRS con hora real de repaso** – `applyReview()` (`src/lib/services/study-service.ts:151`) recibe
   `reviewedAt?: Date` (por defecto `new Date()`).
   - Lo pasa a `review(schedule, rating, reviewedAt)` (`src/lib/fsrs/algorithm.ts:50`, que ya acepta
     `now`) y lo escribe en `review_logs.reviewed_at`.
   - Lleva un comentario citando FSRS 4.5: el tiempo transcurrido es el que pasa entre repasos reales.
   - `algorithm.ts` no se toca.
3. **`POST /api/study/review/sync`** (nuevo; patrón de `src/app/api/study/review/route.ts`, delega en el
   servicio `syncOfflineReviews(userId, reviews[])`).
   - Body: hasta 500 ítems `{client_review_id, card_id, rating, reviewed_at}` (zod en `validations.ts`,
     `DbIdSchema`).
   - Validación de `reviewed_at`: no más de 5 min en el futuro ni más de 60 días atrás.
   - Proceso: se ordena por `reviewed_at`; cada ítem va en su propia transacción.
     - `client_review_id` ya existe → `duplicate` (OK).
     - `reviewed_at <= card_schedules.last_review` del servidor (otro dispositivo repasó después) → `stale`.
       No se escribe nada, así se cumple la regla "ambas tablas o ninguna".
     - En otro caso → `applyReview(..., reviewedAt)` y se inserta `client_review_id` → `applied`.
   - Responde `{ data: { results: [{client_review_id, status}], schedules: [...] } }`, con los schedules
     actualizados para refrescar el snapshot local.
4. **`GET /api/offline/decks/[id]`** (nuevo; servicio `getOfflineDeckSnapshot`). Comprueba la propiedad y
   devuelve el mazo, **todas** sus tarjetas (front, back, image_url_1/2, source) con su `card_schedule`
   **completo** y `server_time`.
5. **`GET /api/offline/books/[id]`** (nuevo; reutiliza `getReaderData()` de `book-service.ts:89`). Devuelve
   el snapshot de `ReaderProps`: el libro (incluye `locations_json`, `last_cfi`, `progress`), las anotaciones,
   los marcadores y las preferencias.
6. **Idempotencia en el lector** (`reader-actions.ts` + servicios + `validations.ts`):
   - `CreateAnnotationSchema` acepta `id?` → insert con `onConflictDoNothing({target: id})`; si ya existe,
     devuelve la fila existente.
   - `SaveReadingProgressSchema` acepta `client_updated_at?` → `UPDATE ... WHERE last_read_at IS NULL OR
     last_read_at < client_updated_at`, para que un flush offline tardío no pise un progreso más nuevo.
   - Borrado de anotación y de marcador: el cliente de sync trata `NOT_FOUND` como éxito.
7. **Extraer el orden de sesión §6.3** de `getStudySession` (`study-service.ts:74-98`) a la función pura
   `orderStudyCards(items, now, rng)` en `src/lib/study/order-cards.ts`. Servidor y cliente usan **la misma**
   función, sin reordenar.

## Capa de cliente offline (`src/lib/offline/`)
- `db.ts`: esquema `idb` v1.
  - `books` (meta + snapshot + `bytes` + `owner_id`)
  - `decks` (snapshot + `owner_id`)
  - `cards` (por `deck_id`)
  - `outbox` (`{id, kind, payload, created_at, attempts}`, `kind` ∈ `review | progress | annotation.create |
    annotation.update | annotation.delete | bookmark.create | bookmark.delete | preferences | locations`)
- `book-files.ts`: `downloadBook(id, onProgress, signal)`.
  - Hace `fetch('/api/books/:id/file')` y pasa `body` a `createWritable()` de OPFS con un contador de bytes
    (usa `Content-Length`, que ya envía `stream-book-blob.ts`). Fallback: Blob en IDB.
  - Luego `readBook(id): Promise<ArrayBuffer>` y `deleteBook(id)`.
  - Descarga también la portada y el snapshot `/api/offline/books/:id`.
- `deck-download.ts`: guarda el snapshot del mazo y precachea las imágenes en Cache Storage, en paralelo
  limitado (4) y con progreso.
- `storage.ts`: `getUsage()`, `requestPersistence()`, `ensureSpace(bytesNeeded)` y `wipeAll()` (IDB + OPFS +
  caches de contenido).
- `outbox.ts` + `sync.ts`:
  - `enqueue()` y `flush()`. Las reviews van en lote a `/api/study/review/sync`; el resto se reenvía a los
    Server Actions existentes, en orden FIFO y con backoff.
  - Disparadores: evento `online`, `visibilitychange`, arranque de la app y botón "Sincronizar ahora".
  - Un lock con `navigator.locks` evita flush dobles entre pestañas.
- `persistence.ts`: adaptador `ReaderPersistence` / `StudyPersistence`. Intenta el Server Action o el fetch;
  si falla por red (`TypeError` o `!navigator.onLine`), encola. Se usa **también online**, así la red móvil
  inestable deja de perder progreso.
- `use-online-status.ts` y el componente `OfflineBanner`.
- Propietario: cada registro guarda `owner_id`. Un `logout()` compartido reemplaza los dos `signOut`
  (`top-nav.tsx:124`, `mobile-drawer.tsx:89`): primero hace flush best-effort, luego `wipeAll()` y después
  `signOut`. Al arrancar, si `session.user.id !== owner_id`, se ejecuta `wipeAll()`.
- `src/components/service-worker-register.tsx`, montado en `src/components/providers.tsx`; solo en
  producción, o en dev con un flag.

## Integración en el lector
- `use-epub-reader.ts`: nueva opción `loadBook: () => Promise<ArrayBuffer>`. Por defecto hace el `fetch`
  actual; si el libro está descargado lee de OPFS, también online, porque abre al instante y no gasta datos.
  El resto del hook no cambia (el archivo pesa como mucho 100 MB, así que epub.js/JSZip en memoria es
  aceptable).
- `reader.tsx`: las llamadas directas (`saveReadingProgressAction` :221, preferencias :140, ubicaciones
  :288, anotaciones y marcadores) pasan por `ReaderPersistence`.
  - Las anotaciones nuevas generan `id` en el cliente, así la UI optimista y el sync comparten id.
- Offline: ocultar o deshabilitar lo que necesita red (ask, traducir, sugerir tarjeta, diccionario,
  `KeepAiAwake`), mostrando "Requiere conexión".
- `src/app/offline/read/page.tsx`: lee `?book=` del snapshot en IDB y renderiza `<Reader>` con las mismas
  props. Si el libro no está descargado, muestra un estado vacío con enlace a `/offline`.

## Integración en estudio
- `study-session.tsx`: el `fetch('/api/study/review')` de las líneas 118-139 pasa por `StudyPersistence`.
- Modo offline:
  - Se calcula `review()` localmente con `reviewed_at = now` y se actualiza el schedule en IDB.
  - Se encola `{client_review_id, card_id, rating, reviewed_at}`.
  - Se recalculan las `previews` con `previewIntervals()` (`algorithm.ts:128`). Esto arregla además el
    preview obsoleto del "again" re-encolado.
- Online, si el mazo está descargado: tras cada review se actualiza también el schedule local con la
  respuesta del servidor, para que el snapshot no quede desfasado.
- Offline se ocultan ExamDialog, VoiceExamDialog y el editor. "Open in book" lleva a
  `/offline/read?book=…&cfi=…` si el libro está descargado; si no, se oculta.
- `src/app/offline/study/page.tsx`: carga el snapshot, construye la cola con `orderStudyCards()` y renderiza
  `<StudySession>`. La racha se muestra local ("se actualizará al sincronizar").
- Tras el sync, los resultados `stale` se muestran en un toast: "N repasos de otro dispositivo eran más
  recientes y se descartaron".

## UI (leer `DESIGN.md` entero antes; solo tokens y variantes de shadcn)
- `src/components/library/book-card.tsx:72-86`: añadir en el menú "Descargar para leer sin conexión" /
  "Eliminar descarga", con un badge de estado (descargado / progreso % / error).
  `delete-book-dialog.tsx` borra también la copia local.
- `src/components/decks/DeckCard.tsx:91-115`: "Descargar mazo", con el mismo badge.
- Página **Descargas** (`src/app/offline/page.tsx`, que es a la vez el home offline):
  - Barra de uso/cuota (`estimate()`) y estado de persistencia, con botón para pedirla.
  - En iOS, aviso "Instala la app en la pantalla de inicio para que Safari no borre las descargas".
  - Lista de libros y mazos con su tamaño, botón eliminar, "Sincronizar ahora" y el número de cambios
    pendientes.
  - Enlace a esta página desde el menú de usuario (top-nav y mobile-drawer).
- `OfflineBanner` global en el layout de dashboard y en los shells offline.

## Ejecución (subagentes en oleadas)
Uso el **objetivo** como criterio de aceptación: abrir un libro y estudiar un mazo con la red cortada, y
que todo se sincronice sin duplicados al volver. Lo ejecuto con subagentes (`Agent`) en paralelo, cada uno
con ficheros disjuntos:
- **Oleada 1 (paralela)**
  - A: servidor, puntos 1-7, con tests de vitest de `orderStudyCards` y de la deduplicación/stale de
    `syncOfflineReviews`.
  - B: `src/lib/offline/*` (db, book-files, deck-download, storage, outbox, sync) con tests sobre
    `fake-indexeddb`.
  - C: service worker, route handler, registro y shells vacíos.
- **Oleada 2 (paralela, tras la 1)**
  - D: integración en el lector.
  - E: integración en estudio.
  - F: UI de descargas, menús, banner y `logout()`.
- **Oleada 3 (yo)**: revisión, e2e, `AGENTS.md` (nueva sección §4.2.4 Offline) y verificación en el navegador.

Dependencias nuevas: `idb`, y `fake-indexeddb` como dev.

## Verificación
- `npx tsc --noEmit`, `npm run lint`, `npm test`. Unit tests: `order-cards`, sync idempotente
  (duplicate/stale/applied), outbox FIFO y reintentos, y `ensureSpace`.
- E2E nuevos `e2e/offline-reader.spec.ts` y `e2e/offline-study.spec.ts`, en Chromium (android-chrome y
  desktop-chrome) con `serviceWorkers: 'allow'`. La descarga ocurre en la página, así que `page.route`
  sigue sirviendo el EPUB fixture.
  - Flujo: descargar, `context.setOffline(true)`, recargar `/read/:id`, que redirige al shell. Leer, subrayar
    y crear un marcador; estudiar tres tarjetas.
  - Después `setOffline(false)`, esperar el sync y comprobar en la base de datos e2e que hay un
    `review_logs` por `client_review_id`, que no hay duplicados tras un segundo flush, y que la anotación y
    el progreso se guardaron.
  - En WebKit se prueba solo el camino de OPFS/IDB sin SW.
- `e2e/reader-security.spec.ts` y `e2e/canvas-security.spec.ts` siguen en verde: `sanitizeSection` no se
  toca y el SW no cachea `/api/canvases/*/raw`.
- Manual en el navegador del preview: descargar un libro, ver la barra de cuota, poner offline en DevTools,
  navegar y leer.
- Cuota grande: en Chrome, comprobar que `estimate().quota` supera 5 GB y que `persist()` devuelve `true`
  con la app instalada.
- `npx next build` antes de cerrar.

## Fuera de alcance
Libros individuales de más de 100 MB (requeriría streaming en el servidor y un zip diferido); cifrado o DRM
del contenido descargado; IA offline; editar tarjetas sin conexión.

## Wire contract (shared by server and client — JSON, Dates are ISO strings)

```ts
// GET /api/offline/decks/[id]  → { data: OfflineDeckSnapshotWire, error: null }
type ScheduleWire = {
  stability: number; difficulty: number; state: 'new'|'learning'|'review'|'relearning';
  reps: number; lapses: number; elapsed_days: number; scheduled_days: number;
  due_date: string; last_review: string | null;
};
type OfflineDeckSnapshotWire = {
  deck: { id: string; name: string; description: string | null; subject: string };
  cards: Array<{
    card_id: string; front: string; back: string;
    image_url_1: string | null; image_url_2: string | null;
    source: { book_id: string; book_title: string; cfi_range: string } | null;
    schedule: ScheduleWire;
  }>;
  server_time: string;
};

// GET /api/offline/books/[id]  → { data: OfflineBookSnapshotWire, error: null }
// Same data the reader page passes to <Reader> (ReaderProps), JSON-serialised.
type OfflineBookSnapshotWire = {
  book: ReaderBook;                 // book-service.ts ReaderBook, JSON
  annotations: BookAnnotation[];    // JSON (dates as strings)
  bookmarks: BookBookmark[];
  preferences: ReaderPreferences;
  deck_options: BookDeckOptions;
  file_bytes: number;               // size of the EPUB blob
};

// POST /api/study/review  (existing) — body gains optional client_review_id (uuid);
// response data gains `schedule: ScheduleWire` (card's schedule after the review).
//   { card_id, rating, client_review_id? } → { data: { scheduled_days, due_date, schedule }, error }

// POST /api/study/review/sync
//   body: { reviews: Array<{ client_review_id: string; card_id: string;
//           rating: 'again'|'hard'|'good'|'easy'; reviewed_at: string }> }   // 1..500
//   → { data: { results: Array<{ client_review_id: string;
//                 status: 'applied'|'duplicate'|'stale'|'not_found' }>,
//               schedules: Array<{ card_id: string } & ScheduleWire> }, error: null }
//   not_found = card deleted or not owned (client drops the item).

// Server Actions (existing, extended):
//   saveReadingProgressAction({ book_id, cfi, progress, client_updated_at? /* ISO */ })
//   createAnnotationAction({ id? /* client uuid */, book_id, cfi_range, quote, chapter_label?, color, note? })
//     → idempotent on id (returns existing row if id already exists for this user).
```
