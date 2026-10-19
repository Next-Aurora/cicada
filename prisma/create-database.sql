-- 建库语句。由 `pnpm db:create` 在迁移前执行。
-- Prisma Migrate 只建表，不会创建数据库本身。
-- 库名默认 cicada；若 DATABASE_URL 指向其他库名，脚本会改写这一处再执行。
CREATE DATABASE IF NOT EXISTS `cicada`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
