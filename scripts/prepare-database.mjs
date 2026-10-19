#!/usr/bin/env node
/**
 * One connection for the pre-migration step: dump existing tables, then create the database.
 */
import mysql from "mysql2/promise"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { backupUsing } from "./backup-database.mjs"
import { readCreateDatabaseStatement } from "./create-database.mjs"
import { reportMysqlError, requireMysqlTarget } from "./mysql-env.mjs"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const target = requireMysqlTarget(repoRoot, "db:create")

let connection
try {
  connection = await mysql.createConnection({
    ...target.connection,
    dateStrings: true,
    multipleStatements: false,
  })
  try {
    await backupUsing(connection, target, { ifExists: true })
  } catch (error) {
    reportMysqlError(error, "db:backup", target.host, target.port)
    process.exitCode = 1
  }
  if (!process.exitCode) {
    await connection.query(readCreateDatabaseStatement(target.database))
    console.log(`[db:create] 数据库 \`${target.database}\` 已就绪`)
  }
} catch (error) {
  reportMysqlError(error, "db:create", target.host, target.port)
  process.exitCode = 1
} finally {
  if (connection) await connection.end()
}

if (process.exitCode) process.exit(process.exitCode)
