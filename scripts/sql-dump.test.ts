import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import {
  createDatabaseStatement,
  insertStatement,
  isManagedBackupName,
  splitSqlStatements,
  sqlLiteral,
  timestampForFile,
} from "./sql-dump.mjs"

describe("sql dump helpers", () => {
  it("escapes values that would break an insert", () => {
    expect(sqlLiteral(null)).toBe("NULL")
    expect(sqlLiteral(undefined)).toBe("NULL")
    expect(sqlLiteral("a';b")).toBe("'a\\';b'")
    expect(sqlLiteral(Buffer.from([0, 255]))).toBe("X'00ff'")
    expect(sqlLiteral(1n)).toBe("1")
  })

  it("keeps semicolons and quotes inside strings as one statement", () => {
    const sql = "INSERT INTO `t` (`body`) VALUES ('a;b', 'it''s');\nSELECT 1;"
    expect(splitSqlStatements(sql)).toEqual([
      "INSERT INTO `t` (`body`) VALUES ('a;b', 'it''s')",
      "SELECT 1",
    ])
  })

  it("builds one batched insert", () => {
    expect(insertStatement("user", ["id", "name"], [{ id: "1", name: "蝉" }])).toBe(
      "INSERT INTO `user` (`id`, `name`) VALUES\n('1', '蝉');\n",
    )
  })

  it("rewrites only the create database statement", () => {
    const template = readFileSync("prisma/create-database.sql", "utf8")
    const sql = createDatabaseStatement(template, "other_db")
    expect(sql).toMatch(/CREATE DATABASE IF NOT EXISTS `other_db`/)
    expect(sql).not.toMatch(/CREATE DATABASE IF NOT EXISTS `cicada`/)
  })

  it("recognizes timestamped backup files", () => {
    expect(timestampForFile(new Date(2026, 9, 18, 15, 47, 3))).toBe("20261018-154703")
    expect(isManagedBackupName("cicada", "cicada-20261018-154703.sql")).toBe(true)
    expect(isManagedBackupName("cicada", "cicada-manual.sql")).toBe(false)
    expect(isManagedBackupName("cicada", "other-20261018-154703.sql")).toBe(false)
  })
})
