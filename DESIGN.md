# Design System Strategy: The Sonic Ether

## 1. Overview & Creative North Star
**Creative North Star: "The Neon Pulse"**
This design system moves beyond the utility of a standard radio app to create a cinematic, immersive audio environment. We are building "The Neon Pulse"—an aesthetic defined by deep atmospheric depth, high-energy chromatic accents, and a "light-through-glass" tactile feel. 

To break the "template" look, we reject the rigid grid in favor of **Intentional Asymmetry**. Album art should feel like it's floating in a void, while typography uses extreme scale contrasts (massive `display-lg` headlines paired with microscopic, high-density `label-sm` metadata) to create a high-end editorial rhythm. We avoid "boxed-in" layouts; elements should breathe, overlap, and bleed into the charcoal darkness.

---

## 2. Colors & Atmospheric Depth
Our palette is rooted in the "Deep Charcoal" (`surface`) to ensure the "Electric Violet" (`primary`) and "Cyan" (`secondary`) feel like light sources, not just colors.

*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. To separate the "Now Playing" bar from the discovery feed, use a shift from `surface` (#131313) to `surface-container-low` (#1C1B1B). If a container needs more prominence, use `surface-container-high` (#2A2A2A). Separation is felt through tonal weight, not drawn lines.
*   **Surface Hierarchy & Nesting:** Treat the UI as a series of nested glass panes. 
    *   *Level 0 (Background):* `surface`
    *   *Level 1 (Sections):* `surface-container-low`
    *   *Level 2 (Cards/Modules):* `surface-container-highest`
*   **The "Glass & Gradient" Rule:** Floating controllers and navigation bars must utilize Glassmorphism. Apply `surface-variant` at 40% opacity with a `20px` backdrop blur. 
*   **Signature Textures:** Use a subtle linear gradient for primary CTAs: `primary_container` (#8F00FF) transitioning to `primary` (#DAB9FF) at a 135-degree angle. This simulates a neon tube glow.

---

## 3. Typography: The Editorial Voice
We utilize a dual-font strategy to balance technical precision with expressive energy.

*   **Space Grotesk (Display & Headlines):** This is our "Signal." Use `display-lg` for station numbers or artist names to create a bold, brutalist impact. The wide apertures and geometric construction feel "New Tech."
*   **Manrope (Body, Titles, & Labels):** This is our "Data." It provides a clean, functional contrast to the expressive headlines. Use `title-sm` for track names and `label-sm` (all-caps with 0.05rem letter spacing) for technical metadata like "BITRATE" or "KHZ."
*   **Hierarchy Tip:** Never center-align long-form text. Flush-left alignment maintains the "sleek" modernist edge.

---

## 4. Elevation & Depth
In a dark, neon system, depth is conveyed through "Light Leakage" and "Tonal Stacking."

*   **The Layering Principle:** To lift an element, do not use a drop shadow immediately. Instead, move the background from `surface_container_low` to `surface_container_highest`.
*   **Ambient Glow (Shadows):** When a "Play" button needs to float, use an ambient glow instead of a black shadow. Use `primary` (#8F00FF) at 12% opacity with a `24px` blur. It should look like the button is casting light onto the charcoal surface.
*   **The "Ghost Border" Fallback:** For accessibility on interactive inputs, use the `outline_variant` token at 15% opacity. This creates a "barely-there" guide that maintains the minimalist aesthetic.
*   **Glassmorphism Integration:** Apply a `0.5px` inner stroke using `outline` (#988CA2) at 20% opacity to the top and left edges of glass containers to simulate a "highlight" on the edge of the glass.

---

## 5. Components & Interface Primitives

### Cards & Discovery
*   **Album Art:** Square format with the `lg` (0.5rem) roundedness scale. 
*   **Layout:** Forbid dividers. Use `Spacing 8` (2rem) to separate categories. Use horizontal scrolling with "peek" (showing 15% of the next card) to imply continuity.

### Interactive Elements
*   **Primary Buttons:** Use the `primary_container` fill with `on_primary` text. Shape: `full` (pill-shaped). No borders.
*   **Glass Controls:** For transport controls (Play/Pause), use a `surface_bright` circle at 10% opacity with a heavy backdrop blur and a `secondary` (#00FFFF) icon.
*   **Input Fields:** Ghost-styled. No background fill. Only a bottom "Ghost Border" using `outline_variant` at 20%. Helper text must use `label-sm`.

### Specific App Components
*   **The "Frequency Wave":** A custom visualization component using `secondary_fixed` (#00FBFB) to represent live audio.
*   **The "Vibe Toggle":** A selection chip using `tertiary_container` for the active state to provide a soft violet-glow distinction from the main actions.

---

## 6. Do’s and Don'ts

### Do:
*   **DO** use extreme whitespace. If you think there’s enough space, add `Spacing 4` (1rem) more.
*   **DO** overlap elements. Let the corner of a glass "Now Playing" card slightly obscure the background content to create depth.
*   **DO** use `secondary` (Cyan) sparingly as a "functional" accent (e.g., live indicators, active toggles).

### Don't:
*   **DON'T** use pure black (#000000). Always use the `surface` (#131313) to allow for subtle "lowest" depth tiers.
*   **DON'T** use standard Material Design elevation shadows. They look muddy on dark backgrounds. Use tonal shifts or colored glows.
*   **DON'T** use 100% opaque dividers. If you must separate, use a `1px` gap that reveals the `surface_container_lowest` color.