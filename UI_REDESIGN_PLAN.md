# Rediseño estético NeuroCards — "Calm & Reward"

## Context

NeuroCards es una app de repetición espaciada (FSRS 4.5) en Next.js 16 + Tailwind v4 + shadcn/@base-ui. El sistema de tokens en `src/app/globals.css` ya es sólido (Material-You completo, dark mode cableado con `next-themes`), pero **solo la mitad de las pantallas lo usa**. Las pantallas nuevas (decks, deck detail, study) usan `Surface`/`Pill`/tokens correctamente; las viejas (dashboard home, login, register, reminders, settings) reinventan cards, sombras y escalas tipográficas a mano.

Problemas concretos medidos:

- **5 recetas distintas de título de página** para el mismo rol; 5 tamaños de heading de sección; 5 paddings de card (`p-5`/`p-6`/`p-6 md:p-8`/`p-8`/`p-10`); 4 radios.
- **Sombras hardcodeadas** `shadow-[0px_12px_32px_rgba(25,28,29,0.04)]` en 9+ sitios → invisibles/incorrectas en dark mode, aunque existen los tokens `shadow-ambient` / `shadow-ambient-lg`.
- **`dashboard-service.ts:48-51` devuelve strings de clases Tailwind** (`dotColor: 'bg-error'`) desde la capa de datos — bloquea cualquier restyle.
- **Bugs responsive reales**: FAB de escritorio `hidden md:flex` convive con la bottom-nav `lg:hidden` entre 768–1024px (dos botones "+" flotando); `activity-heatmap` es una grilla de celdas `w-4 h-4` fijas sin overflow (se desborda en teléfono); `pb-28` de clearance de tab-bar se aplica también en escritorio; 3 de 4 skeletons no coinciden con el ancho de la página que reemplazan (reflow visible en cada carga).
- **Nada de enganche visual**: la racha es un emoji 🔥 suelto, el heatmap no tiene tooltips, no hay celebración de fin de sesión más allá de un check, los 4 botones de rating tienen 4 pesos visuales distintos (Again/Hard se leen como secundarios, Good/Easy como CTA primarios) cuando deberían ser una elección de 4 vías equiponderada.
- `DESIGN.md` actual declara una filosofía explícitamente **anti-gamificada** ("editorial gallery", "sacred focus"), lo que contradice el objetivo de enganchar al usuario a seguir aprendiendo.

**Resultado buscado:** una identidad visual coherente que use color, tipografía y movimiento *con propósito pedagógico* — progreso visible, refuerzo inmediato, cierre celebrado — manteniendo la calma editorial durante el recall (donde la carga cognitiva debe ser mínima). Y un `DESIGN.md` reescrito lo bastante preciso para que cualquier agente futuro produzca UI consistente sin inventar patrones.

### Decisiones ya tomadas por el usuario

| Decisión | Elección |
|---|---|
| Dirección | **Calma + recompensa** — base serena, acentos de refuerzo en progreso/racha/dominio, celebración en momentos clave |
| Movimiento | **Moderado** — CSS puro, sin librería nueva, respeta `prefers-reduced-motion` |
| Dark mode | **Completo con toggle** (el toggle ya existe en `layout/theme-toggle.tsx`; falta auditar) |
| Alcance | **Todas las pantallas, por fases** |
| Tipografía display | **Fraunces** (serif variable) solo para `display-*`; Inter sigue para cuerpo y UI |
| Funcionalidad | **Restyle + enganche barato** — sin tablas nuevas; solo datos que el backend ya calcula |

---

## Principios de diseño (el "por qué" detrás de cada regla)

1. **El progreso debe ser visible en todo momento.** Efecto Zeigarnik + gradiente de meta: la gente persiste cuando ve cuánto falta. Toda superficie con estado de aprendizaje lleva un indicador de progreso.
2. **Refuerzo inmediato, no ruidoso.** Al calificar una tarjeta hay confirmación visual < 250 ms. Nunca confeti mitad de sesión — interrumpe el recall.
3. **Calma durante el recall, recompensa en los bordes.** La pantalla de estudio es la más sobria de la app. El color y la celebración viven en dashboard, fin de sesión y estados vacíos.
4. **Color = significado, nunca decoración.** Cada acento mapea a un estado FSRS real. Si un color no comunica estado, no se usa.
5. **Un solo componente por rol.** Si dos pantallas muestran "una card", usan el mismo componente. Sin excepciones.
6. **Mobile-first real.** Cada pantalla se diseña a 360 px primero. Nada de `hidden md:flex` sin verificar qué pasa en la ventana 640–1023.

---

## Fase 0 — Fundamentos: tokens, tipografía y `DESIGN.md`

> Ninguna otra fase puede empezar antes de terminar esta. Todo lo demás consume estos tokens.

### 0.1 Tipografía — `src/app/layout.tsx`

Añadir Fraunces junto a Inter vía `next/font/google`:

```tsx
import { Inter, Fraunces } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});
```

En `<html className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>`.

> Si Fraunces resulta demasiado editorial al verlo en vivo, el cambio es **un solo token** (`--font-display`) más la línea de import. No tocar nada más.

### 0.2 Tokens — `src/app/globals.css`

**(a) Radio base — suavizar la app entera con un token.** En `:root`, subir `--radius: 0.5rem` → `--radius: 0.75rem`. Contrato resultante: control `rounded-lg` (12 px) · card `rounded-xl` (~17 px) · panel/sección `rounded-2xl` (~22 px) · pill `rounded-full`.

**(b) Fuente display.** En `@theme inline`:

```css
--font-display: var(--font-fraunces);
--font-sans: var(--font-inter);
--font-heading: var(--font-inter);   /* headline-* sigue en Inter */
```

Los tres tamaños `--text-display-*` deben usar `--font-display`. Como Tailwind v4 no permite ligar familia a un `--text-*`, añadir en `@layer base`:

```css
.text-display-lg, .text-display-md, .text-display-sm { font-family: var(--font-display); }
```

Y bajar el peso de display de `800` a `600` (Fraunces a 800 es muy pesado) y el tracking de `-0.02em` a `-0.01em` (los serifs no necesitan tanto apretado).

**(c) Familia de estados de aprendizaje.** Es el cambio de color central: desacopla los buckets FSRS de `primary`/`error` y permite el color de refuerzo. Añadir a `:root`:

```css
/* Learning states — buckets FSRS (AGENTS.md §7.1). */
--state-new:                        #4338ca;
--state-new-container:              #e4e1ff;
--on-state-new-container:           #1c0e8f;
--state-struggling:                 #b3261e;
--state-struggling-container:       #ffdad6;
--on-state-struggling-container:    #6d0a05;
--state-intermediate:               #8a5a00;
--state-intermediate-container:     #ffeaca;
--on-state-intermediate-container:  #4a2f00;
--state-mastered:                   #006b46;
--state-mastered-container:         #c4f2df;
--on-state-mastered-container:      #00321f;

/* Streak — refuerzo temporal. Solo en contexto de racha, nunca como bucket. */
--streak:                           #c2410c;
--streak-container:                 #ffe4d3;
--on-streak-container:              #5c1c02;
```

Y a `.dark`:

```css
--state-new:                        #bdb8ff;
--state-new-container:              #2b2296;
--on-state-new-container:           #e4e1ff;
--state-struggling:                 #ffb4ab;
--state-struggling-container:       #5c1410;
--on-state-struggling-container:    #ffdad6;
--state-intermediate:               #f2c46b;
--state-intermediate-container:     #4a3100;
--on-state-intermediate-container:  #ffeaca;
--state-mastered:                   #57e0a8;
--state-mastered-container:         #00432b;
--on-state-mastered-container:      #c4f2df;
--streak:                           #ff9a62;
--streak-container:                 #4d1a04;
--on-streak-container:              #ffe4d3;
```

Exponerlos todos en `@theme inline` como `--color-state-new: var(--state-new);` etc.

**(d) Arreglar el ramp de charts.** Hoy `--chart-1..5` son oklch en escala de grises (croma 0) y **`.dark` no los redefine**, así que se filtran iguales en ambos temas. Remapear en ambos temas: `chart-1 = state-new`, `chart-2 = state-intermediate`, `chart-3 = state-mastered`, `chart-4 = state-struggling`, `chart-5 = streak`.

**(e) Escala métrica** (números de estadística — necesita `tabular-nums` para que los contadores animados no salten):

```css
--text-metric-lg: 3rem;    --text-metric-lg--line-height: 1;    --text-metric-lg--letter-spacing: -0.03em; --text-metric-lg--font-weight: 700;
--text-metric-md: 2rem;    --text-metric-md--line-height: 1.05; --text-metric-md--letter-spacing: -0.02em; --text-metric-md--font-weight: 700;
--text-metric-sm: 1.25rem; --text-metric-sm--line-height: 1.1;  --text-metric-sm--letter-spacing: -0.01em; --text-metric-sm--font-weight: 700;
```

Más una utilidad en `@layer utilities`: `.tabular { font-variant-numeric: tabular-nums; }`.

**(f) Tokens de movimiento** en `@theme inline`:

```css
--ease-soft: cubic-bezier(0.22, 1, 0.36, 1);
--animate-pop-in:     pop-in 250ms var(--ease-soft) both;
--animate-rise-in:    rise-in 400ms var(--ease-soft) both;
--animate-streak:     streak-pulse 2.4s ease-in-out infinite;
--animate-thread:     thread-grow 600ms var(--ease-soft) both;
--animate-celebrate:  celebrate 700ms var(--ease-soft) both;

@keyframes pop-in      { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: none; } }
@keyframes rise-in     { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes streak-pulse{ 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .85; transform: scale(1.06); } }
@keyframes thread-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes celebrate   { 0% { opacity:0; transform: scale(.8); } 60% { transform: scale(1.06); } 100% { opacity:1; transform: none; } }
```

El bloque `prefers-reduced-motion` existente (globals.css ~356-365) ya neutraliza todo esto — verificar que sigue al final del archivo.

### 0.3 Reescribir `DESIGN.md`

Reemplazo completo. Es el contrato entre agentes, así que debe ser **prescriptivo y verificable**, no evocativo. Secciones exigidas:

1. **North Star** — "Calm & Reward": calma durante el recall, refuerzo en los bordes. Los 6 principios de arriba, literales.
2. **Color** — tabla completa de tokens con valores light/dark. Regla: *ningún hex crudo, ninguna clase de paleta Tailwind (`bg-green-100`), ninguna sombra literal*. Tabla de mapeo estado FSRS → token.
3. **Tipografía** — la escala completa (`display-*` en Fraunces, `headline-*`/`body-*`/`label-*` en Inter, `metric-*` con `.tabular`) con una columna "cuándo usarlo" y una tabla explícita de **qué tamaño lleva cada rol de página**: título de página = `display-md` (`display-lg` solo en dashboard y decks index), heading de sección = `headline-md`, título de card = `headline-sm`, cuerpo = `body-md`, metadata = `label-md`.
4. **Espaciado y layout** — contrato único:
   - Ancho máximo de contenido: `max-w-7xl`, **siempre** vía `PageSection`.
   - Gutters de página: `px-4 sm:px-6 lg:px-10` (la asimetría editorial solo a partir de `lg`).
   - Padding de card: `p-5 sm:p-6`. Card hero/stat: `p-6 sm:p-8`.
   - Gap de grilla: `gap-4 sm:gap-6`.
   - Separación entre secciones: `space-y-10 sm:space-y-12`.
5. **Radios y elevación** — el contrato de (a), más: sombras **solo** vía `shadow-ambient` / `shadow-ambient-lg`. Prohibido `shadow-lg`, `shadow-sm` y cualquier `shadow-[...]`.
6. **Regla "No-Line" (revisada)** — se mantiene la prohibición de divisores de 1 px para seccionar, pero se admite explícitamente el *ghost border* `border-outline-variant/15` vía `Surface ghost`. Se prohíben: `ring-1`, bordes punteados, y el rail izquierdo `border-l-[3px]`.
7. **Componentes** — un párrafo por primitivo con su API y el "no construyas esto a mano": `Surface`, `Pill`, `Button`, `StatCard`, `MasteryThread`, `EmptyState`, `PageHeader`/`PageSection`, `SectionHeading`.
8. **Movimiento** — tabla de las 5 animaciones, cuándo aplica cada una, y la regla: *ninguna animación durante la fase de recall; toda animación debe sobrevivir a `prefers-reduced-motion`*.
9. **Responsive** — los tres breakpoints contractuales (phone `<640`, tablet `640–1023`, desktop `≥1024`), la regla de que el sidebar aparece en `lg` y la bottom-nav desaparece en `lg`, y una checklist de verificación a 360/768/1440 px.
10. **Dark mode** — regla: *no se escriben clases `dark:` en componentes de feature*; el color se resuelve por token. `dark:` solo se permite dentro de `src/components/ui/`.
11. **Do / Don't** — con ejemplos de código reales tomados de este repo (antes/después).

---

## Fase 1 — Primitivos: un componente por rol

Objetivo: eliminar las recetas duplicadas antes de tocar pantallas. Todos en `src/components/primitives/` salvo indicación.

| Componente | Archivo | Qué hace | Reemplaza |
|---|---|---|---|
| `Surface` | `primitives/surface.tsx` *(existe — ajustar)* | Cambiar `tone: card` de `rounded-md` a `rounded-xl`, `panel` a `rounded-2xl`. Añadir variante `tone="stat"` (`bg-card rounded-xl shadow-ambient p-6 sm:p-8`). | Las 4 recetas de card competidoras |
| `Pill` | `primitives/pill.tsx` *(existe — extender)* | Añadir tonos `new`/`struggling`/`intermediate`/`mastered`/`streak` mapeados a los nuevos containers. Añadir `size: sm|md`. | El chip inline de `command-palette.tsx:243` |
| `StatCard` | `primitives/stat-card.tsx` **nuevo** | Props `{ label, value, tone, icon?, hint?, trend? }`. Usa `text-metric-lg tabular` + `text-label-md` + `Surface tone="stat"`. Anima `rise-in` al montar. | Los 3 bloques repetidos de `(dashboard)/page.tsx:48,58,71` |
| `MasteryThread` | `primitives/mastery-thread.tsx` **nuevo** | Barra de 2 px. Props `{ value, tone?, animate? }`. Track `bg-surface-container-high`, fill `bg-state-mastered`, `origin-left animate-thread`. | El markup duplicado en `DeckCard.tsx:139`, `decks/[id]/page.tsx:88`, `study-session.tsx:185`, `dashboard-deck-card.tsx` |
| `EmptyState` | `primitives/empty-state.tsx` **nuevo** | Props `{ icon, title, body, action? }`. `Surface tone="panel"`, `px-6 py-16 sm:py-24`, icono en círculo 20×20, título `text-display-sm`. | `empty-deck-card.tsx`, el empty de `CardList.tsx`, `reminders/empty-state-card.tsx` (que hoy usa un borde punteado de 2 px prohibido) |
| `SectionHeading` | `primitives/section-heading.tsx` **nuevo** | `{ title, action? }` → `headline-md` + slot de acción a la derecha, `flex-col sm:flex-row`. | Los 5 recetas de heading de sección |
| `StreakBadge` | `primitives/streak-badge.tsx` **nuevo** | Llama + número en `text-metric-*` con `bg-streak-container text-on-streak-container`. La llama lleva `animate-streak` solo si `days > 0`. Hitos en 7/30/100 → copy distinto ("¡7 días!"). | El emoji suelto de `(dashboard)/page.tsx:60` |

**Además — limpiar la capa de datos:** `src/lib/services/dashboard-service.ts:48-51` (`stabilityBucket`) debe devolver `bucket: 'struggling' | 'intermediate' | 'mastered'`, **no** strings de clases Tailwind. El mapeo bucket→token vive en un solo sitio nuevo, `src/lib/learning-state.ts`, junto a `subject-accent.ts`. Actualizar `timeline-list.tsx` (único consumidor de `dotColor`/`labelColor`).

**Instalar los shadcn que faltan** (hoy se hacen a mano): `npx shadcn@latest add progress tooltip badge sonner`. `tooltip` ya existe; `sonner` habilita un sistema de toasts único (hoy cada pantalla reporta errores con un `<p>` distinto).

---

## Fase 2 — Shell y navegación

Archivos: `layout/dashboard-shell.tsx`, `sidebar.tsx`, `top-nav.tsx`, `mobile-nav.tsx`, `mobile-drawer.tsx`, `nav-config.ts`, `page-header.tsx`.

1. **Centralizar geometría** en `nav-config.ts`: añadir `CONTENT_PADDING = "px-4 sm:px-6 lg:pl-16 lg:pr-10"` y `SHELL_CLEARANCE = "pt-20 sm:pt-24 pb-24 lg:pb-12"`. El `pb-28` plano actual regala ~112 px muertos al final de cada página de escritorio.
2. **Sidebar scrollable**: el `flex-1 space-y-2` actual desborda `h-screen` si crece la nav. Envolver la lista en `overflow-y-auto no-scrollbar`.
3. **Estado activo más legible**: mantener el hilo de 2 px, pero añadir el icono en `text-primary` y fondo `bg-primary/10 rounded-lg`, con `transition-colors duration-[var(--duration-fast)]`.
4. **Unificar el trigger de búsqueda** de `top-nav.tsx`: hoy hay dos botones separados (`:71` con `kbd` oculto en `<md`, `:82` icon-only en `<sm`). Debe ser **un** botón responsive con el `kbd` en `hidden md:inline-flex`.
5. **El título "The Digital Curator"** está hardcodeado en `sidebar.tsx:52` y `mobile-drawer.tsx:60` → mover a `nav-config.ts` y actualizarlo al nuevo North Star.
6. **Bottom-nav con estado de pendientes**: si hay tarjetas due, el tab de Dashboard lleva un punto `bg-state-struggling` de 6 px. Refuerzo de bucle sin ser intrusivo.
7. **Backdrop-blur**: `backdrop-blur-[12px]` → `backdrop-blur-md` (misma medida, token real).

**Criterio de aceptación:** a 360 px no hay scroll horizontal; a 768 px hay exactamente **una** acción flotante; a 1440 px el sidebar no deja hueco muerto abajo.

---

## Fase 3 — Dashboard (el motor de enganche)

Archivos: `(dashboard)/page.tsx`, `(dashboard)/loading.tsx`, `dashboard/activity-heatmap.tsx`, `timeline-list.tsx`, `dashboard-deck-card.tsx`.

Esta es la pantalla más fuera de sistema y la que más rinde en enganche.

1. **Envolver en `PageSection`** (`max-w-7xl`) — hoy la página es full-bleed mientras su skeleton es `max-w-7xl`, lo que produce un salto visible al hidratar. Arreglar ambos.
2. **Hero de sesión** (nuevo bloque, arriba del todo): saludo + `StreakBadge` + **anillo de meta diaria**. El anillo es un SVG de dos círculos que muestra `reviewedToday / (reviewedToday + dueToday)` — **no requiere datos nuevos**, ambos números ya salen de `dashboard-service`. En el centro, el número de pendientes en `text-metric-lg tabular`. CTA primario "Continuar estudiando" que enlaza al deck con más pendientes. Si `dueToday === 0`, el anillo se completa en `state-mastered` con `animate-celebrate` y copy de "al día".
3. **Reemplazar las 3 stat cards** por `<StatCard>`: due → tono `struggling`, racha → `streak`, dominadas → `mastered`. Grilla `grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6`.
4. **Heading de sección uniforme**: los tres actuales (`text-3xl font-extrabold`, `text-2xl font-bold` ×2) → `<SectionHeading>`.
5. **Carrusel de decks**: añadir afluencia — máscara de degradado a la derecha (`[mask-image:linear-gradient(to_right,black_85%,transparent)]`) y flechas `hidden lg:flex`. Reducir `min-w-[320px]` a `min-w-[280px] sm:min-w-[320px]` para que en un teléfono de 360 px se asome la siguiente card (afluencia de scroll).
6. **`dashboard-deck-card.tsx`**: usar `Surface` + `MasteryThread` + `<Button size="lg">`. Hoy el mismo CTA "Study now" mide 48 px aquí y 32 px en `/decks` — unificar a `size="lg"`. Heading `text-xl font-bold` → `text-headline-sm`.
7. **Heatmap** — reconstruir. Es lo más roto en móvil y lo más valioso en enganche:
   - Envolver en `overflow-x-auto no-scrollbar` con las celdas a `size-3 sm:size-4`.
   - Añadir `title` por celda con fecha + conteo (`Tooltip` en `sm+`).
   - Etiquetas de día (L/M/X) y de mes.
   - Arreglar la leyenda: los swatches (`/25 /50 /75`) **no coinciden** con la escala real de las celdas (`/10 /20 /30 /40 /60 /90`). Que ambas salgan de la misma constante.
   - Escala de color: pasar de `bg-primary/N` a `bg-state-mastered/N` — el verde lee mejor como "hecho".
8. **Timeline**: consumir `bucket` en vez de `dotColor`. Puntos con el token de estado. Añadir `animate-rise-in` escalonado con `style={{ animationDelay }}`.
9. **FAB de escritorio** (`:135`): `hidden md:flex` → `hidden lg:flex` (elimina el doble botón en tablet) y `shadow-lg` → `shadow-ambient-lg`.
10. **`loading.tsx`**: reescribir para reflejar el nuevo layout, usando `<Skeleton>` en vez de `animate-pulse` a mano (23 apariciones hoy).

---

## Fase 4 — Decks y detalle de deck

Archivos: `(dashboard)/decks/page.tsx`, `decks/[id]/page.tsx`, `DeckList.tsx`, `DeckCard.tsx`, `CardList.tsx`, `empty-deck-card.tsx`, y sus `loading.tsx`.

Esta área es ya la implementación de referencia; el trabajo es alinearla al contrato nuevo y subir el enganche.

1. `DeckCard` y las cards de `CardList` al mismo padding (`p-5 sm:p-6`) y gap (`gap-4 sm:gap-6`) — hoy son `p-6`/`gap-6` vs `p-5`/`gap-4`.
2. `Surface` pasa a `rounded-xl`; el toolbar de `DeckList.tsx:94` baja de `rounded-xl` a `rounded-2xl` como panel contenedor (hoy el contenedor es *menos* redondo que sus hijos en algunos casos y más en otros).
3. **Chips de filtro**: `DeckList.tsx` y `CardList.tsx` deben usar un único `<FilterChip>` de `components/primitives/`, sin modificar el `Button` autogenerado.
4. **`DeckCard` con señal de progreso**: añadir `<MasteryThread>`. No inferir un bucket dominante con datos agregados, porque “due” no equivale a “struggling” y produciría etiquetas FSRS falsas.
5. **Deck detail**: título `display-md` (correcto). Añadir una fila de 3 `StatCard` compactas (total / pendientes / dominadas) sobre la lista de tarjetas. El CTA "Study" debe ser el elemento más prominente de la pantalla en móvil — hacerlo sticky al fondo (`sticky bottom-20 lg:static`) cuando hay pendientes.
6. **Empty states** → `<EmptyState>` en los tres sitios.
7. Verificar que ambos `loading.tsx` usan los mismos wrappers que sus páginas.

---

## Fase 5 — Sesión de estudio (calma + cierre celebrado)

Archivos: `study/study-session.tsx`, `study-card.tsx`, `rating-bar.tsx`, `ratings.ts`, `study-outcome.tsx`, `exam-dialog.tsx`; nuevo `(dashboard)/study/[id]/loading.tsx`.

Principio rector: **esta pantalla se vuelve más sobria, no más colorida.** El refuerzo llega al final.

1. **Botones de rating — arreglar la jerarquía.** Hoy Again es un tinte `destructive/10`, Hard es `outline` con borde, Good es indigo sólido y Easy es verde sólido: cuatro pesos distintos para una elección de cuatro vías equiponderada. El contrato vive en `ratings.ts`: los cuatro usan `Button variant="ghost"` con clases tonales centralizadas en `buttonClass` — Again `state-struggling-container`, Hard `state-intermediate-container`, Good `state-new-container`, Easy `state-mastered-container`. Misma altura, mismo radio, mismo peso de fuente y sin editar `src/components/ui/button.tsx`.
2. **Feedback inmediato al calificar**: al hacer clic, el botón elegido hace `animate-pop-in` y la barra de progreso crece con `transition-transform duration-[var(--duration-slow)]`. Nada más — sin toast, sin sonido.
3. **Revelar respuesta**: hoy `study-card.tsx:88-93` aplica `motion-safe:translate-y-2 → translate-y-0` pero solo transiciona `opacity`, así que el desplazamiento salta. Cambiar a `transition-[opacity,transform]`.
4. **Legibilidad del contenido**: el texto de flashcard sube a `text-body-lg sm:text-headline-sm` con `max-w-[60ch]`. El `max-h-[300px]` de imagen pasa a `max-h-[40vh]` (en móvil apaisado 300 px se come la pantalla).
5. **Footer responsive** (`:215`): `px-8 pt-4 pb-10` con `justify-between` y dos elementos que colisionan en teléfono → `flex-wrap gap-2 px-4 sm:px-8`.
6. **Título de nav truncado a `max-w-[150px]`** en posición absoluta: pasar a flujo normal con `truncate` y `max-w-[40vw] sm:max-w-xs`.
7. **`study-outcome.tsx` — la pantalla de recompensa.** Es donde se concentra la celebración:
   - Título en `display-md` (Fraunces) con `animate-celebrate`.
   - Los números de sesión (recalled/hard/again) como `StatCard` con tonos de estado y contador que sube de 0 al valor (`useEffect` + `requestAnimationFrame`, ~600 ms, `tabular` para que no salte).
   - Si la racha creció: `StreakBadge` con `animate-pop-in` y el hito si aplica (7/30/100).
   - Resumen de "qué aprendiste": nº de tarjetas que cambiaron de bucket hacia arriba (derivable de `submitReview`, sin DB nueva).
   - Dos CTAs: "Otro mazo" (primario) y "Volver al dashboard" (ghost).
   - **Sin confeti.** La celebración es tipográfica y de color.
8. **Crear `(dashboard)/study/[id]/loading.tsx`** — hoy entrar a una sesión no muestra nada hasta que resuelve el server component.

**Criterio de aceptación:** los 4 botones de rating son indistinguibles en peso visual y distinguibles en color; a 360 px caben en 2×2 sin desbordar; con `prefers-reduced-motion` no hay ninguna animación.

---

## Fase 6 — Auth (login / register)

Archivos: `(auth)/login/page.tsx`, `(auth)/register/page.tsx`, `(auth)/layout.tsx`; nuevo `components/auth/auth-shell.tsx`.

Hoy son dos páginas construidas a mano de forma independiente, con `<input>`/`<button>` crudos y **sin importar ni un primitivo**. Divergen en: fondo de input (`surface-container-low` vs `surface-container-high`), peso del botón (`font-bold` vs `font-semibold`), borde de la card (login sí, register no), orden del footer, tamaño de icono de error.

1. **Crear `AuthShell`** — card + branding + footer compartidos. Ambas páginas lo consumen. Elimina toda la duplicación.
2. **Usar `Input`, `Label`, `Button`, `Surface`** de verdad.
3. **Formularios a react-hook-form + zod** (`AGENTS.md §10.11` lo exige y hoy no se cumple en auth).
4. **Arreglar los bugs de UI muertos**: el `CheckCircle2` verde permanente del confirm-password de register (`:183`) miente — debe reaccionar al match real; el `<a href="#">Forgot password?</a>` de login debe ocultarse hasta que exista la ruta; los links de footer (Privacy/Terms/Support) apuntan a `/login`/`/register`; el copyright dice "© 2024".
5. **Jerarquía semántica**: login usa un `<h2>` como título de página sin ningún `<h1>` — corregir a `<h1>` con `text-display-sm` (Fraunces) en ambas.
6. **Padding responsive**: `p-10` sobre `max-w-[400px]` deja ~200 px de pozo de contenido en un teléfono de 360 px → `p-6 sm:p-10`, y el `max-w-[400px]` a `w-full max-w-sm`.
7. **Momento de enganche**: bajo la card, una línea de valor ("Aprende con repetición espaciada basada en evidencia") y, en register, los 3 pasos del onboarding. Coste cero, mejora la conversión.

---

## Fase 7 — Reminders y Settings

Archivos: `reminders/reminders-content.tsx`, `program-card.tsx`, `empty-state-card.tsx`, `send-digest-button.tsx`, `modals/NewReminderModal.tsx`, `settings/page.tsx`, `skills-manager.tsx`, y los `loading.tsx`.

1. **Ancho**: `reminders-content.tsx:42` usa `max-w-4xl mx-auto py-10` cuando todo lo demás usa `max-w-7xl` vía `PageSection`, y añade padding sobre el del shell. Migrar a `PageHeader` + `PageSection`. Su `loading.tsx` usa `max-w-7xl` + `md:grid-cols-2` contra un contenido `max-w-4xl` de una columna → reflow en cada carga. Alinear ambos.
2. **`BucketRow` (`program-card.tsx:68`)** usa `border-l-[3px]` — viola la regla No-Line y es un patrón que no existe en ninguna otra parte de la app. Reemplazar por `Surface tone="panel"` + un `Pill` de estado con los tokens nuevos.
3. **Dropdown hecho a mano** (`:169-184`): `absolute … z-10` sin portal, sin focus trap, sin Escape, sin cierre por click fuera — y se recorta. Reemplazar por `ui/dropdown-menu.tsx`, que ya se usa en `DeckCard` y `TopNav`.
4. **`window.confirm()` (`:115`)** para borrar, cuando el resto de la app usa diálogos estilizados. Crear `DeleteProgramDialog` siguiendo el patrón de `DeleteDeckDialog`.
5. **Botones a mano** en `program-card.tsx:230` y `empty-state-card.tsx:20` (`px-4 py-2 font-semibold` vs `px-5 py-2.5 font-bold`) → `<Button>`.
6. **`empty-state-card.tsx:7`**: `border-2 border-dashed border-outline-variant/40` es la línea más ruidosa de toda la app en una pantalla cuyo sistema prohíbe bordes de sección → `<EmptyState>`.
7. **`NewReminderModal.tsx`** es un overlay `fixed inset-0` hecho a mano en vez de `ui/dialog.tsx`. Migrar a `Dialog`.
8. **`settings/page.tsx`**: cero prefijos responsive, `max-w-3xl mx-auto px-6 py-10` propio, título `text-3xl font-bold text-primary` (único título coloreado de la app). Migrar a `PageHeader`/`PageSection` y `display-md`. `skills-manager.tsx` usa 4 tamaños distintos de heading → `SectionHeading`.
9. **Toasts**: sustituir el feedback inline de `send-digest-button.tsx:38` y los `<p>` de error por `sonner`.

---

## Fase 8 — Barrido final: dark mode, movimiento, responsive, a11y

1. **Sombras**: buscar y reemplazar las literales en feature code por `shadow-ambient` / `shadow-ambient-lg`. Los archivos autogenerados de `src/components/ui/` no se editan; si un consumidor necesita otro tratamiento, lo aporta con `className`.
2. **Diálogos**: mantener intacto `ui/dialog.tsx`; los ajustes de backdrop y elevación se aplican desde el componente consumidor.
3. **Escalas tipográficas crudas**: reemplazar todo `text-5xl`/`text-4xl`/`text-3xl`/`text-2xl` por tokens; `text-[10px] font-bold … tracking-widest uppercase` → `text-label-sm` (`activity-heatmap:25`, `register:158`, `program-card:198`); `text-[11px]` (`program-card:212`, `register:225`) → `text-label-md`.
4. **Redundancias**: `text-label-sm font-semibold tracking-wider` en `command-palette` (3 sitios) — el token ya trae peso 600 y tracking 0.08em.
5. **Dark mode**: recorrer las 8 rutas con el toggle en los 3 estados. La regla es que ninguna pantalla necesite clases `dark:` (solo `src/components/ui/` puede). Verificar contraste ≥ 4.5:1 para texto y ≥ 3:1 para los containers de estado en ambos temas.
6. **Responsive**: verificar a **360 / 414 / 768 / 1024 / 1440 px** cada ruta. Foco en los archivos con cero prefijos hoy: `settings/page.tsx`, `activity-heatmap.tsx`, `timeline-list.tsx`, `program-card.tsx`, `empty-state-card.tsx`, `DeckCard.tsx`, `DeckForm.tsx`, ambas páginas de auth.
7. **Command palette**: los tres bloques de grupo (líneas ~204-257, 259-312, 314-355) son ~50 líneas de JSX casi idéntico ×3 → extraer `<PaletteGroup>`. Además el trigger está oculto en `<sm` y el hint `⌘K` en `<md`, así que en móvil no hay descubribilidad — añadir una entrada de búsqueda en la bottom-nav.
8. **Accesibilidad**: foco visible en todos los interactivos (`focus-visible:ring-3 ring-ring/50` ya está en `Button`, falta en los elementos a mano); `aria-label` en los botones icon-only; el heatmap necesita `role="img"` + `aria-label` con el resumen.
9. **Idioma**: la metadata está en español (`(auth)/layout.tsx`, `(dashboard)/page.tsx:14`, `reminders/page.tsx:8-9`, `settings/page.tsx:8`) mientras toda la UI visible está en inglés. Unificar — recomendación: pasar las 4 cadenas de metadata a inglés (cambio mínimo) o, si se prefiere español, es una fase aparte de i18n de toda la copy.
10. **Rutas de error que faltan**: crear `src/app/not-found.tsx` y `src/app/global-error.tsx` con `<EmptyState>`.

---

## Fase 9 — Verificación y resync del design system

1. `npx tsc --noEmit` — debe pasar limpio.
2. `npm run lint` — sin nuevos warnings.
3. `npx next build` — build de producción local (exigido por `AGENTS.md §10.10`).
4. `npm run dev` y recorrido manual de las 8 rutas × 3 anchos × 2 temas (matriz de 48 verificaciones; usar las herramientas de Chrome para capturar 360 px y 1440 px de cada una).
5. **`ds-bundle/` queda obsoleto.** Es un export del design system generado desde el código (`.ds-build-meta.json`, `componentCount: 20`) y ya lleva un marcador `_ds_needs_recompile`. Su `guidelines/DESIGN.md` y su `README.md` describen el sistema *anterior* ("The Cognitive Atelier", `--radius: 0.5rem`, cards `rounded-xl`, sombras literales). Tras la Fase 8 hay que regenerarlo con el flujo DesignSync, o borrarlo si ya no se usa. **No editarlo a mano** — se desincroniza en silencio.
6. Releer el `DESIGN.md` nuevo contra el código final: cada regla debe tener al menos un ejemplo real en el repo.

---

## Archivos críticos

**Fundamento (Fase 0):** `src/app/globals.css` · `src/app/layout.tsx` · `DESIGN.md`

**Primitivos (Fase 1):** `src/components/primitives/{surface,pill}.tsx` (existen) · `{stat-card,mastery-thread,empty-state,section-heading,streak-badge,filter-chip}.tsx` (nuevos) · `src/lib/learning-state.ts` (nuevo) · `src/lib/services/dashboard-service.ts` (limpiar clases de la capa de datos). `src/components/ui/*` permanece autogenerado e inmutable.

**Reutilizar, no reescribir:** `cn()` de `src/lib/utils.ts` · `subjectAccent` de `src/lib/subject-accent.ts` · `useListSearch` de `src/hooks/use-list-search.ts` · `PageHeader`/`PageSection` de `src/components/layout/page-header.tsx` · `nav-config.ts` como única fuente de geometría · `RATINGS` de `src/components/study/ratings.ts` como única fuente de semántica de rating.

**Patrón repetido en muchos archivos** (describir una vez, aplicar en todos): sustituir card hecha a mano → `<Surface>`; sombra literal → `shadow-ambient`; tamaño de texto crudo → token de escala; heading de sección → `<SectionHeading>`; empty state → `<EmptyState>`; barra de progreso → `<MasteryThread>`.

---

## Verificación end-to-end

```bash
npx tsc --noEmit          # sin errores de tipo
npm run lint              # sin warnings nuevos
npx next build            # build de producción local
npm run dev               # recorrido manual
```

Checklist manual por ruta (`/`, `/decks`, `/decks/[id]`, `/study/[id]`, `/reminders`, `/settings`, `/login`, `/register`):

- [ ] 360 px: sin scroll horizontal, sin texto cortado, targets táctiles ≥ 44 px
- [ ] 768 px: exactamente **una** acción flotante en pantalla
- [ ] 1440 px: contenido a `max-w-7xl`, sin hueco muerto al final
- [ ] Light y dark: ningún elemento invisible, sombras presentes en ambos
- [ ] Skeleton de carga con el mismo ancho y layout que la página real (sin reflow)
- [ ] `prefers-reduced-motion: reduce` activo → cero animación
- [ ] Navegación solo con teclado: foco visible en cada parada
- [ ] `grep -rn "shadow-\[" src/` → sin resultados
- [ ] `grep -rnE "text-(2|3|4|5)xl" src/` → sin resultados
- [ ] `grep -rn "dark:" src/app src/components --include=*.tsx | grep -v "components/ui/"` → sin resultados

No hay test runner configurado en el repo, así que la verificación es build + recorrido manual.
