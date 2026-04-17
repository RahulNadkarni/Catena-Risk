/**
 * Next.js 14.2.x CLI calls `_semver.default.lt(...)`. Some environments (conda PATH,
 * corrupted installs) break the compiled semver interop so `.lt` is not a function.
 * This idempotent patch mirrors the fix in patches/next+14.2.35.patch without relying
 * on patch-package (which fails on Node 24 in some setups).
 */
import fs from "node:fs";
import path from "node:path";

/** npm postinstall runs with cwd = project root; prefer INIT_CWD when nested. */
const root = process.env.INIT_CWD || process.cwd();
const bin = path.join(root, "node_modules", "next", "dist", "bin", "next");

if (!fs.existsSync(bin)) {
  process.exit(0);
}

let s = fs.readFileSync(bin, "utf8");
if (s.includes("function semverLt")) {
  process.exit(0);
}

const needleRequire = `const _semver = /*#__PURE__*/ _interop_require_default(require("next/dist/compiled/semver"));`;
const replacementRequire = `const _semverMod = require("next/dist/compiled/semver");
const _semver = /*#__PURE__*/ _interop_require_default(_semverMod);`;

const needleIf = `if (_semver.default.lt(process.versions.node, "18.17.0")) {
    console.error(\`You are using Node.js \${process.versions.node}. For Next.js, Node.js version >= v\${"18.17.0"} is required.\`);
    process.exit(1);
}`;

const replacementIf = `function semverLt(version, cmp) {
    const d = _semver.default;
    if (d && typeof d.lt === "function") return d.lt(version, cmp);
    if (_semverMod && typeof _semverMod.lt === "function") return _semverMod.lt(version, cmp);
    console.error(
        "Next.js could not load semver. Reinstall dependencies (rm -rf node_modules && npm install). If you use conda, run conda deactivate so nvm Node/npm are first on PATH.",
    );
    process.exit(1);
}
if (semverLt(process.versions.node, "18.17.0")) {
    console.error(\`You are using Node.js \${process.versions.node}. For Next.js, Node.js version >= v\${"18.17.0"} is required.\`);
    process.exit(1);
}`;

if (!s.includes(needleRequire) || !s.includes(needleIf)) {
  console.warn("[apply-next-semver-patch] next/dist/bin/next did not match expected 14.2.x layout; skipping.");
  process.exit(0);
}

s = s.replace(needleRequire, replacementRequire);
s = s.replace(needleIf, replacementIf);
fs.writeFileSync(bin, s, "utf8");
console.log("[apply-next-semver-patch] Patched next/dist/bin/next for robust semver.lt.");
