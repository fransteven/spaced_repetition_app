# Plan — Lector EPUB · Fase 3 (RAG con LangGraph + OpenAI)

> Estado: **implementado y verificado sin la clave real de OpenAI** (modo offline + fallo real de autenticación). Pendiente: correr `evals.smoke` y `evals.run` con tu `OPENAI_API_KEY`.
>
> Reemplaza la primera versión de esta fase (RAG en TypeScript con Gemini dentro de Next.js).
>
> Fuera de alcance (siguientes): PDF (fase 4) y agente que genera cards por capítulo (fase 5, LangGraph en `srs-llm-api`).

## Qué cambió respecto a la primera versión
- El RAG vive en **`srs-llm-api`** (FastAPI + LangGraph), no en Next.js. El proveedor es **OpenAI** (embeddings y LLM).
- **Traducción** y **sugerencia de tarjeta** (fase 2) pasan al mismo servicio con OpenAI. Examen, calificación de voz y Gemini Live siguen en Gemini.
- Next.js sigue siendo dueño de la BD: el servicio Python **no tiene credenciales de BD** (mismo patrón que el gateway de voz).
- Respuestas en **streaming** (SSE), con un tope diario por usuario y modelo barato por defecto (`gpt-5-nano`).

## Flujo
1. Subir un EPUB → Inngest `book-process` extrae el texto → `book-index` pide al servicio indexarlo (embeddings en segundo plano).
2. En el lector, **Ask this book**: "Up to where I am" (sin spoilers) o "Whole book".
3. La respuesta llega en streaming (etapas "Searching / Reading / Writing" y texto progresivo) con citas `[n]`; cada fuente abre el pasaje y lo resalta.
4. Si el libro no está indexado (anterior a esta fase) la primera pregunta lo encola; el panel espera y responde solo. Esas esperas no cuentan para el tope diario.

## Arquitectura
```
Browser ─sesión─► Next  POST /api/books/[id]/ask ─Bearer LLM_SERVICE_TOKEN─► srs-llm-api  POST /v1/rag/ask (SSE)
                  (auth, ownership, spine_limit, índice listo, tope diario)    │ LangGraph: condense → retrieve → grade ⟲ → generate | not_covered → finalize
                                                                               ├─► OpenAI (chat + embeddings)
                                                                               └─► Next  POST /api/internal/rag/search ─► Neon pgvector
Inngest book-index ─► srs-llm-api POST /v1/rag/index (202) ─► Next: begin · GET sections · PUT chunks · complete | fail
Server actions traducir / sugerir ─► srs-llm-api POST /v1/llm/translate · /v1/llm/suggest-card
```

## Grafo (`srs-llm-api/app/rag/graph/`)
- **condense** (solo con historial): reescribe el seguimiento como pregunta autónoma.
- **retrieve**: embebe la consulta y llama a `search` (reintentos de LangGraph ante 5xx de Next).
- **grade**: una llamada estructurada → pasajes relevantes, `sufficient` y, si no, una consulta refinada. Insuficiente con intentos disponibles → vuelve a `retrieve` (máx. `RAG_MAX_ATTEMPTS`, por defecto 2).
- **generate** (streaming con citas `[n]`) o **not_covered** (respuesta breve en el idioma de la pregunta; sugiere "Whole book" si había límite de spoilers).
- **finalize**: las citas del modelo **nunca se confían**: se normalizan (`[1,2]`→`[1][2]`), se descartan las inexistentes, se reconstruyen las fuentes y se decide `answerable`. El evento `final` es la salida autoritativa; los tokens son una vista previa.
- Protocolo SSE: `status`, `token`, `final`, `indexing`, `error`. Cancelar la petición cancela la corrida en Python (y su llamada a OpenAI).
- El grafo depende de puertos (retriever, embedder, condenser, grader, generator): en tests y evals se usan fakes y un retriever en memoria.

## Indexación
`begin` (compare-and-set en Next: una corrida a la vez por libro; una atascada >15 min se retoma) → paginar secciones → chunking (`CHUNKER_VERSION`) → embeddings por lotes → `PUT chunks` idempotente (clave única `book, spine, chunk`) → `complete` (verifica el conteo). Cualquier error o cancelación llama a `fail`.
`books.index_fingerprint` = `proveedor:modelo:dims:chunker`. Si no coincide con el actual, el servicio responde `indexing` y reconstruye el índice solo.

## Datos (migraciones `0011`–`0015`)
pgvector, `book_chunks vector(768)`, `books.index_status`, `books.index_fingerprint`, índice único de chunks y `llm_usage`. La `0014` descarta los vectores de Gemini y deja todos los libros en `pending`.

## Configuración y costos
Variables del servicio: ver `srs-llm-api/.env.example`. Puntos clave:
- `OPENAI_CHAT_MODEL=gpt-5-nano` (el más barato; subir a `gpt-6-luna` es una variable) y `OPENAI_REASONING_EFFORT=auto`, que elige el esfuerzo que cada familia acepta (`gpt-5*`: `minimal`; `gpt-6*`: `none`). Hay override por nodo o tarea (`OPENAI_{CONDENSE,GRADER,GENERATOR,TRANSLATE,SUGGEST}_MODEL`).
- Topes de salida por nodo (incluyen los tokens de razonamiento), `RAG_FETCH_K`/`RAG_CONTEXT_K` y `RAG_GRADER_ENABLED=false` para depurar con menos tokens.
- En Next: `LLM_DAILY_LIMIT_ASK|TRANSLATE|SUGGEST` (100 / 300 / 100 por usuario y día UTC). La traducción cuenta solo si no estaba en caché.
- Costo estimado con `gpt-5-nano`: ≈ $0,0006 por pregunta; indexar un libro de 500 páginas ≈ $0,004.
- `LLM_PROVIDER=fake`: modo offline determinista y gratis (embeddings por hashing, respuestas extractivas) para pruebas de UI y desarrollo. `FAKE_TOKEN_DELAY_SECONDS` lo pone en cámara lenta.

## Seguridad
- Token compartido separado del de voz, ≥ 32 caracteres, comparación de tiempo constante, el servicio falla cerrado si falta.
- Ownership y filtro anti-spoiler en SQL dentro de Next; una posición de lectura desconocida limita la respuesta a la primera sección, nunca al libro completo.
- El texto de libros e historial se pasa como dato delimitado; el grafo no tiene herramientas. Los logs llevan ids, conteos y uso de tokens, nunca prompts ni texto del libro.
- Errores de proveedor o de Next se muestran con mensajes genéricos y amables.

## Verificación realizada
- Python: 147 tests (chunker, pipeline contra un Next simulado, decisiones del grafo, citas, prompts, puertos OpenAI con modelos falsos, endpoints SSE y JSON, proveedor offline, arnés de evals), `ruff`, `mypy`.
- Contrato en Next: 34 comprobaciones HTTP (401, aislamiento entre tokens, CAS, paginación, idempotencia, anti-spoiler, ownership).
- Navegador (offline): subida → índice automático, streaming progresivo, fuente → pasaje, anti-spoiler con la posición real, seguimiento, libro sin indexar → responde solo, cancelar al cerrar el panel, tope diario, Python caído, libro ajeno (403), traducción con caché, sugerencia y creación de tarjeta.
- Fallo real contra OpenAI con una clave inválida: el índice queda `failed`, no atascado.
- **Pendiente con clave real**: `uv run python -m evals.smoke` (5 llamadas, < $0,001) y `uv run python -m evals.run --dry-run` / `evals.run` (umbrales: hit@k ≥ 0,85, recall ≥ 0,80, rechazo ≥ 0,80, 0 fugas, 0 inyecciones, p95 primer token < 8 s).

## Limitaciones conocidas
- Granularidad de spoilers = sección (capítulo): dentro del capítulo actual puede aparecer texto posterior a la página.
- Un `<spine>` gigante (todo el libro en un archivo) debe caber en la respuesta de 4,5 MB de Vercel al paginar secciones.
- Los chats no se persisten (el cliente envía los últimos 6 turnos). Persistirlos exigiría acceso directo a la BD desde Python.
- Pasar a OpenAI implica enviar el texto de los libros del usuario a un tercero: conviene revisar sus términos de retención y reflejarlo en la política de la app.
- Una llamada que falla tras reservar cuenta para el tope diario.
- Siguiente, si los evals muestran huecos de recall: búsqueda híbrida (tsvector + RRF).
