# scripts

按用途分两类：

## 站点工具（仓库根下直接跑）

| 脚本 | 说明 |
|------|------|
| `sync-guides.mjs` | 同步 `guides/` → `public/guides/` |
| `prepare-database.mjs` 等 `db:*` | MySQL 建库 / 备份 / 恢复（配合 Prisma） |

## 服务器部署（按组件分目录）

每个目录可单独拷到机器上使用：

| 目录 | 入口 | 说明 |
|------|------|------|
| `docker/` | `install.sh` | 安装 Docker Engine（腾讯云镜像） |
| `nginx/` | `install.sh` | 安装并配置 Nginx |
| `mysql/` | `deploy.sh` + `compose.yaml` | MySQL 8 |
| `redis/` | `deploy.sh` + `compose.yaml` | Redis 7 |
| `portainer/` | `deploy.sh` + `compose.yaml` | Portainer CE |

示例：

```bash
sudo bash scripts/docker/install.sh
sudo bash scripts/mysql/deploy.sh
sudo bash scripts/redis/deploy.sh
sudo bash scripts/portainer/deploy.sh
sudo bash scripts/nginx/install.sh --server-name example.com --upstream 127.0.0.1:3000
```

应用本体的 Docker / Portainer CI 见仓库根目录 `Dockerfile`、`docker-compose.yml`、`README.docker.md`。
