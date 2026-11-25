# PRODUCT.md — Earth, right now (TileEarth)

## Product Identity & Vision
- **Name**: Earth, right now
- **Subtitle**: Natural events tracked by NASA over global satellite imagery
- **Audience**: Curious observers, students, educators, and everyday citizens exploring the living, dynamic Earth. Not a military operations room, not a sci-fi gamer dashboard.
- **Tone**: Calm, editorial, observant, trustworthy, humane. A modern observatory journal / field atlas.
- **Core Value**: The Earth and its planetary rhythms are the centerpiece. The interface provides quiet, respectful context and recedes into the background.

## Design System & Rules
- **Mode**: Operate / Read (Field journal & interactive globe atlas).
- **Dial Values**:
  - *Layout Variance*: Low-to-Medium (A planetary globe requires a stable, predictable interface rail and clean sliding inspection drawers).
  - *Motion*: Restrained & purposeful (Emil Kowalski's laws: under 250ms for UI state, custom ease-out curves, no scale(0), subtle feedback on interaction, auto-rotate disabled under prefers-reduced-motion).
  - *Visual Density*: Medium-low (Clean negative space, distinct 8px spatial grid, no nested card-in-card containers, no synthetic glowing halos).
- **Typography**:
  - *Display / Headings*: Newsreader (refined editorial serif, Google Fonts)
  - *UI Body / Labels*: Plus Jakarta Sans (clean, warm humanist sans, Google Fonts)
  - *Numerics & Coordinates*: Tabular figures (`font-variant-numeric: tabular-nums`)
- **Color Palette**:
  - *Canvas Space*: Deep Ink (`#0a0d14`)
  - *Surface Containers*: Warm charcoal slate (`#131824`) with gentle 1px border (`rgba(255, 255, 255, 0.08)`)
  - *Text Primary*: Soft warm white (`#f1f5f9`)
  - *Text Muted*: Warm mist (`#94a3b8`)
  - *Primary Accent*: Warm Amber / Ochre (`#f59e0b` / `#fbbf24`), used only for active selections and key CTAs.
  - *Category Colors*: Muted, accessible earth tones paired with distinct inline Lucide-style SVGs.
- **Copy**: Plain human language. No robotic mission jargon ("observation checkpoints", "track trajectory rendered in cyan").
