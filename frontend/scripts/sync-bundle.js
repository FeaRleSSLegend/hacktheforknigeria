// Copy the generated bundle from the backend into the app and verify every sha256 against the manifest.
// Usage: node scripts/sync-bundle.js   (run after `python scripts/build_bundle.py` in backend/)
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "../../backend/mobile/assets/bundle");
const dst = path.resolve(__dirname, "../assets/bundle");

const manifest = JSON.parse(fs.readFileSync(path.join(src, "manifest.json"), "utf8"));
for (const [name, info] of Object.entries(manifest.files)) {
  const bytes = fs.readFileSync(path.join(src, name));
  const hash = crypto.createHash("sha256").update(bytes).digest("hex");
  if (hash !== info.sha256) {
    console.error(`sha256 mismatch for ${name}; bundle NOT copied`);
    process.exit(1);
  }
}
fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(dst, { recursive: true });
for (const name of [...Object.keys(manifest.files), "manifest.json"]) {
  fs.copyFileSync(path.join(src, name), path.join(dst, name));
}
console.log(`Bundle ${manifest.version} copied to assets/bundle (${Object.keys(manifest.files).length} files, hashes verified)`);
