// Vendors the generic rules of dmmulroy/anti-slop into plugins/anti-slop as JavaScript.
// Upstream is TypeScript and unpublished, and Node does not strip types under node_modules.
// Usage: node scripts/vendor-anti-slop.mjs <commit-sha>
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sha = process.argv[2];

if (!sha || !/^[0-9a-f]{40}$/.test(sha)) {
  throw new Error("usage: node scripts/vendor-anti-slop.mjs <40-char commit sha>");
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "plugins/anti-slop");
const workDir = mkdtempSync(path.join(tmpdir(), "anti-slop-"));

try {
  const response = await fetch(`https://codeload.github.com/dmmulroy/anti-slop/tar.gz/${sha}`);

  if (!response.ok) throw new Error(`download failed: ${response.status}`);
  const tarball = path.join(workDir, "src.tar.gz");
  writeFileSync(tarball, Buffer.from(await response.arrayBuffer()));
  const extract = spawnSync("tar", ["-xzf", tarball, "-C", workDir, "--strip-components=1"]);

  if (extract.status !== 0) throw new Error(extract.stderr.toString());

  const srcDir = path.join(workDir, "src");
  rmSync(outDir, { recursive: true, force: true });

  // Effect rules are framework-specific; tests and declaration files have no runtime code.
  const sources = readdirSync(srcDir, { recursive: true, encoding: "utf8" }).filter(
    (file) =>
      file.endsWith(".ts") &&
      !file.endsWith(".d.ts") &&
      !file.endsWith(".test.ts") &&
      !file.startsWith(`effect${path.sep}`),
  );

  for (const file of sources) {
    const code = stripTypeScriptTypes(readFileSync(path.join(srcDir, file), "utf8")).replaceAll(
      /(from\s+["'][^"']+)\.ts(["'])/g,
      "$1.js$2",
    );

    const target = path.join(outDir, file.replace(/\.ts$/, ".js"));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(
      target,
      `// Vendored from dmmulroy/anti-slop@${sha} src/${file} by scripts/vendor-anti-slop.mjs.\n${code}`,
    );
  }

  cpSync(path.join(workDir, "LICENSE"), path.join(outDir, "LICENSE"));

  for (const file of ["LICENSE", "UPSTREAM.md"]) {
    cpSync(
      path.join(srcDir, "vendor/eslint-stylistic", file),
      path.join(outDir, "vendor/eslint-stylistic", file),
    );
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

const format = spawnSync(path.join(root, "node_modules/.bin/oxfmt"), [outDir], {
  stdio: "inherit",
});

if (format.status !== 0) process.exit(format.status ?? 1);
