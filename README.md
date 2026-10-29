# بوابة FTC — الخريجين (ftc-graduates)

Multi-file split of `ftc-graduates-v3.html`. Behavior-identical: same markup, same CSS,
same JS — just organized. The original single-file prototype is untouched.

## Run

Open `index.html` directly in the browser (double-click works — plain scripts, no build
step, no server needed). Feature flags:

- `?test=1` — test panel (date simulation)
- `?dev=1` — dev harness (`window.FTC`, `FTC.resetSeed()`, `FTC.runDevTests()`)

Storage keys unchanged: `ftc-grads-proto-v2` compat + current store envelope (`KEY`/`VERKEY` in `store.js`).

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
    ├── pages.js        trash page, settings page, template editor
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

## Known issues

Fix plan: `/home/youssef/Desktop/ftc-graduates-v3-fix-plan.md` (P0–P3, tracked separately).
Line references in that plan map to the original single file; equivalent sections are
listed above.
