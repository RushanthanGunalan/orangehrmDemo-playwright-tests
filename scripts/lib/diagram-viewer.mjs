/**
 * Bundles the finished per-test Archify diagrams into ONE html file with a
 * test list on the left and the selected diagram on the right.
 *
 * Archify itself produces one self-contained HTML per diagram and has no
 * multi-diagram or tab feature (its `guidedViews` only highlight nodes inside
 * a single diagram). So this file is a thin container: every diagram is
 * embedded byte-for-byte as Archify wrote it (gzip + base64, about a quarter
 * of its size), then shown unchanged in an iframe when its test is selected.
 * Nothing here draws or edits a diagram.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const idOf = (name) => name.match(/^(TC_[A-Z]+_\d+)/)?.[1] ?? name;

/** "TC_UCF_001-2-act-assert" -> "Act assert" (the part label shown on its sub-tab). */
function partLabel(name, id) {
  const rest = name.slice(id.length).replace(/^-/, "").replace(/^\d+-/, "");
  return rest ? rest.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()) : "";
}

const escapeJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

export function bundleDiagrams({ sequenceDir, htmlDir, casesFile, out, files }) {
  const cases = existsSync(casesFile) ? JSON.parse(readFileSync(casesFile, "utf8")) : [];
  const caseById = new Map(cases.map((c) => [c.id, c]));

  const names = files.map((f) => f.replace(/\.json$/, "")).sort();
  const tests = new Map();
  const missing = [];
  const blobs = [];

  for (const name of names) {
    const htmlPath = path.join(htmlDir, `${name}.html`);
    if (!existsSync(htmlPath)) {
      missing.push(name);
      continue;
    }
    const meta = JSON.parse(readFileSync(path.join(sequenceDir, `${name}.json`), "utf8")).meta;
    const id = idOf(name);
    const row = caseById.get(id);
    if (!tests.has(id)) {
      tests.set(id, {
        id,
        scenario: row?.scenario ?? meta.title.replace(/^TC_[A-Z]+_\d+:\s*/, ""),
        module: row?.module ?? "Other",
        type: row?.type ?? "",
        draft: false,
        parts: [],
      });
    }
    const entry = tests.get(id);
    if (!meta.repository) entry.draft = true;
    entry.parts.push({ label: partLabel(name, id) || "Diagram", title: meta.title, blob: blobs.length });
    blobs.push(gzipSync(readFileSync(htmlPath), { level: 9 }).toString("base64"));
  }

  // Same order as the test-case sheet, so a module's tests sit together; unknown ids go last.
  const order = (id) => (caseById.has(id) ? cases.findIndex((c) => c.id === id) : Number.MAX_SAFE_INTEGER);
  const sorted = [...tests.values()].sort((a, b) => order(a.id) - order(b.id) || a.id.localeCompare(b.id));
  // Keep each module together, in the order its first test appears.
  const modules = [...new Set(sorted.map((t) => t.module))];
  const data = { tests: modules.flatMap((m) => sorted.filter((t) => t.module === m)) };
  const html = TEMPLATE.replace("/*DATA*/", () => escapeJson(data)).replace(
    "<!--BLOBS-->",
    () => blobs.map((b, i) => `<script type="application/octet-stream" id="d${i}">${b}</script>`).join("\n"),
  );
  writeFileSync(out, html);
  return { tests: tests.size, diagrams: blobs.length, missing, bytes: Buffer.byteLength(html) };
}

const TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OrangeHRM Test Diagrams</title>
<style>
  :root { --bg:#f6f7f9; --panel:#fff; --ink:#1b1f24; --muted:#5b6570; --line:#d8dde3; --accent:#1f6feb; --sel:#e8f0fe;
          --draft:#9a6700; --draftbg:#fff4d6; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0e1116; --panel:#161b22; --ink:#e6edf3; --muted:#8b949e; --line:#30363d; --accent:#58a6ff; --sel:#1c2a40;
            --draft:#e3b341; --draftbg:#3a2f12; }
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { background: var(--bg); color: var(--ink); font: 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
         display: grid; grid-template-columns: 320px 1fr; grid-template-rows: 100%; }
  aside { background: var(--panel); border-right: 1px solid var(--line); display: flex; flex-direction: column; min-height: 0; }
  header { padding: 14px 14px 10px; border-bottom: 1px solid var(--line); }
  h1 { font-size: 15px; margin: 0 0 2px; }
  .sub { color: var(--muted); font-size: 12px; margin: 0 0 10px; }
  input[type=search] { width: 100%; padding: 7px 9px; border: 1px solid var(--line); border-radius: 6px;
                       background: var(--bg); color: var(--ink); font: inherit; }
  nav { overflow: auto; padding: 6px 0 16px; flex: 1; }
  .group { padding: 12px 14px 4px; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
  nav button { display: block; width: 100%; text-align: left; border: 0; background: none; color: inherit; font: inherit;
               padding: 7px 14px; cursor: pointer; border-left: 3px solid transparent; }
  nav button:hover { background: var(--bg); }
  nav button[aria-selected=true] { background: var(--sel); border-left-color: var(--accent); }
  nav .id { font-weight: 600; font-size: 12px; font-family: ui-monospace, Consolas, monospace; }
  nav .what { display: block; color: var(--muted); font-size: 12.5px; }
  .tag { display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 9px; font-size: 10.5px; font-weight: 600;
         background: var(--bg); color: var(--muted); border: 1px solid var(--line); vertical-align: 1px; }
  .tag.draft { background: var(--draftbg); color: var(--draft); border-color: transparent; }
  main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .bar { background: var(--panel); border-bottom: 1px solid var(--line); padding: 8px 14px; display: flex; gap: 10px;
         align-items: center; min-height: 46px; flex-wrap: wrap; }
  .bar .title { font-weight: 600; margin-right: auto; }
  .parts { display: flex; gap: 4px; }
  .parts button { border: 1px solid var(--line); background: var(--bg); color: inherit; border-radius: 6px; padding: 4px 10px;
                  font: inherit; cursor: pointer; }
  .parts button[aria-selected=true] { background: var(--accent); border-color: var(--accent); color: #fff; }
  iframe { flex: 1; width: 100%; border: 0; background: var(--panel); }
  .empty { margin: auto; color: var(--muted); }
  @media (max-width: 760px) { body { grid-template-columns: 1fr; grid-template-rows: 40% 60%; } aside { border-right: 0; border-bottom: 1px solid var(--line); } }
</style>
</head>
<body>
<aside>
  <header>
    <h1>OrangeHRM test diagrams</h1>
    <p class="sub" id="count"></p>
    <input type="search" id="q" placeholder="Filter by id, name or module" aria-label="Filter tests">
  </header>
  <nav id="list" role="tablist" aria-label="Tests"></nav>
</aside>
<main>
  <div class="bar"><span class="title" id="title"></span><span class="parts" id="parts" role="tablist"></span></div>
  <iframe id="frame" title="Test sequence diagram" allow="clipboard-write; fullscreen"></iframe>
</main>
<script type="application/json" id="data">/*DATA*/</script>
<!--BLOBS-->
<script>
(function () {
  var data = JSON.parse(document.getElementById("data").textContent);
  var tests = data.tests;
  var list = document.getElementById("list"), frame = document.getElementById("frame");
  var titleEl = document.getElementById("title"), partsEl = document.getElementById("parts");
  var urls = {}, current = { id: null, part: 0 };

  document.getElementById("count").textContent =
    tests.length + " tests, " + tests.reduce(function (n, t) { return n + t.parts.length; }, 0) + " diagrams";

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function render(filter) {
    list.textContent = "";
    var f = (filter || "").toLowerCase(), lastModule = null, shown = 0;
    tests.forEach(function (t) {
      var hay = (t.id + " " + t.scenario + " " + t.module + " " + t.type).toLowerCase();
      if (f && hay.indexOf(f) < 0) return;
      if (t.module !== lastModule) { list.appendChild(el("div", "group", t.module)); lastModule = t.module; }
      var b = el("button");
      b.setAttribute("role", "tab");
      b.dataset.id = t.id;
      b.setAttribute("aria-selected", String(t.id === current.id));
      var top = el("span", "id", t.id);
      if (t.type) top.appendChild(el("span", "tag", t.type));
      if (t.draft) top.appendChild(el("span", "tag draft", "draft"));
      b.appendChild(top);
      b.appendChild(el("span", "what", t.scenario));
      b.onclick = function () { select(t.id, 0); };
      list.appendChild(b);
      shown++;
    });
    if (!shown) list.appendChild(el("div", "group", "No test matches"));
  }

  function decode(i) {
    if (urls[i]) return Promise.resolve(urls[i]);
    var b64 = document.getElementById("d" + i).textContent.trim();
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).blob().then(function (blob) {
      urls[i] = URL.createObjectURL(new Blob([blob], { type: "text/html" }));
      return urls[i];
    });
  }

  function select(id, part, fromHash) {
    var t = tests.find(function (x) { return x.id === id; });
    if (!t) return;
    part = Math.min(part || 0, t.parts.length - 1);
    current = { id: id, part: part };
    var p = t.parts[part];
    titleEl.textContent = p.title;
    partsEl.textContent = "";
    if (t.parts.length > 1) {
      t.parts.forEach(function (x, i) {
        var b = el("button", "", (i + 1) + ". " + x.label);
        b.setAttribute("role", "tab");
        b.setAttribute("aria-selected", String(i === part));
        b.onclick = function () { select(id, i); };
        partsEl.appendChild(b);
      });
    }
    Array.prototype.forEach.call(list.querySelectorAll("button"), function (b) {
      b.setAttribute("aria-selected", String(b.dataset.id === id));
    });
    var hash = "#" + id + (t.parts.length > 1 ? "/" + (part + 1) : "");
    if (!fromHash && location.hash !== hash) history.replaceState(null, "", hash);
    decode(p.blob).then(function (url) {
      if (current.id === id && current.part === part) frame.src = url;
    });
  }

  function fromHash() {
    var m = location.hash.slice(1).split("/");
    var t = tests.find(function (x) { return x.id === m[0]; }) || tests[0];
    if (t) select(t.id, (parseInt(m[1], 10) || 1) - 1, true);
  }

  document.getElementById("q").addEventListener("input", function (e) { render(e.target.value); });
  window.addEventListener("hashchange", fromHash);
  document.addEventListener("keydown", function (e) {
    if (e.target.tagName === "INPUT" || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    var visible = Array.prototype.map.call(list.querySelectorAll("button"), function (b) { return b.dataset.id; });
    var i = visible.indexOf(current.id) + (e.key === "ArrowDown" ? 1 : -1);
    if (i >= 0 && i < visible.length) { e.preventDefault(); select(visible[i], 0); }
  });

  render("");
  if (tests.length) fromHash();
  else frame.replaceWith(el("div", "empty", "No diagrams were built."));
})();
</script>
</body>
</html>
`;
