# Portainer CI 部署说明

思路对齐参考项目（Docker 镜像 + 阿里云仓库 + Portainer Stack）：GitHub Actions 构建并推送镜像后，用 [cssnr Portainer Stack Deploy](https://github.com/cssnr/portainer-stack-deploy-action) 更新 Stack。

## 概述

- **Workflow**：[`.github/workflows/docker-build.yml`](../.github/workflows/docker-build.yml)
- **触发**：推送 `v*` tag（semantic-release 在 `main` 发版后会打 tag）、`workflow_dispatch`、针对 `main` 的 `pull_request`（仅构建不推送/不部署）
- **定时（自建栈）**：[`.github/workflows/weekly-deploy.yml`](../.github/workflows/weekly-deploy.yml) — 北京时间 **每周一 00:00**（周日 24:00）检查 `main` 是否较上次 weekly 成功部署有**新提交**；有则复用 `docker-build` 构建并更新 Portainer。无新提交则跳过。镜像 tag 形如 **`weekly-{短SHA}-{run}`**（与发版 tag / `main-*` 区分）。Actions → **Weekly Deploy** 可手动试跑。
- **流程**：构建镜像 → 推送到阿里云容器镜像服务 → 调用 Portainer API 更新 Stack（`env_data` 注入 `IMAGE_URI`）

日常「改代码上线」仍可用 Vercel；本通道适合自建机（已装 Docker / Portainer / MySQL）上的同构部署。

## 所需配置

### Variables（Settings → Secrets and variables → Actions → Variables）

| Variable | 说明 |
|----------|------|
| `ALIYUN_REGISTRY` | 阿里云**公网**仓库域名。个人版如 `crpi-xxxx.cn-chengdu.personal.cr.aliyuncs.com`；企业版公网如 `registry.cn-chengdu.aliyuncs.com`。**不要**用 `registry-vpc.*`（仅 VPC 内网，GitHub Actions 连不上） |
| `ALIYUN_NAMESPACE` | 命名空间；未设时默认 `cicada` |

### Secrets

| Secret | 说明 |
|--------|------|
| `ALIYUN_REGISTRY_USERNAME` | ACR **镜像仓库登录名**（控制台 → 访问凭证页可见；主账号一般是阿里云登录名，不是纯数字 UID） |
| `ALIYUN_REGISTRY_PASSWORD` | ACR **Registry 固定密码**（同一页「设置固定密码」；**不是**阿里云登录密码，也**不是** AccessKey Secret） |
| `ALIYUN_ACCESS_KEY_ID` / `ALIYUN_ACCESS_KEY_SECRET` | 兼容旧名；未设上面两个时会回退用它们（仍须填成登录名/固定密码，不要填 AccessKey） |
| `PORTAINER_HOST` | Portainer **基地址**，见下方格式 |
| `PORTAINER_ACCESS_TOKEN` | Portainer Access Token（建议专用 CI 用户） |
| `MAIL_*` | 可选邮件通知，见 workflow |

登录失败报 `unauthorized: authentication required` 时，到成都地域的 ACR 控制台打开「访问凭证」，按页面上的 `docker login` 命令核对用户名，并确认已设置固定密码。

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
| `DATABASE_URL` | 备份脚本用。容器内主机写 `host.docker.internal`，格式 `mysql://cicada:密码@host.docker.internal:3306/cicada`。登录不再直连 MySQL |
| `CICADA_API_URL` | cicadar-api 地址。容器里访问宿主机用 `http://host.docker.internal:8080` |
| `CICADA_INTERNAL_TOKEN` | 与 API 栈的 `INTERNAL_AUTH_TOKEN` 相同 |
| `BETTER_AUTH_SECRET` | ≥32 字符 |
| `BETTER_AUTH_URL` | 对外站点 URL |
| `WEB_PORT` | 默认 `127.0.0.1:3000`，配合 Nginx 反代 |
| 其余 | GitHub / 微信等可选，见 `.env.example` |

**cicadar-api 栈**另配（MySQL 在宿主机、只监听 `127.0.0.1:3306` 时）：

| 变量 | 值 |
|------|-----|
| `CONNECTION_STRING` | `server=host.docker.internal;port=3306;database=cicada;user=cicada;password=应用用户密码` |
| `INTERNAL_AUTH_TOKEN` | 与站点 `CICADA_INTERNAL_TOKEN` 相同 |

密码来自服务器 `/opt/mysql/.env` 的应用用户。从自己电脑连这台库用 SSH 隧道，见 [README](../README.md) 的「从自己的电脑连这台库」。建表步骤见同一篇的「建表」。

首次上线前在能连上该 MySQL 的机器上建表（不需要 .NET，容器内也不自动 migrate）。SQL 在 cicadar-api：

```bash
# 空库。库要已存在，把「库名」换成实际库。
mysql -h127.0.0.1 -u用户 -p 库名 < Persistence/Migrations/InitialAuthSchema.sql

# 已经由 Prisma 建过表的库：不要执行上一份，改为
mysql -h127.0.0.1 -u用户 -p 库名 < Persistence/Migrations/baseline-existing.sql
```

## 首次手建 Stack

1. Portainer → Stacks → Add stack，名称 `cicada`
2. 粘贴仓库中的 `docker-compose.yml`
3. 填写环境变量（至少 `IMAGE_URI`、`DATABASE_URL`、`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`）
4. Deploy；之后由 CI 更新镜像

### Nginx 反代与 HTTPS

完整步骤见 **[scripts/nginx/README.md](../scripts/nginx/README.md)**。摘要（**推荐泛域名**）：

```bash
sudo bash scripts/nginx/install.sh
sudo cp scripts/nginx/cicadar.conf /etc/nginx/sites-available/cicadar.conf
sudo ln -sfn /etc/nginx/sites-available/cicadar.conf /etc/nginx/sites-enabled/cicadar.conf
sudo nginx -t && sudo systemctl reload nginx
# DNS API 凭据 → /etc/cicadar/dns-credentials.env（见 dns-credentials.env.example）
# 大陆加 --china；须保证域名 NS 已指向该解析商
sudo bash scripts/nginx/enable-https-wildcard.sh --email you@example.com --china
# 取消站点 conf 中 HTTPS 注释：include /etc/nginx/snippets/ssl-cicadar.cn.conf;
```

- 反代模板：[`cicadar.conf`](../scripts/nginx/cicadar.conf)；证书覆盖 `cicadar.cn` + `*.cicadar.cn`，acme.sh 自动续期
- 凭据 / `--china` / TXT NXDOMAIN 排查：见 [`scripts/nginx/README.md`](../scripts/nginx/README.md)
- 无 DNS API 时可用备选 [`enable-https.sh`](../scripts/nginx/enable-https.sh)（HTTP-01，须每个域名已有公网解析）
- 其他通用反代：`sudo bash scripts/nginx/install.sh --server-name 你的域名 --upstream 127.0.0.1:3000`

## 故障排查

### Portainer 404

检查 `PORTAINER_HOST` 是否为无路径基地址，以及 Runner 是否真能访问该地址：

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "X-API-Key: <TOKEN>" \
  "<PORTAINER_HOST>/api/system/status"
```

### 推送报 `unknown manifest class for application/vnd.oci.empty.v1+json`

ACR 个人版不接受 BuildKit 默认附带的 OCI attestation。workflow 已设 `provenance: false` / `sbom: false`；本地构建请加同样参数。

### 镜像拉取失败

确认服务器能拉阿里云个人版仓库，并在 Portainer 配好 Registry 凭据。

### 应用连不上 MySQL

容器内不要写 `127.0.0.1`（那是容器自己）。用 `host.docker.internal`，或把 MySQL 放进同一 Docker 网络后改 `DATABASE_URL` 主机名。

## 相关文档

- [README.docker.md](../README.docker.md)
- [scripts/nginx/README.md](../scripts/nginx/README.md)（反代 + HTTPS）
- [路线图](./roadmap.md)
