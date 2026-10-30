# cicada Docker / Portainer 部署

与 Vercel 并行的一套自建发布方式：镜像构建 → 阿里云容器镜像服务 → Portainer Stack。

## 前置

- Docker 20.10+、Compose v2
- 服务器上已部署 MySQL（可用 `scripts/mysql/deploy.sh`）
- 可选：Nginx、Portainer（见 [`scripts/nginx/README.md`](./scripts/nginx/README.md)、`scripts/portainer/`）

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

- **运行时**注入 `DATABASE_URL`、`CICADA_API_URL`、`CICADA_INTERNAL_TOKEN`、`BETTER_AUTH_*`（不是构建期 `NEXT_PUBLIC_*`）
- 宿主机 MySQL 只监听 `127.0.0.1:3306`。容器里用 `host.docker.internal`。API 栈用 `CONNECTION_STRING=server=host.docker.internal;port=3306;database=cicada;user=cicada;password=...`，站点登录通过 API，不直连库。从自己电脑连接用 SSH 隧道，见 [README](./README.md)
- 默认端口绑定 `127.0.0.1:3000`，前面用 Nginx 反代（主站 `scripts/nginx/cicadar.conf`，API `scripts/nginx/cicadar-api.conf`）
- 对外 HTTPS：推荐泛域名 `scripts/nginx/enable-https-wildcard.sh`（步骤见 [scripts/nginx/README.md](./scripts/nginx/README.md)）

### Nginx 反代与 HTTPS（摘要）

```bash
sudo bash scripts/nginx/install.sh
sudo cp scripts/nginx/cicadar.conf /etc/nginx/sites-available/cicadar.conf
sudo ln -sfn /etc/nginx/sites-available/cicadar.conf /etc/nginx/sites-enabled/cicadar.conf
sudo cp scripts/nginx/cicadar-api.conf /etc/nginx/sites-available/cicadar-api.conf
sudo ln -sfn /etc/nginx/sites-available/cicadar-api.conf /etc/nginx/sites-enabled/cicadar-api.conf
sudo nginx -t && sudo systemctl reload nginx
# 凭据：/etc/cicadar/dns-credentials.env（见 dns-credentials.env.example）
# 大陆加 --china；TXT NXDOMAIN 见 scripts/nginx/README.md 故障排查
sudo bash scripts/nginx/enable-https-wildcard.sh --email you@example.com --china
# 然后取消 cicadar.conf、cicadar-api.conf 中 HTTPS server 注释并 reload
```

泛证书覆盖 `cicadar.cn` + `*.cicadar.cn`，自动续期；子域共用 `/etc/nginx/snippets/ssl-cicadar.cn.conf`。`api.cicadar.cn` 反代到 `127.0.0.1:8080`，`/internal/` 在 Nginx 上直接 404。站点容器仍用 `http://host.docker.internal:8080`。说明见 [README](./README.md) 的「API 的 Nginx」。

## 常用命令

```bash
docker compose up -d
docker compose logs -f web
docker compose pull && docker compose up -d --force-recreate web
docker compose down
```

## CI → Portainer

推送到 `main`、推送 `v*` tag，或手动跑 **Build and Push Docker Image** 后：

1. 构建并推送 `{registry}/{namespace}/cicadar-ui:{version}`
2. 更新 Portainer Stack `cicada`（或 develop/staging 后缀）

配置项与排错见 **[docs/PORTAINER_DEPLOY.md](./docs/PORTAINER_DEPLOY.md)**。

## 与 Vercel 的关系

| 通道 | 用途 |
|------|------|
| Vercel | 绑定域名的日常站点发布（现有） |
| Docker + Portainer | 自建机同构部署、可控运维 |

两套可同时存在；对外域名指到哪边由 DNS / Nginx 决定。
