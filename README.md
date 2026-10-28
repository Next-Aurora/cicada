# 凌风蝉 · cicadar

个人站点：**旅行攻略**、博客与小工具（后两者陆续开放）。

- 仓库：[Next-Aurora/cicada](https://github.com/Next-Aurora/cicada)
- UI：shadcn **base-nova**（`components/ui`）
- 生产：以 Vercel 项目 [cicada](https://vercel.com/wintersmilesb101s-projects/cicada) 绑定域名为准
- 版本发布：`main` 上 [semantic-release](.github/workflows/release.yml)（Changelog + GitHub Release）；站点上线仍靠 Vercel
- 自建部署（可选）：Docker 镜像 + 阿里云仓库 + Portainer Stack，见 [README.docker.md](README.docker.md)、[docs/PORTAINER_DEPLOY.md](docs/PORTAINER_DEPLOY.md)；Nginx / HTTPS 见 [scripts/nginx/README.md](scripts/nginx/README.md)
- 账号：Better Auth + Prisma(MySQL)；邮箱密码、可选 GitHub、可选微信内 H5 拉起小程序登录；公开攻略页无需登录

## 日常开发

```bash
pnpm install
pnpm sync-guides   # guides/ → public/guides/
pnpm db:migrate    # 已有表时先备份（backups/ 保留最近 10 份），再建库并执行迁移
pnpm db:backup     # 导出结构与数据到 backups/<库名>-时间戳.sql
pnpm db:restore -- backups/<file>.sql
pnpm dev
```

复制 [`.env.example`](.env.example) 为 `.env` 并填写：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | MySQL 连接串；Vercel 上建议加 `?connection_limit=1`（或使用连接池） |
| `BETTER_AUTH_SECRET` | ≥32 字符密钥（可用 `openssl rand -base64 32`） |
| `BETTER_AUTH_URL` | 本地 `http://localhost:3000`，生产为站点 URL |
| `AUTH_TRUSTED_ORIGINS` | 可选，额外信任来源（逗号分隔） |
| `AUTH_IDLE_TIMEOUT_MINUTES` | 无操作自动退出分钟数，默认 `10`（范围 1～1440；客户端闲置检测，跨标签同步；到期前约 1 分钟提示） |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth；回调 `{BETTER_AUTH_URL}/api/auth/callback/github`；未配置时登录页不显示 GitHub 按钮 |
| `WECHAT_MINI_APP_ID` / `WECHAT_MINI_APP_SECRET` | 微信内 H5 拉起小程序登录；可验证邮箱密码后绑定同一账号；未配置时不显示微信按钮；见 `wechat-miniprogram/README.md` |

| 路径 | 用途 |
|------|------|
| `app/` | Next App Router 站点壳 |
| `app/login` · `app/register` | 登录 / 注册 |
| `components/ui/` | shadcn 组件 |
| `prisma/` | Better Auth 与评论/收藏预留表 |
| `wechat-miniprogram/` | 微信登录小程序源码（需单独上传） |
| `backups/` | `pnpm db:backup` 导出的 SQL（含账号数据，不提交，默认保留最近 10 份） |
| `guides/<slug>/` | travel-guide Skill 落盘攻略 HTML |
| `public/guides/` | 同步后的静态文件（需提交） |
| `styles/` | 全局样式与主题 token |
| `.cursor/skills/travel-guide` | 攻略生成 Skill |
| `.cursor/rules/` | AI 开发约定 |

说明文档：

- [旅行攻略](docs/travel-guides.md)
- [Skills 与 MCP](docs/cursor-skills-mcp.md)
- [路线图（Auth / 评论收藏 / OTel）](docs/roadmap.md)
- [站点设计备忘](docs/superpowers/specs/2026-09-19-travel-guides-vercel-design.md)

## 生成攻略

用 Cursor **打开本仓库根目录**，走 `travel-guide` Skill。产出写入 `guides/<slug>/`，再：

```bash
pnpm sync-guides
git add guides public/guides && git commit && git push
```
