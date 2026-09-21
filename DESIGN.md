# Design System Specification — "Calm & Reward"

> **Contrato obligatorio para todo agente o desarrollador que modifique la interfaz de NeuroCards.**
> Este documento es prescriptivo y verificable. Ninguna pantalla o componente debe inventar patrones al margen de esta especificación.

---

## 1. North Star — "Calm & Reward"

La identidad de NeuroCards fusiona **calma durante el recall** con **refuerzo en los bordes**:
- Durante el estudio/recall, la carga cognitiva se reduce al mínimo (pantalla sobria, sin animaciones que distraigan, sin confeti intrusivo).
- En el dashboard, la navegación, la selección y el cierre de sesión, se celebra el esfuerzo y se visualiza claramente el progreso mediante tipografía editorial, acentos cromáticos significativos y movimiento sutil.

### Principios Fundamentales
1. **El progreso debe ser visible en todo momento.** Efecto Zeigarnik + gradiente de meta: la gente persiste cuando ve cuánto falta. Toda superficie con estado de aprendizaje lleva un indicador de progreso (`MasteryThread`, anillo de meta o conteo).
2. **Refuerzo inmediato, no ruidoso.** Al calificar una tarjeta hay confirmación visual inmediata (< 250 ms, `animate-pop-in`). Nunca confeti a mitad de sesión — interrumpe el recall.
3. **Calma durante el recall, recompensa en los bordes.** La pantalla de estudio es la más sobria de la app. El color y la celebración viven en dashboard, fin de sesión y estados vacíos.
4. **Color = significado, nunca decoración.** Cada acento mapea a un estado FSRS real (`new`, `struggling`, `intermediate`, `mastered`, `streak`). Si un color no comunica estado o rol de acción, no se usa.
5. **Un solo componente por rol.** Si dos pantallas muestran una card, una estadística, una barra o un heading, usan exactamente el mismo componente primitivo. Sin excepciones.
6. **Mobile-first real.** Cada pantalla se diseña a 360 px primero. Nada de `hidden md:flex` sin verificar el comportamiento en tablet (640–1023 px).

---

## 2. Color & FSRS Learning States

### Reglas Estrictas
- **PROHIBIDO** el uso de colores hexadecimales crudos en componentes (`#3525cd`, `#ffffff`, etc.).
- **PROHIBIDO** el uso de clases de paleta Tailwind genéricas (`bg-green-100`, `text-blue-600`, `bg-red-500`, etc.).
- **PROHIBIDO** el uso de sombras literales `shadow-[...]`.
- Todo color debe consumirse mediante tokens semánticos definidos en `src/app/globals.css`.

### Tokens de Estado de Aprendizaje (FSRS 4.5 & AGENTS.md §7.1)

| Estado | Token Color | Container (Light) | Container (Dark) | Texto en Container | Uso Semántico |
|---|---|---|---|---|---|
| **New** | `var(--state-new)` | `#e4e1ff` (`--state-new-container`) | `#2b2296` | `var(--on-state-new-container)` | Tarjetas nuevas por aprender |
| **Struggling** | `var(--state-struggling)` | `#ffdad6` (`--state-struggling-container`) | `#5c1410` | `var(--on-state-struggling-container)` | S < 10 días, errores recurrentes, calificaciones Again |
| **Intermediate** | `var(--state-intermediate)` | `#ffeaca` (`--state-intermediate-container`) | `#4a3100` | `var(--on-state-intermediate-container)` | 10 ≤ S < 50 días, calificaciones Hard/Repaso medio |
| **Mastered** | `var(--state-mastered)` | `#c4f2df` (`--state-mastered-container`) | `#00432b` | `var(--on-state-mastered-container)` | S ≥ 50 días, tarjetas consolidadas, Easy |
| **Streak** | `var(--streak)` | `#ffe4d3` (`--streak-container`) | `#4d1a04` | `var(--on-streak-container)` | Racha activa (refuerzo temporal, nunca bucket) |

### Tokens de Superficie (Material You Tonal Surface Hierarchy)
- **Base / Canvas:** `bg-background` (`--surface`: `#f8f9fa` en light, `#191c1d` en dark).
- **Secciones / Fondos de baja elevación:** `bg-surface-container-low` (`#f3f4f5` en light, `#1f2223` en dark).
- **Cards y Contenedores Interactivos:** `bg-card` o `bg-surface-container-lowest` (`#ffffff` en light, `#2e3132` en dark).
- **Elevación Tonal Alta / Toolbars:** `bg-surface-container-high` (`#e7e8e9` en light, `#2e3031` en dark).

---

## 3. Tipografía

NeuroCards combina **Fraunces** (serif display variable con calidez editorial) con **Inter** (sans-serif de máxima legibilidad técnica).

### Familias
- `--font-display`: Fraunces (usada exclusivamente en `text-display-*`).
- `--font-sans` / `--font-heading`: Inter (usada en titulares, cuerpo y controles de interfaz).

### Escala Tipográfica Completa

| Clase de Escala | Tamaño / Altura | Peso / Tracking | Familia | Cuándo Usarlo |
|---|---|---|---|---|
| `text-display-lg` | 3.5rem (56px) / 1.02 | 600 / -0.01em | Fraunces | Hero principal de Dashboard y Home de Decks |
| `text-display-md` | 2.75rem (44px) / 1.06 | 600 / -0.01em | Fraunces | Título principal de página (Deck Detail, Reminders, Settings, Outcome) |
| `text-display-sm` | 2.25rem (36px) / 1.1 | 600 / -0.01em | Fraunces | Auth headers (Login/Register) y Títulos de Empty States |
| `text-headline-lg` | 2.0rem (32px) / 1.15 | 700 / -0.01em | Inter | Encabezados de sección mayor |
| `text-headline-md` | 1.5rem (24px) / 1.2 | 700 / -0.01em | Inter | `SectionHeading` estándar en todas las páginas |
| `text-headline-sm` | 1.25rem (20px) / 1.25 | 700 / -0.01em | Inter | Títulos de Cards (`DeckCard`, `StatCard`, flashcard grande) |
| `text-body-lg` | 1.0rem (16px) / 1.6 | 400 / normal | Inter | Flashcard question/answer, intros descriptivas |
| `text-body-md` | 0.875rem (14px) / 1.55 | 400 / normal | Inter | Cuerpo general de texto, formularios, labels de input |
| `text-body-sm` | 0.8125rem (13px) / 1.5 | 400 / normal | Inter | Texto secundario y descripciones breves |
| `text-label-md` | 0.75rem (12px) / 1.3 | 600 / 0.08em | Inter (uppercase) | Badges, metadata de tarjeta, botones pequeños |
| `text-label-sm` | 0.625rem (10px) / 1.3 | 600 / 0.08em | Inter (uppercase) | Chips mínimos, fechas relativas, tags compactos |
| `text-metric-lg` | 3.0rem (48px) / 1.0 | 700 / -0.03em | Inter (`.tabular`) | Estadísticas de gran impacto (hero counter, racha) |
| `text-metric-md` | 2.0rem (32px) / 1.05 | 700 / -0.02em | Inter (`.tabular`) | Números de `StatCard` en resúmenes |
| `text-metric-sm` | 1.25rem (20px) / 1.1 | 700 / -0.01em | Inter (`.tabular`) | Contadores compactos y badges numéricos |

> **Regla de Números:** Todo número animado o métrico DEBE incluir la clase `.tabular` (`font-variant-numeric: tabular-nums`) para evitar oscilaciones de ancho durante transiciones.

---

## 4. Espaciado, Layout & Geometría

### Contrato Único de Layout
- **Ancho máximo de página:** `max-w-7xl`, **siempre** envuelto en `<PageSection>` con `mx-auto`.
- **Gutters de página:** `px-4 sm:px-6 lg:pl-16 lg:pr-10` centralizados en `nav-config.ts` (`CONTENT_PADDING`).
- **Clearance del Shell:** `pt-20 sm:pt-24 pb-24 lg:pb-12` en `nav-config.ts` (`SHELL_CLEARANCE`). Prohibido usar `pb-28` plano en desktop.
- **Paddings de Cards:**
  - Card estándar: `p-5 sm:p-6`.
  - Card hero / stat: `p-6 sm:p-8`.
- **Gaps de Grillas:** `gap-4 sm:gap-6`.
- **Separación entre Secciones:** `space-y-10 sm:space-y-12`.

---

## 5. Radios y Elevación

### Contrato de Bordes Redondeados (`--radius: 0.75rem`)
- **Controles (botones, inputs, selects):** `rounded-lg` (12px)
- **Cards e items de lista:** `rounded-xl` (~17px)
- **Paneles, toolbars y modales:** `rounded-2xl` (~22px)
- **Pills, avatares, badges:** `rounded-full`

### Sombras Permitidas
- Elevación estándar de cards: `shadow-ambient`
- Modales, FABs y menús flotantes: `shadow-ambient-lg`
- **PROHIBIDO en feature code:** `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl` y cualquier `shadow-[...]` arbitrario. `src/components/ui/` es código autogenerado y no se edita; cualquier ajuste se aplica desde el consumidor con `className`.

---

## 6. Regla "No-Line" (Revisada)

1. **PROHIBIDO** el uso de divisores de `1px solid` (`border-b`, `border-t`, `divide-y`) para separar secciones de la interfaz. La jerarquía se define mediante cambio de color de superficie (`surface` → `surface-container-low`) o incremento de espacio (`space-y-6 sm:space-y-8`).
2. **Ghost Border admitido:** Para cards sobre superficies con poco contraste o grillas de alta densidad, se permite exclusivamente el borde fantasma `border-outline-variant/15` implementado en `<Surface tone="ghost">`.
3. **PROHIBIDO:** bordes punteados (`border-dashed`), anillos duros de enfoque estático (`ring-1`), y rails laterales duros (`border-l-[3px]`).

---

## 7. Catálogo de Componentes Primitivos

Todo componente debe consumirse desde `src/components/primitives/`. **No construyas estas piezas a mano.**

1. **`Surface` (`primitives/surface.tsx`):**
   - Tonos: `card` (`rounded-xl bg-card shadow-ambient`), `panel` (`rounded-2xl bg-surface-container-low`) y `stat` (`rounded-xl bg-card shadow-ambient p-6 sm:p-8`). El borde fantasma se activa con la prop booleana `ghost`.
2. **`Pill` (`primitives/pill.tsx`):**
   - Indicador de estado compacto.
   - Tonos: `neutral`, `primary`, `secondary`, `tertiary`, `error`, `new`, `struggling`, `intermediate`, `mastered`, `streak`, `outline`.
   - Tamaños: `sm` (`text-label-sm px-2 py-0.5`), `md` (`text-label-md px-2.5 py-1`).
3. **`StatCard` (`primitives/stat-card.tsx`):**
   - Tarjeta de métrica con valor en `text-metric-lg tabular`, label en `text-label-md`, contenedor tonal y soporte de animación `rise-in`.
4. **`MasteryThread` (`primitives/mastery-thread.tsx`):**
   - Línea de progreso de 2 px de alto. Reemplaza cualquier barra gruesa arbitraria. Track en `bg-surface-container-high` y relleno animado con `animate-thread`.
5. **`StreakBadge` (`primitives/streak-badge.tsx`):**
   - Visualizador de racha con llama animada (`animate-streak`), contenedor tonal de racha (`bg-streak-container text-on-streak-container`) y mensajes conmemorativos en hitos (7, 30, 100 días).
6. **`SectionHeading` (`primitives/section-heading.tsx`):**
   - Encabezado unificado de sección (`text-headline-md`) con slot opcional para acciones alineadas a la derecha (`flex-col sm:flex-row sm:items-end sm:justify-between`).
7. **`EmptyState` (`primitives/empty-state.tsx`):**
   - Estado vacío consistente con icono en círculo elevado, título en `text-display-sm`, descripción en `text-body-md` y slot de CTA.
8. **`PageHeader` & `PageSection` (`layout/page-header.tsx`):**
   - Estructuración estándar de encabezado de página y contenedor `max-w-7xl`.
9. **`FilterChip` (`primitives/filter-chip.tsx`):**
   - Único control para filtros compactos. Centraliza altura, radio, tipografía y estado activo sin modificar el `Button` autogenerado.

---

## 8. Movimiento & Animaciones

Todas las animaciones están implementadas en CSS puro y respetan de manera estricta `prefers-reduced-motion`.

| Animación | Token de Clase | Propósito y Momento |
|---|---|---|
| **Pop-in** | `animate-pop-in` | Feedback visual al calificar una tarjeta (< 250ms) o abrir diálogos |
| **Rise-in** | `animate-rise-in` | Montaje escalonado de cards, stats o items de lista (400ms) |
| **Streak Pulse**| `animate-streak` | Pulso suave continuo en la llama de racha activa |
| **Thread Grow** | `animate-thread` | Expansión suave de la barra de progreso `MasteryThread` |
| **Celebrate** | `animate-celebrate`| Celebración de fin de sesión o meta diaria completa (700ms) |

> **Regla de Recall:** Ninguna animación decorativa o continua está permitida mientras el usuario lee o responde una flashcard.

---

## 9. Responsive & Breakpoints

- **Mobile:** `< 640px` (360px base de diseño). Bottom navigation visible, sidebar oculto, padding `px-4`.
- **Tablet:** `640px – 1023px`. Bottom navigation visible, sidebar oculto, exactamente **una** acción flotante activa.
- **Desktop:** `≥ 1024px` (`lg`). Sidebar visible, bottom navigation oculta, padding asimétrico `lg:pl-16 lg:pr-10`.

### Checklist de Verificación Responsive
- [ ] 360 px: cero scroll horizontal, títulos truncados adecuadamente, botones táctiles ≥ 44 px.
- [ ] 768 px: sin solapamiento entre FAB y bottom-nav.
- [ ] 1440 px: contenido restringido a `max-w-7xl`, clearance inferior limpio sin hueco excesivo.

---

## 10. Dark Mode

- **Regla Fundamental:** No se escriben clases `dark:` en componentes de vista/feature.
- El cambio de tema se resuelve al 100% mediante los tokens CSS de `:root` y `.dark`.
- Las únicas excepciones autorizadas para la variante `dark:` son los componentes base de `src/components/ui/`.
- Todo contenedor y texto debe mantener un contraste mínimo de 4.5:1 para texto normal y 3:1 para componentes de estado en ambos modos.

---

## 11. Ejemplos Do / Don't (del código real)

### 1. Cards y Sombras
```tsx
// ❌ DON'T (Código viejo — sombra fija invisible en dark, padding desalineado)
<div className="bg-card p-6 md:p-8 rounded-xl shadow-[0px_12px_32px_rgba(25,28,29,0.04)]">
  ...
</div>

// ✅ DO (Usar Surface y shadow-ambient)
<Surface tone="card" className="p-5 sm:p-6">
  ...
</Surface>
```

### 2. Títulos de Página
```tsx
// ❌ DON'T (Clase arbitraria de Tailwind y escala inconsistente)
<h1 className="text-3xl font-extrabold text-foreground tracking-tight">Decks</h1>

// ✅ DO (Token tipográfico oficial con Fraunces)
<h1 className="text-display-md text-foreground">Decks</h1>
```

### 3. Estados de Aprendizaje
```tsx
// ❌ DON'T (Hex crudos o clases Tailwind arbitrarias)
<span className="bg-red-100 text-red-700 px-2 py-1 rounded">Struggling</span>

// ✅ DO (Pill con token semántico de estado)
<Pill tone="struggling" size="sm">Struggling</Pill>
```

### 4. Barras de Progreso
```tsx
// ❌ DON'T (Divisores de 1px o barras de progreso gruesas arbitrarias)
<div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
  <div className="bg-emerald-500 h-full" style={{ width: '45%' }} />
</div>

// ✅ DO (MasteryThread unificado de 2px)
<MasteryThread value={45} />
```

### 5. Botones de Rating en Sesión de Estudio
```tsx
// ❌ DON'T (Pesos visuales desbalanceados entre opciones)
<Button variant="destructive">Again</Button>
<Button variant="outline">Hard</Button>
<Button className="bg-indigo-600">Good</Button>
<Button className="bg-emerald-600">Easy</Button>

// ✅ DO (Semántica centralizada; cuatro opciones equiponderadas)
{RATINGS.map((rating) => (
  <Button key={rating.key} variant="ghost" className={rating.buttonClass}>
    {rating.label}
  </Button>
))}
```
