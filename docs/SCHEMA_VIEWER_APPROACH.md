# AsyncAPI Schema Viewer — Approach & Findings

## Summary

We evaluated three strategies for rendering AsyncAPI schema documentation inside the Fern docs site. The current implementation uses the AsyncAPI React component rendered via Next.js static export, embedded in Fern via iframe. This document records what we tried, what works, and what limitations we hit.

## Strategies evaluated

### 1. Native Fern AsyncAPI support (fern/apis/)

**Approach:** Point `fern/apis/{spec}/generators.yml` at the AsyncAPI YAML files and let Fern render them natively.

**Result:** Fern's AsyncAPI support is limited. The generated output was unusable — no structured nav, no collapsible schemas, no payload examples. Reverted.

**Commit:** `1cf0b62` (Add AsyncAPI schema rendering for all four specs)

### 2. Pure MDX — parse YAML, generate native MDX pages

**Approach:** Python script (`scripts/generate_asyncapi_docs.py`) reads the four AsyncAPI specs, resolves `$ref` chains, and generates native MDX with property tables, JSON examples, and per-operation pages. No external dependencies at runtime.

**Result:** Works. 77 MDX pages generated, `fern check` passes, all content renders natively in Fern. Property tables with dot-notation for nested objects, `oneOf` rendered as variant subsections, auto-generated JSON examples. Granular Fern sidebar nav (Servers/Operations/Messages/Schemas per spec).

**Status:** Available on branch `pmackinnon/docs-fern-mdx-schema-strategy`. Production-ready fallback.

**Trade-off:** No interactive UI — static tables and code blocks. No collapsible schemas, no expand/collapse on payloads. Functional but not as polished as a dedicated schema viewer.

### 3. AsyncAPI React component via Next.js iframe

**Approach:** Next.js app in `schema-viewer/` uses `@asyncapi/react-component` to render each spec. Built with `next build` (static export), output copied to `docs/schema-viewer/`. Each spec's Fern page embeds the viewer via `<iframe>`.

**Result:** Works locally via `fern docs dev`. CDN 403 blocker prevents preview/publish deploy (see below).

**Status:** Branch `pdmack/docs-fern-react-schema-viewer` on GitHub. Waiting on Fern CDN fix.

### 4. Tabbed iframe viewer (current iteration)

**Approach:** Evolved from strategy 3. Hides the AsyncAPI component's built-in sidebar to avoid nav-in-nav with Fern. Adds horizontal tabs inside the iframe: Overview | Operations | Messages | Schemas | Raw YAML. Each tab uses the `show` config to filter the rendered content. Raw YAML tab includes a copy-to-clipboard button (uses `execCommand('copy')` fallback for iframe context).

**Result:** Clean UX — Fern sidebar has 4 spec entries, iframe tabs handle section navigation. No competing sidebars. Copy button works in iframe context. `fern docs dev` renders correctly.

**Status:** Branch `pdmack/docs-fern-react-schema-viewer`. Blocked on CDN 403 (same as strategy 3).

**Trade-off:** Fern sidebar deep-linking into iframe sections is not possible (hash fragments and query params both mangled by Fern's asset resolver). Tabs inside the iframe are the workaround.

## Fern limitations discovered

### iframe src hash fragments are dropped

**Issue:** When an MDX page contains `<iframe src="./file.html#section">`, Fern's asset resolver converts the relative path to an internal `file:UUID` reference but appends the hash to the UUID rather than the resolved URL.

**Evidence (from HAR capture):**

Expected iframe src:
```
/_local/.../docs/schema-viewer/bms/index.html#servers
```

Actual iframe src in rendered HTML:
```
file:1427b816-5282-4ce8-868b-a094785d2d4a#servers
```

The `file:UUID` gets resolved to the `/_local/` path, but the `#servers` hash is attached to the UUID, not the final URL. The browser loads the page without scrolling to the anchor.

**Impact:** Cannot deep-link from Fern sidebar entries to specific sections within an iframed page. Sub-pages for Servers, Operations, Messages, Schemas all load the full viewer without scrolling to the target section.

**Workaround:** Horizontal tabs inside the iframe (Overview/Operations/Messages/Schemas/Raw YAML) using the AsyncAPI component's `show` config to filter sections per tab. Fern sidebar lists 4 spec-level pages only. Both hash fragments (`#section`) and query params (`?section=X`) were tested and both are mangled by Fern's resolver.

### iframe asset path resolution

**Issue:** Next.js static export generates HTML with `/_next/static/` asset paths. When embedded as an iframe, these absolute paths resolve against the Fern domain root, not the iframe's directory.

**Fix:** Set `assetPrefix: '..'` in `next.config.js` so per-spec pages (at `{spec}/index.html`) reference `../_next/static/` which correctly resolves to the shared `_next/` directory one level up.

### Node.js builtins in client bundle

**Issue:** `@asyncapi/parser` (dependency of `@asyncapi/react-component`) imports `fs` at the module level, causing webpack to fail when bundling for the browser.

**Fix:** Add webpack fallbacks in `next.config.js`:
```js
if (!isServer) {
  config.resolve.fallback = { fs: false, path: false, ... };
}
```

## npm CVE posture

Next.js 14.2.x reports high-severity CVEs (DoS, SSRF, cache poisoning). All are **server-side only** and do not apply to our static export. See `schema-viewer/SECURITY.md` for full rationale. `node_modules/` is gitignored — vulnerable source code never enters the repository.

## Architecture

```
schema-viewer/              # Next.js app (not committed to git: node_modules, .next, out)
  package.json              # @asyncapi/react-component, next, react
  next.config.js            # static export, assetPrefix, webpack fallbacks
  specs/                    # YAML copies from schema/schema/
  pages/[spec].tsx          # per-spec page using AsyncApiComponent
  .gitignore                # node_modules/, .next/, out/

docs/schema-viewer/         # Static export output (GENERATED — not in git)
  _next/static/             # JS/CSS bundles
  bms/index.html            # Pre-rendered BMS viewer
  power-management/         # etc.
  nico/
  spiffe-exchange/

docs/schema-bms.mdx         # Fern page with <iframe src="./schema-viewer/bms/index.html">
fern/docs.yml               # Nav: Schema Reference > BMS / Power Mgmt / NICo / SPIFFE
.gitignore                  # docs/schema-viewer/ excluded from git
```

## Build workflow

### Local development

```bash
# 1. Build the schema viewer (generates docs/schema-viewer/)
cd schema-viewer
npm install                 # pulls @asyncapi/react-component + deps
npm run export              # next build && cp -r out/ ../docs/schema-viewer/

# 2. Preview the Fern site
cd ..
fern docs dev               # http://localhost:3000/dsx-exchange
```

### Fern CI pipeline (.gitlab-ci.yml)

The schema viewer must be built before `fern docs publish` since the
static export output (`docs/schema-viewer/`) is gitignored and only
exists as a build artifact.

```yaml
build_schema_viewer:
  stage: build
  image: node:20
  script:
    - cd schema-viewer
    - npm ci
    - npm run export
  artifacts:
    paths:
      - docs/schema-viewer/
    expire_in: 1 hour

publish_docs:
  stage: deploy
  image: fernapi/fern:latest
  needs: [build_schema_viewer]
  script:
    - fern docs publish
  only:
    - monorepo
```

**Key points:**
- `npm ci` (not `npm install`) for deterministic builds in CI
- `node_modules/` is ephemeral — exists only during the `build_schema_viewer` job
- The `artifacts` mechanism passes `docs/schema-viewer/` to the `publish_docs` job
- `fern docs preview` must also be preceded by the schema viewer build (see caveats below)

### Caveats

**`fern docs preview` will not render schema pages without a prior build.**
The static export (`docs/schema-viewer/`) is gitignored. When `fern docs preview`
uploads assets to the Fern CDN (`files.buildwithfern.com`), the iframe HTML
may upload as a file asset, but the `_next/static/` JS/CSS bundles it references
will be missing from the CDN. Result: the iframe loads a blank page with 403
errors on every asset request.

**Evidence (HAR capture, 2026-05-15):** The preview at
`nvidia-preview-docs-fern-react-schema-strategy.docs.buildwithfern.com`
returned 403 for all `_next/static/` asset fetches because `docs/schema-viewer/`
was not present when `fern docs preview` ran.

**Workaround — always build before preview or publish:**

```bash
# Local preview
cd schema-viewer && npm install && npm run export && cd ..
fern docs dev

# Remote preview
cd schema-viewer && npm install && npm run export && cd ..
fern docs preview

# Production publish (CI handles this automatically)
# see .gitlab-ci.yml pipeline above
```

**`fern docs dev` (local) vs `fern docs preview` (remote):**
- `fern docs dev` serves files from disk — works as long as `docs/schema-viewer/`
  exists locally after `npm run export`
- `fern docs preview` uploads to Fern's CDN — requires `docs/schema-viewer/`
  to exist at upload time, including the `_next/static/` directory
- Neither will show schema viewer content without building first

**Fern CDN still blocks iframe assets (confirmed 2026-05-23):**
Re-tested with the tabbed viewer. `fern docs dev` works — all iframe assets
load from disk. `fern docs preview` still returns 403 for `_next/static/`
asset fetches on the CDN. The original 2026-05-15 behavior is unchanged.
This is a Fern platform limitation — the CDN treats iframe-referenced files
differently from page assets.
- CVEs in `@asyncapi/react-component` transitive deps are confined to the CI runner; the built output is static HTML/CSS/JS only
- The YAML specs are copied into `schema-viewer/specs/` from `schema/schema/`; if specs change, rebuild the viewer

### Updating schemas

When AsyncAPI specs change:

```bash
cd schema-viewer
npm run copy-specs           # copies YAML from schema/schema/ to specs/
npm run export               # rebuilds the static viewer
```

In CI this happens automatically since `copy-specs` pulls from the
repo's `schema/schema/` directory at build time.

## Decision record

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-12 | Start with Fern native AsyncAPI | Simplest approach |
| 2026-05-14 | Revert native, try iframe with pre-rendered HTML | Fern's AsyncAPI rendering insufficient |
| 2026-05-14 | Build pure MDX generator as fallback | Zero dependencies, works everywhere |
| 2026-05-14 | Build Next.js + @asyncapi/react-component viewer | Rich interactive UI, CVEs accepted for static export |
| 2026-05-15 | Accept Next.js 14.x CVEs | All server-side, static export not affected |
| 2026-05-15 | Drop per-section sidebar entries | Fern drops iframe hash fragments during asset resolution |
| 2026-05-15 | Final: 4 spec pages in Fern sidebar, AsyncAPI sidebar for drill-down | Best achievable UX within Fern's iframe constraints |
| 2026-05-22 | Pure MDX generator ships in PR #5 | Production-ready, zero dependencies, works with Fern CDN |
| 2026-05-23 | Re-test React viewer — `fern docs dev` works | Local asset resolution fixed since May 15 |
| 2026-05-23 | CDN 403 still present on `fern docs preview` | Fern CDN behavior unchanged — blocker for deploy |
| 2026-05-23 | Replace AsyncAPI sidebar with horizontal tabs | Avoids nav-in-nav; tabs: Overview/Operations/Messages/Schemas/Raw YAML |
| 2026-05-23 | Confirm hash/query param deep-linking still broken | Both `#section` and `?section=X` mangled by Fern's asset resolver |
| 2026-05-23 | Add copy-to-clipboard on Raw YAML tab | Uses `execCommand('copy')` fallback for iframe context |
| 2026-05-23 | BMS messages missing titles in spec | Only `ValueMessage` has `title:`; other messages need spec fix |
