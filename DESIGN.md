# L'Échoppe de Paris — Design System

> Source of truth: current `master` branch of `TriloyTech/lechoppe-official`.
>
> Purpose: document the existing public-site visual language, interaction patterns, and reusable UI conventions of L'Échoppe de Paris so future work remains visually coherent with the established website.

---

## 1. Brand Character

L'Échoppe de Paris combines **Parisian bistronomy**, **premium food photography**, **cinematic storytelling**, and a **modern dark editorial interface**.

The site should feel:

- premium but not formal
- cinematic rather than corporate
- warm rather than cold
- editorial rather than dashboard-like
- food-first rather than technology-first
- minimal, with strong visual hierarchy
- tactile and refined, with restrained glass, glow, blur, and motion

The visual identity is built around:

1. near-black cinematic backgrounds
2. warm off-white typography
3. sage/mint green as the main interactive accent
4. peach/gold as premium secondary accents
5. oversized condensed headings
6. restrained translucent cards and borders
7. rounded shapes for functional UI
8. large food imagery
9. subtle motion and atmospheric glows

A new feature should look like it was always part of the restaurant website.

---

## 2. Core Design Principles

### 2.1 Food and hospitality first

The interface should never feel like a generic admin system, marketplace, delivery app, or payment product.

Use restaurant language, editorial hierarchy, generous spacing, clear food imagery, concise actions, and hospitality-oriented microcopy.

Avoid dense dashboard layouts, excessive tables on customer-facing pages, generic blue SaaS styling, heavy card nesting, raw form dumps, and overly technical labels.

### 2.2 Dark cinematic default

Dark mode is the primary visual identity. The base background is almost black, not charcoal. Content surfaces should usually be only slightly lighter than the page.

### 2.3 Warm accents, not neon accents

Sage green and peach/gold are used as controlled accents. Do not introduce unrelated bright colors for primary actions.

### 2.4 Large typography + small editorial labels

The site deliberately combines very large condensed display headings, very small uppercase eyebrow labels with wide tracking, and compact Inter body copy. This contrast is a core part of the brand.

### 2.5 Functional UI should still feel premium

Forms, filters, selectors, drawers, and modals must inherit the same visual language: soft dark surfaces, thin borders, rounded corners, clear selected states, restrained glow, subtle animation, and strong hierarchy.

---

## 3. Design Tokens

The implementation uses CSS variables from `app/globals.css`. New designs should map to these variables rather than inventing a separate palette.

### 3.1 Dark theme — default

| Token | Value | Usage |
|---|---:|---|
| `--bg` | `#050505` | Main page background |
| `--fg` | `#F5F5F5` | Primary text |
| `--fg-muted` | `rgba(245,245,245,0.55)` | Secondary text |
| `--fg-subtle` | `rgba(245,245,245,0.35)` | Supporting labels |
| `--fg-ghost` | `rgba(245,245,245,0.20)` | Very low emphasis text |
| `--surface` | `rgba(255,255,255,0.03)` | Cards / functional surfaces |
| `--surface2` | `rgba(255,255,255,0.06)` | Hover / stronger surface |
| `--border` | `rgba(255,255,255,0.08)` | Default border |
| `--border-strong` | `rgba(255,255,255,0.15)` | Stronger separation |
| `--card-bg` | `#080808` | Opaque dark cards |
| `--img-bg` | `#111111` | Image placeholder background |
| `--nav-bg` | `rgba(5,5,5,0.92)` | Fixed / glass navigation |
| `--drawer-bg` | `#080808` | Drawers / modal surfaces |
| `--input-bg` | `rgba(255,255,255,0.04)` | Inputs |
| `--input-border` | `rgba(255,255,255,0.10)` | Input borders |

### 3.2 Brand accents

| Name | Value | Primary use |
|---|---:|---|
| Sage | `#7CB895` | Primary interaction, reservation, positive state, navigation accent |
| Peach | `#F3CDA0` | Premium highlight, prices, confirmation actions, editorial accents |
| Gold | `#D4AF37` | Luxury highlight / selective premium accent |
| Google gold | `#FBBC05` | Google review-specific rating treatment only |

Sage is the default interactive brand color. Peach is a premium secondary accent, not a competing primary CTA color. Gold should be used sparingly.

### 3.3 Light theme

The site also supports a warm editorial light theme.

| Token | Value |
|---|---:|
| `--bg` | `#F9F4F0` |
| `--fg` | `#1A1208` |
| `--fg-muted` | `#4A3F35` |
| `--fg-subtle` | `#7A6E65` |
| `--fg-ghost` | `#B0A89F` |
| `--surface` | `#FFFFFF` |
| `--surface2` | `#F2ECE7` |
| `--card-bg` | `#FFFFFF` |
| `--img-bg` | `#EDE8E2` |
| `--nav-bg` | `rgba(249,244,240,0.93)` |

Any new customer-facing experience should remain coherent in both themes rather than depending on a pure black background.

---

## 4. Typography

### Display font — Bebas Neue

Use `var(--font-bebas)` for hero headlines, section titles, major numbers, large status/success titles, and category section titles.

Typical characteristics:
- uppercase
- line-height around `0.9–0.92`
- letter-spacing around `0.04em–0.08em`
- very large responsive sizing

### UI / body font — Inter

Use `var(--font-inter)` for navigation, buttons, inputs, body text, prices, descriptions, labels, status copy, and form controls.

### Editorial serif

Menu item names use:

```css
Georgia, "Times New Roman", serif;
font-style: italic;
```

This should be preferred for food/product names when matching the existing menu.

### Eyebrow labels

Repeated pattern:
- Inter
- uppercase
- `0.55rem–0.65rem`
- letter-spacing `0.35em–0.5em`
- sage, peach, muted white, or subtle gray

### Section headings

Typical responsive size:

```css
font-size: clamp(3.5rem, 10vw, 8rem);
```

Headlines often highlight one word with sage, peach, or context-specific gold.

---

## 5. Spacing and Layout

The public site uses large vertical breathing room, typically `py-24`, `py-28`, or `py-32`.

Common responsive gutters:

```text
px-6
md:px-12
lg:px-20
```

Common content widths:

```text
max-w-5xl
max-w-6xl
max-w-7xl
mx-auto
```

Existing grid patterns:
- 1 column mobile → 2 columns desktop for food cards
- 1 column mobile → 3 columns desktop for editorial pillar cards
- 3/2 split for location map + information
- 2-column desktop modal for reservation storytelling + functional steps

Horizontal scrolling is used intentionally for browse-oriented patterns such as chef suggestions and category pills, not for essential actions.

---

## 6. Shapes and Surfaces

Primary card radius: `rounded-2xl` (~16px).
Large modal radius: `rounded-3xl`.

Cards generally use:

```text
background: var(--surface)
border: 1px solid var(--border)
box-shadow: var(--card-shadow)
```

Pill shapes (`rounded-full`) are used for navigation actions, category filters, price badges, availability badges, and utility actions.

Glass surfaces are restrained and primarily used for fixed navbar, floating actions, dropdowns, and popovers. Typical treatment is `backdrop-filter: blur(12px–16px)` with a translucent near-black background and 1px low-opacity border.

---

## 7. Brand Color Roles

### Sage — `#7CB895`

Use for main interaction accents, selected states, active filters, reservation CTAs, links, hover accents, success highlights, and section accent words.

Typical selected control:

```text
sage background
near-black text
sage border
gentle sage glow
```

### Peach — `#F3CDA0`

Use for premium editorial accents, price treatments, selected confirmation actions, luxury food-related emphasis, and alternative headline accents.

### Red

Use only for destructive/error/sold-out states.

---

## 8. Navigation

The navbar is fixed and overlays the cinematic hero.

Desktop behavior:
- logo left
- editorial navigation links center
- utility/CTA actions right
- transparent over hero
- blurred/translucent after scroll
- thin bottom border after scroll

Navigation labels use Inter, uppercase, small size, wide tracking, muted white, and sage hover state.

Use the existing brand asset:

```text
/images/logo-full-brand.png
```

Do not replace the official logo with text typography in final designs.

Mobile should preserve strong logo presence, clear primary action, language access, and uncluttered navigation.

---

## 9. Hero Language

The existing homepage hero is cinematic and immersive:
- full-viewport video
- near-black canvas
- radial vignette
- oversized Bebas Neue typography
- scroll-timed storytelling
- sage and peach accent words
- very limited UI chrome

Interior pages do not need to reproduce the 400vh cinematic sequence, but should remain connected to this visual world through a strong title, concise eyebrow, dark cinematic background, atmospheric imagery where appropriate, and restrained accents.

---

## 10. Food Cards

Existing food cards establish the product visual language.

Structure:
1. image / placeholder
2. optional badges on image
3. product name
4. description
5. price
6. category / action row

Visual rules:
- rounded 2xl card
- thin theme border
- very dark translucent surface
- image with subtle gradient overlay
- image hover scale around `1.05`
- card hover scale around `1.03`
- italic serif product name
- Inter description
- pill-style price
- small badge treatments

Do not compress restaurant dishes into spreadsheet rows unless imagery is unavailable. When imagery is unavailable, the current site uses elegant dotted menu rows rather than empty image boxes.

---

## 11. Category Navigation

The menu uses a sticky horizontal category filter:
- translucent dark bar
- horizontal pill list
- emoji + category label
- inactive = dark translucent pill + thin border + muted text
- active = sage fill + dark text

This is the primary reference for compact catalog/category navigation.

---

## 12. Reservation Modal — Canonical Transactional UX Pattern

The existing reservation flow is the strongest reference for new transactional or multi-step experiences.

### Overlay

```text
fixed full-screen overlay
black / 85% backdrop
backdrop blur
centered modal
```

### Modal

```text
max-w-5xl
rounded-3xl
bg-bg
thin border
large shadow
max-height ~85vh
scrollable inner content
```

### Desktop composition

Reservation uses two columns.

**Left:** editorial eyebrow, large Bebas title, supporting copy, and a simple overview of the journey.

**Right:** the actual transactional flow, one focused step at a time.

This keeps functional UI from becoming visually overwhelming.

### Step flow

Reservation is broken into:
1. Date
2. Guests
3. Time
4. Contact details
5. Success

Key rule:

> When a user must make several decisions, show one coherent decision group at a time instead of dumping all controls into one long form.

### Step indicator

The modal uses small horizontal capsules:
- completed/current = sage
- inactive = muted border color
- current step becomes wider

### Selection controls

Selected:

```text
background: #7CB895
text: #0A0A0A
border: #7CB895
optional subtle sage glow
```

Unselected:

```text
surface2 / transparent dark background
thin theme border
muted foreground
sage border on hover
```

### Inputs

```text
rounded-xl
px-4
py-3.5
var(--input-bg)
1px var(--input-border)
light foreground
muted placeholder
```

Inputs should always have a clear label or unambiguous placeholder.

### Validation

A new flow must never leave a disabled CTA unexplained. If an action cannot proceed, show the user exactly what is missing.

### Primary / secondary actions

**Back:** theme border, muted text, transparent/dark background.

**Next:** sage background, dark text, uppercase Inter.

**Final confirm:** peach background, dark text.

Sage should remain the dominant action color unless there is a clear reason to use peach for a final confirmation moment.

---

## 13. Forms and Functional UI

Group related information instead of displaying all possible inputs at once.

Every functional screen needs:
1. page/step title
2. concise helper text
3. current choice or summary
4. focused controls
5. next/primary action

A time, option, payment method, filter, or category must have an unmistakable selected state.

Never show only a disabled button. If disabled, show the specific reason nearby, e.g.:

```text
Complete the required selection to continue.
Enter a valid phone number.
Complete the anti-bot check.
Minimum order amount is €20.
```

Avoid walls of choices. For time selection, prefer day selector → times for that day, rather than every time for every day simultaneously.

---

## 14. Buttons

Primary:

```text
sage background
near-black text
rounded-xl or rounded-full
Inter
uppercase or strong compact label
```

Secondary:

```text
transparent / dark surface
1px theme border
muted foreground
hover → stronger surface / sage border
```

Peach may be used for a final confirm action.

Hover behavior should be small and controlled: scale `1.03–1.05`, subtle color transition, subtle glow.

---

## 15. Motion

The site uses Framer Motion extensively, but motion is elegant rather than playful.

Common reveal:

```text
opacity: 0 → 1
y: 20–40px → 0
```

Typical durations: `0.45s–0.8s`.
Common premium easing: `[0.22, 1, 0.36, 1]`.

Card hover: scale ~`1.03`; image scale ~`1.05`.

Modal entrance: opacity `0→1`, scale `0.95→1`, y `20→0`, spring stiffness ~300, damping ~25.

Motion should reinforce hierarchy and state transitions. Do not animate every control continuously.

---

## 16. Ambient Effects

The site uses low-opacity radial glows to create depth:
- sage radial glow
- peach radial glow
- 400–800px blurred shapes
- opacity around `0.04–0.10`
- blur `60–120px`

Use behind sections, not over content. Avoid bright neon glows.

---

## 17. Dark / Light Mode

Dark mode is the brand-leading experience.

Light mode uses warm cream rather than pure white, warm charcoal rather than black, white cards, warm amber accents, and soft shadows.

Any new design should use semantic theme tokens so the composition remains attractive in both modes.

---

## 18. Multilingual Design

The site supports French, English, Spanish, and Italian.

Designs must allow text expansion. Do not size buttons so tightly that longer Spanish or Italian labels overflow. Avoid fixed-width text containers unless truncation is intentional.

---

## 19. Responsive Behaviour

### Mobile

Priorities:
1. one primary task per viewport
2. full-width functional controls where appropriate
3. large tap areas
4. no overlapping fixed UI
5. no dense multi-column functional flows
6. content remains scrollable inside overlays
7. horizontal scrolling only for intentional browsing controls

### Tablet

Use 1–2 columns depending on task complexity.

### Desktop

Use available width for editorial balance, not for displaying more controls than necessary.

For transactional modals, prefer **editorial context left + focused task right**.

---

## 20. Floating Actions

The homepage uses a persistent centered bottom dock with call and reservation actions, plus a theme toggle at lower right.

When designing new pages or overlays, ensure fixed controls do not cover primary CTAs, validation messages, important content, or mobile navigation. Suppress or reposition homepage floating actions during focused transactional experiences if necessary.

---

## 21. Reviews / Trust Elements

Third-party brand colors may appear only inside a context that clearly belongs to that third-party brand. Do not use Google blue/yellow/red as general site colors.

---

## 22. Location / Information Cards

Information sections use section eyebrow, oversized heading, large visual/content area, dark rounded cards, small uppercase labels, and sage CTA links.

This pattern can be reused for practical information such as address, hours, contact details, or service instructions.

---

## 23. Do / Don't

### Do

- use near-black backgrounds
- use sage as primary interaction color
- use peach as premium secondary accent
- use oversized Bebas headings
- use Inter for functional UI
- use italic serif for dish names where appropriate
- use rounded 2xl/3xl containers
- use thin low-opacity borders
- use subtle glass and blur
- use clear selected states
- use step-based flows for complex actions
- show validation reasons
- retain generous spacing
- preserve dark/light compatibility
- design for FR/EN/ES/IT text lengths

### Don't

- introduce generic blue primary buttons
- use pure white page backgrounds in light mode
- build a dense dashboard-style customer-facing flow
- use unexplained disabled CTAs
- stack multiple modal layers unnecessarily
- overuse glow
- overuse emojis as the primary visual system
- invent a new typography system
- replace the official logo
- copy an unrelated commerce, delivery, or SaaS visual language

---

## 24. Existing UI References in the Repository

Use these current `master` files as concrete implementation references:

```text
app/globals.css
app/page.tsx
app/layout.tsx
components/Navbar.tsx
components/HeroCanvas.tsx
components/HeroTextOverlays.tsx
components/ChefSuggestions.tsx
components/FullMenu.tsx
components/ReviewsSection.tsx
components/StorySection.tsx
components/LocationSection.tsx
components/ReservationSection.tsx
components/Footer.tsx
components/FloatingActions.tsx
context/LangContext.tsx
```

For new transactional UX, `components/ReservationSection.tsx` is the most important behavioral/design reference.

For catalog/product presentation, `components/FullMenu.tsx` and `components/ChefSuggestions.tsx` are the primary references.

For theme tokens, always begin with `app/globals.css`.

---

## 25. Design North Star

A successful new screen should pass this test:

> If the logo were temporarily hidden, would a returning L'Échoppe customer still recognize the page as part of the same restaurant website?


