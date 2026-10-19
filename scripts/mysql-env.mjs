import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

export function loadDotEnv(repoRoot) {
  const path = join(repoRoot, ".env")
  if (!existsSync(path)) return
  const text = readFileSync(path, "utf8")
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key]) continue
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

export function requireMysqlTarget(repoRoot, label) {
  loadDotEnv(repoRoot)
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error(`[${label}] 缺少 DATABASE_URL。复制 .env.example 为 .env 并填写连接串。`)
    process.exit(1)
  }

  let url
  try {
    url = new URL(databaseUrl)
  } catch {
    console.error(`[${label}] DATABASE_URL 不是合法的 URL。`)
    process.exit(1)
  }
  if (url.protocol !== "mysql:") {
    console.error(`[${label}] 仅支持 mysql:// 连接串。`)
    process.exit(1)
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, "").split("/")[0] ?? "")
  if (!database) {
    console.error(
      `[${label}] DATABASE_URL 需要带上数据库名，例如 mysql://user:pass@localhost:3306/cicada`,
    )
    process.exit(1)
  }
  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    console.error(`[${label}] DATABASE_URL 中的数据库名只能包含字母、数字和下划线。`)
    process.exit(1)
  }

  const port = url.port ? Number(url.port) : 3306
  return {
    database,
    port,
    host: url.hostname,
    connection: {
      host: url.hostname,
      port,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      charset: "utf8mb4",
      connectTimeout: 10_000,
      supportBigNumbers: true,
      bigNumberStrings: true,
    },
  }
}

export function reportMysqlError(error, label, host, port) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : ""
  if (code === "ECONNREFUSED") {
    console.error(`[${label}] 连不上 MySQL（${host}:${port}）。请先启动数据库服务。`)
    return
  }
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[${label}] ${message}`)
}
