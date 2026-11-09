import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "dist/manifest.webmanifest",
  "dist/sw.js",
  "dist/firebase-messaging-sw.js",
  "dist/assets/kira-logo.png",
  "dist/icons/kira.svg"
];
for (const file of requiredFiles) {
  assert.ok(existsSync(file), `PWA build artifact missing: ${file}`);
}

const manifest = JSON.parse(readFileSync("dist/manifest.webmanifest", "utf8"));
assert.equal(manifest.display, "standalone", "PWA must use standalone display mode");
assert.ok(manifest.name && manifest.short_name, "PWA name and short_name are required");
assert.ok(manifest.start_url && manifest.scope, "PWA start_url and scope are required");
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, "PWA icons are required");
for (const icon of manifest.icons) {
  const path = `dist/${String(icon.src || "").replace(/^\//, "")}`;
  assert.ok(icon.src && existsSync(path), `Manifest icon missing: ${icon.src}`);
}
const html = readFileSync("dist/index.html", "utf8");
assert.match(html, /rel="manifest"\s+href="\/manifest\.webmanifest"/, "index.html must reference the generated manifest");
assert.match(html, /apple-touch-icon/, "iOS home-screen icon metadata is required");
console.log("KIRA PWA artifacts verified: manifest, service worker, Firebase messaging worker and icons.");
