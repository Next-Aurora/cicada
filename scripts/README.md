# scripts

按用途分两类：

## 站点工具（仓库根下直接跑）

| 脚本 | 说明 |
|------|------|
| `sync-guides.mjs` | 同步 `guides/` → `public/guides/` |
| `db:create` / `db:backup` / `db:restore` | MySQL 建空库 / 备份 / 恢复。表结构在 cicadar-api |
| `schema-owned-by-api.mjs` | `db:migrate` 与 `db:push` 的说明：不再从本仓建表 |

## 服务器部署（按组件分目录）

每个目录可单独拷到机器上使用：

| 目录 | 入口 | 说明 |
|------|------|------|
| `docker/` | `install.sh` | 安装 Docker Engine（腾讯云镜像） |
| `nginx/` | `install.sh`、`enable-https-wildcard.sh`、`enable-https.sh`、`cicadar.conf`、`cicadar-api.conf` | 安装 Nginx；**泛域名** / 多域名 HTTPS；主站与 API 反代。详见 [nginx/README.md](./nginx/README.md) |
| `mysql/` | `deploy.sh` + `compose.yaml` | MySQL 8 |
| `redis/` | `deploy.sh` + `compose.yaml` | Redis 7 |
| `portainer/` | `deploy.sh` + `compose.yaml` | Portainer CE |

示例：

```bash
sudo bash scripts/docker/install.sh
sudo bash scripts/mysql/deploy.sh
sudo bash scripts/redis/deploy.sh
sudo bash scripts/portainer/deploy.sh
sudo bash scripts/nginx/install.sh
sudo cp scripts/nginx/cicadar.conf /etc/nginx/sites-available/cicadar.conf
sudo ln -sfn /etc/nginx/sites-available/cicadar.conf /etc/nginx/sites-enabled/cicadar.conf
sudo nginx -t && sudo systemctl reload nginx
# 泛域名证书（推荐）：先配置 /etc/cicadar/dns-credentials.env；大陆加 --china
sudo bash scripts/nginx/enable-https-wildcard.sh --email you@example.com --china
```

Nginx / HTTPS（含泛域名）见 **[nginx/README.md](./nginx/README.md)**。应用本体的 Docker / Portainer CI 见仓库根目录 `Dockerfile`、`docker-compose.yml`、`README.docker.md`。
