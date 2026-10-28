# Nginx（自建机反代 + HTTPS）

Ubuntu 上安装 Nginx、挂上 cicadar 站点，并用 Let's Encrypt 开 HTTPS。

| 文件 | 作用 |
|------|------|
| `install.sh` | 安装 Nginx、基础配置；可选 `--server-name` + `--upstream` / `--root` |
| `cicadar.conf` | 生产反代模板：`cicadar.cn` / `www` → `127.0.0.1:3000` |
| `enable-https-wildcard.sh` | **推荐**：`*.域名` + 根域 DNS-01 泛证书 + acme.sh 自动续期 |
| `dns-credentials.env.example` | 泛证书用的 DNS API 凭据模板 |
| `enable-https.sh` | 备选：按明确域名列表 HTTP-01（certbot，**不能**签通配符） |

## 选哪种证书？

| 方式 | 适用 | 前置 |
|------|------|------|
| **泛域名** `enable-https-wildcard.sh` | 整站任意子域（`cd` / `www` / `api`…）共用一张证 | 域名 NS 已指向解析商 + 该商 API（阿里云 / DNSPod / 腾讯云 / Cloudflare） |
| 多域名 SAN `enable-https.sh` | 只有少数固定域名、没有 DNS API | 每个域名公网 A/AAAA 已指向本机 |

泛域名证书含 `cicadar.cn` 与 `*.cicadar.cn`；新子域一般**不用重签**，配好 nginx 即可。  
certbot 也能做泛域名（同样要 DNS-01 + 插件），本仓库泛证书默认用 **acme.sh**（国内解析商支持更省事）。

---

## 推荐：泛域名 HTTPS

### 1. 准备 DNS API 凭据

```bash
sudo mkdir -p /etc/cicadar
sudo cp scripts/nginx/dns-credentials.env.example /etc/cicadar/dns-credentials.env
sudo chmod 600 /etc/cicadar/dns-credentials.env
sudo nano /etc/cicadar/dns-credentials.env
```

**阿里云 DNS**（`DNS_PROVIDER=aliyun`）：

```bash
DNS_PROVIDER=aliyun
Ali_Key=你的AccessKeyId
Ali_Secret=你的AccessKeySecret
```

建议用**仅有云解析权限**的 RAM 子账号。

**DNSPod Token**（`DNS_PROVIDER=dnspod`）：

1. 打开 [密钥管理](https://console.dnspod.cn/account/token/) → 账号中心 → 密钥管理 → 创建密钥  
2. 选 **DNSPod Token**（不要选「腾讯云 API 密钥」）  
3. 创建后只显示一次：**ID → `DP_Id`，Token → `DP_Key`**（分开放，不要拼成 `ID,Token`）  
4. 文档：[DNSPod 密钥说明](https://docs.dnspod.cn/account/dnspod-token/)

```bash
DNS_PROVIDER=dnspod
DP_Id=刚才的ID
DP_Key=刚才的Token
```

若只有腾讯云 **SecretId / SecretKey**，改用：

```bash
DNS_PROVIDER=tencent
Tencent_SecretId=...
Tencent_SecretKey=...
```

Cloudflare 等见 `dns-credentials.env.example` 注释。

**签发前必查：** 域名的权威 NS 必须指向你正在用的这家解析商，且域名在该 API 账号控制台里。

```bash
dig NS cicadar.cn +short
# DNSPod 常见 *.dnspod.net；阿里云常见 *.alidns.com
```

### 2. 装 Nginx + 主站 HTTP

```bash
sudo bash scripts/nginx/install.sh
sudo cp scripts/nginx/cicadar.conf /etc/nginx/sites-available/cicadar.conf
sudo ln -sfn /etc/nginx/sites-available/cicadar.conf /etc/nginx/sites-enabled/cicadar.conf
sudo nginx -t && sudo systemctl reload nginx
```

安全组放行 **80**（若仍用 HTTP-01 / 跳转）与 **443**。

### 3. 签发泛证书（自动续期）

```bash
# 默认 --domain cicadar.cn → 覆盖 cicadar.cn + *.cicadar.cn
# 大陆服务器请加 --china（从 Gitee 装 acme.sh，避免 GitHub 超时 curl error 28）
sudo bash scripts/nginx/enable-https-wildcard.sh --email you@example.com --china
```

产物：

- `/etc/nginx/ssl/cicadar.cn/fullchain.pem`
- `/etc/nginx/ssl/cicadar.cn/privkey.pem`
- `/etc/nginx/snippets/ssl-cicadar.cn.conf`
- acme.sh cron 自动续期；续期成功后 `nginx -t && reload`

默认会在写入 TXT 后等待 **120s** 再校验（`--dnssleep`，可加大）。

### 4. 打开 443

编辑已安装的站点配置，取消 HTTPS `server` 注释（模板已写好 `include /etc/nginx/snippets/ssl-cicadar.cn.conf;`），HTTP 段可改为：

```nginx
return 301 https://$host$request_uri;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -fsSI https://cicadar.cn/ | head
```

`cd.cicadar.cn` 等其它站点同样：

```nginx
listen 443 ssl;
listen [::]:443 ssl;
http2 on;
include /etc/nginx/snippets/ssl-cicadar.cn.conf;
```

### 常用选项

```bash
# 其它根域
sudo bash scripts/nginx/enable-https-wildcard.sh --email you@example.com --china --domain example.com

# 覆盖凭据里的解析商
sudo bash scripts/nginx/enable-https-wildcard.sh --email you@example.com --china --dns dnspod

# 测试环境 / 强制重签 / 加长 DNS 等待
sudo bash scripts/nginx/enable-https-wildcard.sh --email you@example.com --china --staging
sudo bash scripts/nginx/enable-https-wildcard.sh --email you@example.com --china --force --dnssleep 180

# 只装 acme.sh
sudo bash scripts/nginx/enable-https-wildcard.sh --email you@example.com --china --setup-only
```

### 故障排查

#### 安装 acme.sh：`Download error` / curl error 28

访问 GitHub 超时。加 `--china` 从 Gitee 安装；官方说明：[Install-in-China](https://github.com/acmesh-official/acme.sh/wiki/Install-in-China)。

也可手动：

```bash
sudo apt-get install -y git
git clone --depth 1 https://gitee.com/neilpang/acme.sh.git
cd acme.sh && sudo ./acme.sh --install -m you@example.com
```

#### 签发失败：`NXDOMAIN looking up TXT for _acme-challenge...`

API 常已写入 TXT，但 Let's Encrypt **二次验证**在公网查不到。

```bash
dig NS cicadar.cn +short
dig TXT _acme-challenge.cicadar.cn +short   # 签发过程中应能查到
```

| 原因 | 处理 |
|------|------|
| NS 未改到当前解析商 | 在注册商把 NS 改成 DNSPod/阿里云等，等生效后再签 |
| 域名不在该 API 账号下 | 换对账号的 Key，或把域名转入该控制台 |
| 传播偏慢 | `--force --dnssleep 180`（或更大）后重试 |
| 本机 Clash 假 IP | 以服务器上 `dig @1.1.1.1` 为准，勿信本机 `198.18.x.x` |

#### HTTP-01（`enable-https.sh`）报 DNS / NXDOMAIN

不要把**尚未有公网 A/AAAA** 的域名写进 `--domains`；缺一条会导致整单失败。只签已解析到本机的域名。

续期检查：

```bash
sudo /root/.acme.sh/acme.sh --list
sudo /root/.acme.sh/acme.sh --cron
```

---

## 备选：按域名列表（HTTP-01 / certbot）

前置：各域名 DNS 已指向本机；安全组放行 **80** 与 **443**。

```bash
sudo bash scripts/nginx/enable-https.sh --email you@example.com
# 默认：cicadar.cn,www.cicadar.cn,cd.cicadar.cn
```

certbot 会给**已存在的**匹配 server 加 443。加子域时传**完整列表** expand：

```bash
sudo bash scripts/nginx/enable-https.sh --email you@example.com \
  --domains cicadar.cn,www.cicadar.cn,cd.cicadar.cn
```

验证：`sudo certbot renew --dry-run`。  
其它选项：`--setup-only`、`--no-redirect`、`--staging`、`--cert-name`。

---

## 注意

- 仓库 `cicadar.conf` 的 **443 默认注释**：无证书时打开会导致 `nginx -t` 失败。
- 用仓库文件**整份覆盖**生产 conf 会冲掉本机已开的 443；覆盖后按上文重新 `include` snippet 或再跑脚本。
- 泛证书路径：`/etc/nginx/ssl/`；certbot 路径：`/etc/letsencrypt/live/`。不要混用同一 `ssl_certificate` 行。

## 仅通用反代

```bash
sudo bash scripts/nginx/install.sh --server-name example.com --upstream 127.0.0.1:3000
sudo bash scripts/nginx/enable-https-wildcard.sh --email you@example.com --china --domain example.com
```
