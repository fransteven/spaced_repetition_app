# Plan — Lector EPUB · Fase 2

> Estado: **implementado**. Traducción estilo Google y creación de cards desde el texto.
>
> Fuera de alcance (fases siguientes): RAG sobre `book_sections` (fase 3), PDF (fase 4), agente que genera cards por capítulo (fase 5).

## Flujo

1. El usuario selecciona texto (o toca un resaltado). La barra flotante ahora ofrece **Traducir** y **Crear card**, además de colores, nota y copiar.
2. **Traducir** abre un panel lateral estilo Google Translate:
   - selector origen → destino, con "Detectar" por defecto y botón de intercambio;
   - el texto original y su traducción; botones Copiar y Crear card.
   - El último par se guarda por libro (`books.translate_from` / `translate_to`). El destino por defecto es el idioma del navegador, o español/inglés si el libro ya está en ese idioma.
3. **Crear card** abre un diálogo:
   - Desde una selección o un resaltado, Gemini redacta pregunta y respuesta (principio de mínima información) y el usuario las edita.
   - Desde el panel de traducción viene prellenada: frente = original, reverso = traducción.
   - El mazo se elige en un select (por defecto, el último usado con ese libro) o se crea uno nuevo con el título del libro.
   - Si la card sale de una selección, se crea también un resaltado amarillo, que es el ancla de la card.
4. En `/study`, las cards de un libro muestran **Open in book**, que lleva a `/read/[id]?cfi=…`.

## Datos (migración `0010`)

| Tabla / columna | Uso |
|---|---|
| `books.translate_from`, `books.translate_to` | Último par de idiomas (`null` en origen = detectar). |
| `card_sources (card_id PK, user_id, book_id, annotation_id?, cfi_range)` | Enlace card → libro. Copia el CFI para sobrevivir al borrado del resaltado (`annotation_id` pasa a `null`); si se borra el libro, se borra solo el enlace. |
| `translation_cache (key PK, source_lang, target_lang, translation)` | Caché compartida con `key = sha256(from, to, texto)`. |

## Código

- `src/lib/gemini.ts`: `generateStructured()` hace llamadas JSON cortas con cadena de modelos de respaldo y valida la salida con Zod. Solo Gemini.
- `src/lib/services/translation-service.ts`: ownership → guarda el par → caché → Gemini, con el párrafo como contexto.
- `src/lib/services/book-card-service.ts`: `getBookDeckOptions`, `suggestCardFromPassage` y `createCardFromBook`, que valida el mazo antes de crear el resaltado.
- `src/lib/translation/languages.ts`: 23 idiomas ISO 639-1.
- Server actions en `reader-actions.ts`: `translateSelectionAction`, `suggestBookCardAction`, `createBookCardAction`.
- UI:
  - `translate-sheet.tsx` y `create-card-dialog.tsx` (react-hook-form + zod);
  - la barra de selección gana dos botones;
  - `use-epub-reader` agrega `context` (el párrafo que rodea la selección).
- Estudio: `getStudySession` hace left join a `card_sources` + `books`, y `study-card.tsx` muestra el enlace.

## Seguridad

- Toda acción valida con Zod y verifica la propiedad del libro, el resaltado y el mazo.
- Los prompts marcan el texto del libro como dato, no como instrucciones.
- `GEMINI_API_KEY` solo se usa en el servidor. Los errores del modelo llegan al usuario como `UNAVAILABLE`, con opción de reintentar.
