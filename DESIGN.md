# Design System Specification: The Cognitive Atelier

## 1. Overview & Creative North Star
**The Creative North Star: "The Digital Curator"**
This design system moves away from the cluttered, gamified aesthetic typical of learning apps. Instead, it adopts the persona of a high-end editorial gallery. We treat information as art and the user’s focus as a sacred resource.

To break the "template" look, we employ **Intentional Asymmetry**. Large `display-lg` headings should sit with generous, unbalanced whitespace, pushing the content to feel like a bespoke publication rather than a database. We utilize **Tonal Depth**—layering whites and off-whites—to create a sense of calm, intellectual rigor.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the "No-Line" Rule. We define structure through shifts in light, not through strokes.

### Core Palette
*   **Primary (Indigo):** `#3525cd` (Brand authority and active states)
*   **Primary Container:** `#4f46e5` (The "Action" surface)
*   **Tertiary (Emerald):** `#005338` (Success and mastery states)
*   **Background:** `#f8f9fa` (The canvas)

### The "No-Line" Rule
**Prohibit 1px solid borders for sectioning.**
Boundaries are defined by background color shifts. A `surface-container-low` section sitting on a `surface` background provides all the separation required. If the eye cannot see the transition, increase the whitespace, do not add a line.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper.
*   **Level 0 (Base):** `surface` (`#f8f9fa`)
*   **Level 1 (Sections):** `surface-container-low` (`#f3f4f5`)
*   **Level 2 (Active Cards):** `surface-container-lowest` (`#ffffff`)

By nesting a `#ffffff` card inside a `#f3f4f5` container, we achieve a "natural lift" that feels premium and intentional.

---

## 3. Typography: Editorial Authority
We use **Inter** not as a system font, but as a typographic tool for hierarchy.

*   **Display (lg/md/sm):** Used for "Zen Mode" or session starts. These should have a slight negative letter-spacing (-0.02em) to feel tighter and more "designed."
*   **Headline (lg/md/sm):** Your primary navigational anchors. Use `headline-lg` (2rem) sparingly to introduce new decks.
*   **Body (lg/md):** The core of the learning experience. `body-lg` (1rem) is the default for flashcard content to ensure maximum legibility during high-intensity recall.
*   **Label (md/sm):** Reserved for metadata (e.g., "Last reviewed 2d ago"). These should use the `on-surface-variant` color to recede into the background.

---

## 4. Elevation & Depth
Depth is a feeling, not a drop-shadow effect.

### Tonal Layering
Avoid shadows for static elements. Use the `surface-container` tiers to stack elements. A card containing a "Term" should be `surface-container-lowest` (#ffffff) to appear as the top-most layer of the intellectual stack.

### Ambient Shadows
For floating elements (modals, active deck selection), use **Ambient Shadows**:
*   **Value:** `0px 12px 32px rgba(25, 28, 29, 0.04)`
*   **Rule:** The shadow must be a tinted version of the `on-surface` color. Never use pure black `#000000` for shadows; it "muddies" the clean white surfaces.

### The "Ghost Border"
If a container requires a boundary (e.g., a card in a high-density grid), use the `outline-variant` at **15% opacity**. It should be felt rather than seen.

---

## 5. Components

### Cards (The Core Unit)
*   **Shape:** `md` (12px) border radius.
*   **Styling:** No borders. Use `surface-container-lowest` background.
*   **Interaction:** On hover, do not change the border; instead, transition the background to `surface-bright` and apply an **Ambient Shadow**.

### Buttons
*   **Shape:** `DEFAULT` (8px) border radius.
*   **Primary:** `primary` background with `on-primary` text. No gradients.
*   **Tertiary (The "Answer" Button):** Use `tertiary-container` to signal a "Correct" or "Mastered" state.
*   **Ghost States:** For "Edit" or "Back" actions, use a `label-md` style with no container, only an `on-surface-variant` color.

### Input Fields
*   **Styling:** Forgo the box. Use a `surface-container-highest` bottom-only indicator or a subtle `surface-container-low` filled background.
*   **Focus:** Transition the background color to `primary-fixed` at 10% opacity.

### Progress Indicators (The Mastery Bar)
*   Instead of a standard thick bar, use a 2px "Thread" line using the `tertiary` color. It should feel like a fine silk thread running across the top of the deck.

---

## 6. Do’s and Don'ts

### Do:
*   **Do** use asymmetrical margins. A 120px left margin and an 80px right margin can make a dashboard feel like a high-end magazine.
*   **Do** embrace the "Empty State." If a user has no cards to review, use `display-sm` typography to celebrate the "Mental Space."
*   **Do** use `backdrop-blur` (12px) on navigation bars to allow the background surfaces to bleed through.

### Don’t:
*   **Don't** use 1px solid dividers to separate list items. Use 16px of `body-sm` vertical spacing instead.
*   **Don't** use high-contrast black (#000) for text. Use `on-surface` (#191c1d) to maintain a sophisticated, soft-gray-black tone.
*   **Don't** crowd the interface. If you are unsure, add 8px more padding.
