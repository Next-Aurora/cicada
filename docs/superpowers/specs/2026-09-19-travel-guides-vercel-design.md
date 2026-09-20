# Travel Guides Site on Vercel (Design)

Date: 2026-09-19（2026-09-20 起实现落在 Next-Aurora/cicada，travel-skills 仓停用）  
Status: superseded by cicada repo root app

## Goal

Travel-guide HTML itineraries on Vercel. **Canonical repo: [Next-Aurora/cicada](https://github.com/Next-Aurora/cicada)**（品牌「蝉」；攻略为站点能力之一）。

原 monorepo `web/` 方案已废弃；cicada 在仓库根跑 Next，`guides/` + `public/guides/` + `/guides` + `/g/[slug]`。

## Decisions

| Item | Choice |
|------|--------|
| Update path | **Git first**: generate HTML → commit/push → Vercel redeploy |
| Layout | **Monorepo**: Next in `web/`, guides in `guides/<slug>/` |
| Guide format | Keep existing full HTML (no React rewrite) |
| Listing | Home scans synced guides; each has optional `meta.json` |
| Future (C) | Stub only: comment / empty route note for `/api/guides`; no Blob/auth |

## Structure

```text
travel-skills/
├── guides/
│   └── <slug>/
│       ├── index.html      # full guide page
│       ├── meta.json       # { title, destination, dates, summary? }
│       └── *.pdf           # optional
├── web/                    # Next.js (Vercel Root Directory)
│   ├── public/guides/      # build-time copy of ../guides (gitignored or synced)
│   ├── scripts/sync-guides.mjs
│   └── src/app/...
└── .cursor/skills/travel-guide/  # output path rules
```

## Runtime behavior

1. `predev` / `prebuild` runs `sync-guides.mjs`: copy `guides/**` → `web/public/guides/**`.
2. `/` lists folders under `public/guides` that contain `index.html` (prefer `meta.json` for card text).
3. `/g/[slug]` redirects or links to `/guides/[slug]/index.html` (static), or renders a thin shell with full-height iframe to that URL so chrome (home link) stays available.
4. Push to main → Vercel builds `web` → new guide appears.

## Skill contract

- After Phase 4 HTML: write to `guides/<slug>/index.html` (+ `meta.json`, optional PDF).
- `slug`: destination pinyin / ascii kebab (e.g. `liuzhou`).
- Chat summary: remind user to commit + push for site update.
- Do not print internal field names in HTML.

## Non-goals (this phase)

- Auth, Blob upload, CMS UI
- Rewriting guides as MDX/React
- China CDN / Tencent hosting (PDF share path unchanged)

## Success criteria

- Local: `cd web && npm run dev` → home lists Liuzhou → open guide works.
- Vercel: Root Directory `web`; after push, production shows the guide.
