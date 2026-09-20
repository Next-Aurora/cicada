#!/usr/bin/env node
/**
 * Copy repo-root guides/ → public/guides/ for static serving on Vercel.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "..")
const src = join(repoRoot, "guides")
const dest = join(repoRoot, "public", "guides")

if (!existsSync(src)) {
  console.warn("[sync-guides] no guides/ at repo root, skip")
  process.exit(0)
}

mkdirSync(join(repoRoot, "public"), { recursive: true })
if (existsSync(dest)) rmSync(dest, { recursive: true, force: true })
mkdirSync(dest, { recursive: true })

for (const name of readdirSync(src)) {
  const from = join(src, name)
  if (!statSync(from).isDirectory()) continue
  const indexHtml = join(from, "index.html")
  if (!existsSync(indexHtml)) {
    console.warn(`[sync-guides] skip ${name}: missing index.html`)
    continue
  }
  cpSync(from, join(dest, name), { recursive: true })
  console.log(`[sync-guides] ${name}`)
}
