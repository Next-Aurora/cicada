#!/usr/bin/env bash
# 用 Docker Compose 部署 MySQL 8。重复执行是安全的，数据卷与密码会保留。
#
# 用法（本目录含 compose.yaml）:
#   sudo bash scripts/mysql/deploy.sh
# 可选环境变量:
#   MYSQL_IMAGE=mysql:8.4
#   MYSQL_DATABASE=cicada
#   MYSQL_USER=cicada

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "请用 root 运行: sudo bash $0" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker 不可用。请先运行 scripts/docker/install.sh，并确认 docker 服务已启动。" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "未找到 docker compose 插件。" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_SRC="${SCRIPT_DIR}/compose.yaml"
if [[ ! -f "${COMPOSE_SRC}" ]]; then
  echo "找不到 ${COMPOSE_SRC}。请把整个 scripts/mysql/ 目录拷到服务器。" >&2
  exit 1
fi

gen_password() {
  openssl rand -base64 24 | tr -d '\n/+=' | cut -c1-24
}

ensure_tencent_mirror() {
  if ! getent hosts mirror.ccs.tencentyun.com >/dev/null 2>&1; then
    echo "解析不到 mirror.ccs.tencentyun.com，继续从 Docker Hub 拉取。"
    return 0
  fi
  if docker info 2>/dev/null | grep -q 'mirror.ccs.tencentyun.com'; then
    echo "已使用腾讯云镜像加速。"
    return 0
  fi
  install -d -m 0755 /etc/docker
  if [[ -s /etc/docker/daemon.json ]]; then
    if ! command -v python3 >/dev/null 2>&1; then
      apt-get update
      apt-get install -y python3
    fi
    python3 - <<'PY'
import json
from pathlib import Path

path = Path("/etc/docker/daemon.json")
data = json.loads(path.read_text() or "{}")
mirror = "https://mirror.ccs.tencentyun.com"
mirrors = [item for item in data.get("registry-mirrors", []) if item != mirror]
data["registry-mirrors"] = [mirror, *mirrors]
path.write_text(json.dumps(data, indent=2) + "\n")
PY
  else
    cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": ["https://mirror.ccs.tencentyun.com"]
}
EOF
  fi
  systemctl restart docker
  echo "已启用腾讯云镜像加速并重启 Docker。"
}

install -d -m 0755 /opt/mysql
install -m 0644 "${COMPOSE_SRC}" /opt/mysql/compose.yaml

ENV_FILE="/opt/mysql/.env"
if [[ -f "${ENV_FILE}" ]]; then
  echo "沿用已有密码文件: ${ENV_FILE}"
else
  MYSQL_DATABASE="${MYSQL_DATABASE:-cicada}"
  MYSQL_USER="${MYSQL_USER:-cicada}"
  MYSQL_ROOT_PASSWORD="$(gen_password)"
  MYSQL_PASSWORD="$(gen_password)"
  umask 077
  cat > "${ENV_FILE}" <<EOF
MYSQL_IMAGE=${MYSQL_IMAGE:-mysql:8.4}
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_DATABASE=${MYSQL_DATABASE}
MYSQL_USER=${MYSQL_USER}
MYSQL_PASSWORD=${MYSQL_PASSWORD}
EOF
  chmod 600 "${ENV_FILE}"
  echo "已生成密码文件: ${ENV_FILE}"
fi

# shellcheck disable=SC1090
set -a
# shellcheck disable=SC1091
. "${ENV_FILE}"
set +a

ensure_tencent_mirror

if ! docker network inspect cicada-internal >/dev/null 2>&1; then
  docker network create cicada-internal
  echo "已创建网络 cicada-internal。"
fi

echo "使用配置: /opt/mysql/compose.yaml"
echo "镜像: ${MYSQL_IMAGE:-mysql:8.4}"

docker compose --env-file "${ENV_FILE}" -f /opt/mysql/compose.yaml pull
docker compose --env-file "${ENV_FILE}" -f /opt/mysql/compose.yaml up -d

echo "等待 MySQL 就绪..."
for _ in $(seq 1 30); do
  if docker compose --env-file "${ENV_FILE}" -f /opt/mysql/compose.yaml exec -T mysql \
    mysqladmin ping -h 127.0.0.1 -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" --silent >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo
docker compose --env-file "${ENV_FILE}" -f /opt/mysql/compose.yaml ps
echo
echo "本机地址: 127.0.0.1:3306"
echo "数据库: ${MYSQL_DATABASE}"
echo "应用用户: ${MYSQL_USER}"
echo "密码文件: ${ENV_FILE}"
echo
echo "本机客户端:"
echo "  mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@127.0.0.1:3306/${MYSQL_DATABASE}"
echo "cicada-internal 网络里的容器:"
echo "  mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@mysql:3306/${MYSQL_DATABASE}"
echo
echo "root 密码也在 ${ENV_FILE} 的 MYSQL_ROOT_PASSWORD。"
echo "端口只绑在 127.0.0.1，不要对公网开放 3306。"
