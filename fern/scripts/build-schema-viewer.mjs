#!/usr/bin/env node
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
//
// Builds the AsyncAPI schema viewer bundle and pre-parses schema YAML files.
//
// Usage:  node fern/scripts/build-schema-viewer.mjs
// Run from repo root, or:  npm run build  (from fern/)

import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fernDir = resolve(__dirname, "..");
const repoRoot = resolve(fernDir, "..");
const emptyShim = resolve(fernDir, "scripts/empty.js");

// --- Step 1: Bundle the renderer + parser model layer ---
// Uses without-parser entry (no runtime YAML parsing) but includes
// @asyncapi/parser model utilities needed to reconstruct pre-parsed documents.
// Strips: @asyncapi/specs (1MB+ of JSON validation schemas), Node builtins,
// and unused schema-format parsers (protobuf, avro, openapi).

const outBundle = resolve(fernDir, "components/vendor/asyncapi-react.js");
console.log("Building asyncapi-react renderer bundle...");
execSync(
  [
    "npx esbuild",
    "node_modules/@asyncapi/react-component/lib/esm/without-parser.js",
    "--bundle --format=esm --minify",
    "--external:react --external:react-dom --external:react/jsx-runtime",
    "--external:@asyncapi/protobuf-schema-parser",
    "--external:@asyncapi/avro-schema-parser",
    "--external:@asyncapi/openapi-schema-parser",
    `--alias:fs=${emptyShim}`,
    `--alias:path=${emptyShim}`,
    `--alias:stream=${emptyShim}`,
    `--alias:zlib=${emptyShim}`,
    `--alias:util=${emptyShim}`,
    `--alias:buffer=${emptyShim}`,
    `--alias:events=${emptyShim}`,
    `--alias:@asyncapi/specs=${emptyShim}`,
    `--outfile=${outBundle}`,
  ].join(" "),
  { cwd: fernDir, stdio: "inherit" },
);
console.log(`  → ${outBundle}`);

// --- Step 2: Inline CSS as a TS module ---

const cssPath = resolve(
  fernDir,
  "node_modules/@asyncapi/react-component/styles/default.min.css",
);
const cssOut = resolve(fernDir, "components/vendor/asyncapi-react-css.ts");
const css = readFileSync(cssPath, "utf8");
writeFileSync(cssOut, `export default ${JSON.stringify(css)};\n`);
console.log(`  → ${cssOut}`);

// --- Step 3: Pre-parse schema YAML files ---

const schemas = {
  bms: "schemas/asyncapi/bms/bms.yaml",
  "power-management": "schemas/asyncapi/power-management/power-management.yaml",
  nico: "schemas/asyncapi/nico/nico.yaml",
  "spiffe-exchange": "schemas/asyncapi/spiffe-exchange/pub-keysets.yaml",
};

const schemaOutDir = resolve(fernDir, "components/vendor/schemas");
mkdirSync(schemaOutDir, { recursive: true });

const { Parser, stringify } = await import("@asyncapi/parser");
const parser = new Parser();

console.log("Pre-parsing AsyncAPI schemas...");
for (const [name, relPath] of Object.entries(schemas)) {
  const content = readFileSync(resolve(repoRoot, relPath), "utf8");
  const { document, diagnostics } = await parser.parse(content);
  if (!document) {
    const errors = diagnostics.filter((d) => d.severity === 0);
    console.error(`  ✗ ${name}: parse failed`, errors);
    process.exit(1);
  }
  const serialized = stringify(document);
  const outPath = resolve(schemaOutDir, `${name}.json`);
  writeFileSync(outPath, serialized);
  console.log(`  → ${name}: ${(serialized.length / 1024).toFixed(1)} KB`);
}

console.log("Done.");
