# Reader fonts

Self-hosted WOFF2 assets extracted from these Fontsource packages (no runtime CDN):

| Family | Package | Version | Weights |
| --- | --- | --- | --- |
| Literata | @fontsource/literata | 5.3.0 | 400, 600 |
| Source Serif 4 | @fontsource/source-serif-4 | 5.3.1 | 400, 600 |
| Atkinson Hyperlegible | @fontsource/atkinson-hyperlegible | 5.3.0 | 400, 700 |
| Inter (reader alias: Reader Sans) | @fontsource/inter | 5.3.0 | 400, 600 |

Each family includes normal and italic styles with Latin and Latin Extended subsets.
Original SIL Open Font License texts are preserved in each family's LICENSE.
Global preview faces live in globals.css; reader-fonts.ts injects only the selected
family into the book iframe with absolute same-origin URLs. Preserve unicode-range
and both subsets when updating assets.
