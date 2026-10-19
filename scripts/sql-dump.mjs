import { escape as escapeValue } from "mysql2/promise"

export const BACKUP_MARK = "-- cicada backup"
export const BACKUP_KEEP = 10
export const INSERT_BATCH = 100

export function quoteIdent(name) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`无法导出标识符 ${name}`)
  }
  return `\`${name}\``
}

export function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL"
  if (Buffer.isBuffer(value)) return `X'${value.toString("hex")}'`
  if (typeof value === "bigint") return value.toString()
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    return escapeValue(JSON.stringify(value))
  }
  return escapeValue(value)
}

export function timestampForFile(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0")
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

export function isManagedBackupName(database, name) {
  const prefix = `${database}-`
  if (!name.startsWith(prefix) || !name.endsWith(".sql")) return false
  return /^\d{8}-\d{6}$/.test(name.slice(prefix.length, -".sql".length))
}

export function insertStatement(table, columns, rows) {
  const columnList = columns.map((column) => quoteIdent(column)).join(", ")
  const values = rows
    .map((row) => `(${columns.map((column) => sqlLiteral(row[column])).join(", ")})`)
    .join(",\n")
  return `INSERT INTO ${quoteIdent(table)} (${columnList}) VALUES\n${values};\n`
}

export function createDatabaseStatement(template, database) {
  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error("数据库名只能包含字母、数字和下划线。")
  }
  const pattern = /CREATE DATABASE IF NOT EXISTS `([A-Za-z0-9_]+)`/i
  if (!pattern.test(template)) {
    throw new Error("prisma/create-database.sql 中缺少 CREATE DATABASE IF NOT EXISTS 语句。")
  }
  return template.replace(pattern, `CREATE DATABASE IF NOT EXISTS \`${database}\``)
}

export function splitSqlStatements(sql) {
  const statements = []
  let start = 0
  let quote = null
  for (let index = 0; index < sql.length; index++) {
    const char = sql[index]
    if (quote) {
      if (char === "\\" && quote !== "`") {
        index += 1
        continue
      }
      if (char === quote) {
        if (quote === "'" && sql[index + 1] === "'") {
          index += 1
          continue
        }
        quote = null
      }
      continue
    }
    if (char === "-" && sql[index + 1] === "-" && isCommentStart(sql[index + 2])) {
      while (index < sql.length && sql[index] !== "\n") index += 1
      continue
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char
      continue
    }
    if (char === ";") {
      const statement = sql.slice(start, index).trim()
      if (statement) statements.push(statement)
      start = index + 1
    }
  }
  const tail = sql.slice(start).trim()
  if (tail) statements.push(tail)
  return statements
}

function isCommentStart(char) {
  return char === undefined || char === " " || char === "\t" || char === "\n" || char === "\r"
}
