# 凌风蝉 · cicadar

**旅行攻略**、博客与小工具（后两者陆续开放）。

- 仓库：[Next-Aurora/cicada](https://github.com/Next-Aurora/cicada)
- UI：shadcn **base-nova**（`components/ui`）
- 生产：以 Vercel 项目 [cicada](https://vercel.com/wintersmilesb101s-projects/cicada) 绑定域名为准
- 版本发布：`main` 上 [semantic-release](.github/workflows/release.yml)（Changelog + GitHub Release）；站点上线仍靠 Vercel
- 自建部署（可选）：Docker 镜像 + 阿里云仓库 + Portainer Stack，见 [README.docker.md](README.docker.md)、[docs/PORTAINER_DEPLOY.md](docs/PORTAINER_DEPLOY.md)；Nginx / HTTPS 见 [scripts/nginx/README.md](scripts/nginx/README.md)
- 账号：Better Auth 在站点里发 Cookie；用户、会话、微信票据的读写走 cicadar-api。邮箱密码、可选 GitHub、可选微信内 H5 拉起小程序登录；公开攻略页无需登录

## 日常开发

```bash
pnpm install
pnpm sync-guides   # guides/ → public/guides/
pnpm db:create     # 只建空库。表结构见下方「建表」
pnpm db:backup     # 导出结构与数据到 backups/<库名>-时间戳.sql
pnpm db:restore -- backups/<file>.sql
pnpm dev
```

复制 [`.env.example`](.env.example) 为 `.env` 并填写：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | 本机建库、备份用的 MySQL 连接串。站点登录不再直连数据库 |
| `CICADA_API_URL` | cicadar-api 地址，例如 `http://127.0.0.1:8080` |
| `CICADA_INTERNAL_TOKEN` | 与 API `INTERNAL_AUTH_TOKEN` 相同。`pnpm auth:secrets` 会成对生成 |
| `BETTER_AUTH_SECRET` | ≥32 字符密钥。`pnpm auth:secrets` 生成，不要提交到仓库 |
| `BETTER_AUTH_URL` | 本地 `http://localhost:3000`，生产为站点 URL |
| `AUTH_TRUSTED_ORIGINS` | 可选，额外信任来源（逗号分隔） |
| `AUTH_IDLE_TIMEOUT_MINUTES` | 无操作自动退出分钟数，默认 `10`（范围 1～1440；客户端闲置检测，跨标签同步；到期前约 1 分钟提示） |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth；回调 `{BETTER_AUTH_URL}/api/auth/callback/github`；未配置时登录页不显示 GitHub 按钮 |
| `WECHAT_MINI_APP_ID` / `WECHAT_MINI_APP_SECRET` | 微信内 H5 拉起小程序登录；可验证邮箱密码后绑定同一账号；未配置时不显示微信按钮；见 `wechat-miniprogram/README.md` |

## 服务器 MySQL 与 Portainer

MySQL 用 `scripts/mysql/deploy.sh` 部署，只监听服务器的 `127.0.0.1:3306`。应用用户是 `cicada`，密码在服务器 `/opt/mysql/.env`，不要写进仓库或镜像。

容器访问宿主机上的 MySQL 时用 `host.docker.internal`，不要写 `127.0.0.1`（那是容器自己）。密钥用 `pnpm auth:secrets` 生成（32 字节随机数，Base64），输出只贴进 Portainer。在栈的环境变量里填写：

**cicadar-api**（登录读写走这个栈）：

| 变量 | 值 |
|------|-----|
| `CONNECTION_STRING` | `server=host.docker.internal;port=3306;database=cicada;user=cicada;password=应用用户密码` |
| `INTERNAL_AUTH_TOKEN` | `pnpm auth:secrets` 生成，与站点 `CICADA_INTERNAL_TOKEN` 相同 |

**cicada 站点**：

| 变量 | 值 |
|------|-----|
| `CICADA_API_URL` | `http://host.docker.internal:8080` |
| `CICADA_INTERNAL_TOKEN` | 与 API 的 `INTERNAL_AUTH_TOKEN` 相同 |
| `DATABASE_URL` | 只给备份脚本。`mysql://cicada:密码@host.docker.internal:3306/cicada` |

改过 API 的 `docker-compose.yml` 后，在 Portainer 里重新部署 cicadar-api，`host.docker.internal` 才会生效。

## API 的 Nginx

公网入口是 [`scripts/nginx/cicadar-api.conf`](scripts/nginx/cicadar-api.conf)：`api.cicadar.cn` 反代到 `127.0.0.1:8080`。`/internal/` 在这份配置里直接 404。站点容器访问 API 仍用上一节的 `http://host.docker.internal:8080`。

先把 `api.cicadar.cn` 解析到这台机器。泛证书已经覆盖 `*.cicadar.cn`，一般不用重签。在服务器上执行：

```bash
sudo cp scripts/nginx/cicadar-api.conf /etc/nginx/sites-available/cicadar-api.conf
sudo ln -sfn /etc/nginx/sites-available/cicadar-api.conf /etc/nginx/sites-enabled/cicadar-api.conf
sudo nginx -t && sudo systemctl reload nginx
```

证书就绪后，取消该文件里 HTTPS `server` 的注释，再执行一次 `nginx -t` 并 reload。主站 Nginx 的完整步骤见 [scripts/nginx/README.md](scripts/nginx/README.md)。

## 从自己的电脑连这台库

3306 保持只绑在服务器本机，不要改成对公网开放。日常用应用用户 `cicada`，不要用 root。密码在客户端里交互输入，不要写进命令行（会进 shell 历史）。

在服务器上执行 SQL 时，先 SSH 登录，再在服务器本机连：

```bash
mysql -h 127.0.0.1 -u cicada -p cicada
```

必须用自己电脑上的图形客户端时，走 SSH 隧道，不要把 3306 暴露到公网：

```bash
ssh -L 3306:127.0.0.1:3306 用户@服务器
```

客户端主机填 `127.0.0.1`，端口 `3306`，用户 `cicada`。DataGrip、MySQL Workbench、DBeaver 选「通过 SSH 连接」是同一做法。

## 建表

服务器不需要安装 .NET，API 启动时也不会自动建表。库要已经存在（`scripts/mysql/deploy.sh` 会建好 `cicada`）。SQL 在 cicadar-api 的 `Persistence/Migrations/InitialAuthSchema.sql`。

空库执行这份脚本。完成后有 8 张表：`user`、`session`、`account`、`verification`、`wechat_login_ticket`、`favorite`、`comment`，以及登记迁移的 `__EFMigrationsHistory`。表、索引、外键已经存在时会跳过，可以重复执行。

命令行会按分号逐条执行，密码交互输入：

```bash
mysql -h 127.0.0.1 -u cicada -p cicada < Persistence/Migrations/InitialAuthSchema.sql
```

图形客户端先选中 `cicada` 库，再用「执行脚本」（DBeaver 是 Alt+X）。全文选中后当成一条语句执行时，会在第二条 `CREATE TABLE` 上报 1064。DataGrip 在数据源 Advanced 里打开 `allowMultiQueries=true`，重新连接后再执行整份。

已经由 Prisma 建过表的库，只执行 `baseline-existing.sql`，用来登记迁移记录。

```bash
mysql -h 127.0.0.1 -u cicada -p cicada < Persistence/Migrations/baseline-existing.sql
```

改模型之后，在装有 .NET SDK 的开发机上重新导出 SQL。`dotnet ef migrations script` 会带上 `DELIMITER`，需要整理成现在这种按分号分隔的普通语句。服务器仍只用 MySQL 客户端执行。

## 仓库路径

| 路径 | 用途 |
|------|------|
| `app/` | Next App Router 站点壳 |
| `app/login` · `app/register` | 登录 / 注册 |
| `components/ui/` | shadcn 组件 |
| `prisma/` | 表结构镜像。登录读写在 cicadar-api |
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
