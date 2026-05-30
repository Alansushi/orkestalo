# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-file landing page for **Orkesta**, an automation and AI consulting business (n8n, Claude, Mercado Pago integrations). The entire application lives in `index.html` — no build step, no package manager, no framework CLI.

## Running the Site

Open `index.html` directly in a browser, or serve it locally:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

There are no build, lint, or test commands.

## Architecture

Everything is in one `<script type="text/babel">` block inside `index.html`. React 18, ReactDOM, Babel standalone, and Tailwind CSS are all loaded from CDN — nothing is bundled.

**Key pattern:** All business content lives in plain JS arrays/objects at the top of the script (`servicios`, `etapas`, `soluciones`, `planes`). UI components below consume them. This keeps content edits separate from markup.

**`CONFIG` object** (lines 48–55) is the single place to update brand name, WhatsApp number, email, Calendly URL, and Formspree endpoint. Any contact flow change starts here.

**Contact form logic** (in `Contacto` component): if `CONFIG.formspree` is set, submits JSON to that endpoint; otherwise falls back to a `mailto:` link. `setSent(true)` controls the success state in both paths.

## Design Tokens

- Background: `#0b0b14` (custom `ink` color in Tailwind config)
- Gradient accent: `from-violet-500 to-cyan-400` (used for CTAs and `.grad-text`)
- Glow shadow: `.glow` utility class (violet box-shadow)
- Font: Inter (Google Fonts)

## Sections & IDs

Nav links anchor to: `#top`, `#servicios`, `#proceso`, `#soluciones`, `#precios`, `#contacto`. Smooth scroll is enabled via `html { scroll-behavior: smooth }`.

## Responsive Standards

Breakpoints:
- `960px` — tablet (2-col grids collapse, nav links hide, hamburger appears)
- `640px` — mobile (1-col grids, reduced section padding, stacked CTAs)

Viewport height:
- Always use `100dvh` (not `100vh`) for full-screen fills — `dvh` accounts for the mobile browser URL bar appearing/disappearing.
- The nav height is stored in `--nav-h: 67px` in `:root`. Update this variable if the nav structure changes height.
- Full-viewport sections use: `min-height: calc(100dvh - var(--nav-h)); display: flex; align-items: center;`

Checklist for any new section or component:
- [ ] Works at 390px wide without horizontal scroll
- [ ] Interactive elements (buttons, links) have min 44px tap height
- [ ] Multi-column grids collapse to 1 column at ≤640px
- [ ] CTA buttons stack vertically (`flex-direction: column; width: 100%`) on mobile
- [ ] No fixed widths that break at narrow viewports
- [ ] Section padding reduces from 80px to 56px at ≤640px
