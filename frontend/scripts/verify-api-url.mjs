#!/usr/bin/env node
/**
 * Verifies that production Android web assets point to the production backend.
 *
 * Usage:
 *   node scripts/verify-api-url.mjs          -> checks android/app/src/main/assets/public/assets/*.js
 *   node scripts/verify-api-url.mjs --aab    -> also checks the JS inside the release AAB
 *
 * Fails (exit 1) if the production URL is missing or a local/dev URL is present.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED = "oficios-web-back.onrender.com";
const FORBIDDEN = [/https?:\/\/127\.0\.0\.1[:\/\w.-]*/, /127\.0\.0\.1:8000/, /localhost:8000/, /https?:\/\/192\.168\.\d+\.\d+[:\d]*/];

const ASSETS_DIR = path.join(ROOT, "android/app/src/main/assets/public/assets");
const AAB_PATH = path.join(ROOT, "android/app/build/outputs/bundle/release/app-release.aab");

/** Minimal ZIP reader (central directory) returning { name, data } for matching entries. */
function readZipEntries(file, filter) {
  const buf = fs.readFileSync(file);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error(`Not a valid ZIP: ${file}`);
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let n = 0; n < count; n++) {
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (!filter(name)) continue;
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const start = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compSize);
    const data = method === 0 ? raw : zlib.inflateRawSync(raw);
    out.push({ name, data: data.toString("utf8") });
  }
  return out;
}

function check(label, files) {
  if (files.length === 0) {
    console.error(`[verify-api-url] ${label}: no JS files found`);
    return false;
  }
  const all = files.map((f) => f.data).join("\n");
  const urls = [...new Set(all.match(/https?:\/\/oficios-web-back\.onrender\.com/g) || [])];
  const bad = FORBIDDEN.flatMap((re) => [...new Set(all.match(new RegExp(re, "g")) || [])]);
  const ok = all.includes(EXPECTED) && bad.length === 0;
  console.log(`[verify-api-url] ${label}: ${files.length} JS file(s)`);
  console.log(`  production URL found: ${urls.length ? urls.join(", ") : "NONE"}`);
  console.log(`  forbidden dev URLs:   ${bad.length ? bad.join(", ") : "none"}`);
  console.log(`  result: ${ok ? "OK" : "FAIL"}`);
  return ok;
}

let ok = true;

if (!fs.existsSync(ASSETS_DIR)) {
  console.error(`[verify-api-url] Missing ${ASSETS_DIR}. Run "pnpm cap sync android" first.`);
  process.exit(1);
}
const assetFiles = fs
  .readdirSync(ASSETS_DIR)
  .filter((f) => f.endsWith(".js"))
  .map((f) => ({ name: f, data: fs.readFileSync(path.join(ASSETS_DIR, f), "utf8") }));
ok = check("android web assets", assetFiles) && ok;

if (process.argv.includes("--aab")) {
  if (!fs.existsSync(AAB_PATH)) {
    console.error(`[verify-api-url] Missing AAB: ${AAB_PATH}`);
    process.exit(1);
  }
  const aabFiles = readZipEntries(AAB_PATH, (n) => /^base\/assets\/public\/assets\/.*\.js$/.test(n));
  ok = check(`AAB (${path.relative(ROOT, AAB_PATH)})`, aabFiles) && ok;
}

process.exit(ok ? 0 : 1);
