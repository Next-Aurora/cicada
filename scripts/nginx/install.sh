#!/usr/bin/env bash
# 在 Ubuntu 上安装并配置 Nginx。重复执行是安全的。
#
# 只安装，并写好基础配置（隐藏版本号、压缩、默认站点）:
#   sudo bash scripts/nginx/install.sh
#
# 增加一个反代站点（可多次执行，按域名覆盖）:
#   sudo bash scripts/nginx/install.sh --server-name example.com --upstream 127.0.0.1:3000
#
# 增加一个静态站点:
#   sudo bash scripts/nginx/install.sh --server-name example.com --root /var/www/example.com

set -euo pipefail

usage() {
  cat <<'EOF'
用法:
  sudo bash scripts/nginx/install.sh
  sudo bash scripts/nginx/install.sh --server-name 域名 --upstream 127.0.0.1:端口
  sudo bash scripts/nginx/install.sh --server-name 域名 --root /var/www/域名

--upstream 与 --root 只能二选一。不带参数时只安装并写入基础配置。
EOF
}

if [[ "${EUID}" -ne 0 ]]; then
  echo "请用 root 运行: sudo bash $0" >&2
  exit 1
fi

if [[ ! -r /etc/os-release ]]; then
  echo "找不到 /etc/os-release，无法识别系统。" >&2
  exit 1
fi

# shellcheck disable=SC1091
. /etc/os-release

if [[ "${ID:-}" != "ubuntu" ]]; then
  echo "这个脚本只用于 Ubuntu，当前系统是 ${ID:-unknown}。" >&2
  exit 1
fi

SERVER_NAME=""
UPSTREAM=""
WEB_ROOT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --server-name)
      SERVER_NAME="${2:-}"
      shift 2
      ;;
    --upstream)
      UPSTREAM="${2:-}"
      shift 2
      ;;
    --root)
      WEB_ROOT="${2:-}"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "未知参数: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -n "${UPSTREAM}" && -n "${WEB_ROOT}" ]]; then
  echo "--upstream 和 --root 只能二选一。" >&2
  exit 1
fi

if [[ -n "${UPSTREAM}${WEB_ROOT}" && -z "${SERVER_NAME}" ]]; then
  echo "使用 --upstream 或 --root 时必须同时提供 --server-name。" >&2
  exit 1
fi

if [[ -n "${SERVER_NAME}" && -z "${UPSTREAM}" && -z "${WEB_ROOT}" ]]; then
  echo "提供 --server-name 时，还要指定 --upstream 或 --root。" >&2
  exit 1
fi

if [[ -n "${SERVER_NAME}" && ! "${SERVER_NAME}" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "域名不合法: ${SERVER_NAME}" >&2
  exit 1
fi

UPSTREAM="${UPSTREAM#http://}"
UPSTREAM="${UPSTREAM#https://}"
UPSTREAM="${UPSTREAM%/}"
if [[ -n "${UPSTREAM}" && ! "${UPSTREAM}" =~ ^[A-Za-z0-9._:\[\]-]+$ ]]; then
  echo "上游地址不合法: ${UPSTREAM}" >&2
  echo "示例: 127.0.0.1:3000" >&2
  exit 1
fi

if [[ -n "${WEB_ROOT}" && ( ! "${WEB_ROOT}" =~ ^/[A-Za-z0-9._/-]+$ || "${WEB_ROOT}" == *..* ) ]]; then
  echo "网站目录不合法: ${WEB_ROOT}" >&2
  exit 1
fi

echo "系统: Ubuntu ${VERSION_ID:-?} (${UBUNTU_CODENAME:-${VERSION_CODENAME:-?}})"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx

install -d -m 0755 /etc/nginx/conf.d /etc/nginx/sites-available /etc/nginx/sites-enabled /var/www/html

# Ubuntu 26.04 的 nginx.conf 已在 http 块写了 server_tokens build;。
# 同一层级不能再写一次，所以改主配置；旧版本没有这行时才写进 conf.d。
server_tokens_line=""
if grep -Eq '^[[:space:]]*server_tokens[[:space:]]+' /etc/nginx/nginx.conf; then
  sed -i -E 's/^([[:space:]]*)server_tokens[[:space:]]+[^;]*;/\1server_tokens off;/' /etc/nginx/nginx.conf
else
  server_tokens_line="server_tokens off;"
fi

# 放在 conf.d，随主配置的 http 块加载。不要再写 gzip on，发行版主配置里已经有。
cat > /etc/nginx/conf.d/00-base.conf <<EOF
# 由 scripts/nginx/install.sh 写入，重复执行会覆盖。
${server_tokens_line}
client_max_body_size 20m;

gzip_vary on;
gzip_proxied any;
gzip_comp_level 5;
gzip_min_length 256;
gzip_types
    text/plain
    text/css
    text/javascript
    application/javascript
    application/json
    application/xml
    image/svg+xml;

map \$http_upgrade \$connection_upgrade {
    default upgrade;
    ''      close;
}
EOF

cat > /etc/nginx/sites-available/default <<'EOF'
# 由 scripts/nginx/install.sh 写入，重复执行会覆盖。
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/html;
    index index.html;

    location = /nginx-health {
        access_log off;
        default_type text/plain;
        return 200 "ok\n";
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

ln -sfn /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

index_html="/var/www/html/index.html"
if [[ ! -f "${index_html}" ]] || grep -q "Welcome to nginx" "${index_html}"; then
  cat > "${index_html}" <<'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>nginx</title>
</head>
<body>
  <p>nginx 已安装。</p>
</body>
</html>
EOF
fi

if [[ -n "${SERVER_NAME}" ]]; then
  site_file="/etc/nginx/sites-available/${SERVER_NAME}.conf"
  if [[ -n "${UPSTREAM}" ]]; then
    cat > "${site_file}" <<EOF
# 由 scripts/nginx/install.sh 写入，重复执行会覆盖。
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAME};

    location / {
        proxy_pass http://${UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        client_max_body_size 20m;
    }
}
EOF
    echo "已写入反代站点: ${SERVER_NAME} -> ${UPSTREAM}"
  else
    install -d -m 0755 "${WEB_ROOT}"
    if [[ ! -f "${WEB_ROOT}/index.html" ]]; then
      cat > "${WEB_ROOT}/index.html" <<EOF
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${SERVER_NAME}</title>
</head>
<body>
  <p>${SERVER_NAME}</p>
</body>
</html>
EOF
    fi
    cat > "${site_file}" <<EOF
# 由 scripts/nginx/install.sh 写入，重复执行会覆盖。
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAME};

    root ${WEB_ROOT};
    index index.html;

    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF
    echo "已写入静态站点: ${SERVER_NAME} -> ${WEB_ROOT}"
  fi

  ln -sfn "${site_file}" "/etc/nginx/sites-enabled/${SERVER_NAME}.conf"
fi

nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo
nginx -v
echo "健康检查: curl -fsS http://127.0.0.1/nginx-health"
echo "Nginx 已安装并完成基础配置。云服务器安全组需要放行 80 端口。"
