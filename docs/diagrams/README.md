# Per-test sequence diagrams

One function-level sequence diagram per test, drawn with [Archify](https://github.com/tt-a1i/archify): which spec calls which function, in what order, and what reaches the OrangeHRM demo. They are built into **one HTML page** with a list of tests to switch between.

- **Source of truth:** the small JSON files in [`sequence/`](sequence/) (about 8 KB each). These are committed.
- **The page:** `all-tests.html` (about 6 MB). **Generated and git-ignored** - rebuild it whenever you want to look.
- **Build cache:** `html/` holds the per-diagram HTML Archify writes (about 740 KB each). Also generated and git-ignored; you never need to open these.

## View them

```bash
pnpm diagrams
```

Then open **`docs/diagrams/all-tests.html`** in a browser. The left-hand list is grouped by module and shows each test's QA type; the filter box matches id, name or module. Click a test to show its diagram. `TC_UCF_001` has three parts, shown as tabs above the diagram. Up/Down arrow keys move through the list, and the address records the selection, so `all-tests.html#TC_CEF_003` (or `#TC_UCF_001/2`) opens that diagram directly.

To rebuild only one diagram (the page is then re-bundled from the cache):

```bash
pnpm diagrams TC_CEF_003
```

`pnpm diagrams` first runs `pnpm docs:sync` (see below), then runs Archify's own `finalize` on every source: schema validation, delivery, a strict check and a real-browser check, and every source reference (the SRC badges) is verified against the committed code at the revision pinned in the JSON. A full build takes about a minute and a half. It needs the Archify skill in `.claude/skills/archify` (git-ignored, so not part of a fresh clone); the script prints the install command if it is missing.

Archify itself makes one HTML per diagram and cannot combine several, so the page is a thin container (`scripts/lib/diagram-viewer.mjs`) that embeds Archify's output unchanged and shows the selected one in a frame. Everything below about reading a diagram applies inside that frame.

## When you add a test

Run `pnpm docs:sync`. For every automated test it finds in `tests/` that has no diagram source yet, it writes a **draft** into [`sequence/`](sequence/), and it also adds the test to the Excel test-case list. The draft is drawn from the code alone: the spec's direct calls to page objects and `testData`, in order, with each `test.step` name as a note; no returns, nothing below the page-object layer, no SRC badges. It passes all of Archify's checks and appears in the page tagged `draft`. Ask Claude to redraw it with Archify from the committed code to complete it (or edit the JSON by hand), then rebuild. `pnpm docs:check` reports what is missing without changing anything.

## Reading and using a diagram

**Anatomy.** Boxes across the top are the participants (the spec, the page objects, `TestData`, `OrangeHrmApi`, the demo...). Each arrow is one call, in time order from top to bottom, labelled with the function name. Dashed grey arrows pointing back are results. Thick green arrows are the steps that matter most in that test, and purple dashed arrows are conditional or failing paths - that colouring is chosen per diagram, not a fixed code. The shaded bands group the phases (for example `Test` and `Teardown`).

**Click a box (or its `SRC` badge)** to open a **Semantic Passport** panel: the verified source references for that participant (file and line range, for example `tests/AddEmployeeTest.spec.ts L71-106`), how many calls go out and come in, and the list of each call with its target. The rest of the diagram dims, and the small notes attached to arrows (such as "runs after the test, pass or fail") appear on the arrows that touch the focused box. **Copy link** gives a deep link to that view. Close it with the **x** or **Esc**. Hovering did nothing in my test; clicking is what opens it.

**Toolbar.**
- Top right: a light/dark toggle, a visual-style menu, a presentation-stage button, and **Export** (copy a PNG to the clipboard, download PNG, JPEG, WebP, or an SVG in auto, light or dark colours).
- Bottom right: **PATH** (trace a route between two points), **LENS** (compare system roles, up to two kinds at a time), a search icon (find a participant by name), and zoom.
- Below the picture: the cards that explain the diagram, and a **Node index** listing every participant.

**Keyboard.** Every arrow is a focusable button ("Inspect relationship 3 of 14 ... Press Enter for details"), so you can Tab through the calls in order.

**Good uses.**
- *Reviewing a failure:* open the diagram for the failing test, find the step named in the report, then click the participant to jump to the exact lines.
- *Learning the framework:* read the three `TC_UCF_001` diagrams first; they show login, data creation and cleanup in full.
- *Reviewing a new test:* draw or update its diagram and compare it with the code. A mismatch is either a bug or a stale diagram.
- *Sharing:* Export a PNG or SVG for a pull request or slide, or send `all-tests.html` (one self-contained file).

## What each diagram shows

| Test | Title | Source |
|---|---|---|
| `TC_LOGIN_001` | successful login | [`TC_LOGIN_001.json`](sequence/TC_LOGIN_001.json) |
| `TC_NAV_001` | navigate to the Admin page | [`TC_NAV_001.json`](sequence/TC_NAV_001.json) |
| `TC_CEF_001` | add an employee, no middle name | [`TC_CEF_001.json`](sequence/TC_CEF_001.json) |
| `TC_CEF_002` | add an employee with a middle name | [`TC_CEF_002.json`](sequence/TC_CEF_002.json) |
| `TC_CEF_003` | employee with an enabled login | [`TC_CEF_003.json`](sequence/TC_CEF_003.json) |
| `TC_CEF_004` | employee with a disabled login | [`TC_CEF_004.json`](sequence/TC_CEF_004.json) |
| `TC_CEF_005` | blank name shows required errors | [`TC_CEF_005.json`](sequence/TC_CEF_005.json) |
| `TC_CEF_006` | cancel returns to the list | [`TC_CEF_006.json`](sequence/TC_CEF_006.json) |
| `TC_EEF_001` | edit an employee's name | [`TC_EEF_001.json`](sequence/TC_EEF_001.json) |
| `TC_SEF_001` | search an employee by name | [`TC_SEF_001.json`](sequence/TC_SEF_001.json) |
| `TC_DEF_001` | delete an employee | [`TC_DEF_001.json`](sequence/TC_DEF_001.json) |
| `TC_UCF_001` | sign in and create the employee | [`TC_UCF_001-1-arrange.json`](sequence/TC_UCF_001-1-arrange.json) |
| `TC_UCF_001` | add the user and check it | [`TC_UCF_001-2-act-assert.json`](sequence/TC_UCF_001-2-act-assert.json) |
| `TC_UCF_001` | purge and teardown | [`TC_UCF_001-3-cleanup.json`](sequence/TC_UCF_001-3-cleanup.json) |
| `TC_UCF_002` | Admin user with Disabled status | [`TC_UCF_002.json`](sequence/TC_UCF_002.json) |
| `TC_TDS_001` | a generated id is valid and fresh | [`TC_TDS_001.json`](sequence/TC_TDS_001.json) |
| `TC_TDS_002` | stale exactly at the age threshold | [`TC_TDS_002.json`](sequence/TC_TDS_002.json) |
| `TC_TDS_003` | ids that are not ours are ignored | [`TC_TDS_003.json`](sequence/TC_TDS_003.json) |
| `TC_TDS_004` | generated ids are unique | [`TC_TDS_004.json`](sequence/TC_TDS_004.json) |
| `TC_TDS_005` | a future stamp is never stale | [`TC_TDS_005.json`](sequence/TC_TDS_005.json) |
| `TC_TDS_006` | purge deletes only stale test employees | [`TC_TDS_006.json`](sequence/TC_TDS_006.json) |
| `TC_TDS_007` | purge refuses over the safety cap | [`TC_TDS_007.json`](sequence/TC_TDS_007.json) |
| `TC_TDS_008` | cleanup deletes only its own employees | [`TC_TDS_008.json`](sequence/TC_TDS_008.json) |
| `TC_TDS_009` | cleanup is safe to run twice | [`TC_TDS_009.json`](sequence/TC_TDS_009.json) |
| `TC_TDS_010` | a failing cleanup never throws | [`TC_TDS_010.json`](sequence/TC_TDS_010.json) |

`TC_UCF_001` has three diagrams (arrange, act and assert, cleanup) because it is the one shown in full. A sequence canvas holds roughly 14 messages before it stops being readable on a desktop, so the other tests are **abridged**: they show the calls that carry the test's meaning, and most browser echoes and assertion-only helpers are left out. The three `TC_UCF_001` diagrams show login, data creation and cleanup in full.

## Keeping them current

A diagram is a snapshot of the code at the commit pinned in its JSON (`meta.repository.revision`), so it goes stale when a test or the code it calls changes. `pnpm docs:check` catches a missing diagram, not a stale one. To refresh one: update its JSON (describe the change to Claude with Archify, or edit the messages by hand), set the revision to the new commit, and run `pnpm diagrams <name>`. Archify will refuse to build a source whose cited lines no longer exist at the pinned revision, which is the signal that a diagram needs attention.
