# Repair mode on your own static site

A template to run Mission Zero's repair mode on any static site served by nginx, Apache, Caddy or a CDN.
Mission Zero never touches the live site: it repairs a local copy and hands back a patch that a human applies.

## 1. Make the copy (10 minutes)

1. Copy this folder next to the repository, for example `../my-site`.
2. Put the files your server serves in `public/` (the built site: `index.html`, scripts, styles, images).
3. Put the headers your server adds in `headers.json`. `curl -sI https://your-site/` prints them.
4. In `server.js`, keep `FALLBACK = '/index.html'` if unknown paths answer the home page (single-page apps,
   `try_files ... /index.html`), else set it to `null`.
5. In `journeys.test.js`, set `TITLE`, `PAGES` and `APIS` (the origins your forms or chat send to).
6. Check that the journeys are green on the copy: `node --test journeys.test.js`.

## 2. Run the repair

```bash
npm run repair -- --scan --policy --login=none --site=../my-site
```

`--scan` scans the copy (a local address needs no ownership proof). `--policy` adds the probes a surface scanner
reports on any site: CSP strength, HSTS, cross-origin isolation, cookie consent, rate limiting.
Findings from another scanner can replace the scan: `npm run repair -- findings.json --site=../my-site`
or `--from=URL` (generic format, see `demo-site/findings.example.json`).

Each finding ends `proposed` (the flaw is gone on the copy and every journey is still green), `rejected`
(a journey broke, nothing is kept), `reserved` (proposed with a reservation to read) or another status that
says why no fix is kept (`ineffective`, `hides`, `no-edit`, `unverified`, `error`). The evidence folder holds, per finding,
the sources with their quotes, the patch (`fix.patch`) and the hashed journal (`npm run verify-chain -- <folder>`).

## 3. Carry the fix to the real server

The patch edits `server.js`, the stand-in for your server. A header added there is one `add_header` line in nginx
(`Header always set` in Apache, `header` in Caddy). Apply it, reload, then scan the live site to confirm:
the live scan needs your proof of control, the token of `MZ_OWNER_TOKEN` served at `/.well-known/mission-zero.txt`.

## What the journeys guard

| Journey | Breaks when a fix |
|---|---|
| reach every page | blocks a page or changes what it serves |
| load every script of the page | refuses the site's own scripts |
| the page scripts still run | adds a `script-src` that blocks an inline script (a hash per inline script keeps it running) |
| the page styles still apply | adds a `style-src` without `'unsafe-inline'` on a page with inline styles |
| images and fonts still load | restricts `img-src` or `font-src` without `'self'` |
| forms reach their APIs | adds a `connect-src` that blocks the form's API |
| one visitor browses ten pages | sets a limit so low that one person reading the site gets refused |
| many visitors open the site at the same time | adds a rate limit shared by all visitors instead of one per visitor |

Add your own: a journey is a function that throws when the visitor cannot do what they came for.
