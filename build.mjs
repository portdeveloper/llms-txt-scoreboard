import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const { scannedAt, results } = JSON.parse(readFileSync("data/results.json", "utf-8"));

const slug = (host) => host.replace(/[^a-z0-9.-]+/gi, "-").toLowerCase();

const STATUS = {
  pass: { icon: "✓", label: "passing", color: "var(--good)", badge: ["brightgreen", "passing"] },
  broken: { icon: "✗", label: "broken", color: "var(--critical)", badge: ["red", "broken"] },
  error: { icon: "!", label: "scan error", color: "var(--warning)", badge: ["yellow", "scan error"] },
  missing: { icon: "–", label: "no llms.txt", color: "var(--muted)", badge: ["lightgrey", "missing"] },
};

mkdirSync("docs/badges", { recursive: true });
for (const r of results) {
  const [color] = [STATUS[r.status].badge[0]];
  const message =
    r.status === "broken" && r.deadCount > 0
      ? `${r.deadCount} dead link${r.deadCount === 1 ? "" : "s"}`
      : STATUS[r.status].badge[1];
  writeFileSync(
    `docs/badges/${slug(r.host)}.json`,
    JSON.stringify({ schemaVersion: 1, label: "llms.txt", message, color })
  );
}

const counts = {
  total: results.length,
  pass: results.filter((r) => r.status === "pass").length,
  broken: results.filter((r) => r.status === "broken").length,
  missing: results.filter((r) => r.status === "missing").length,
  dead: results.reduce((n, r) => n + r.deadCount, 0),
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const row = (r) => {
  const s = STATUS[r.status];
  let note =
    r.status === "broken"
      ? r.deadCount > 0
        ? esc(r.failureSamples[0] || "")
        : esc(r.sourceProblems.join("; "))
      : r.status === "missing"
        ? "llms.txt returns 404"
        : r.status === "error"
          ? esc(r.sourceProblems.join("; "))
          : "";
  if (r.note) note = note ? `${note} · ${esc(r.note)}` : esc(r.note);
  const links = r.status === "missing" || r.status === "error" ? "–" : `${r.checked} of ${r.totalLinks}`;
  const dead = r.status === "broken" ? String(r.deadCount) : r.status === "pass" ? "0" : "–";
  return `<tr>
    <td><a href="${esc(r.site)}">${esc(r.host)}</a></td>
    <td><span class="status" style="color:${s.color}">${s.icon}&nbsp;${s.label}</span></td>
    <td class="num">${links}</td>
    <td class="num">${dead}</td>
    <td class="note">${note}</td>
  </tr>`;
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>llms.txt scoreboard</title>
<meta name="description" content="Weekly health scan of major docs sites' llms.txt files: dead links, HTML shells, and missing files, checked against what each site actually serves.">
<style>
:root {
  color-scheme: light;
  --surface: #fcfcfb; --text: #0b0b0b; --secondary: #52514e; --muted: #8a897f;
  --good: #0ca30c; --critical: #d03b3b; --warning: #b07700; --line: #e5e4df;
}
@media (prefers-color-scheme: dark) {
  :root { color-scheme: dark;
    --surface: #1a1a19; --text: #ffffff; --secondary: #c3c2b7; --muted: #8a897f;
    --good: #0ca30c; --critical: #d03b3b; --warning: #fab219; --line: #33322f;
  }
}
* { box-sizing: border-box; }
body { margin: 0 auto; max-width: 72rem; padding: 2rem 1rem 4rem; background: var(--surface);
  color: var(--text); font: 16px/1.55 system-ui, sans-serif; }
h1 { font-size: 1.6rem; margin: 0 0 .3rem; }
.sub { color: var(--secondary); margin: 0 0 1.6rem; }
.tiles { display: flex; flex-wrap: wrap; gap: 1rem; margin: 0 0 1.8rem; }
.tile { border: 1px solid var(--line); border-radius: 8px; padding: .7rem 1.1rem; min-width: 8.5rem; }
.tile b { display: block; font-size: 1.5rem; }
.tile span { color: var(--secondary); font-size: .85rem; }
.tablewrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: .95rem; }
th, td { text-align: left; padding: .5rem .7rem; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--secondary); font-weight: 600; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
.status { font-weight: 600; white-space: nowrap; }
.note { color: var(--secondary); font-size: .85rem; word-break: break-all; max-width: 28rem; }
a { color: inherit; }
footer { margin-top: 2rem; color: var(--secondary); font-size: .9rem; }
footer code { font-size: .85em; }
</style>
</head>
<body>
<h1>llms.txt scoreboard</h1>
<p class="sub">Weekly scan of major docs sites: does the deployed site actually serve what its llms.txt promises?
Checked with <a href="https://github.com/portdeveloper/llms-txt-check">llms-txt-check</a> on ${esc(scannedAt.slice(0, 10))} (checking every listed link).</p>

<div class="tiles">
  <div class="tile"><b>${counts.total}</b><span>sites scanned</span></div>
  <div class="tile"><b style="color:var(--good)">${counts.pass}</b><span>✓ passing</span></div>
  <div class="tile"><b style="color:var(--critical)">${counts.broken}</b><span>✗ broken</span></div>
  <div class="tile"><b>${counts.missing}</b><span>– no llms.txt</span></div>
  <div class="tile"><b>${counts.dead}</b><span>dead links found</span></div>
</div>

<div class="tablewrap">
<table>
  <thead><tr><th>site</th><th>status</th><th class="num">links checked</th><th class="num">dead</th><th>first failure</th></tr></thead>
  <tbody>
${results.map(row).join("\n")}
  </tbody>
</table>
</div>

<footer>
<p>Check your own site: <code>npx llms-txt-check https://your-docs-site.com</code>, or add
<a href="https://github.com/portdeveloper/llms-txt-check-action">the GitHub Action</a> to CI.
Broken and want the details, or missing from the list? <a href="https://github.com/portdeveloper/llms-txt-scoreboard/issues">Open an issue</a>.</p>
<p>Status badges per site are served from <code>badges/&lt;host&gt;.json</code> for use with shields.io endpoints.</p>
</footer>
</body>
</html>`;

writeFileSync("docs/index.html", html);
console.log(`wrote docs/index.html + ${results.length} badges`);
