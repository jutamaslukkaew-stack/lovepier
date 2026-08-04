---
name: Love Pier Beach Cafe
description: A warm, light-serif beach-cafe world in cocoa, espresso, and sea-foam cream, built for ordering inside LINE.
colors:
  brand-cocoa: "#4a3520"
  brand-espresso: "#3a2818"
  brand-gold: "#c9a96e"
  cream: "#f5f3ef"
  surface-warm: "#faf8f5"
  ink: "#1a1a1a"
  driftwood: "#888888"
typography:
  display:
    fontFamily: "Cormorant Garamond, LINESeedSansTH, Noto Serif Thai, serif"
    fontSize: "clamp(2.5rem, 7vw, 4.5rem)"
    fontWeight: 300
    lineHeight: 1.05
    letterSpacing: "normal"
  body:
    fontFamily: "LINESeedSansTH, Jost, Noto Sans Thai, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "LINESeedSansTH, Jost, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    letterSpacing: "0.05em"
rounded:
  md: "12px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand-cocoa}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "14px 32px"
  button-primary-hover:
    backgroundColor: "{colors.brand-espresso}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
  input-field:
    backgroundColor: "{colors.surface-warm}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: Love Pier Beach Cafe

## Overview

**Creative North Star: "The Warm Pier at Golden Hour"**

Love Pier is a seaside cafe world rendered in the colors of roasted coffee and
late-afternoon light: deep cocoa and espresso browns, a broad wash of sea-foam
cream, and a single thread of low-sun gold used as sparingly as the sun itself.
The personality is calm, editorial, and unhurried — a light-weight Cormorant
serif carries the display voice while LINE Seed Sans keeps Thai text warm and
readable. Nothing shouts. Depth comes from stacking warm tones and hairline
borders, not from heavy shadows.

The system serves two contexts from one identity. The **customer-facing world**
(home, menu, events, and the full-screen delivery wizard that lives inside LINE)
is where this brand voice is expressed fully. The **admin backoffice** runs on a
deliberately neutral shadcn scaffold — the brand's cocoa accent appears on its
key controls, but its job is quiet operability, not expression. When generating
new customer surfaces, follow this document; when extending the admin, match the
existing neutral shadcn primitives and reach for cocoa only on primary actions.

**Key Characteristics:**
- Warm, low-contrast, sunlit — cream fields with cocoa/espresso ink, never stark white-on-black drama.
- Light editorial serif for display, humanist sans for Thai-first body text.
- Pill-shaped primary actions; softly rounded cards and inputs.
- Near-flat surfaces; depth from tonal layering, hairline borders, and backdrop blur.
- Gold is a rare accent, reserved for dark backgrounds only.

## Colors

A warm, coffee-toned palette anchored by two browns over a cream ground, with a
single gold reserved for moments on dark surfaces.

### Primary
- **Roasted Cocoa** (`#4a3520`): The dominant brand accent and the default action color — primary buttons, active step indicators, focus rings, order numbers, and running totals. This is the color the customer touches.
- **Espresso Bark** (`#3a2818`): The deeper sibling of cocoa, used for the pressed/hover state of primary actions and for LINE Flex card headers. It reads as "cocoa, one shade down."

### Tertiary
- **Low-Sun Gold** (`#c9a96e`): A rare metallic accent — the "Love Pier Beach Cafe" wordmark tone and small flourishes. Used only on dark backgrounds.

### Neutral
- **Sea-Foam Cream** (`#f5f3ef`): The primary page background across the whole site (also seen as the near-identical `#f5f2ee` in the delivery wizard). The world sits on cream, not white.
- **Surface Warm** (`#faf8f5`): A slightly lifted cream for input fields and inset surfaces.
- **Near-Black Ink** (`#1a1a1a`): Primary body text. Softened to `text-ink` rather than pure black.
- **Driftwood Gray** (`#888888`): Muted/secondary text, captions, and placeholder-adjacent labels.

### Named Rules
**The Gold-on-Dark Rule.** Low-Sun Gold (`#c9a96e`) is only ever placed on dark backgrounds. It fails contrast on cream and white, so it is never used for text or icons on light surfaces — cocoa or ink carry those instead.

**The Cocoa-then-Espresso Rule.** Interactive elements rest at Roasted Cocoa (`#4a3520`) and darken to Espresso Bark (`#3a2818`) on hover/press. Never the reverse, and never a lighter tint on hover.

**The Cream-Not-White Rule.** Page and section grounds are Sea-Foam Cream, not `#ffffff`. Pure white belongs only to text sitting on cocoa/espresso fills.

## Typography

**Display Font:** Cormorant Garamond (with LINE Seed Sans TH / Noto Serif Thai fallback)
**Body Font:** LINE Seed Sans TH (with Jost / Noto Sans Thai fallback)

**Character:** A light, high-contrast editorial serif for headlines paired with a
warm humanist sans for reading. The pairing feels boutique and calm rather than
corporate. Thai is a first-class citizen: it renders in LINE Seed Sans at a
generous line-height, never in the Latin serif's tight leading.

### Hierarchy
- **Display** (Cormorant, weight 300, `clamp(2.5rem, 7vw, 4.5rem)`, line-height ~1.05): Hero headlines and the footer tagline (`clamp(28px, 7vw, 92px)`). Airy and light-weight.
- **Headline / Title** (Cormorant or LINE Seed, weight 300–400): Section headings. Thai headings drop to weight 300 with line-height 1.45 for tone-mark room.
- **Body** (LINE Seed Sans, weight 400, ~14px, line-height 1.6; Thai 1.75): Default reading text.
- **Label** (LINE Seed Sans / Jost, weight 600, ~13px, letter-spacing 0.05em, often UPPERCASE): Eyebrow labels, step captions, small CTAs.

### Named Rules
**The No-Tracking-Thai Rule.** Thai text (`:lang(th)`) always sets `letter-spacing: 0` — Latin letter-spacing breaks Thai clusters. Uppercase tracking applies to Latin labels only.

**The Light-Display Rule.** Display serif runs at weight 300, never bold. Emphasis comes from size and space, not weight. (`font-light` is the most-used type utility in the codebase.)

## Layout

A centered, generous single-column-to-mosaic model. Content sits in comfortable
max-width containers over full-bleed cream. The customer delivery flow is a
special case: a **full-screen, app-like wizard** (`min-h-[100dvh]`) with a sticky
translucent top bar (step progress) and a sticky bottom action bar that respects
`env(safe-area-inset-bottom)` for LINE's in-app browser. Site nav and footer are
hidden during the order steps. Spacing rhythm runs on an 8/16/32px feel; sections
breathe with large vertical padding. Motion is deliberate — scroll-reveal
(`translateY(40px)` → 0 over ~1.2s) and image-mask wipes carry the editorial pace.

## Elevation & Depth

Near-flat by design. The customer world almost never uses drop shadows; depth is
built from **tonal layering** (cream ground → warm surface → cocoa fills),
**hairline borders** (`rgba(0,0,0,0.07)`–`0.15`, or `border-black/10`), and
**backdrop blur** on the sticky wizard bars (`bg-[#f5f2ee]/95 backdrop-blur-sm`).
The admin (shadcn) uses only the faintest `shadow-xs` on outline buttons and
cards.

### Named Rules
**The Flat-Warm Rule.** Customer surfaces are flat at rest. Separation comes from a one-tone shift and a hairline border, not from a shadow. If a surface needs to float (sticky bars, overlays), use translucency + blur, not elevation.

## Shapes

Two corner languages by context. **Actions are pills** (`rounded-full`, 9999px) —
the primary CTA silhouette across the customer site. **Cards, inputs, and panels
are softly rounded** (`rounded-xl`, ~12px). Borders are hairline and low-contrast.
The admin scaffold is more rectilinear: shadcn `rounded-md` (~10px, from
`--radius: 0.625rem`) on its buttons, inputs, and cards.

## Components

### Buttons
- **Shape:** Fully rounded pills for primary actions (`rounded-full`); some inline/secondary buttons use `rounded-xl` (12px). Admin buttons are `rounded-md` (10px).
- **Primary:** Roasted Cocoa fill, white text, `font-semibold`, generous padding (~`14px 32px`), often `tracking-wide`.
- **Hover / Focus:** Darkens to Espresso Bark (`hover:bg-[#3a2818]`) with a color transition; disabled drops to ~60% opacity. Admin focus uses a 3px `ring-ring/50`.
- **Secondary / Ghost:** On the admin side, shadcn `outline` (bordered, cream/background fill, `shadow-xs`) and `ghost` (accent tint on hover).

### Cards / Containers
- **Corner Style:** `rounded-xl` (~12px) on the customer side.
- **Background:** Cream / warm surface; white only inside admin shadcn cards.
- **Shadow Strategy:** None by default (see The Flat-Warm Rule) — separated by a hairline top border (`rgba(0,0,0,0.07)`).
- **Internal Padding:** Roomy; 16–32px typical.

### Inputs / Fields
- **Style:** `rounded-xl`, Warm Surface fill (`#faf8f5`), hairline border (`border-black/15`). A second, lighter style exists for the marketing/reservation forms: a bottom-underline-only field (`.res-input` / `.c-input`, Jost 14px).
- **Focus:** Border and a soft ring shift to Roasted Cocoa (`focus:border-[#4a3520] focus:ring-1 focus:ring-[#4a3520]/30`).

### Navigation
- Minimal top nav on cream, with a language switcher (TH / EN / ZH). Hidden entirely during the delivery wizard steps for a focused, app-like flow. The admin uses a fixed left sidebar (icon + label rows, cocoa active state, a pending-orders count badge).

### Delivery Wizard (signature component)
- A full-screen, multi-step flow with a **sticky translucent progress bar** (segments fill Roasted Cocoa as steps complete) and a **sticky bottom action bar**. This is the product's defining surface and its most brand-expressive moment; keep it flat, warm, and thumb-reachable.

## Do's and Don'ts

### Do:
- **Do** ground every customer surface on Sea-Foam Cream (`#f5f3ef`), not white.
- **Do** use Roasted Cocoa (`#4a3520`) for the primary action and darken to Espresso Bark (`#3a2818`) on hover.
- **Do** render display headlines in light-weight (300) Cormorant, letting size and whitespace carry emphasis.
- **Do** keep Thai text at `letter-spacing: 0` with generous line-height.
- **Do** shape primary actions as pills and cards/inputs as `rounded-xl`.
- **Do** convey depth with tonal layering, hairline borders, and backdrop blur.

### Don't:
- **Don't** place Low-Sun Gold (`#c9a96e`) on cream or white — dark backgrounds only.
- **Don't** add decorative emoji to customer-facing cards or the order-status page (recent work deliberately removed them).
- **Don't** reach for drop shadows to separate customer surfaces; use a tone shift and a hairline border.
- **Don't** set Latin letter-spacing on Thai text, and don't bold the display serif.
- **Don't** bleed the admin's neutral shadcn palette into customer surfaces, or the cocoa brand accent into every admin control — cocoa is for primary actions only there.
