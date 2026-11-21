# Plan — Canvases HTML (explicaciones interactivas hechas por LLMs)

> Estado: **fase 1 implementada** (guardar y ver). Fases 2 y 3 pendientes.
> Cambio respecto a este plan al implementar: el HTML se guarda en **Postgres** (`canvases.html`), no en Vercel Blob.
> El servidor E2E carga el token de Blob de `.env.local` y escribiría en el store real; en Postgres los tests usan la
> rama `e2e`, no hay blobs huérfanos y actualizar es una sola escritura. Cuota: 2 MB por canvas, 200 y 50 MB por usuario.
> La subida es `POST /api/canvases` (multipart), porque AGENTS.md exige ruta API para uploads y las Server Actions
> tienen un límite de body de 1 MB. Las referencias a Blob más abajo quedan como contexto histórico.
> Alcance: guardar los archivos `.html` que generan los LLMs para explicar ideas abstractas,
> verlos dentro de NeuroCards de forma segura y conectarlos con decks, tarjetas y el servidor MCP.
> Fuera de alcance: editor de HTML, compartir canvases con otros usuarios, canvases que llamen a APIs externas.

---

## 0. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Nombre | "Canvas" (UI en inglés como el resto: *Canvases*) |
| Navegación | Pestaña dentro de Mind maps: `/mind-maps` (Mind maps) · `/mind-maps/canvases` (Canvases). Sin ítem nuevo en el sidebar ni en el bottom nav |
| Aislamiento | Iframe `sandbox="allow-scripts"` **sin** `allow-same-origin` + header CSP `sandbox` en la respuesta (§2) |
| Sanitizar el HTML | **No.** Romper el JS rompería el canvas; la defensa es el aislamiento de origen, no limpiar el contenido |
| Dominio propio (`canvas.<dominio>`) | Más adelante, cuando la app sea pública (§10). La fase 1 funciona en el mismo dominio |
| Almacenamiento | Vercel Blob privado, `canvases/{userId}/{uuid}.html`, subido desde el servidor con `putPrivateBlob()` (cabe en el body de 4,5 MB de una función; no hace falta token de subida desde el cliente) |
| Límites | 2 MB por canvas · 200 canvases por usuario · solo UTF-8 |
| Origen | `source = 'upload' \| 'mcp'` (pastilla "From AI", igual que los mapas mentales) |
| Red dentro del canvas | `connect-src 'none'`: sin `fetch`/XHR/WebSocket. Scripts solo inline o desde CDNs en lista blanca |

---

## 1. Flujo de usuario

```
Opción A — subir a mano
/mind-maps/canvases ──[Upload HTML]──► Server Action uploadCanvas(FormData)
                              valida tamaño + UTF-8 + tipo → putPrivateBlob → fila canvases
                              título = <title> del HTML, o el nombre del archivo

Opción B — desde Claude / ChatGPT (MCP)
"Explícame la entropía con un canvas y guárdalo en NeuroCards"
        └─► tool create_canvas({ title, html, deck_id? }) → misma función del servicio → source='mcp'

/mind-maps            pestañas [Mind maps | Canvases]
/mind-maps/canvases   (lista: título, deck, fecha, pastilla From AI)
        └─► /mind-maps/canvases/[id]  visor a pantalla completa
              <iframe sandbox="allow-scripts" src="/api/canvases/[id]/raw">
              barra superior: ← volver (a la pestaña Canvases) · título · deck · menú (renombrar, asignar deck, borrar)
```

---

## 2. Modelo de amenazas y aislamiento (lo crítico)

El HTML lo escribe un LLM y casi siempre trae `<script>`. Si se ejecutara con el origen de la app,
podría llamar a `/api/*` y a las Server Actions con la sesión del usuario, leer el DOM de la app
o navegar la pestaña a una página de phishing.

### 2.1 Capas

1. **Origen opaco.** El iframe usa `sandbox="allow-scripts"` sin `allow-same-origin`. El documento
   queda en un origen opaco: no ve cookies, `localStorage`, `parent.document` ni puede hacer
   peticiones con credenciales a la app (la respuesta, además, no tiene CORS).
2. **El header repite el sandbox.** `GET /api/canvases/[id]/raw` responde con
   `Content-Security-Policy: sandbox allow-scripts; …`. Así, aunque alguien abra esa URL directamente
   en una pestaña, el documento sigue en un origen opaco.
3. **CSP restrictiva** (construida en `src/lib/canvases/csp.ts`, con test unitario):

   ```
   sandbox allow-scripts;
   default-src 'none';
   script-src 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://cdn.tailwindcss.com https://esm.sh;
   style-src 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com;
   font-src data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;
   img-src data: blob: https:;
   media-src data: blob:;
   connect-src 'none';
   form-action 'none';
   base-uri 'none';
   frame-src 'none';
   frame-ancestors 'self'
   ```

   `'unsafe-inline'`/`'unsafe-eval'` son aceptables **solo porque** el origen es opaco: el código no
   tiene nada que robar. Babel standalone y muchos ejemplos de los LLMs los necesitan.
4. **Sin escapes.** El iframe nunca lleva `allow-same-origin`, `allow-top-navigation*`,
   `allow-popups`, `allow-forms` ni `allow-modals`.
5. **Headers extra:** `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store` (renombrar o borrar se ve al instante),
   `Content-Type: text/html; charset=utf-8`, `Referrer-Policy: no-referrer`.

### 2.2 Riesgo que queda

- El canvas puede navegar **su propio iframe** a otra web (p. ej. una página de login falsa). No llega
  a la pestaña. Mitigación: la barra del visor siempre está fuera del iframe y muestra
  "AI-generated content". Se elimina del todo con el dominio propio (§10).
- `img-src https:` permite "beacons" con imágenes, pero el canvas solo podría filtrar su propio
  contenido, que es del usuario. Aceptado.

### 2.3 Compatibilidad

- `localStorage`/`sessionStorage` lanzan `SecurityError` en un origen opaco, y algunos canvases los usan.
  Al servirlo se **inyecta** un `<script>` mínimo al inicio del `<head>` que los cambia por un
  almacenamiento en memoria (`Object.defineProperty` dentro de try/catch). **Hay que verificarlo
  en Chromium y WebKit** (E2E §7). Si no funciona en WebKit, se documenta como limitación.
- iOS/Safari: el sandbox **con** `allow-scripts` recibe eventos (el fallo del lector EPUB era un
  sandbox *sin* `allow-scripts`).
- Si el HTML es un fragmento sin `<html>`, se envuelve en un documento mínimo con
  `<meta charset>` y `<meta name="viewport">`.

---

## 3. Schema (Drizzle) — `src/lib/db/schema.ts`

```typescript
export const CANVAS_SOURCES = ['upload', 'mcp'] as const;
export type CanvasSource = (typeof CANVAS_SOURCES)[number];

// One self-contained HTML explainer. The file lives in Vercel Blob (private) and is
// served only through /api/canvases/[id]/raw inside an opaque-origin sandbox.
export const canvases = pgTable('canvases', {
  id:            uuid('id').defaultRandom().primaryKey(),
  user_id:       uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  deck_id:       uuid('deck_id').references(() => decks.id, { onDelete: 'set null' }),
  title:         text('title').notNull(),
  description:   text('description'),
  blob_pathname: text('blob_pathname').notNull().unique(),
  size_bytes:    integer('size_bytes').notNull(),
  source:        text('source', { enum: CANVAS_SOURCES }).notNull().default('upload'),
  plain_text:    text('plain_text'),                 // phase 3: visible text, ≤ 20k chars
  created_at:    timestamp('created_at').defaultNow().notNull(),
  updated_at:    timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('canvases_user_updated_idx').on(table.user_id, table.updated_at),
  index('canvases_deck_idx').on(table.deck_id),
]);

// Phase 2: cards that a canvas explains ("Open canvas" while studying).
export const cardCanvases = pgTable('card_canvases', {
  card_id:    uuid('card_id').references(() => cards.id, { onDelete: 'cascade' }).notNull(),
  canvas_id:  uuid('canvas_id').references(() => canvases.id, { onDelete: 'cascade' }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.card_id, table.canvas_id] }),
  index('card_canvases_canvas_idx').on(table.canvas_id),
]);
```

Migraciones con `npx drizzle-kit generate` → `0021_canvases` (fase 1) y `0022_card_canvases` (fase 2),
luego `npx drizzle-kit migrate`. Nada de edición manual.

**Orden al escribir** (el id lo genera la DB): `putPrivateBlob('canvases/{userId}/{randomUUID()}.html')`
→ `insert` → si el insert falla, `deleteBlobs([pathname])`. Al actualizar el HTML se escribe un blob nuevo
y se borra el viejo después de actualizar la fila (así no se sirve una versión cacheada).

---

## 4. Servicio y límites

`src/lib/canvases/limits.ts`
- `MAX_CANVAS_SIZE_BYTES = 2 * 1024 * 1024`, `MAX_CANVASES_PER_USER = 200`.
- `CanvasHtmlSchema` (zod): string no vacío, ≤ 2 MB en bytes UTF-8.
- `extractTitle(html)`: `<title>` con `node-html-parser` (ya es dependencia), recortado a 120 caracteres.

`src/lib/canvases/prepare-html.ts`: envuelve los fragmentos e inyecta el shim de storage (§2.3). Es una función pura con test.

`src/lib/services/canvas-service.ts` (toda la lógica y la propiedad viven aquí):

| Función | Notas |
|---|---|
| `listCanvases(userId, { deckId? })` | Orden `updated_at desc` |
| `getCanvasForUser(userId, id)` | `NOT_FOUND` si no existe o es de otro usuario (no se distingue, para no revelar ids) |
| `assertCanAddCanvas(userId)` | Límite de 200 |
| `createCanvas(userId, { title?, html, description?, deck_id? }, source)` | Verifica que el deck es del usuario |
| `updateCanvas(userId, id, { title?, html?, description?, deck_id? })` | |
| `deleteCanvas(userId, id)` | Borra el blob y después la fila |
| `openCanvasHtml(userId, id)` | Para la ruta `raw`: blob → `prepareCanvasHtml()` |

Validación de ids con `DbIdSchema` (`src/lib/validations.ts`).

---

## 5. Rutas, acciones y páginas

| Pieza | Archivo | Notas |
|---|---|---|
| `GET /api/canvases/[id]/raw` | `src/app/api/canvases/[id]/raw/route.ts` | Auth → `openCanvasHtml` → headers de §2.1. Los errores salen con el envelope `{ data, error }` |
| Server Actions | `src/app/actions/canvas-actions.ts` | `uploadCanvas(FormData)`, `renameCanvas`, `setCanvasDeck`, `deleteCanvas`; `revalidatePath('/mind-maps/canvases')` |
| Pestañas | `src/components/mind-maps/mind-maps-tabs.tsx` | Barra de dos pestañas **con enlaces** (cada una es una ruta, así funcionan el back del navegador y los links directos), con el estilo de pestañas de `DESIGN.md`. Se renderiza arriba en `/mind-maps/page.tsx` y en `/mind-maps/canvases/page.tsx`. El botón de acción cambia según la pestaña: "New mind map" o "Upload HTML" |
| Lista | `src/app/(dashboard)/mind-maps/canvases/page.tsx` | Server Component + `metadata` (`Canvases — NeuroCards`). Tarjetas con título, deck, fecha y pastilla From AI. Estado vacío con el botón "Copy prompt" (§6.2) |
| Visor | `src/app/(dashboard)/mind-maps/canvases/[id]/page.tsx` | El segmento estático `canvases` tiene prioridad sobre `mind-maps/[id]`, así que no hay conflicto de rutas. Pantalla completa sin shell: en `dashboard-shell.tsx`, `isImmersive` también es verdadero para `/mind-maps/canvases/<id>` (no para la lista). El iframe es un Client Component mínimo |
| Componentes | `src/components/canvases/` | `canvas-card.tsx`, `canvas-upload-button.tsx` (react-hook-form + zod, `accept=".html,text/html"`), `canvas-frame.tsx`, `canvas-actions-menu.tsx` |
| Navegación | `src/components/layout/nav-config.ts` | **Sin cambios**: `isNavActive` ya marca "Mind maps" en `/mind-maps/canvases/*` |
| Protección | `middleware.ts` | **Sin cambios**: `'/mind-maps/:path*'` ya está en el `matcher` |

Toda la UI sigue `DESIGN.md` (se lee completo antes de tocar componentes) y usa solo shadcn y tokens existentes.

---

## 6. MCP (`src/lib/mcp/canvas-tools.ts`, registrado en `neurocards-mcp-server.ts`)

### 6.1 Tools

| Tool | Entrada | Salida |
|---|---|---|
| `create_canvas` | `{ title, html, description?, deck_id? }` | `{ id, title, url }` (link a `/mind-maps/canvases/[id]` con `AUTH_URL`) |
| `list_canvases` | `{ deck_id? }` | Metadatos, sin HTML |
| `get_canvas` | `{ id, include_html?: boolean }` | Metadatos; HTML solo si se pide (puede ocupar 2 MB) |
| `update_canvas` | `{ id, title?, html?, description?, deck_id? }` | Como `create_canvas` |

Sin borrado por MCP, igual que en tarjetas y mapas. Todas llaman a `canvas-service`.

### 6.2 Contrato para el LLM

La descripción de `create_canvas` (y el texto de "Copy prompt" para LLMs sin MCP) le dice al modelo:
- Un solo archivo HTML autocontenido. CSS/JS inline o desde cdnjs, jsdelivr, unpkg, Tailwind CDN o esm.sh.
- Sin `fetch`, formularios, popups ni `localStorage` persistente (todo se pierde al recargar).
- Que funcione en móvil (viewport, controles táctiles) y en tema claro y oscuro.
- Que sea ≤ 2 MB.

---

## 7. Tests

| Tipo | Archivo | Qué comprueba |
|---|---|---|
| Unit | `src/lib/canvases/csp.test.ts` | Directivas exactas. Nunca `allow-same-origin`. `connect-src 'none'` |
| Unit | `src/lib/canvases/prepare-html.test.ts` | Envuelve fragmentos, inyecta el shim una sola vez, respeta `<head>` existente |
| Unit | `src/lib/canvases/limits.test.ts` | Tamaño en bytes (no en caracteres), extracción del título |
| Unit | `src/lib/mcp/handle-mcp-request.test.ts` | Los nuevos tools aparecen en `tools/list` |
| E2E | `e2e/canvas-security.spec.ts` + fixture `e2e/fixtures/hostile-canvas.html` | El canvas hostil intenta `document.cookie`, `fetch('/api/decks')`, `parent.document`, `top.location = …`, `window.open`, `localStorage`. Se verifica que la pestaña sigue en `/mind-maps/canvases/[id]`, que `window.__canvasEscaped` del padre sigue `undefined` y que el iframe no ve cookies. Abrir `/raw` directamente devuelve el header `sandbox` |
| E2E | `e2e/canvas.spec.ts` | Pestañas Mind maps ↔ Canvases (el ítem "Mind maps" del nav queda activo) → subir → aparece en la lista → el visor ejecuta un script inline (el botón cambia un contador) → renombrar → borrar. En los 3 proyectos (android-chrome, iphone-safari, desktop-chrome) |

Los E2E usan la rama `e2e` de Neon (`.env.test`), como el resto.

---

## 8. Fases

| Fase | Alcance | Tamaño |
|---|---|---|
| **1 — Guardar y ver** | §3 `canvases`, §4, §5 (sin enlace a tarjetas), CSP, shim, E2E de seguridad | Pequeña-media (similar a la parte de almacenamiento de los mapas mentales) |
| **2 — MCP + decks + tarjetas** | §6, `deck_id` en la UI del deck ("Canvases" en `/decks/[id]`), `card_canvases`, botón "Open canvas" en el estudio (hoja con el iframe, como "Open in book"), `create_cards` acepta `canvas_id` | Media |
| **3 — De canvas a tarjetas** | `plain_text` extraído al guardar (`node-html-parser`, sin `script`/`style`), botón "Make cards" → srs-llm-api → revisión → `createCardsForUser`. Cuenta para `llm_usage` (`reserveLlmCall`) | Media. **Verificar** si `/v1/llm/suggest-card` devuelve una tarjeta o varias; puede hacer falta `/v1/llm/suggest-cards` en srs-llm-api |

Cada fase termina con `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run test:e2e` y `npx next build`.

---

## 9. Decisiones abiertas

1. ~~**Navegación.**~~ Decidido: pestaña dentro de Mind maps (§0, §5).
2. **Límites.** ¿Bastan 2 MB / 200 por usuario? Algunos canvases con imágenes en base64 pasan de 2 MB.
3. **Lista blanca de CDNs.** ¿Añadir `cdn.plot.ly`, `d3js.org`, `cdn.skypack.dev`? Cada dominio amplía lo que el canvas puede cargar.

---

## 10. Más adelante: dominio aislado

Cuando la app sea pública, servir `raw` desde `canvas.<dominio>` (otro *site*, no solo otro origen)
con un token firmado de corta duración en la URL (HMAC con un secreto nuevo, `CANVAS_URL_SECRET`, que caduque en unos 5 min).
Así el canvas queda fuera del site de la app aunque se abra sin sandbox. Para dar `localStorage` real
(`allow-same-origin`, sin shim) cada canvas necesitaría su propio subdominio (`{id}.canvas.<dominio>`):
con uno compartido, los canvases de todos los usuarios verían el storage de los demás.
Necesita otro dominio (wildcard) en Vercel y una ruta que no use la cookie de NextAuth.
