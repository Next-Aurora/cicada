# 路线图

## 已具备

| 能力 | 说明 |
|------|------|
| **站点部署** | `git push` → Vercel 自动构建上线（日常「发布网站」） |
| **版本发布流水线** | `main` 推送后 GitHub Actions 跑 [semantic-release](../.releaserc)：分析 Conventional Commits、更新 `CHANGELOG.md` / 版本号、创建 GitHub Release（**不**发 npm） |
| **自建 Docker / Portainer** | `Dockerfile` + `docker-compose.yml`；`v*` tag 触发 [docker-build.yml](../.github/workflows/docker-build.yml) 推镜像并更新 Portainer Stack（与 Vercel 并行，见 [README.docker.md](../README.docker.md)） |
| **账号体系** | Better Auth 发 Cookie；用户、会话、微信票据由 cicadar-api 读写。邮箱密码、可选 GitHub、可选微信内 H5 拉起小程序登录 |

提交信息请用 Conventional Commits（如 `feat:`、`fix:`、`docs:`），否则可能不会 bump 版本。

Auth 环境变量见仓库根目录 [`.env.example`](../.env.example)。表结构在 cicadar-api。服务器上用 MySQL 客户端执行该仓库的 `Persistence/Migrations/InitialAuthSchema.sql`（空库）或 `baseline-existing.sql`（已经由 Prisma 建过表），不需要安装 .NET。本仓 `pnpm db:create` 只创建空库（语句在 [`prisma/create-database.sql`](../prisma/create-database.sql)）。站点通过 `CICADA_API_URL` 调用 API 完成登录读写。

## 计划中

### 评论与收藏

数据表 `comment` / `favorite` 已在 cicadar-api 的初始迁移里（按 `guideSlug` 关联攻略）。下一步：

1. 登录用户可对 `/g/[slug]` 发表评论、收藏攻略
2. 提供列表与删除（仅本人或站长）
3. 不改动攻略静态 HTML 的生成流程

### OpenTelemetry（OTel）可观测性

用于后期看清请求延迟、错误与链路，而不是现在就上。

建议落地顺序：

1. 确认是否需要（流量上来、要排查线上问题再做）。
2. 安装 `@vercel/otel` 与匹配的 OpenTelemetry SDK 版本。
3. 新增根目录 `instrumentation.ts`，在 `register()` 里调用 `registerOTel("cicada")`（或站点名）。
4. 在 Vercel 项目中打开 Observability / 对接所选后端（Vercel 自带或外部 APM）。
5. 用一次真实请求验证 trace 出现后，再按需加自定义 span（如 `sync-guides`、攻略页）。

**注意**：OTel 与「Vercel 部署」无关；不上 OTel 也能正常发版与上线。

### 其他（占位）

- 博客、小工具入口（产品向）
- 需要时再考虑 E2E / Storybook，勿默认恢复整套 boilerplate
