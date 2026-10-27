#!/usr/bin/env bash
# 用 Docker Compose 部署 Portainer CE。重复执行是安全的，数据卷会保留。
#
# 用法（与 scripts/portainer/compose.yaml 放在一起）:
#   sudo bash deploy-portainer.sh
# 指定镜像（可选）:
#   sudo PORTAINER_IMAGE=portainer/portainer-ce:lts bash deploy-portainer.sh

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
if [[ -f "${SCRIPT_DIR}/portainer/compose.yaml" ]]; then
  COMPOSE_SRC="${SCRIPT_DIR}/portainer/compose.yaml"
elif [[ -f "${SCRIPT_DIR}/compose.yaml" ]]; then
  COMPOSE_SRC="${SCRIPT_DIR}/compose.yaml"
else
  echo "找不到 compose.yaml。请把 scripts/portainer/compose.yaml 和本脚本一起拷到服务器。" >&2
  exit 1
fi

install -d -m 0755 /opt/portainer
install -m 0644 "${COMPOSE_SRC}" /opt/portainer/compose.yaml

# 腾讯云内网加速只在云服务器上能解析。已配置过则不重启 Docker。
if getent hosts mirror.ccs.tencentyun.com >/dev/null 2>&1; then
  if docker info 2>/dev/null | grep -q 'mirror.ccs.tencentyun.com'; then
    echo "已使用腾讯云镜像加速。"
  else
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
  fi
else
  echo "解析不到 mirror.ccs.tencentyun.com，继续从 Docker Hub 拉取。"
fi

echo "使用配置: /opt/portainer/compose.yaml"
echo "镜像: ${PORTAINER_IMAGE:-portainer/portainer-ce:lts}"

docker compose -f /opt/portainer/compose.yaml pull
docker compose -f /opt/portainer/compose.yaml up -d

token_line=""
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  token_line="$(docker compose -f /opt/portainer/compose.yaml logs --no-color 2>/dev/null | grep 'setup_token=' | tail -n 1 || true)"
  if [[ -n "${token_line}" ]]; then
    break
  fi
  sleep 1
done

ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
ip="${ip:-服务器IP}"

echo
docker compose -f /opt/portainer/compose.yaml ps
echo
echo "直连地址: https://${ip}:9443"
echo "浏览器会提示证书不受信任。这是 Portainer 自带的自签证书，首次访问选择继续即可。"
echo "经 Nginx 访问时，把上游设为 127.0.0.1:9000，例如:"
echo "  sudo bash install-nginx.sh --server-name 域名或公网IP --upstream 127.0.0.1:9000"
echo "腾讯云安全组需要放行实际对外的端口（直连 9443，或 Nginx 的 80）。"
if [[ -n "${token_line}" ]]; then
  echo "首次设置口令（日志中的 setup_token）:"
  echo "${token_line}"
else
  echo "日志里没有 setup_token。若这台机器已经完成过初始化，直接用原来的管理员账号登录。"
fi
