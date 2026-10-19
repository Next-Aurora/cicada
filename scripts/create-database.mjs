#!/usr/bin/env node
/**
 * Create the MySQL database named in DATABASE_URL if it does not exist.
 * Statement lives in prisma/create-database.sql (Prisma Migrate does not create databases).
 */
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import mysql from "mysql2/promise"
import { reportMysqlError, requireMysqlTarget } from "./mysql-env.mjs"
import { createDatabaseStatement } from "./sql-dump.mjs"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

export function readCreateDatabaseStatement(database) {
  return createDatabaseStatement(readFileSync(join(repoRoot, "prisma", "create-database.sql"), "utf8"), database)
}

async function main() {
  const target = requireMysqlTarget(repoRoot, "db:create")
  let connection
  try {
    connection = await mysql.createConnection({
      ...target.connection,
      multipleStatements: false,
    })
    await connection.query(readCreateDatabaseStatement(target.database))
    console.log(`[db:create] 数据库 \`${target.database}\` 已就绪`)
  } catch (error) {
    reportMysqlError(error, "db:create", target.host, target.port)
    process.exitCode = 1
  } finally {
    if (connection) await connection.end()
  }
  if (process.exitCode) process.exit(process.exitCode)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
