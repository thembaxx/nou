# Nou

**Weather for now.**

Nou means “now” in Afrikaans. The name expresses the app's focus on the day the visitor is in. Use **Nou** in prose and **nou.** as the visual wordmark. Keep the existing repository and browser-storage identifiers stable.

The mark combines a rounded lowercase **n**, a small sun in its open center, and a horizon. Its curved silhouette reflects the app's soft cards; the dot emphasizes the present moment. Use a single ink color, reversing to ivory on dark surfaces. The citron app tile gives the mark contrast on a home screen.

## Palette

| Color  | Value     | Use                               |
| ------ | --------- | --------------------------------- |
| Ivory  | `#F5F4EF` | Light background                  |
| Ink    | `#252922` | Text and monochrome logo          |
| Citron | `#F0FA8C` | App icon, insight cards, emphasis |
| Mist   | `#E2EAE7` | Weather surfaces                  |
| Night  | `#141614` | Dark background                   |

Use Manrope. Favor generous spacing and regular or medium weights. Keep data easy to scan and explanations short. Weather colors describe conditions without implying urgency unsupported by the data.

## Voice

Calm, clear, and present. Lead with useful weather information. Use short everyday phrases: “Weather for now.”, “The rest of today”, and “A little more detail”. State update times and unavailable data plainly. Describe provider estimates accurately.

## Logo use

Use the provided vector files. Keep a clear area around the symbol of at least the width of one stem. Use the symbol at 20px or larger in the app, and the simplified favicon at 16px. Preserve proportions. Avoid shadows, gradients, borders, and independent rotation of the mark.

Assets are in `public/brand/`: light/dark wordmarks, symbol, app icon, social image, and visual brand guide. `pnpm assets` regenerates application icons and the social image from the brand sources.

## Motion

Use springs with restrained overshoot. The active navigation selection moves between icons; press feedback compresses slightly and releases smoothly. Mobile sheets follow a drag from their handle and dismiss downward after a sufficient distance or velocity. Content changes use small displacements and short fades. Respect reduced-motion preferences. Motion supports a change of state rather than running continually around functional controls.

## Discovery

Canonical origin: `https://nou-six.vercel.app`. Search descriptions explain the product as a weather app for today. Structured data describes the actual free web application without ratings or invented reviews. `/llms.txt` is a concise product index, and `/llms-full.txt` describes behavior, data sources, timestamps, installation, and limits.
