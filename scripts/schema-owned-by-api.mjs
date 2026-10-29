#!/usr/bin/env node

console.error(`表结构由 cicadar-api 的 EF Core 迁移维护，这里不再执行 prisma migrate / db push。

空库：在已有该库的 MySQL 上执行 cicadar-api 的
  Persistence/Migrations/InitialAuthSchema.sql
不需要在服务器上安装 .NET。

已经由 Prisma 建过表的库：不要执行上一份。改为执行
  cicadar-api/Persistence/Migrations/baseline-existing.sql
只把初始迁移记为已应用。

站点登录不再用 Prisma 读写这些表，改调 cicadar-api 的 internal/auth-store。以后改表先改后端实体并新增 EF 迁移，再把同一形状同步回 schema.prisma。`)

process.exit(1)
