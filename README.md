# llms.txt scoreboard

Weekly health scan of major docs sites' llms.txt files, published at **https://portdeveloper.github.io/llms-txt-scoreboard/**.

A site's llms.txt promises AI tools a map of its docs. Generators produce these files at build time, but breakage happens at the serving layer (host redirects, docs restructures, domain migrations), so the file can rot while every build stays green. This scoreboard fetches each site's llms.txt every Monday and verifies the listed URLs actually serve content, using [llms-txt-check](https://github.com/portdeveloper/llms-txt-check).

State is git-committed, so `git log data/results.json` is the change history.

## Badges

Every scanned site gets a shields.io endpoint at `docs/badges/<host>.json`:

```markdown
![llms.txt](https://img.shields.io/endpoint?url=https://portdeveloper.github.io/llms-txt-scoreboard/badges/orm.drizzle.team.json)
```

## Add a site

Open an issue or PR against `sites.json`. Criteria: a docs site people actually use, with (or expected to have) an llms.txt.

## Fix your row

Run `npx llms-txt-check https://your-site.com` for the full failure list, or add [the GitHub Action](https://github.com/portdeveloper/llms-txt-check-action) to CI so it can't regress. The next weekly scan picks up fixes automatically, or open an issue and I'll rescan sooner.
