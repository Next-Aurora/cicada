#!/usr/bin/env node
/**
 * Dump the MySQL database in DATABASE_URL to a SQL file.
 * Rows are streamed so a large table is not held in memory.
 * Default files in backups/ are pruned to the newest BACKUP_KEEP.
 */
import { createWriteStream } from "node:fs"
import { mkdir, readdir, rm } from "node:fs/promises"
import { dirname, isAbsolute, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import mysql from "mysql2/promise"
import { reportMysqlError, requireMysqlTarget } from "./mysql-env.mjs"
import {
  BACKUP_KEEP,
  BACKUP_MARK,
  INSERT_BATCH,
  insertStatement,
  isManagedBackupName,
  quoteIdent,
  timestampForFile,
} from "./sql-dump.mjs"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

export async function backupUsing(connection, target, { ifExists = false, out } = {}) {
  const exists = await databaseExists(connection, target.database)
  if (!exists) {
    if (ifExists) {
      console.log(`[db:backup] 数据库 \`${target.database}\` 尚不存在，跳过备份。`)
      return
    }
    throw new Error(`数据库 \`${target.database}\` 不存在。可先执行 pnpm db:create。`)
  }

  const tables = await listBaseTables(connection, target.database)
  if (tables.length === 0 && ifExists) {
    console.log(`[db:backup] 数据库 \`${target.database}\` 还没有表，跳过备份。`)
    return
  }

  const outPath = out
    ? isAbsolute(out)
      ? out
      : resolve(repoRoot, out)
    : join(repoRoot, "backups", `${target.database}-${timestampForFile()}.sql`)

  await mkdir(dirname(outPath), { recursive: true })
  const fileStream = createWriteStream(outPath, { encoding: "utf8" })
  let rowCount = 0
  try {
    await writeChunk(
      fileStream,
      `${BACKUP_MARK}\n-- database: ${target.database}\n-- exported: ${new Date().toISOString()}\n-- 恢复：pnpm db:restore -- <this-file>\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\nSET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n\n`,
    )
    await connection.beginTransaction()
    await connection.query(`USE ${quoteIdent(target.database)}`)
    for (const table of tables) {
      rowCount += await writeTable(connection, fileStream, table)
    }
    await connection.commit()
    await writeChunk(fileStream, "SET FOREIGN_KEY_CHECKS = 1;\n")
    await endStream(fileStream)
  } catch (error) {
    try {
      await connection.rollback()
    } catch {
      // Report the original failure.
    }
    fileStream.destroy()
    await rm(outPath, { force: true })
    throw error
  }

  if (!out) await pruneBackups(dirname(outPath), target.database)
  console.log(`[db:backup] 已导出 ${tables.length} 张表、${rowCount} 行到 ${outPath}`)
}

async function databaseExists(connection, database) {
  const [rows] = await connection.query(
    "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1",
    [database],
  )
  return rows.length > 0
}

async function listBaseTables(connection, database) {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME AS tableName
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
    [database],
  )
  return rows.map((row) => String(cell(row, "tableName"))).filter(Boolean)
}

async function writeTable(connection, fileStream, table) {
  const ident = quoteIdent(table)
  const [createRows] = await connection.query(`SHOW CREATE TABLE ${ident}`)
  const createSql = String(cell(createRows[0], "Create Table") ?? "")
  if (!createSql.startsWith("CREATE TABLE")) {
    throw new Error(`无法读取表 ${table} 的结构`)
  }
  await writeChunk(fileStream, `DROP TABLE IF EXISTS ${ident};\n${createSql};\n\n`)

  const query = connection.connection.query(`SELECT * FROM ${ident}`)
  const rowStream = query.stream({ highWaterMark: INSERT_BATCH })
  let columns
  let batch = []
  let count = 0
  try {
    for await (const row of rowStream) {
      if (!columns) columns = Object.keys(row)
      batch.push(row)
      count += 1
      if (batch.length >= INSERT_BATCH) {
        await writeChunk(fileStream, insertStatement(table, columns, batch))
        batch = []
      }
    }
  } catch (error) {
    rowStream.destroy()
    throw error
  }
  if (columns && batch.length > 0) {
    await writeChunk(fileStream, insertStatement(table, columns, batch))
  }
  if (count > 0) await writeChunk(fileStream, "\n")
  return count
}

async function pruneBackups(dir, database) {
  const names = await readdir(dir).catch(() => [])
  const stale = names
    .filter((name) => isManagedBackupName(database, name))
    .sort()
    .slice(0, -BACKUP_KEEP)
  await Promise.all(stale.map((name) => rm(join(dir, name), { force: true })))
}

function cell(row, key) {
  if (!row || typeof row !== "object") return undefined
  if (row[key] != null) return row[key]
  const found = Object.keys(row).find((item) => item.toLowerCase() === key.toLowerCase())
  return found ? row[found] : undefined
}

function writeChunk(stream, chunk) {
  if (stream.destroyed) return Promise.reject(new Error("备份写入已中断"))
  if (stream.write(chunk)) return Promise.resolve()
  return new Promise((resolvePromise, reject) => {
    stream.once("drain", resolvePromise)
    stream.once("error", reject)
  })
}

function endStream(stream) {
  return new Promise((resolvePromise, reject) => {
    stream.once("error", reject)
    stream.end(resolvePromise)
  })
}

function parseArgs(argv) {
  let out
  let ifExists = false
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === "--if-exists") {
      ifExists = true
      continue
    }
    if (arg === "--out") {
      out = argv[++index]
      if (!out) {
        console.error("[db:backup] --out 需要一个文件路径。")
        process.exit(1)
      }
      continue
    }
    console.error("[db:backup] 用法：pnpm db:backup [-- --out backups/custom.sql]")
    process.exit(1)
  }
  return { out, ifExists }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const target = requireMysqlTarget(repoRoot, "db:backup")
  let connection
  try {
    connection = await mysql.createConnection({
      ...target.connection,
      dateStrings: true,
      multipleStatements: false,
    })
    await backupUsing(connection, target, options)
  } catch (error) {
    reportMysqlError(error, "db:backup", target.host, target.port)
    process.exitCode = 1
  } finally {
    if (connection) await connection.end()
  }
  if (process.exitCode) process.exit(process.exitCode)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
