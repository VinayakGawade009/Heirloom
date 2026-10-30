---
name: Quiet Archival
colors:
  surface: '#fff8f5'
  surface-dim: '#e9d7c8'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1e8'
  surface-container: '#feeadc'
  surface-container-high: '#f8e5d6'
  surface-container-highest: '#f2dfd1'
  on-surface: '#231a11'
  on-surface-variant: '#534435'
  inverse-surface: '#392e25'
  inverse-on-surface: '#ffeee1'
  outline: '#867462'
  outline-variant: '#d8c3ae'
  surface-tint: '#875200'
  primary: '#875200'
  on-primary: '#ffffff'
  primary-container: '#e9951c'
  on-primary-container: '#593500'
  inverse-primary: '#ffb865'
  secondary: '#6c5c4a'
  on-secondary: '#ffffff'
  secondary-container: '#f2dcc5'
  on-secondary-container: '#70604e'
  tertiary: '#6b5d3c'
  on-tertiary: '#ffffff'
  tertiary-container: '#b8a680'
  on-tertiary-container: '#483b1e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffddba'
  primary-fixed-dim: '#ffb865'
  on-primary-fixed: '#2b1700'
  on-primary-fixed-variant: '#673d00'
  secondary-fixed: '#f5dfc8'
  secondary-fixed-dim: '#d8c3ad'
  on-secondary-fixed: '#25190b'
  on-secondary-fixed-variant: '#534433'
  tertiary-fixed: '#f5e0b7'
  tertiary-fixed-dim: '#d8c49c'
  on-tertiary-fixed: '#241a02'
  on-tertiary-fixed-variant: '#524526'
  background: '#fff8f5'
  on-background: '#231a11'
  surface-variant: '#f2dfd1'
typography:
  display:
    fontFamily: Georgia, 'Times New Roman', serif
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Georgia, 'Times New Roman', serif
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: -0.005em
  headline-md:
    fontFamily: Georgia, 'Times New Roman', serif
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 28px
  headline-sm:
    fontFamily: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  transcript-body:
    fontFamily: Georgia, 'Times New Roman', serif
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 30.6px
  body-default:
    fontFamily: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-muted:
    fontFamily: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-default:
    fontFamily: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-caps:
    fontFamily: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.06em
  code-default:
    fontFamily: Consolas, 'Courier New', monospace
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.5rem
  space-sm: 1rem
  space-md: 1.5rem
  space-lg: 2rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a quiet, sunlit reading room environment tailored for preserving intimate family histories—handwritten correspondence, weathered journals, and heirloom recipes. Rather than presenting the sterile machinery of a modern AI tool, the interface recedes completely, honoring physical artifacts through tactile stillness, deliberate pacing, and literary warmth.

The aesthetic fuses archival editorial restraint with humane craftsmanship:
- **Atmosphere**: Warm parchment, aged rag paper, sepia inks, and the quiet dignity of a library preservation lab.
- **Offline Integrity**: Self-contained, deterministic, and private. Zero third-party font calls, external scripts, or network reliance.
- **Visual Weight**: Grounded, single-plane structural clarity. No artificial skeuomorphic gimmicks, harsh drop shadows, or glossy blurs; structure is communicated strictly via surface color shifts and crisp paper-edge borders.

## Colors

The palette is rooted in historic papers, iron gall ink, and golden linen binding:

- **Canvas Background (`#FBF6EC`)**: A warm, unbleached cotton-rag tone that reduces eye strain during prolonged reading and transcription sessions.
- **Surfaces & Panels (`#FFFDF8`)**: Fresh vellum tone used for transcription workspaces, metadata inspection drawers, and reading panels. Paired with a delicate `#E6DAC3` hairline rule.
- **Ink Primary (`#2B2118`)**: Deep, oxidized bistre brown used for high-contrast legible prose, headlines, and primary button labels.
- **Ink Muted (`#6B5B49`)**: Dried walnut ink for metadata timestamps, secondary labels, and archival catalog numbers.
- **Marigold Primary Accent (`#E9951C`, Hover `#D98410`)**: The solitary chromatic accent, reminiscent of library book ribbons and wax seals. Utilized for primary interactive touchpoints, caret indicators, and active workspace views.
- **Marigold Tint (`#FCE7BD`)**: Gentle highlight wash applied to ambiguous transcript phrases flagged by the local inference model.
- **Status Accents**: Muted Herb Green (`#4F7A3A`) for verified local saves and finished exports; Madder Red (`#B23A2B`) for corrupted files or transcription warnings.

## Typography

The typography architecture adheres to a strict zero-dependency philosophy, relying solely on universal operating system font stacks:

1. **System UI Sans (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`)**: Drives all chrome, application chrome, buttons, filter chips, and operational telemetry. Highly readable, crisp at small point sizes, and instantly native.
2. **Bookish Serif (`Georgia, "Times New Roman", serif`)**: Allocated for human narratives—primary document titles, handwritten transcriptions, side-by-side historical translations, and diary entries. `transcript-body` holds an intentional `1.7` line-height (30.6px on an 18px body) to facilitate eye tracking between historical scan facsimiles and machine text.
3. **Monospace (`Consolas, "Courier New", monospace`)**: Strictly applied to local model runtime metrics, token generation rates, and file hash verifications.
4. **Hard Floor**: Type size never drops below 13px across the system to ensure comfort for archivists working across prolonged sessions.

## Layout & Spacing

The application targets a disciplined 1440px desktop frame, engineered with an 8px base rhythm. It avoids edge-to-edge sprawl, adopting a centered workbench architecture framed by generous `2rem` (32px) canvas margins.

### Archival Split Workbench
The primary view uses a three-pane fixed-ratio arrangement:
- **Index Drawer (Left, 280px)**: Collections, folders, dates, and catalog tags.
- **Document Facsimile Stage (Center, fluid min 520px)**: Paper-toned viewport displaying high-resolution scans with pinch/pan controls.
- **Transcription & Translation Studio (Right, 520px)**: Side-by-side or stacked parchment panels displaying machine OCR outputs, human corrections, and annotations.

### Rhythm Rules
- All component margins, panel insets, and padding steps must resolve to multiples of 8px (`8px`, `16px`, `24px`, `32px`, `40px`, `48px`).
- Internal panel gutters utilize `1.5rem` (24px) to preserve cognitive breathing room.
- Form field stacks and metadata blocks utilize `1rem` (16px) element gaps.

## Elevation & Depth

This design system enforces a zero-shadow, zero-gradient rule. Depth is conveyed purely through surface materiality and structural framing:

- **Surface Layering**:
  - Base canvas: `#FBF6EC`
  - Active document panels and inspector cards: `#FFFDF8`
  - Inset fields and editor gutters: `#F5EEDB`
- **Boundaries**: All cards, modals, popovers, and split panes are demarcated by a 1px solid border in `#E6DAC3`.
- **Focus & Selection**: Interactive focus is achieved via a crisp 2px solid `#E9951C` outline offset by 2px `#FFFDF8`, eliminating blurry focus rings.
- **Modals & Overlays**: Modals sit on top of a flat `#2B2118` scrim with 35% opacity, framed with the standard 1px `#E6DAC3` perimeter line.

## Shapes

The design system standardizes on a structural `12px` (`0.75rem`) corner radius for primary architectural elements, reflecting trimmed deckle-edge papers and sturdy binder pockets.

- **Panels, Cards, and Modals**: Exactly `12px` border radius with uniform `1px solid #E6DAC3`.
- **Form Inputs and Action Buttons**: `8px` corner radius for immediate physical tactility.
- **Chips and Metadata Tags**: `6px` softened corners, avoiding modern pill shapes that disrupt the historic editorial cadence.
- **Unsure Word Highlight Marks**: `3px` tight corner radius wrapping model-flagged transcript words.

## Components

### Buttons
- **Primary Action (CTA)**: Background `#E9951C`, text `#2B2118` (semibold), 0px shadow, border radius 8px, padding 10px 20px. Hover state shifts to `#D98410`. Active state shifts to `#C57408`.
- **Secondary (Outline)**: Background transparent, border 1px solid `#E6DAC3`, text `#2B2118`. Hover state fills with `#F4EBDA`.
- **Tertiary / Ghost**: Text `#6B5B49`, background transparent. Hover state shifts text to `#2B2118` with subtle background `#F5EEDB`.

### Cards & Panels
- Constructed with `#FFFDF8` background and 1px solid `#E6DAC3` border.
- Border radius fixed at 12px.
- Internal padding fixed at 24px (`space-md`). No shadow under any circumstance.

### Input Fields & Search
- Background `#FFFDF8`, 1px solid `#E6DAC3`, border radius 8px, padding 10px 14px.
- Text `#2B2118`, placeholder text `#8C7B68`.
- Focus state: Border color changes to `#E9951C` with an explicit 2px `#E9951C` outer outline ring.

### Archival Transcription View
- Text renders in Georgia at 18px with 1.7 line height on `#FFFDF8`.
- **Unsure Words (AI Confidence Flag)**: Enclosed in `<mark>` elements styled with background `#FCE7BD`, text `#2B2118`, 2px horizontal padding, and a dotted underline in `#E9951C`. Clicking triggers an archival alternate transcription tooltip.
- **Ruled Paper Mode**: Optional toggle that introduces pure CSS linear background rules (1px line `#EFE5D3` spaced every 30.6px) aligning to the Georgia typography baseline.

### Tabs & Navigation
- Flat layout resting on an `#E6DAC3` bottom border.
- Active tab features a 2px solid `#E9951C` bottom rule and text in `#2B2118`.
- Inactive tabs feature text in `#6B5B49` with smooth hover transition to `#2B2118`.

### Checkboxes & Radios
- 18px square (checkbox) or circle (radio), background `#FFFDF8`, 1.5px solid `#8C7B68`.
- Checked state: Background `#E9951C`, border `#E9951C`, checkmark glyph in `#2B2118`.

### Chips & Metadata Tags
- Background `#F5EEDB`, 1px solid `#E6DAC3`, text `#6B5B49`, label-caps font styling, padding 4px 10px, radius 6px.