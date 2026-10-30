#!/usr/bin/env node
/**
 * Print fresh auth secrets. Paste them into Portainer or a local .env.
 * Does not write any file.
 */
import { randomBytes } from "node:crypto"

const secret = randomBytes(32).toString("base64")
const token = randomBytes(32).toString("base64")

console.log(`BETTER_AUTH_SECRET=${secret}`)
console.log(`CICADA_INTERNAL_TOKEN=${token}`)
console.log(`INTERNAL_AUTH_TOKEN=${token}`)
console.log("")
console.log("填进 Portainer 或本地 .env，不要提交到仓库。")
console.log("CICADA_INTERNAL_TOKEN 与 INTERNAL_AUTH_TOKEN 使用同一串。")
