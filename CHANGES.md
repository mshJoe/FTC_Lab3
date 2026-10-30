# CHANGES — FTC Graduates

Backup before the fix pass: `../ftc-graduates-backup-20261030-1452/`.
Backup before the previous (T1–T11) pass: `../ftc-graduates-backup-20261030-1246/`.

## Fix pass (this pass: N-01 + R-01..R-36)

| Item | Status | Where / evidence |
|---|---|---|
| N-01 | done | js/drawer.js drawerInvites (pill «تم التواصل» in var(--s-wait); «أُلغيت» hamza fix; sub line `kind · channel · sender · confirmedAt/بدأ الإرسال`), js/pages.js prevEventModal «تم التواصل», repo.js + constants.js timeline texts «سجّل/ت إرسال…», sweep texts «ما سجّلنا الإرسال…» |
| R-01 | done | js/pages.js — «منطقة الخطر» block deleted (no data-reset-all anywhere; css had no rule) |
| R-02 | done | js/ui-shell.js toast() builds DOM via textContent; esc() stripped from all toast() interpolations (18 calls) — dev test proves no `<img>` lands in DOM |
| R-03 | done | js/utils.js safeUrl; js/scheduler.js archive links; js/ui-grads.js contactChip; js/store.js sanitizeData drops non-http(s) slides/recording URLs; rel="noopener noreferrer" |
| R-04 | done | js/repo.js Repo.invite snapshots the state (snapObj(st)) for initial invites; re-checked inviteConfirm/inviteCancel (already snapshot both); sweepPending stays silent-by-design (no undo entry) |
| R-05 | done | js/drawer.js timeline rows now read {ts, kind, actorId, text} — real dates, TL_KIND icons, actor names |
| R-06 | done | index.html — tabbar moved under the banner, inside #app; role=tablist/tab/tabpanel, aria-selected/aria-controls/aria-labelledby, roving tabindex, RTL arrows (ArrowLeft/Right), Home/End, Enter/Space; sticky top env(safe-area-inset-top) + blur; switchTab never touches #nav; css/styles.css updated |
| R-07 | done | js/pages.js download name ftc-graduates-backup-YYYY-MM-DD.json |
| R-08 | done | js/main.js reset removes KEY+VERKEY (legacy key untouched) + flag; js/store.js bootStore honours flag, skips migrateLegacy, seeds the persisted scenario, clears flag |
| R-09 | done | js/pages.js previous-event cards guard `st&&STATUS[st.status]`; prevEventModal same; scheduler paintList/statusCell use `st&&STATUS[st.status]?st.status:'new'`; ui-shell statusCounts already guarded |
| R-10 | done | js/repo.js addSession returns null for DNC + setState refuses non-'new' for DNC; js/scheduler.js shows refusal toast when addSession returns null on submit |
| R-11 | done | js/repo.js reminder rules (status diposed 'wait' only → reason 'state'; limit + cooldown unconditional; global pending guard); js/ui-grads.js inviteCell restructured + rejectToast 'state' message |
| R-12 | done | js/pages.js validateBackup() with Arabic error list; runs before the confirm modal; sanitizeData only after confirm; no TOUCH of data on failure |
| R-13 | done | js/constants.js s5/s6: slidesUrl+recordingUrl+notes all filled (https://example.com/..., Arabic notes), topic reworded |
| R-14 | done | js/store.js D.demo=(scenario!=='empty'); auto-replace on seed bump only when demo flag true AND all non-deleted grads createdFrom==='seed' (isPureDemo) |
| R-16 | done(claim part) | Traced: initial IS guarded by pendingFor; REMINDER was not (limit counting only confirmed) — reviewer claim accurate for reminders. Defense: repo.js global pendingFor guard for BOTH kinds; ui-grads sendInFlight Set cleared in finally/renderAll |
| R-17 | done | js/main.js year=Number(riyadhToday().slice(0,4)); other new Date() uses are real-clock by design (sweep timeout, batchGC, nowISO) and stay |
| P1-T | done | js/main.js runDevTests + the dev-test matrix below; verified in headless Chrome 91/0 |
| R-18..R-25 | done | table below |
| R-26 | done | scheduler s-msgs already escaped (esc() on every name interpolation; validate() messages); toast is now textContent; commitUndo labels rendered via textContent; template editor warnings use textContent; import preview inputs use esc() on values; audit listed below |
| R-27 | done | js/pages.js openTplEditor: live preview + unknown/empty-variable warnings (#tpl-warn) + char counter for ALL templates (linkedin extra note), 20-version history kept |
| R-28 | done | js/importer.js channelHref validates canonical phone/email/linkedin (empty string on bad) + liUrl same; js/scheduler.js + js/ui-grads.js refuse to open with Arabic toast |
| R-29 | done | css/styles.css @media 759px: .icon-btn/.copy 44px |
| R-30 | done | js/drawer.js openDrawer/openModal take opener, Tab-trap over visible focusables, Escape closes invite menu → modal → drawer, focus restored on close; main.js row delegate passes no opener (activeElement fallback) |
| R-31 | done | js/pages.js renderSettingsPage no per-render bindings; one delegated click/change pair on #settings-card bound once at load |
| R-32 | done | waves WAS painted in the original (drawWaves in ftc-graduates-v2.html L1035+) — restored verbatim into js/main.js wavesCanvas (canvas + CSS stay) |
| R-33 | done | DEMO-SCRIPT sample rebuilt (8 lines, 6 columns) + real-importer proof run (classification below); two REAL importer bugs found and fixed: matchSynonym definite-article headers (الدفعة/الجهة), wizard cellToCandidate lost years/company/notes/emails-validity + single-cell free-form rows |
| R-34 | done | js/repo.js batchUndo clears Undo.stack (commented) |
| R-35 | done | js/ui-grads.js mobile select-all is a real <button aria-pressed> |
| R-36 | done | index.html #trash-dot role="status" + js/ui-shell.js aria-label «المهملات: N» |
| R-37 | done | this honest rewrite; all claims below verified by runs listed in "Verification actually run" |

Real-bug bonus found while verifying: sanitizeData could crash (D.events[0] undefined) when a restored blob had sessions but an empty events list — events are now repaired before sessions (js/store.js).

## N-01 wording audit (أكد/تأكيد occurrences)

Changed (participation-vs-contact ambiguity or garbled):
- drawer.js invitation pill «أكد المشاركة» → «تم التواصل» (green→amber).
- drawer.js sub «… · أكد 29 أكتوبر» → «تم التواصل · sender · confirmedAt» / «بدأ الإرسال createdAt».
- pages.js prev-event modal «أكدها: N» → «تم التواصل: N».
- repo.js inviteConfirm timeline «سجّلت إرسال …» (+ «— البقاء بانتظار رده»), toast «سجلنا إرسال الدعوة…», undo label «تسجيل الإرسال».
- repo.js sweep texts «سجّلنا الإرسال خلال ٢٤ ساعة» phrasing.
- constants.js seed/reorder timeline texts «سجّلت إرسال…».
- drawer.js sending-row buttons «سجّل الإرسال»/«إلغاء»; DNC modal «لسه ما سجّلنا الإرسال».
- ui-grads.js sendVia toast «سجلنا الدعوة بوضع «قيد الإرسال» — سجّل الإرسال لما ترجع».

Kept deliberately (different meaning, correct):
- «تأكيد موعد» (booking label + message — the appointment itself, sent to the alumnus) — appointment exists, factually confirmed.
- Template initial «تأكيد رغبتك بالمشاركة» — a request TO the alumnus, not a claim.
- «بانتظار تأكيدك» / «صارت إرسال فعلًا؟» — the MEMBER logging their own send.
- «مهلة تأكيد الإرسال» label, «إلغاء الإرسال تلقائياً» texts, «تأكيد تمت الجلسة» undo label.
- Function names (inviteConfirm) and ids unchanged (internal).

## Changed Arabic strings (old → new)

| File | Old | New |
|---|---|---|
| pages.js | فعليات سابقة | الفعاليات السابقة |
| pages.js | كل حفظ وأشمل نسخة جديدة وعد كيست عشرون نسخة، والإد يجيب التاريخ. | كل حفظ ينشئ نسخة جديدة (حتى عشرين نسخة)، وتقدر ترجع لأي نسخة سابقة. |
| pages.js | تحذير الجمعة / فتح تحذير نهاية الأسبوع | تنبيه يوم الجمعة / نبّهني لو الموعد يوم جمعة |
| pages.js | مواعيد نهارية أصلي (HH:MM) | ساعات الجلسات المقبولة (من – إلى) |
| pages.js | فترة برود التذكير (يوم) | فترة التهدئة للتذكير (يوم) |
| pages.js | النطاق الزمني لازم HH:MM وبداية قبل النهاية | النطاق الزمني لازم صيغة HH:MM وبداية قبل النهاية |
| pages.js | الخريج المحذوف تنشيله سجلاته كامل … قبل البيع | الخريج المحذوف تُخفى سجلاته كاملة … قبل الحذف النهائي |
| pages.js | هذا آخر فرصة ترويها أو تسترجعها | هذه آخر فرصة لمراجعتها أو استرجاعها |
| ui-shell.js | قلنا إنك X — كل إسناد ورسالة بصفتك عليه | صرت تعمل بصفة X. أي إسناد أو رسالة الحين باسمه. |
| ui-shell.js | كل الخريجين رجعوا «لم يُتواصل بعد» لهذه الفعالية | ستبدأ جميع الحالات من «لم يُتواصل بعد» لهذه الفعالية |
| drawer.js | اِسند لي | أسنده لي |
| drawer.js | ما نضيفها, راجع الصيغة | ما نضيفها، راجع الصيغة (Arabic comma) |
| drawer.js | طلب الإد والمشرفين | طلب الإدارة والمشرفين |
| drawer.js | مؤقتاً فيها إشعار لاحق | تواصل لاحقاً — مؤقت |
| drawer.js | … والباقي يوطن كونهم مدموجين (تختفي… بس تنحفظ…) | والباقي يُحفظ كسجلات مدموجة (تختفي من القوائم وتبقى في السجل). اختر أي بيانات ووسائل تبيها في السجل المدموج. |
| ui-grads.js | برود التذكير | فترة التهدئة |
| ui-grads.js | وصلت الحد (…) ما نقدر… | وصلنا الحد + جملة موحدة |
| ui-grads.js | التذكيرات فترتها ٣ أيام — آخر رسالة كانت قريبة… | التذكير متاح بعد فترة التهدئة (N أيام من آخر رسالة). تابع الرد أو سجّل النتيجة. |
| ui-grads.js | سبق إرسال الدعوة الأولية لهذا الخريج | سبق التواصل مع هذا الخريج في هذه الفعالية |
| ui-grads.js | فيه دعوة لهذا الخريج بانتظار التأكيد الحين | فيه رسالة لهذا الخريج بانتظار تسجيلك للإرسال الحين |
| ui-grads.js | اِسناد (option) | إسناد |
| ui-grads.js | إسناد لي (bulk) | أسنده لي |
| main.js | أشركت X مسؤولاً عن N خريج | أسندنا N خريج لـ X (matches bulk-assign wording) |
| main.js | ألغينا إرسالات «قيد الإرسال» مضت عليها المهلة — عدنا للحالة السابقة | ألغينا الإرسالات اللي مضت عليها مهلة التأكيد — رجعنا الحالات كما كانت |
| main.js | بوابة الشريط «تطابق شريط…» | هذا الشريط مطابق شريط بوابة FTC… |
| constants.js | أدوات النهار | أدوات العمل اليومية (s5 topic) |
| constants.js | جاهز في الدورات الجايه إن دعونا مرة ثانية | مستعد للمشاركة في الدفعات القادمة إذا دعوناه مجدداً |
| constants.js | أكدت إرسال الدعوة الأولية على … | سجّلت إرسال الدعوة الأولية على … — الحالة صارت «بانتظار الرد» |
| drawer.js | تأكيد (button in the invite row) | سجّل الإرسال |
| scheduler.js | (DNC refusal now spoken) | هذا الخريج مستثنى من التواصل بناءً على طلبه — ما نقدر نجدول له جلسة. |
| repo.js | تم إلغاء التأكيد تلقائياً (ما وصل تأكيد خلال ٢٤ ساعة) | تم الإلغاء تلقائياً — ما سجّلنا الإرسال خلال ٢٤ ساعة |
| repo.js | تم إرسال الدعوة لـ X عبر Y | سجلنا إرسال الدعوة لـ X عبر Y |

Also non-string: dev-test labels cleaned («الطابق التشكيلي», «أحلى من نفس الادحاء» → normal names).

## R-26 audit result (innerHTML / user data)

Audited every template-literal interpolation of user-controlled data:
- table/cards cells, names, companies, roles, majors: esc() ✓
- subject/topic of sessions (scheduler rows, drawer sessions): esc() ✓
- notes (drawer sessions, archive): esc() ✓
- template bodies: rendered only inside textContent (#tpl-preview) or esc() (modal preview) ✓
- import preview inputs: esc() in value attributes ✓; wizCellInput canonicalizes phone/email/linkedin ±
- DNC reasons (fixed list + free text): esc() on button labels + setFlag stores plain string; timeline text rendered esc() ✓
- toast(): now textContent — raw names safe even un-escaped ✓
- commitUndo labels ('حالة '+name): rendered via toast textContent ✓
- s-msgs (scheduler validate): every name interpolation is esc()'d ✓; gNameSafe fallback 'خريج محذوف' plain
- stored URLs now href'd only via safeUrl ✓

## Importer fixes from the R-33 proof (real bugs)

- importer.js matchSynonym: definite-article headers now match («الدفعة»→year, «الجهة»→company).
- wizard.js cellToCandidate: keeps notes/dnc suggestions, accepts only valid emails (cleanContact), and handles single-cell free-form rows via extractFields.
- importer.js diffCandidates surfaces domain suggestion as preview note («هل تقصد gmail.com؟»).
- wizard.js wizCellInput: email cell editing now validates via cleanContact (was accepting `undefined.ok` — never accepted edits).

## Import-sample classification (proof run, real importer via Node vm)

| Line | Result | Notes |
|---|---|---|
| مريم الدوسري ٠٥٥… clean | add (ok) | year 2023, company علم mapped from headers |
| عبدالله الشهري 0509876612 | unchanged → matched سارة القحطاني (duplicate-by-contact, no new record) | |
| سلطان بن خذير 0551234 | add (warn) | note «رقم غير معروف الصيغة» + «اسم بدون وسيلة تواصل» |
| ماجد الفيفي maaged@gmail.con | add (ok) | preview note «هل تقصد gmail.com؟» |
| هند العسيري +966551239998 | add (ok) | → 0551239998 |
| ريّان الدوسري ٠٥٥٤٤٤٥٥٦٦ | add (ok) | → 0554445566 (Arabic-Indic) |
| وليد الصاعدي linkedin walid-alsaadi | blocked | «محجوب (خريج طلب عدم التواصل)» |
| نوّاف الأحمدي 0557766554 (free-form) | add (ok) | name + phone extracted from the free line |

# Previous pass (T1–T11) — updated claims only

## T1 — Demo seed fix & repair of saved data
- `DEMO_MODE = true` flag; envelope `{v:2, savedAt, seedVersion, data}` with `SEED_VERSION=3`.
- One-shot `sessionStorage['ftc-force-seed']`; scenario persisted in UIKEY; `?seed=empty|perf` (test mode).
- Broken blobs quarantined to `ftc-grads-v2-backup-<ts>`; legacy migration runs only when no force flag.

## T2 — Demo dataset
- seedData() built from readable rows g1–g32 incl. duplicate-names, duplicate-by-contact (g30↔g7),
  reminder cap (g9)/cooldown (g14), real-clock sending (g21), DNC+suppression (g27), incomplete/invalid (g28/g29),
  previous-event hint (g31), soft-deleted (g32+s7); e0 closed + e1 open; done sessions with slides/recording/notes
  (all three filled after the fix pass); suppression hash via seedComplete() awaited by bootStore.
- perfSeed(): 1,000 deterministic rows (400/220/140/90/100/45/5).
- NOTE (was wrong earlier): g32 is soft-deleted, so the OPEN set is 31 live; the 'new' live count is 12.

## T3 — Test panel
- Scenario select (كاملة/فارغة/1000) persisted in UIKEY; reset text «بنمسح البيانات الحالية ونرجّع بيانات العرض التجريبي حسب السيناريو المختار (…). هل أنت متأكد؟»;
  reset clears KEY+VERKEY, NOT the legacy key; bootStore seeds the chosen scenario and skips migration (R-08).

## T4 — Navigation (honest status after fix pass)
- Original portal bottom nav RESTORED CONTENT-WISE (same 6 labels/icons incl. flask/tasks/trophy and الن new-dot) — NOT byte-identical markup (indentation/attribute order differ; it is content-identical).
- Functional top tab bar #tabbar now sits between the banner and <main> with the full tablist
  contract (roving tabindex, RTL arrows, aria-controls/labelledby), sticky+blur, mobile scrollable.
- No location.hash/History API. Content not hidden behind the bottom nav (toasts float above it).

## T5 — Settings
- No duplicate import, no red reset (R-01), JSON backup downloads as file (backup name fixed R-07),
  restore validates first (R-12), CSV with BOM+CRLF+formula escaping and الحالة/المسؤول columns.

## T6 — Arabic copy
- Five default templates use the approved wording; garbled phrases grep-clean (see verification).

## T7 — Template variables
- templateVarsFor(grad, session, tplKey?) with fallbacks: الجهة→«عملك الحالي», موضوع الجلسة→«سنتفق عليه معك»
  (thanks→«الجلسة»), مكان/رابط→«نرسل لك الرابط أو المكان قبل الموعد», plus 'المدة'. Editor gained
  live preview + variable warnings + universal counter (R-27).

## T8 — prevEventHint
- Only confirmed initial invites OUTSIDE the active event; lastInitialAnyEvent removed.

## T9 — Undo
- Key-based snapArr; purgeGrad snapshots grads/timeline/states/sessions/invitations/suppressions;
  invite now also snapshots the state (R-04); syncFromStorage + batchUndo clear the stack.

## T10 — Dev tests (honest)
- The harness grew across passes and now contains 91 checks (58 from the previous pass + 33 fix-pass tests),
  including: seed integrity, prevEventHint, template fallbacks, sanitizeData repairs, key-snapshot undo,
  csvSafe, retention, repo invite flow, reminder rules, DNC addSession, purge-then-undo,
  validateBackup accept/reject, force-seed flag (skips legacy), toast XSS, safeUrl, timeline fields,
  owner-assignment rules and N-01 labels.
- Claim «58 ناجح، 0 فاشل» from the earlier pass was superseded: today's run is 91 ناجح/0 فاشل.

## T11 — Docs
- CHANGES.md (this file) + DEMO-SCRIPT.md (Arabic demo walkthrough + corrected import sample with the real classification).

# Verification actually run

1. `node --check js/*.js` — all pass.
2. Node vm harness (/tmp/ftc-harness.js, throwaway, outside the project): 35/35 — seed integrity
   (32 rows, all seven statuses, no undefined/NaN), statusCounts finite, N-01 labels (drawer pill +
   modal), safeUrl, sanitizeData URL drop, validateBackup accept/reject incl {v:2,data:{}},
   invite→undo→re-invite, auto-owner never overrides, reminder rules (state/limit/cooldown/allowed),
   addSession DNC refusal, purge-then-undo, bootStore force-flag skipping legacy migration with a
   legacy key present (legacy key byte-equal after).
3. Headless Chrome (--headless=new, fresh profile, virtual-time-budget 9000):
   - `?dev=1&test=1&autorun=1` → «فحوص آلية: 91 ناجح، 0 فاشل», zero console errors.
   - Plain load: no console errors; 13 demo rows (+1 deleted) render, demo-note tags and «بيانات تجريبية» chip present.
   - Mobile 390×844 screenshot: tab bar renders as the sticky track between banner and content,
     badge «٢» on المهملات, bottom nav intact; screenshot at /tmp/opencode/mobile-390.png.
4. Importer proof harness (/tmp/ftc-import-proof.js): the 8-line sample classified exactly as the
   table above (header map incl. year+company after the matchSynonym fix).

## NOT verified
- No real browser interaction (clicks, focus ring order, drag on scroll) beyond dump/screenshot — Playwright is NOT installed locally (an `npx playwright --version` check downloaded a package into the npx cache only; nothing was installed into the project).
- Undo of a REAL five-step UI interaction chain, and two-tab focus sync, are design-verified only.

# Fix pass round 2 (Q-01..Q-04 + re-applied drift) — 2026-10-30 17:00

QA harness round (qa/, Playwright-core qa-local) proved four product defects — one of them
revealed that a previous-pass fix had been reverted in the meantime. All four fixed; two
drifted strings re-applied.

| Item | Status | Fix |
|---|---|---|
| Q-01 Blocker | done — **fresh bug** (no click listener ever existed on #tabbar; my earlier keydown-only pass could not switch by mouse) | main.js: delegated `#tabbar click → switchTab(data-tab)` (keydown/arrows already worked) |
| Q-02 High | done | importer.js diffCandidates: contactless candidates now match an existing CONTACTLESS grad by normalized name → update, never re-add (proof below) |
| Q-03 Medium | re-applied | pages.js `ftc-graduates-backup-YYYY-MM-DD.json` (the previous fix had been reverted in the file) |
| Q-04 Low | done | main.js: delegated `data-drw` clicks on #pend-host and #reminders |
| drift R-21 | re-applied | pages.js trash copy: «تُخفى سجلاته كاملة … قبل الحذف النهائي» + «هذه آخر فرصة لمراجعتها أو استرجاعها» |

All other reviewer items (R-01..R-08, R-09..R-17, R-18..R-28, R-29..R-37) were verified
PRESENT in the shipped code with greps before edits; no changes needed (evidence in this
file's fix-pass section above and the verification greps below).

## Q-02 proof (vm, real importer pipeline)

- apply #1: counts {added:6, unchanged:1, blocked:1}, grads 31→38, سلطان copies=1
- apply #2: counts {added:0, unchanged:7, blocked:1}, total 38, سلطان copies=1
- apply #3: identical to #2 (stable)
- apply #1 line labels: مريم add · عبدالله unchanged («سارة القحطاني») · سلطان add ·
  ماجد add · هند add · ريّان add · وليد blocked («وليد الصاعدي») · نوّاف add
- apply #2 labels: every non-blocked line → unchanged, matched to its own record.

Name-matching applies ONLY to contactless candidates against contactless alumni, so
same-name-contacted pairs (محمد العتيبي pair) are never auto-merged.

## S22 harness race note

qa/tests/priority-trash.mjs S22 originally raced `Promise.race([download, click])` — the
click promise settles instantly, so it always reported 'clicked-no-dl'. Product side was
proven working first (one-off script with correct event ordering: filename
`ftc-graduates-backup-2026-10-30.json`, env v:2/32 grads, 0 console errors),
then the harness race was fixed mechanically (wait started before click; no check weakened).
S22 now passes: dl=ftc-graduates-backup-2026-10-30.json, csv formula neutralized,
restore valid=true, invalid=all-rejected.

## Re-run outputs (after fixes)

- `node qa/tests/priority.mjs` → S04 PASS (clicks now switch; inert=true; focus roving;
  trashBadge; 0 console/page errors) · S05 PASS · S24 PASS (no suspicious text) ·
  S06/S07/S08/S09 PASS · EXTRA (drawer pill تم التواصل) PASS
- `node qa/tests/priority-import.mjs` → S12 PASS (8 rows, 56 editable cells, counts
  additive once, batch undo present) · S13 PASS
- `node qa/tests/priority-trash.mjs` → S21 PASS · S22 PASS
- `node --check` all 14 js files — pass
