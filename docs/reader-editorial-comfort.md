# Lector editorial: personalización y enfoque

Implementación en `feat/reader-editorial-comfort`, basada en `main` (`0fd0006`).

## Experiencia

- Siete temas: Sepia, Paper, Sage, Light, Slate, Dark OLED y Auto.
- Seis fuentes: Book, Literata, Source Serif 4, Atkinson Hyperlegible, Sans y Original.
- Presets Editorial, Rest y Night; aplican tema, fuente, tamaño, interlineado, alineación y columnas como un solo cambio. Los ajustes posteriores siguen siendo independientes.
- Vista previa del texto con el mismo CSS y fuentes que el libro. Original conserva la tipografía de la editorial en el libro y se identifica expresamente en la vista previa.
- Ajustes móviles a ancho completo, controles táctiles de al menos 44 px y pie con Start reading, Reset settings y estado de sincronización/reintento.
- Start reading oculta los controles sin cambiar la geometría del libro. Tap o Escape los recuperan. Los controles ocultos no reciben foco.

Las preferencias existentes se conservan. No se cambia la biblioteca ni se añaden hábitos, analítica, tablas de sesiones o llamadas de IA.

## Persistencia y compatibilidad

El catálogo compartido alimenta los enums PostgreSQL, Zod y los controles. El guardado mantiene aplicación inmediata, agrupa cambios rápidos y serializa las peticiones. El cierre de ajustes, la ocultación de pestaña y la salida del lector intentan enviar lo pendiente; un fallo deja el estado visible con Retry.

Las comparaciones de interlineado/presets toleran la precisión de `real` de PostgreSQL. Al leer se ajustan los errores mínimos de representación en los límites de escala 0.7/1.6, para no invalidar el siguiente cambio.

Se reutilizan la repaginación, el anclaje CFI y el refresco de resaltados existentes. La sanitización de EPUB sigue intacta. Los temas claros conservan colores editoriales; Slate usa la misma adaptación de contenido oscuro que Dark.

Las fuentes se sirven localmente desde `public/fonts`, con subconjuntos Latin/Latin Extended y variantes normal, negrita y cursiva. Las licencias y versiones están en `public/fonts/README.md`.

## Ramas revisadas

Se verificaron las ramas locales y los heads de GitHub. `main` local y remoto coinciden en `0fd0006`. Las ramas `feat/srs-build-guide-implementation`, `feat/rag-langgraph` y el checkpoint del lector ya forman parte de `main`.

`fix/study-keyboard-rating` conserva una corrección de estudio sin incorporar. El worktree divergente conserva documentación propia y un código anterior; la rama backup también conserva trabajo anterior. Ninguna se ha fusionado para esta mejora. El documento local sin seguimiento `docs/plans/plan-completo-lector-epub.md` se ha preservado sin modificar.

## Migración y despliegue

Drizzle generó `0019_reader_editorial_comfort.sql`: solo añade tres valores a `reader_font` y tres a `reader_theme`. No modifica columnas, datos ni valores predeterminados existentes.

La migración se aplicó y validó en la base aislada de `.env.test`, verificando que su endpoint es distinto al de la app. **La base de producción no se ha migrado ni se ha desplegado la aplicación.** Antes de publicar esta rama, aplicar la migración con `npx drizzle-kit migrate` usando la configuración del entorno destino.

## Comprobaciones

Resultado final: **32 pruebas unitarias y 61 E2E aprobadas**. Las otras 15 E2E se omiten de forma explícita según navegador/dispositivo. TypeScript, lint de `src`/`e2e` y build de producción aprobados. Se generaron 70 capturas del lector y los ajustes para la matriz visual.

- `npx tsc --noEmit`
- `npm test`: pruebas unitarias de catálogo, validación, presets, fuentes locales, CSS de iframe y guardado serializado con fallos/reintentos.
- `npx eslint src e2e`: sin errores ni warnings en el código de la app y las pruebas.
- `npm run lint`: sin errores; conserva 19 warnings de herramientas locales de DesignSync. Se excluyó `.next-e2e` para evitar analizar los artefactos generados.
- `npx next build`
- `npx playwright test`: Chrome escritorio, Android Chrome y Safari iPhone; personalización, persistencia, fallos de red, límites de tamaño, posición, selección, resaltados, fullscreen, Ask acoplado, traducciones y EPUB hostil.
- Matriz visual: siete temas × 360/414/768/1024/1440 px, con contraste de texto/controles/traducción ≥ 4.5:1, movimiento reducido y ausencia de desbordamientos.

Playwright guarda capturas del lector y los ajustes bajo `test-results/reader-appearance-*/`. Se pueden regenerar con `npx playwright test e2e/reader-appearance.spec.ts --project=desktop-chrome`.

La mejora busca favorecer sesiones cómodas y prolongadas. No se atribuye un aumento de retención sin medirlo.

## Capturas de revisión

| Vista | Captura |
| --- | --- |
| Ajustes Paper, móvil 360 px | [Abrir](../test-results/reader-appearance-themes-r-a7c4d-dth-and-with-reduced-motion-desktop-chrome/settings-360-paper.png) |
| Ajustes Slate, escritorio 1440 px | [Abrir](../test-results/reader-appearance-themes-r-a7c4d-dth-and-with-reduced-motion-desktop-chrome/settings-1440-slate.png) |
| Libro con Slate, escritorio | [Abrir](../test-results/reader-appearance-themes-r-a7c4d-dth-and-with-reduced-motion-desktop-chrome/reader-1440-slate.png) |
| Libro con Sage, móvil | [Abrir](../test-results/reader-appearance-themes-r-a7c4d-dth-and-with-reduced-motion-desktop-chrome/reader-414-sage.png) |

Las capturas son artefactos locales de Playwright, excluidos de Git. La prueba de arranque espera a que el HTML transmitido por Next deje un único indicador de página; la prueba de EPUB hostil espera a que se cierre el índice antes de interactuar con el capítulo.
