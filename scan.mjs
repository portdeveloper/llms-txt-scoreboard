import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { checkSite } from "llms-txt-check";

const SAMPLE = 25;
const SITE_CONCURRENCY = 4;

const sites = JSON.parse(readFileSync("sites.json", "utf-8"));

const hostOf = (url) => {
  const u = new URL(url);
  return u.host + (u.pathname !== "/" ? u.pathname.replace(/\/$/, "") : "");
};

async function scanOne(site) {
  const started = Date.now();
  try {
    const r = await checkSite(site, { sample: SAMPLE, concurrency: 6 });
    const missing = r.sourceProblems.some((p) => p.startsWith("http-404"));
    const sourceBroken = r.sourceProblems.length > 0 && !missing;
    const status = missing
      ? "missing"
      : sourceBroken || r.failures.length > 0
        ? "broken"
        : "pass";
    return {
      site,
      host: hostOf(site),
      status,
      sourceProblems: r.sourceProblems,
      totalLinks: r.totalLinks,
      checked: r.checked.length,
      deadCount: r.failures.length,
      failureSamples: r.failures.slice(0, 3).map((f) => `${f.url} (${f.problems[0]})`),
      warnings: r.lint.filter((i) => i.severity === "warning").length,
      ms: Date.now() - started,
    };
  } catch (err) {
    return {
      site,
      host: hostOf(site),
      status: "error",
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
      const site = sites[cursor++];
      const r = await scanOne(site);
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
  JSON.stringify({ scannedAt: new Date().toISOString(), sample: SAMPLE, results }, null, 2)
);
console.log(`\nwrote data/results.json (${results.length} sites)`);
