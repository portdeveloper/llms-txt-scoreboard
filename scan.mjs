import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { checkSite } from "llms-txt-check";

const SITE_CONCURRENCY = 4;

const sites = JSON.parse(readFileSync("sites.json", "utf-8")).map((entry) =>
  typeof entry === "string" ? { url: entry, ignore: [], note: "" } : { ignore: [], note: "", ...entry }
);

const hostOf = (url) => {
  const u = new URL(url);
  return u.host + (u.pathname !== "/" ? u.pathname.replace(/\/$/, "") : "");
};

async function scanOne({ url: site, ignore, note }) {
  const started = Date.now();
  try {
    const r = await checkSite(site, { concurrency: 6 });
    // Per-site ignores: URL prefixes verified as working-as-designed
    // (e.g. parameterized API endpoints), documented in the row note.
    const failures = r.failures.filter((f) => !ignore.some((p) => f.url.startsWith(p)));
    const ignoredCount = r.failures.length - failures.length;
    const missing = r.sourceProblems.some((p) => p.startsWith("http-404"));
    const sourceBroken = r.sourceProblems.length > 0 && !missing;
    const status = missing
      ? "missing"
      : sourceBroken || failures.length > 0
        ? "broken"
        : "pass";
    return {
      site,
      host: hostOf(site),
      status,
      note,
      ignoredCount,
      sourceProblems: r.sourceProblems,
      totalLinks: r.totalLinks,
      checked: r.checked.length,
      deadCount: failures.length,
      failureSamples: failures.slice(0, 3).map((f) => `${f.url} (${f.problems[0]})`),
      warnings: r.lint.filter((i) => i.severity === "warning").length,
      ms: Date.now() - started,
    };
  } catch (err) {
    return {
      site,
      host: hostOf(site),
      status: "error",
      note,
      ignoredCount: 0,
      sourceProblems: [String(err?.message ?? err)],
      totalLinks: 0,
      checked: 0,
      deadCount: 0,
      failureSamples: [],
      warnings: 0,
      ms: Date.now() - started,
    };
  }
}

const results = [];
let cursor = 0;
await Promise.all(
  Array.from({ length: SITE_CONCURRENCY }, async () => {
    while (cursor < sites.length) {
      const entry = sites[cursor++];
      const r = await scanOne(entry);
      results.push(r);
      console.log(`${r.status.padEnd(7)} ${r.host} (${r.deadCount} dead / ${r.checked} checked)`);
    }
  })
);

const order = { broken: 0, error: 1, pass: 2, missing: 3 };
results.sort(
  (a, b) => order[a.status] - order[b.status] || b.deadCount - a.deadCount || a.host.localeCompare(b.host)
);

mkdirSync("data", { recursive: true });
writeFileSync(
  "data/results.json",
  JSON.stringify({ scannedAt: new Date().toISOString(), sample: null, results }, null, 2)
);
console.log(`\nwrote data/results.json (${results.length} sites)`);
