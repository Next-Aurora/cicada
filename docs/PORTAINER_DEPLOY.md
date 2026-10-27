# Portainer CI 部署说明

思路对齐参考项目（Docker 镜像 + 阿里云仓库 + Portainer Stack）：GitHub Actions 构建并推送镜像后，用 [cssnr Portainer Stack Deploy](https://github.com/cssnr/portainer-stack-deploy-action) 更新 Stack。

## 概述

- **Workflow**：[`.github/workflows/docker-build.yml`](../.github/workflows/docker-build.yml)
- **触发**：推送 `v*` tag（semantic-release 在 `main` 发版后会打 tag）、`workflow_dispatch`、针对 `main` 的 `pull_request`（仅构建不推送/不部署）
- **流程**：构建镜像 → 推送到阿里云容器镜像服务 → 调用 Portainer API 更新 Stack（`env_data` 注入 `IMAGE_URI`）

日常「改代码上线」仍可用 Vercel；本通道适合自建机（已装 Docker / Portainer / MySQL）上的同构部署。

## 所需配置

### Variables（Settings → Secrets and variables → Actions → Variables）

| Variable | 说明 |
|----------|------|
| `ALIYUN_REGISTRY` | 阿里云个人版域名，如 `crpi-xxxx.cn-chengdu.personal.cr.aliyuncs.com` |
| `ALIYUN_NAMESPACE` | 命名空间；未设时默认 `cicada` |

### Secrets

| Secret | 说明 |
|--------|------|
| `ALIYUN_ACCESS_KEY_ID` | 推送镜像用 |
| `ALIYUN_ACCESS_KEY_SECRET` | 推送镜像用 |
| `PORTAINER_HOST` | Portainer **基地址**，见下方格式 |
| `PORTAINER_ACCESS_TOKEN` | Portainer Access Token（建议专用 CI 用户） |
| `MAIL_*` | 可选邮件通知，见 workflow |

**`PORTAINER_HOST` 格式**：

- ✅ `https://portainer.example.com`、`http://公网IP:9000`、`https://公网IP:9443`
- ❌ 带末尾 `/`、带 `/api`、缺协议、GitHub 托管 Runner 填内网 IP

GitHub 托管 Runner 只能访问公网。Portainer 若仅内网可达，需公网反代或自托管 Runner。

## 镜像与 Stack

- 镜像：`{ALIYUN_REGISTRY}/{ALIYUN_NAMESPACE}/cicadar-ui:{version}`（tag 去掉前缀 `v`）
- Stack 文件：根目录 [`docker-compose.yml`](../docker-compose.yml)，`image: ${IMAGE_URI}`
- CI 只提交该文件，并通过 `env_data` 传 `IMAGE_URI`；**不**读取 `docker-compose.override.yml`
- 本地开发用 override 默认 `cicada:local`

| 触发 | Stack 名称 |
|------|------------|
| production / auto | `cicada` |
| develop | `cicada-develop` |
| staging | `cicada-staging` |

## Portainer 栈环境变量

**CI 注入**：`IMAGE_URI`

**需在栈中自行配置**（与 [`.env.docker`](../.env.docker) 一致）：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | MySQL。库在宿主机时用 `host.docker.internal`（compose 已加 `extra_hosts`） |
| `BETTER_AUTH_SECRET` | ≥32 字符 |
| `BETTER_AUTH_URL` | 对外站点 URL |
| `WEB_PORT` | 默认 `127.0.0.1:3000`，配合 Nginx 反代 |
| 其余 | GitHub / 微信等可选，见 `.env.example` |

首次上线前在宿主机对目标库执行迁移（容器内不自动 migrate）：

```bash
# 在能连上该 MySQL 的环境
pnpm db:migrate
```

## 首次手建 Stack

1. Portainer → Stacks → Add stack，名称 `cicada`
2. 粘贴仓库中的 `docker-compose.yml`
3. 填写环境变量（至少 `IMAGE_URI`、`DATABASE_URL`、`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`）
4. Deploy；之后由 CI 更新镜像

Nginx 反代本机 3000 示例：

```bash
sudo bash scripts/nginx/install.sh --server-name 你的域名 --upstream 127.0.0.1:3000
```

## 故障排查

### Portainer 404

检查 `PORTAINER_HOST` 是否为无路径基地址，以及 Runner 是否真能访问该地址：

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "X-API-Key: <TOKEN>" \
  "<PORTAINER_HOST>/api/system/status"
```

### 镜像拉取失败

确认服务器能拉阿里云个人版仓库，并在 Portainer 配好 Registry 凭据。

### 应用连不上 MySQL

容器内不要写 `127.0.0.1`（那是容器自己）。用 `host.docker.internal`，或把 MySQL 放进同一 Docker 网络后改 `DATABASE_URL` 主机名。

## 相关文档

- [README.docker.md](../README.docker.md)
- [路线图](./roadmap.md)
