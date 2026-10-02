# Plan — Lector EPUB · Fase 3 (RAG: "Ask this book")

> Estado: **implementado**. Preguntas al libro con respuestas citadas y sin spoilers.
>
> Fuera de alcance (fases siguientes): PDF (fase 4) y agente que genera cards por capítulo (fase 5, LangGraph en `srs-llm-api`).

## Flujo

1. En el lector, el botón **Ask this book** (barra superior, derecha) abre un panel de chat.
2. Alcance:
   - **Up to where I am** (por defecto): solo usa las secciones hasta la página actual (anti-spoiler).
   - **Whole book**: usa todo el libro.
3. La respuesta sale solo de los pasajes recuperados, en el idioma de la pregunta, con citas `[n]`.
   - Cada fuente es un chip que lleva al pasaje y lo resalta 2,5 s.
   - Si los pasajes no responden la pregunta, lo dice (`answerable = false`).
4. Las preguntas de seguimiento usan el historial de la conversación, que vive en memoria mientras el lector está abierto.

## Indexación

- Al terminar `book-process`, Inngest encola `app/book.index` y la función `book-index` lo indexa:
  - parte `book_sections` en chunks;
  - genera los embeddings;
  - reemplaza `book_chunks` en una transacción;
  - deja `index_status = ready`.
- Libros anteriores a esta fase (o con índice fallido): la primera pregunta los marca `indexing` y encola el evento. El panel muestra "Reading the book for the first time…" y reintenta cada 5 s hasta tener la respuesta.
- Un índice que queda `indexing` más de 15 min se vuelve a encolar.

## Datos (migraciones `0011`–`0013`)

| Elemento | Detalle |
|---|---|
| `CREATE EXTENSION vector` | Migración custom `0011` (pgvector 0.8 en Neon). |
| `books.index_status` | Enum `pending · indexing · ready · failed`. |
| `book_chunks` | Columnas: `book_id`, `section_id`, `spine_index`, `chunk_index`, `text`, `embedding vector(768)`. Índice btree `(book_id, spine_index)`. |

Sin índice ANN: un HNSW global filtraría por libro *después* de la búsqueda aproximada y podría devolver 0 resultados. La búsqueda exacta sobre los chunks de un libro (miles como máximo) es precisa y rápida. `0013` elimina el HNSW que había creado `0012`.

## Decisiones técnicas

- **Chunks** (`src/lib/rag/chunk.ts`):
  - párrafos completos, unos 1400 caracteres (máximo 2400);
  - un párrafo gigante se corta por oraciones;
  - solape de un párrafo corto entre chunks vecinos;
  - la cola pequeña se une al chunk anterior.
- **Embeddings**: `gemini-embedding-001`.
  - Tarea `RETRIEVAL_DOCUMENT` para los chunks y `RETRIEVAL_QUERY` para las preguntas.
  - 768 dimensiones, normalizados L2 (con menos de 3072 dimensiones el modelo no los normaliza).
  - Lotes de 100 con backoff. A cada chunk se le antepone el título de su sección.
- **Recuperación**: top 8 por distancia coseno.
  - Filtro `spine_index <= sección actual`; la sección actual se obtiene por sufijo del `href` que reporta epub.js.
  - La consulta incluye la pregunta anterior para resolver seguimientos.
- **Respuesta**: `generateStructured()` con salida `{ answerable, answer, cited[] }`.
  - Los pasajes se presentan en orden de lectura.
  - Los prompts tratan el texto del libro como dato.
  - Timeout de 25 s por modelo; un timeout pasa al siguiente modelo.
- **Ir a la fuente**: `goToPassage(section_path, locator)`.
  - Busca la sección del spine por sufijo de ruta.
  - Hace `section.find()` con las primeras palabras del chunk (60 caracteres, luego 6 y luego 3 palabras).
  - Hace `display(cfi)` y resalta el pasaje. Si no lo encuentra, va al inicio de la sección.

## Código

- `src/lib/services/book-rag-service.ts`: `indexBook`, `markBookIndexFailed`, `askBook`.
- `src/lib/gemini.ts`: `embedTexts()`. Los timeouts ahora cuentan como errores transitorios.
- `src/inngest/functions.ts`: `indexBookForQuestions` (`book-index`).
  - Concurrencia 1 por libro, 2 reintentos, `onFailure` marca `failed`.
- `askBookAction` en `reader-actions.ts`: Zod, verificación de propiedad y encolado diferido del índice.
- UI:
  - `ask-sheet.tsx`, con formulario react-hook-form + zod.
  - `use-epub-reader.ts` agrega `ReaderLocation.href` y `goToPassage`.

## Verificado

Probado con un EPUB de 3 capítulos en una cuenta local:
- indexación automática al subir;
- anti-spoiler: desde el capítulo 1 no responde sobre el capítulo 3;
- con "Whole book", respuesta correcta citando [3];
- salto a la fuente con resaltado;
- indexación diferida: `pending` → `indexing` → respuesta;
- seguimiento en español con historial;
- móvil a 360 px.
