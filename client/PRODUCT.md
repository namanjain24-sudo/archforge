# ArchForge — PRODUCT.md

## Register
**Product** — design serves the tool. ArchForge is a working developer instrument; the UI should disappear into the task and earn the trust of engineers fluent in Linear / Vercel / Raycast.

## Purpose
Turn a plain-English prompt into an **accurate, production-grade system-architecture diagram** — verified against real design principles, with capacity estimates and a Well-Architected review. Not a sketch tool; a correctness instrument.

## Target users
Software engineers, architects, and students preparing system-design work. Context: focused, often late-night, on a laptop, evaluating a design or communicating one. They value precision and distrust vague output.

## Primary task per screen
1. Type a system prompt (or pick an example).
2. Read the generated diagram — layered, every box/edge explained.
3. Inspect the insights: capacity numbers, production-readiness, Well-Architected pillars, findings.
4. (Later) refine, export, share.

## Brand personality
**Precise · Trustworthy · Sharp.** A high-end technical instrument — exact, calm, confident. Warmth comes from insight, not decoration.

## Visual identity — "Precision Instrument"
- **Theme:** dark-first (developer default; ~80% run dark). Light is a fully-polished secondary, never an afterthought.
- **Neutrals:** cool slate / zinc, *tinted* (not pure gray, not pure black). Base near-black ≈ `oklch(0.16 0.015 255)`.
- **Primary:** clean electric blue, hue ≈ 248 — deliberately shifted off violet so it reads "considered tool", never AI-purple. Carries primary actions, selection, brand.
- **Warm counterpoint:** amber (hue ≈ 70) — the signature. Used for insights / capacity emphasis. Cool base + warm accent is the distinctive move.
- **Semantic:** verified-green (correctness — thematic), issue-red, warning-amber. State-rich: hover/focus/active/disabled/selected/loading/error.
- **Diagram layer colors:** a considered categorical palette (one hue per architecture layer) via the dataviz method — accessible in both themes.
- **Type:** one premium sans (Geist / Inter) for all UI; a mono (JetBrains/Geist Mono) for tech names, IDs, code-like tokens. Fixed rem scale (product, not fluid).

## Anti-references (do NOT look like)
- Purple/violet gradient "AI SaaS".
- Cream / sand / parchment warm near-white bodies.
- Generic navy-and-gold fintech, or neon-cyan-on-charcoal dev-tool template.
- Pure-gray dated dashboards; pure-black voids.
- Hero-metric templates, identical card grids, tracked uppercase eyebrows, side-stripe borders, gradient text, glassmorphism-by-default.

## Strategic principles
- **Earned familiarity** over surprise: standard affordances (command-palette-style input, panels, tabs), consistent component vocabulary.
- **The diagram is the hero** — everything else is instrument chrome around it.
- **Every number and box is explained** — the UI must surface the "why" (tooltips), because trust is the product.
- **Motion conveys state** (150–250ms), never decoration; request-flow animation is the one earned flourish.
- **Accessibility:** body text ≥4.5:1 both themes; full keyboard; reduced-motion honored.

## Accessibility
WCAG AA contrast in both themes, keyboard-navigable, `prefers-reduced-motion` alternatives, focus-visible everywhere.
