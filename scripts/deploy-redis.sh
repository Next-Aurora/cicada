#!/usr/bin/env bash
# 用 Docker Compose 部署 Redis 7。重复执行是安全的，数据卷与密码会保留。
#
# 用法（与 scripts/redis/compose.yaml 放在一起）:
#   sudo bash deploy-redis.sh
# 可选环境变量:
#   REDIS_IMAGE=redis:7-alpine

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "请用 root 运行: sudo bash $0" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker 不可用。请先运行 install-docker.sh，并确认 docker 服务已启动。" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "未找到 docker compose 插件。" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/redis/compose.yaml" ]]; then
  COMPOSE_SRC="${SCRIPT_DIR}/redis/compose.yaml"
elif [[ -f "${SCRIPT_DIR}/compose.yaml" ]]; then
  COMPOSE_SRC="${SCRIPT_DIR}/compose.yaml"
else
  echo "找不到 compose.yaml。请把 scripts/redis/compose.yaml 和本脚本一起拷到服务器。" >&2
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

install -d -m 0755 /opt/redis
install -m 0644 "${COMPOSE_SRC}" /opt/redis/compose.yaml

ENV_FILE="/opt/redis/.env"
if [[ -f "${ENV_FILE}" ]]; then
  echo "沿用已有密码文件: ${ENV_FILE}"
else
  REDIS_PASSWORD="$(gen_password)"
  umask 077
  cat > "${ENV_FILE}" <<EOF
REDIS_IMAGE=${REDIS_IMAGE:-redis:7-alpine}
REDIS_PASSWORD=${REDIS_PASSWORD}
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

echo "使用配置: /opt/redis/compose.yaml"
echo "镜像: ${REDIS_IMAGE:-redis:7-alpine}"

docker compose --env-file "${ENV_FILE}" -f /opt/redis/compose.yaml pull
docker compose --env-file "${ENV_FILE}" -f /opt/redis/compose.yaml up -d

echo "等待 Redis 就绪..."
for _ in $(seq 1 20); do
  if docker compose --env-file "${ENV_FILE}" -f /opt/redis/compose.yaml exec -T redis \
    redis-cli -a "${REDIS_PASSWORD}" ping 2>/dev/null | grep -q PONG; then
    break
  fi
  sleep 1
done

echo
docker compose --env-file "${ENV_FILE}" -f /opt/redis/compose.yaml ps
echo
echo "本机地址: 127.0.0.1:6379"
echo "密码文件: ${ENV_FILE}"
echo
echo "连接示例:"
echo "  redis-cli -h 127.0.0.1 -p 6379 -a '${REDIS_PASSWORD}'"
echo "  redis://:${REDIS_PASSWORD}@127.0.0.1:6379/0"
echo
echo "端口只绑在 127.0.0.1，不要对公网开放 6379。"
