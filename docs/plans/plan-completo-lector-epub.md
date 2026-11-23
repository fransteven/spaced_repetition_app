# Plan completo — Lector EPUB, traducción, tarjetas y preguntas al libro (RAG)

> Documento maestro. Reúne las fases 1–3 (implementadas), el replanteo del 2-oct-2026, el despliegue y lo que sigue.
> Estado al **2026-10-04**: fases 1–3 en `main` de ambos repos. Next.js en Vercel; `srs-llm-api` en Render (plan gratis).
> Pendiente para que la IA funcione en producción: variables en Vercel, sincronizar Inngest y correr los evals con la clave real.
> Detalle por fase: `epub-reader-fase-1.md`, `epub-reader-fase-2.md`, `epub-reader-fase-3-langgraph.md`. Contrato del servicio: `AGENTS.md` §6.5.

---

## 1. Objetivo

Cerrar el ciclo **leer → capturar → repasar**: el usuario sube un libro, lo lee con resaltados y notas, traduce un pasaje, convierte una idea en tarjeta (que entra al motor FSRS de estudio) y puede preguntarle al libro con respuestas citadas y sin spoilers.

## 2. Estado por fase

| Fase | Alcance | Estado | Dónde |
|---|---|---|---|
| 1 | Subir EPUB → biblioteca → lector estilo Apple Books (progreso, resaltados, notas, temas, tipografía) | Implementada, en `main` | Next |
| 2 | Traducción estilo Google y creación de tarjetas desde el texto (con «Abrir en el libro» en `/study`) | Implementada, en `main`; la IA pasó a `srs-llm-api` | Next + Python |
| 3 | «Ask this book»: RAG con LangGraph + OpenAI, streaming, anti-spoiler, tope diario | Implementada, en `main`; falta verificar con clave real y activar en producción | Next + Python |
| 4 | Soporte PDF | Sin planificar en detalle (propuesta en §12) | — |
| 5 | Agente que genera tarjetas por capítulo | Sin planificar en detalle (propuesta en §12) | Python (LangGraph) |

## 3. Decisiones y su razón

| Tema | Decisión | Razón |
|---|---|---|
| Formato | EPUB primero, PDF en fase 4 | EPUB trae estructura (spine, TOC, CFI); PDF exige extracción de texto |
| Almacenamiento | Vercel Blob privado, subida directa del navegador | Evita el límite de 4,5 MB de las funciones; el URL del blob nunca llega al cliente |
| Render del libro | `epubjs` directo, sin `react-reader` | Control total de la UI según DESIGN.md |
| Tema del lector | Sepia estilo Apple Books por defecto (más Auto, Claro, Oscuro) | Lectura larga; contraste ≥ 4,5:1 |
| Dónde vive la lógica LLM | Repo Python `srs-llm-api` (FastAPI + LangGraph), no en Next | Los agentes van en Python; la primera versión (TS + Gemini dentro de Next) se descartó el 2-oct |
| Proveedor del RAG, traducción y sugerencia | **OpenAI** (examen, calificación de voz y Gemini Live siguen en Gemini) | Decisión del usuario; Gemini daba 503 seguidos en pruebas |
| Dueño de los datos | **Next.js** (BD, sesiones y permisos). Python no tiene credenciales de BD | Mismo patrón que el gateway de voz; una sola fuente de verdad para permisos |
| Autenticación entre servicios | `LLM_SERVICE_TOKEN` (≥ 32 caracteres, comparación de tiempo constante, falla cerrado), distinto de `VOICE_SERVICE_TOKEN` | Aislar secretos por función |
| Modelo | `gpt-5-nano` por defecto (≈ $0,0006 por pregunta); `gpt-6-luna` como subida de calidad, global o por nodo | El usuario hace muchas pruebas; un cambio de variable, no de código |
| Embeddings | `text-embedding-3-small` a 768 dimensiones | Reutiliza `vector(768)`; búsqueda exacta por libro, sin índice ANN global |
| Entorno Python | `uv` + Python 3.12 fijado + lockfile + `pytest`/`ruff`/`mypy` + Docker | El `.venv` local era 3.14 y el Dockerfile 3.12 |
| Chats | No se persisten; el cliente envía los últimos 6 turnos | Persistir exigiría acceso a la BD desde Python |
| Respuesta | Streaming SSE; el evento `final` es la salida autoritativa | Primer token rápido sin confiar en las citas del modelo |
| Control de gasto | Tope diario por usuario en `llm_usage` (100 preguntas / 300 traducciones / 100 sugerencias por día UTC) | OpenAI es de pago y el registro es abierto |
| Hosting de Python | **Render** (plan gratis, Docker, `render.yaml`) | Proceso de larga vida: WebSockets de voz e indexación en segundo plano funcionan como están diseñados |
| Por qué no Vercel para Python | Vercel ya soporta FastAPI y WebSockets (beta), pero Python no tiene `waitUntil`: la indexación en segundo plano (202 + tarea) no está garantizada | Habría que indexar dentro de la petición; se descartó al elegir Render |
| Arranque en frío | Next espera a `/health` antes de cada llamada | El plan gratis de Render duerme tras 15 min y tarda 30–60 s en arrancar |
| BD | Un solo proyecto Neon (`spaced_repetition_app`, rama `production`) compartido por el `.env` local y Vercel | Hay que borrar siempre los datos de prueba |

## 4. Arquitectura

```
Navegador ─sesión─► Next (Vercel)  POST /api/books/[id]/ask ─Bearer LLM_SERVICE_TOKEN─► srs-llm-api (Render)  POST /v1/rag/ask (SSE)
                    (auth, propiedad, spine_limit, índice listo,        │ LangGraph: condense → retrieve → grade ⟲ → generate | not_covered → finalize
                     tope diario, espera de arranque)                   ├─► OpenAI (chat + embeddings)
                                                                        └─► Next  POST /api/internal/rag/search ─► Neon (pgvector)
Inngest  book-process (sube EPUB → texto por capítulo)  →  book-index ─► srs-llm-api POST /v1/rag/index (202)
                                                                        └─► Next: begin · GET sections · PUT chunks · complete | fail
Acciones del lector: traducir / sugerir tarjeta ─► srs-llm-api POST /v1/llm/translate · /v1/llm/suggest-card
Examen por voz ─► srs-llm-api WebSocket /v1/voice/ws (Gemini Live), calificación y FSRS en Next
```

**Repos (no se fusionan):** `spaced_repetition_app` (Next 16, App Router, Drizzle + Neon, NextAuth v5, Inngest, Vercel Blob) y `srs-llm-api` (FastAPI, LangGraph, voz).

**Contrato** (todas las rutas con `Authorization: Bearer LLM_SERVICE_TOKEN`; errores `{data:null, error:{code,message}}`):

| Dirección | Endpoint | Función |
|---|---|---|
| Next → Python | `POST /v1/rag/ask` (SSE: `status`, `token`, `final`, `indexing`, `error`) | Responde con el grafo. Next antes verifica propiedad, `spine_limit`, índice listo y tope diario |
| Next → Python | `POST /v1/rag/index` (202) | Indexa el libro en segundo plano |
| Next → Python | `POST /v1/llm/translate` · `/v1/llm/suggest-card` | Llamadas únicas con salida estructurada |
| Python → Next | `POST /api/internal/rag/search` | Búsqueda vectorial de un libro (propiedad y filtro anti-spoiler en SQL) |
| Python → Next | `GET …/books/[id]/sections` · `PUT …/chunks` · `POST …/index/begin\|complete\|fail` | Indexación: paginar secciones, subir chunks, reclamar (compare-and-set) y liberar |
| Cualquiera | `GET /health` | Vida del servicio; funciona sin configuración RAG |

## 5. Fase 1 — Biblioteca y lector

- **Flujo:** `/library` → subida directa a Blob → `POST /api/books` (verifica con `head()`) → evento Inngest `app/book.uploaded` → `book-process` (valida ZIP y anti zip-bomb, metadata, portada, texto por capítulo en `book_sections`) → `/read/[id]` inmersivo.
- **Datos:** `books`, `book_sections`, `book_annotations`, `reader_preferences`. Límites: 100 MB por archivo, 50 libros por usuario.
- **Lector:** paginado, progreso por CFI y porcentaje (debounce 2 s), TOC, panel de anotaciones, 4 colores de resaltado con notas, ajustes de tipografía y tema dentro del iframe.
- **Seguridad:** propiedad en cada lectura y escritura, `allowScriptedContent: false`, el URL del blob nunca sale del servidor.

## 6. Fase 2 — Traducción y tarjetas desde el texto

- Seleccionar texto ofrece **Traducir** y **Crear tarjeta**. El panel de traducción tiene origen → destino («Detectar» por defecto) y recuerda el último par por libro (`books.translate_from/to`).
- La tarjeta se redacta con IA (principio de mínima información), el usuario la edita, se elige o crea el mazo y se crea un resaltado que ancla la tarjeta (`card_sources`). En `/study`, «Open in book» lleva a `/read/[id]?cfi=…`.
- Datos (migración `0010`): `card_sources`, `translation_cache` (clave `sha256(par + texto)`), columnas de idioma en `books`.
- La IA vive en `srs-llm-api` con OpenAI; en Next quedan propiedad, caché y el par de idiomas.

## 7. Fase 3 — Preguntas al libro (RAG con LangGraph + OpenAI)

**Grafo** (`srs-llm-api/app/rag/graph/`): `condense` (solo seguimientos) → `retrieve` → `grade` (relevantes, suficiente, consulta refinada; hasta 2 intentos) → `generate` (streaming con citas `[n]`) o `not_covered` → `finalize`.
- `finalize` nunca confía en las citas del modelo: normaliza `[1,2]`→`[1][2]`, descarta números inválidos, reconstruye las fuentes y decide `answerable`.
- El grafo depende de puertos (retriever, embedder, condenser, grader, generator): tests y evals usan fakes y un retriever en memoria.
- Límites: deadline de 60 s, 8 preguntas concurrentes, cancelar la petición cancela la corrida y la llamada a OpenAI.

**Indexación** (sin LangGraph): `begin` (compare-and-set en Next; una corrida por libro, una atascada > 15 min se retoma) → paginar secciones (10 por página) → chunking (objetivo 1 400 caracteres, máx. 2 400) → embeddings por lotes de 96 → `PUT chunks` idempotente → `complete`. Cualquier error o cancelación llama a `fail`.
- **Huella del índice** `proveedor:modelo:dims:chunker-vN` en `books.index_fingerprint`: si no coincide con la actual, el servicio responde `indexing` y reconstruye el índice solo.

**Anti-spoiler:** modo «Up to where I am» (límite por capítulo según la posición real de lectura; una posición desconocida limita a la primera sección, nunca al libro completo) o «Whole book».

**Datos** (migraciones `0011`–`0015`): pgvector, `book_chunks vector(768)` con índice único `(book, spine, chunk)`, `books.index_status`, `books.index_fingerprint`, `llm_usage`. La `0014` descartó los vectores de Gemini.

**Modelos y costo:** `gpt-5-nano` ≈ $0,0006 por pregunta; indexar un libro de 500 páginas ≈ $0,004. `OPENAI_REASONING_EFFORT=auto` elige el esfuerzo que acepta cada familia (`gpt-5*`: `minimal`; `gpt-6*`: `none`, porque `gpt-6-luna` rechaza `minimal`). Hay override por nodo o tarea (`OPENAI_{CONDENSE,GRADER,GENERATOR,TRANSLATE,SUGGEST}_MODEL`) y topes de salida por nodo que incluyen los tokens de razonamiento.

**Modo offline:** `LLM_PROVIDER=fake` corre todo sin clave ni costo (embeddings por hashing, respuestas extractivas). Sirve para UI y pruebas, no para juzgar calidad.

**UI** (`ask-sheet.tsx`): etapas «Searching / Reading / Writing», texto progresivo, `final` reemplaza el contenido, cada fuente abre el pasaje, cerrar el panel cancela, y si el libro no está indexado el panel espera y responde solo (esas esperas no cuentan para el tope diario).

**Seguridad:** el texto del libro y el historial se pasan como dato delimitado y el grafo no tiene herramientas (una inyección solo afectaría al texto). Los logs llevan ids, conteos y uso de tokens, nunca prompts ni texto del libro. Los errores del proveedor se muestran con mensajes genéricos.

## 8. Operación y despliegue

### 8.1 Entornos

| Pieza | Dónde | URL / nombre |
|---|---|---|
| Next.js | Vercel, proyecto `spaced-repetition-app` (región `iad1`) | `https://spaced-repetition-app-roan.vercel.app` |
| srs-llm-api | Render, servicio `srs-llm-api` (`render.yaml`, Docker, `autoDeploy`, health `/health`, plan gratis, región Virginia) | `https://srs-llm-api.onrender.com` |
| Base de datos | Neon, proyecto `spaced_repetition_app`, rama `production` | compartida con el `.env` local |
| Tareas en segundo plano | Inngest (cron del resumen diario, `book-process`, `book-index`) | app sincronizada en `/api/inngest` |
| Archivos | Vercel Blob privado | `BLOB_READ_WRITE_TOKEN` |

### 8.2 Variables de entorno

**Next (Vercel, Production).** Presentes al 3-oct: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY/SECRET`, `GEMINI_API_KEY`, `BLOB_READ_WRITE_TOKEN` (+ `BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY`), `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`.

| Falta | Valor | Para qué |
|---|---|---|
| `LLM_API_URL` | `https://srs-llm-api.onrender.com` | RAG, traducción y sugerencias |
| `LLM_SERVICE_TOKEN` | el mismo que en Render, ≥ 32 caracteres | Autenticación entre servicios |
| `VOICE_WS_URL` | `wss://srs-llm-api.onrender.com/v1/voice/ws` | Examen por voz |
| `VOICE_SERVICE_TOKEN` | el mismo que en Render | Examen por voz |
| `SMTP_HOST/PORT/USER/PASS/FROM` | cuenta de correo | Resumen diario (sin ellos queda `failed`) |
| Opcionales | `LLM_DAILY_LIMIT_ASK/TRANSLATE/SUGGEST`, `LLM_WAKE_TIMEOUT_MS` (90000, `0` = sin espera) | Topes y arranque en frío |

Además: crear `INNGEST_EVENT_KEY` e `INNGEST_SIGNING_KEY` como secretas (hoy son tipo *Config* y `vercel env ls` muestra su valor). `INNGEST_DEV` no debe existir en Vercel.

**Python (Render).** Secretas: `LLM_SERVICE_TOKEN`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `VOICE_SERVICE_TOKEN`. Públicas: `NEXT_INTERNAL_BASE_URL` y `ALLOWED_ORIGIN` = `https://spaced-repetition-app-roan.vercel.app` (dominio de producción, nunca un preview). El resto (modelos, `RAG_*`, `LOG_LEVEL`) viene con valores en `render.yaml`.

### 8.3 Arranque en frío (Render gratis)

El servicio se duerme tras 15 min sin tráfico y tarda 30–60 s en volver. Next lo absorbe:
- `postToLlmService()` (`src/lib/llm-client.ts`) hace antes `GET /health` con su propio presupuesto (`LLM_WAKE_TIMEOUT_MS`, 90 s): solo un JSON `{"status":"ok"}` cuenta como despierto; el HTML o 5xx del host se reintentan cada 2 s. El timeout de 30 s de la petición ya no incluye el arranque.
- Sin sondeo si respondió hace menos de 10 min; las llamadas concurrentes comparten un sondeo; un 502/503 o conexión rechazada se reintenta una sola vez; un timeout nunca se repite.
- La página del lector calienta el servicio con `after()`; la ruta de preguntas lo despierta antes de gastar el tope diario (`maxDuration` 180 s); el examen de voz lo despierta antes de emitir el ticket de 60 s (`maxDuration` 120 s).
- La UI avisa tras 4 s sin respuesta: «Starting the AI service…» (traducir, tarjeta, preguntar, voz).
- Alternativas para evitarlo: plan de pago siempre activo, o un ping periódico a `/health` (consume las 750 h gratis del mes).

### 8.4 Puesta en producción, paso a paso

1. **Probar con la clave real (local):** `uv run python -m evals.smoke` (5 llamadas, < $0,001) y `uv run python -m evals.run` (≈ $0,015; umbrales abajo). Fijar un límite de presupuesto mensual en el panel de OpenAI.
2. **Secretos de producción nuevos** (no reutilizar los locales): `openssl rand -hex 32 | pbcopy` y pegar el valor como `LLM_SERVICE_TOKEN` en Vercel y Render (igual en ambos); repetir para `VOICE_SERVICE_TOKEN`.
3. **Python en Render** (hecho): servicio creado desde `render.yaml`; completar las variables de §8.2 y comprobar `https://srs-llm-api.onrender.com/health`.
4. **Migraciones** (hechas): `npx drizzle-kit migrate` aplica `0000`–`0015`; contra la base compartida es un no-op. Se aplican **antes** de desplegar código que use las columnas nuevas.
5. **Variables en Vercel** (pendiente): las de §8.2; solo aplican a un deploy nuevo, hay que redeployar.
6. **Merge y deploy de Next** (hecho el 3-oct): `main` en `9bc3b6f`.
7. **Inngest** (pendiente): en el panel, Sync de `https://spaced-repetition-app-roan.vercel.app/api/inngest`. Deben aparecer las 5 funciones (`daily-study-digest`, `send-digest-now`, `purge-voice-transcripts`, `book-process`, `book-index`; Inngest cuenta 7 con los manejadores de fallo). Hay que repetirlo tras cada deploy que cambie funciones, o instalar la integración Vercel–Inngest.
8. **Recorrido en producción:** subir un EPUB → `book-process` y `book-index` en verde → traducir (la segunda vez sale de caché) → crear tarjeta con sugerencia y «Open in book» → preguntar (streaming, citas, sin spoilers en «Up to where I am») → examen por voz → `send-digest-now`.

### 8.5 Si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| «The AI service is not configured» | Faltan `LLM_API_URL` / `LLM_SERVICE_TOKEN` (≥ 32) en Vercel, o falta redeploy | Agregar y redeployar |
| 401 o 503 desde Python | Tokens distintos, o faltan `LLM_SERVICE_TOKEN` / `OPENAI_API_KEY` en Render | Igualar tokens, completar variables |
| «The service is still starting up» | Render tardó más de 90 s | Reintentar; subir `LLM_WAKE_TIMEOUT_MS` o pasar a plan de pago |
| Python no alcanza a Next | `NEXT_INTERNAL_BASE_URL` apunta a un preview o a un dominio con protección total | Usar el dominio de producción (Deployment Protection «Standard») |
| Libro eterno en `indexing` | Render se durmió a mitad de la indexación (15 min sin tráfico entrante) | Volver a preguntar: la siguiente pregunta lo re-encola tras 15 min |
| Producción rota tras un deploy | — | Promover el deploy anterior en Vercel (`spaced-repetition-ntiwffltc…`) o `git revert` |

## 9. Historial de hitos

Plan aprobado el 2-oct-2026 (replanteo de la fase 3). Commits locales por hito, publicados el 3-oct.

| Hito | Contenido | Estado | Commits |
|---|---|---|---|
| M0 | Checkpoint del código previo (TS/Gemini) y ramas `feat/rag-langgraph` | Hecho | Next `a5ae368` (rama `checkpoint/reader-fase-2-3`, solo local) |
| M1 | Entorno Python: `uv`, 3.12, lockfile, config, seguridad, Dockerfile; spikes de SSE nativo, `reasoning_effort` y `dimensions=768` | Hecho | Python `25d667b` |
| M2 | Contrato en Next: migraciones `0014`/`0015`, `book-index-service`, rutas internas, auth generalizada | Hecho | Next `bb6919c` |
| M3 | Indexación: chunker, `NextApiClient`, `ingest`, `/v1/rag/index`, Inngest recableado | Hecho | Python `330e951`; Next `b6a8d3f`, `22ed88a` |
| M4 | Grafo `ask`, nodos, prompts y router SSE con fakes | Hecho | Python `e5a08f8`, `682c06e` |
| M5 | `ask` en Next: ruta con streaming, `ask-sheet`, tope diario; se elimina el RAG en TS | Hecho | Next `1ed6d87` |
| M6 | Traducir y sugerir tarjeta en `/v1/llm/*`; se elimina `gemini.ts` | Hecho | Python `fae83c6`; Next `a25074a` |
| M7 | Evals con umbrales, prueba en vivo, documentación | Hecho | Python `573bf56`; Next `70938e9` |
| M8 | Búsqueda híbrida (tsvector + RRF) | Opcional, solo si los evals muestran huecos de recall | — |
| Extra | Hosting en Render: blueprint y notas | Hecho | Python `3fa40fd`, `7ca587d` |
| Extra | Espera de arranque en frío y avisos en la UI | Hecho | Next `9bc3b6f` |

## 10. Verificación

**Hecha**
- Python: 147 tests (chunker, pipeline contra un Next simulado, decisiones del grafo, citas, prompts, puertos OpenAI con modelos falsos, endpoints, proveedor offline, arnés de evals), `ruff` y `mypy` en estricto. El código de voz y sus tests quedaron intactos.
- Next: `tsc`, lint (0 errores, 19 advertencias previas) y `next build`.
- Contrato interno: 34 comprobaciones HTTP (401, aislamiento entre tokens, compare-and-set, paginación, idempotencia, anti-spoiler, propiedad).
- Navegador con el LLM falso: subida → índice automático, streaming, fuente → pasaje, anti-spoiler con la posición real, seguimiento, libro sin indexar que responde solo, cancelar al cerrar, tope diario, Python caído, libro ajeno (403), traducción con caché, sugerencia y creación de tarjeta.
- Fallo real contra OpenAI con una clave inválida: el índice queda `failed`, no atascado.
- Arranque en frío con un servidor simulado (9 escenarios) y de punta a punta con Python apagado y levantado 12–15 s después: pregunta contestada y libro indexado.
- Producción (3-oct): deploy en Ready, rutas nuevas responden 401 sin sesión/token, Inngest exige firma, y sin las variables nuevas la app responde 409 «not configured» sin gastar el tope.

**Pendiente**
- Calidad y latencia reales de `gpt-5-nano`, y que la API acepte `reasoning_effort="minimal"` con ese modelo: `evals.smoke` y `evals.run`. Umbrales: acierto de recuperación ≥ 0,85, recall de respuestas ≥ 0,80, rechazo correcto ≥ 0,80, 0 fugas de spoiler, 0 inyecciones, 0 citas inválidas, p95 al primer token ≤ 8 s.
- Comportamiento real de Render al arrancar (si retiene la petición o responde 502/503; el código soporta ambos).
- Examen de voz y flujo de IA completo en producción.
- La imagen Docker no se construyó localmente (no hay Docker en el Mac); la construye Render.

## 11. Riesgos y limitaciones conocidas

- **Spoilers:** la granularidad es el capítulo; dentro del capítulo actual puede aparecer texto posterior a la página.
- **Spines enormes:** un `<spine>` con todo el libro en un archivo debe caber en la respuesta de 4,5 MB de Vercel al paginar secciones.
- **Chats sin persistencia:** el cliente envía los últimos 6 turnos.
- **Calidad del modelo barato:** `gpt-5-nano` puede fallar más en citas, rechazos y español; si los evals no llegan a los umbrales se sube solo el nodo que falle o todo a `gpt-6-luna`, sin tocar código.
- **Privacidad:** el texto de los libros del usuario sale hacia OpenAI. Revisar sus términos de retención y reflejarlo en la política de la app.
- **Gasto:** una llamada que falla tras reservar cuenta para el tope diario. Falta el límite de presupuesto mensual en OpenAI.
- **Render gratis:** 512 MB de RAM y poca CPU; arranque de 30–60 s; una indexación puede interrumpirse si el servicio se duerme antes de terminar.
- **Dos proveedores** conviven: OpenAI (RAG, traducción, sugerencia) y Gemini (examen, voz). Está documentado en `AGENTS.md`.
- **Datos de prueba:** las pruebas locales escriben en la base real; borrar siempre usuarios, libros y blobs de prueba.

## 12. Lo que sigue

**Inmediato (activar y medir)**
1. Variables en Vercel y redeploy (§8.2); recrear las claves de Inngest como secretas.
2. Sincronizar Inngest.
3. `evals.smoke` y `evals.run` con la clave real; decidir si algún nodo necesita `gpt-6-luna`.
4. Recorrido en producción (§8.4, paso 8) y límite de presupuesto en OpenAI.

**Fase 4 — PDF** (propuesta, sin aprobar)
- Subir PDF a Blob como con el EPUB; extraer texto por página en `book-process` (por ejemplo con `pdfjs-dist`) hacia `book_sections`. Los PDF escaneados (sin texto) quedan fuera: requerirían OCR.
- Lector con visor de PDF y capa de texto; reemplazar el CFI por ancla de página + cita del texto para resaltados, tarjetas y «Open in book».
- El RAG no cambia: sigue leyendo `book_sections`. El anti-spoiler pasa a granularidad de página, mejor que la del capítulo.
- Decisiones abiertas: biblioteca de renderizado, tamaño máximo, manejo de columnas y notas al pie.

**Fase 5 — Agente que genera tarjetas por capítulo** (propuesta, sin aprobar)
- Grafo de LangGraph en `srs-llm-api`: elegir el capítulo → extraer conceptos → redactar tarjetas (mínima información) → comparar con las tarjetas existentes del mazo (a través de una ruta interna de Next) → proponer.
- El usuario aprueba o edita antes de crear (humano en el bucle); las tarjetas se crean por el flujo existente de Next.
- Mismo patrón de seguridad (Next dueño de los datos), un tipo nuevo de tope diario en `llm_usage` y un conjunto de evals propio.

**Opcionales**
- Búsqueda híbrida (tsvector + RRF) solo si los evals muestran huecos de recall.
- Evitar el arranque en frío: plan de pago o ping periódico a `/health`.
- Mejoras del RAG según los evals: reordenamiento, resúmenes por capítulo.

**Pendientes sueltos**
- Revisar la política de privacidad por el envío de texto a OpenAI.
- Corregir el fallo del menú de cuenta de la barra superior (tarea sugerida aparte).
- Actualizar `AGENTS.md` §10.10 para reflejar Render y el cambio de proveedor.

## 13. Referencias

- **Ramas:** `main` de ambos repos. `checkpoint/reader-fase-2-3` (solo local) conserva la versión TypeScript con Gemini como punto de retorno.
- **Comandos de calidad.** Python: `uv run pytest -q`, `uv run ruff check .`, `uv run mypy`. Next: `npx tsc --noEmit`, `npm run lint`, `npx next build`. Migraciones: `npx drizzle-kit generate` y `npx drizzle-kit migrate` (nunca `push` en producción).
- **Servicio en local:** `uv run uvicorn app.main:app --port 8000` (añadir `LLM_PROVIDER=fake` para trabajar sin costo) más `npm run dev` y `npm run inngest`.
- **Modo offline y evals:** `FAKE_TOKEN_DELAY_SECONDS` para ver el streaming en cámara lenta; `uv run python -m evals.run --dry-run` estima el costo sin llamar a la API; `--model gpt-6-luna` compara modelos.
