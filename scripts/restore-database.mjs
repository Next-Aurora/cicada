#!/usr/bin/env node
/**
 * Restore a dump produced by scripts/backup-database.mjs into DATABASE_URL.
 * Statements run one by one so a large dump is not sent as a single packet.
 */
import { readFileSync } from "node:fs"
import { dirname, isAbsolute, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import mysql from "mysql2/promise"
import { readCreateDatabaseStatement } from "./create-database.mjs"
import { reportMysqlError, requireMysqlTarget } from "./mysql-env.mjs"
import { BACKUP_MARK, quoteIdent, splitSqlStatements } from "./sql-dump.mjs"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const fileArg = process.argv[2]
if (!fileArg || fileArg.startsWith("-")) {
  console.error("[db:restore] 用法：pnpm db:restore -- backups/<file>.sql")
  process.exit(1)
}

const dumpPath = isAbsolute(fileArg) ? fileArg : resolve(repoRoot, fileArg)
const target = requireMysqlTarget(repoRoot, "db:restore")
const statements = readDump(dumpPath)

let connection
try {
  connection = await mysql.createConnection({
    ...target.connection,
    multipleStatements: false,
  })
  await connection.query(readCreateDatabaseStatement(target.database))
  await connection.query(`USE ${quoteIdent(target.database)}`)
  for (let index = 0; index < statements.length; index++) {
    try {
      await connection.query(statements[index])
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`第 ${index + 1}/${statements.length} 条语句失败：${message}`)
    }
  }
  console.log(`[db:restore] 已执行 ${statements.length} 条语句，恢复到数据库 \`${target.database}\``)
} catch (error) {
  reportMysqlError(error, "db:restore", target.host, target.port)
  process.exitCode = 1
} finally {
  if (connection) await connection.end()
}

if (process.exitCode) process.exit(process.exitCode)

function readDump(path) {
  let sql
  try {
    sql = readFileSync(path, "utf8")
  } catch {
    console.error(`[db:restore] 读不到备份文件：${path}`)
    process.exit(1)
  }
  if (!sql.startsWith(BACKUP_MARK)) {
    console.error("[db:restore] 这个文件不是 pnpm db:backup 导出的备份。")
    process.exit(1)
  }
  return splitSqlStatements(sql)
}
