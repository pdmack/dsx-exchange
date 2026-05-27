# Schema Viewer — Security Notes

## npm audit findings (2026-05-14)

Next.js 14.2.x and its transitive `postcss` dependency report CVEs
(high / moderate). All reported vulnerabilities are **server-side only**:

- DoS via Image Optimizer, Server Components, HTTP smuggling
- SSRF via WebSocket upgrades
- Cache poisoning in RSC responses
- XSS in CSP nonces (App Router only)
- PostCSS XSS via untrusted CSS input

**Why accepted:** This project uses `output: 'export'` (static HTML).
No Next.js server runs in production — the output is pre-rendered
HTML/CSS/JS served as static files. None of the CVE attack vectors
apply to a static export.

`node_modules/` is gitignored and only exists during build.
The vulnerable source code does not ship in the final artifact.

## Reassessment trigger

Re-evaluate if:
- The viewer is changed to use a Next.js server (`next start`)
- The export pipeline processes untrusted CSS or user-supplied content
- `@asyncapi/react-component` adds server-side features
