# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static, multi-page marketing site for **Orkesta**, an automation and AI consulting business (n8n, Claude, agent orchestration, Mercado Pago). No build step, no package manager, no framework CLI — each page is a standalone HTML file with React 18 + Babel-standalone from CDN and shared styling in `styles.css`.

Pages: `index.html` (home) plus topic/cluster pages — `orquestacion-agentes.html` (pillar), `agentes-ia-claude.html`, `automatizacion-n8n.html`, `integraciones-mercado-pago.html`, `procesamiento-documentos-ia.html`, `casos-de-uso.html`, `sobre-orkesta.html`, `preguntas-frecuentes.html`. (`design-system.html` and `index-hero-bg.html` are dev-only and gitignored.)

## Running the Site

Open `index.html` directly in a browser, or serve it locally:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

There are no build, lint, or test commands.

## Architecture

Each page is a self-contained React app inside a single `<script type="text/babel">` block, with React 18 + ReactDOM + Babel-standalone from CDN and shared styling in `styles.css` (custom CSS, **not** Tailwind). Icons come from the `defs.svg` sprite via `<use href="/defs.svg#id">`.

**Content pattern:** All user-facing text lives in a `TRANSLATIONS = { es: {...}, en: {...} }` object near the top of each page's script; components consume `TRANSLATIONS[lang]`. Language is chosen by `?lang=en` / `localStorage` / browser and toggled by the ES/EN switch in the nav. Keep ES and EN in parity — run `/sync-translations` after content edits.

**SSR fallback:** Each page's `#root` contains a static `.ssr-fallback` block with the core content as plain HTML — this is what no-JS crawlers and answer engines see before React mounts. Keep it substantive (see AEO section).

**`CONFIG` object** (top of the babel script, ~line 257 in `index.html`): brand name, WhatsApp number, email, Formspree endpoint. Any contact-flow change starts here.

**Contact form logic** (in `Contacto` component): if `CONFIG.formspree` is set, submits JSON to that endpoint; otherwise falls back to a `mailto:` link. `setSent(true)` controls the success state in both paths.

## Design Tokens

Design System v2 — "brutalismo suave: papel + tinta + una señal verde". Source of truth: `design-system.html`.
- Paper background + ink text; single accent = deep green (`#1F5A3A` → `#143E27`).
- Shared styles in `styles.css` (custom CSS, no Tailwind).
- Fonts: Archivo (sans), Newsreader (serif display), IBM Plex Mono (mono) — Google Fonts.

## Sections & IDs

Home nav anchors: `#soluciones`, `#servicios`, `#proceso`, `#precios`, `#faqs`, `#contacto`, plus a page link to `/orquestacion-agentes.html`. Cluster pages link back to home anchors. Smooth scroll via `html { scroll-behavior: smooth }`.

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

## Answer Engine Optimization (AEO)

The site is tuned to be **cited by AI answer engines** (ChatGPT, Claude, Perplexity, Google AI Overviews, Gemini), not just ranked. Reusable tooling lives in the user-level skill **`aeo-optimizer`** (`~/.claude/skills/aeo-optimizer/`), invokable as **`/aeo`** — it runs a multi-subagent audit → scorecard → prioritized plan → applies fixes (local repo or remote URL).

AEO surfaces in this repo:
- **`robots.txt`** allows AI citation crawlers (OAI-SearchBot, PerplexityBot, ClaudeBot/Claude-SearchBot, Google-Extended, Applebot-Extended, …).
- **`sitemap.xml`** lists every indexable page with `hreflang` (es/en/x-default) and `lastmod`.
- **`llms.txt`** (curated index) + **`llms-full.txt`** (full-text dump). Regenerate `llms-full.txt` with **`/update-llm`** after any content change.
- **JSON-LD** per page: Organization + WebSite + FAQPage on home; Service + BreadcrumbList on cluster pages. The Organization has `@id "https://orkestalo.com/#org"`, referenced by other nodes via `provider`/`publisher`. OG image is a raster `og-image.png` (1200×630).
- **`.ssr-fallback`** carries each page's substance for no-JS crawlers — keep it rich.

Rules when editing for AEO:
- **Never invent facts** (capabilities, metrics, reviews). JSON-LD must match visible content.
- The pillar page `orquestacion-agentes.html` owns "orquestación de agentes / agéntica"; weave the term only where truthful.
- E-E-A-T TODOs (Organization `sameAs`, founder `Person`) are left as commented placeholders in `index.html` and `sobre-orkesta.html` — fill with real profiles.
