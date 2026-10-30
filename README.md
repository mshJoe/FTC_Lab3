# بوابة FTC — الخريجين (ftc-graduates)

Multi-file implementation of the FTC graduates gateway (split from `ftc-graduates-v3.html`,
then hardened per T1–T11 — see `CHANGES.md`). Plain scripts, no build step, no server.

## Run

Open `index.html` directly in the browser (double-click works). Flags:

- `?test=1` — test panel (date simulation + demo seed scenarios + reset)
- `?test=0` — hide the test panel
- `?dev=1` — dev harness (`window.FTC`) + «شغّل الفحوص» button; add `&autorun=1` to run on load
- `?seed=empty|perf` — pick the demo seed scenario once (test mode only)

Demo data: `DEMO_MODE` flag in `js/constants.js` (true = demo build with seeded data and
test panel; flip to false for the club-site embed).

Storage keys unchanged: `ftc-grads-proto-v2` compat + current store envelope
`ftc-grads-v2`/`ftc-grads-v2-ui`/`ftc-grads-v2-ver` (`store.js`). The envelope carries
`seedVersion` so pure-demo datasets reseed when the seed logic bumps.

## Structure

```
ftc-graduates/
├── index.html          markup shell (header, nav, page containers, toast) + script tags
├── css/
│   └── styles.css      all styling (design tokens → components → breakpoints)
└── js/                 classic scripts, loaded in dependency order
    ├── icons.js        ICONS map + ic() helper
    ├── utils.js        helpers, Riyadh clock, norm module (phone/email/linkedin canonicalizers)
    ├── constants.js    STATUS, members, template defaults, demo seed, legacy migration
    ├── store.js        Store (versioned envelope, save/load/sweep), accessors (gradById…)
    ├── repo.js         Timeline, Undo snapshots, Repo — all mutations (invites, events,
    │                   sessions, graduates, trash, suppressions, merge, import batches)
    ├── templates.js    Tmpl — per-event template versions, render vars, counter
    ├── importer.js     Importer — CSV/paste parse, cleanContact, diffCandidates;
    │                   WhatsApp/Gmail/LinkedIn link builders
    ├── ui-shell.js     UI state, toast, member picker, header stats, event bar
    ├── ui-grads.js     toolbar & filters, graduates table/cards, invite send flow
    ├── scheduler.js    scheduler (D1), 14-day strip, reminders, sessions table, archive
    ├── drawer.js       alumnus drawer, modal system, drawer actions, DNC flow, merge dialog
    ├── pages.js        trash page, settings page (backup/restore, CSV, templates editor)
    ├── wizard.js       import wizard (review preview, commits, batch undo)
    └── main.js         quick add, thanks/booking menus, row delegation, router,
                        renderAll, test panel, waves canvas, boot, window export + dev harness
```

## Load order (index.html)

icons → utils → constants → store → repo → templates → importer →
ui-shell → ui-grads → scheduler → drawer → pages → wizard → main

The original file wrapped all JS in one IIFE; modules are unwrapped top-level scripts —
shared state (`D`, `U`, `F`, `sel`, …) lives in the browser global scope exactly once,
so `let/const` declarations must stay unique across files (no new top-level names without
checking `js/` siblings).

## Navigation

- Sticky top tab bar `#tabbar` — functional routes (الخريجين/الجلسات/المهملات/الإعدادات).
- Fixed bottom nav `#nav` — visual identity strip mirroring the FTC portal
  (الخريجين، اللابات، المهام، المجتمع، الصدارة، حسابي). Inert; clicking explains itself.

## Verification

- `node --check` every module; Node vm seed harness on `constants.js` (see CHANGES.md).
- Headless Chrome smoke + full dev harness:
  `google-chrome --headless=new --user-data-dir=/tmp/x --virtual-time-budget=8000 --dump-dom
   "file://$PWD/index.html?dev=1&test=1&autorun=1"` — expect «فحوص آلية: 91 ناجح، 0 فاشل»
  and no console errors.

## Docs

- `CHANGES.md` — the T1–T11 pass, string-change table, verification log.
- `DEMO-SCRIPT.md` — Arabic walkthrough for presenting the demo.

