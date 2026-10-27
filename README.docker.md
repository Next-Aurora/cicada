# cicada Docker / Portainer 部署

与 Vercel 并行的一套自建发布方式：镜像构建 → 阿里云容器镜像服务 → Portainer Stack。

## 前置

- Docker 20.10+、Compose v2
- 服务器上已部署 MySQL（可用 `scripts/mysql/deploy.sh`）
- 可选：Nginx、Portainer（见 `scripts/nginx/`、`scripts/portainer/`）

## 本地构建并运行

```bash
cp .env.docker .env
# 编辑 DATABASE_URL、BETTER_AUTH_SECRET、BETTER_AUTH_URL

docker build -t cicada:local .
docker compose up -d
docker compose ps
curl -fsS http://127.0.0.1:3000/api/health
```

不要单独写 `-f docker-compose.yml`，否则不会加载 `docker-compose.override.yml`，缺少默认 `IMAGE_URI` 会失败。

## 环境变量

见 [`.env.docker`](./.env.docker) 与 [`.env.example`](./.env.example)。

要点：

- **运行时**注入 `DATABASE_URL`、`BETTER_AUTH_*`（不是构建期 `NEXT_PUBLIC_*`）
- 宿主机 MySQL：`DATABASE_URL=...@host.docker.internal:3306/cicada`
- 默认端口绑定 `127.0.0.1:3000`，前面用 Nginx 反代

## 常用命令

```bash
docker compose up -d
docker compose logs -f web
docker compose pull && docker compose up -d --force-recreate web
docker compose down
```

## CI → Portainer

推送 `v*` tag（或手动跑 **Build and Push Docker Image**）后：

1. 构建并推送 `{registry}/{namespace}/cicada:{version}`
2. 更新 Portainer Stack `cicada`（或 develop/staging 后缀）

配置项与排错见 **[docs/PORTAINER_DEPLOY.md](./docs/PORTAINER_DEPLOY.md)**。

## 与 Vercel 的关系

| 通道 | 用途 |
|------|------|
| Vercel | 绑定域名的日常站点发布（现有） |
| Docker + Portainer | 自建机同构部署、可控运维 |

两套可同时存在；对外域名指到哪边由 DNS / Nginx 决定。
