#!/usr/bin/env bash
# 在 Ubuntu 上安装 Docker Engine（腾讯云镜像）。
# 已在 Ubuntu 26.04 (resolute) 上验证。重复执行是安全的。
#
# 用法:
#   sudo bash scripts/docker/install.sh
# 指定镜像（可选，须包含 /docker-ce 这一层）:
#   sudo DOCKER_MIRROR=https://mirrors.cloud.tencent.com/docker-ce bash scripts/docker/install.sh

set -euo pipefail

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

CODENAME="${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}"
if [[ -z "${CODENAME}" ]]; then
  echo "无法从 /etc/os-release 读到 Ubuntu 代号。" >&2
  exit 1
fi

ARCH="$(dpkg --print-architecture)"
KEYRING_DIR="/etc/apt/keyrings"
KEY_PATH="${KEYRING_DIR}/docker.asc"
LIST_PATH="/etc/apt/sources.list.d/docker.list"

echo "系统: Ubuntu ${VERSION_ID:-?} (${CODENAME})  架构: ${ARCH}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl

# Ubuntu 自带的 docker.io 等会和官方包冲突；没装过时这里是空操作。
conflicts="$(dpkg-query -W -f '${Package}\n' \
  docker.io docker-compose docker-compose-v2 docker-doc docker-buildx podman-docker containerd runc \
  2>/dev/null || true)"
if [[ -n "${conflicts}" ]]; then
  echo "移除可能冲突的包:"
  echo "${conflicts}"
  # shellcheck disable=SC2086
  apt-get remove -y ${conflicts}
fi

install -m 0755 -d "${KEYRING_DIR}"

# 内网源优先（腾讯云 CVM）。拉不到密钥时再试公网源。
mirrors=()
if [[ -n "${DOCKER_MIRROR:-}" ]]; then
  mirrors+=("${DOCKER_MIRROR}")
fi
mirrors+=(
  "http://mirrors.tencentyun.com/docker-ce"
  "https://mirrors.cloud.tencent.com/docker-ce"
)

MIRROR=""
for candidate in "${mirrors[@]}"; do
  candidate="${candidate%/}"
  echo "尝试镜像: ${candidate}"
  if curl -fL --retry 3 --retry-delay 2 --connect-timeout 15 \
    "${candidate}/linux/ubuntu/gpg" -o "${KEY_PATH}.partial"; then
    if grep -q "BEGIN PGP PUBLIC KEY BLOCK" "${KEY_PATH}.partial"; then
      mv "${KEY_PATH}.partial" "${KEY_PATH}"
      MIRROR="${candidate}"
      break
    fi
  fi
  rm -f "${KEY_PATH}.partial"
  echo "镜像不可用: ${candidate}" >&2
done

if [[ -z "${MIRROR}" ]]; then
  echo "所有镜像都没能下载到 Docker 的 GPG 密钥。" >&2
  exit 1
fi

chmod a+r "${KEY_PATH}"

# 旧的 deb822 源文件如果还在，会和 docker.list 重复，甚至指向不可达地址。
if [[ -f /etc/apt/sources.list.d/docker.sources ]]; then
  echo "移除旧的 /etc/apt/sources.list.d/docker.sources"
  rm -f /etc/apt/sources.list.d/docker.sources
fi

cat > "${LIST_PATH}" <<EOF
deb [arch=${ARCH} signed-by=${KEY_PATH}] ${MIRROR}/linux/ubuntu ${CODENAME} stable
EOF

echo "已写入 ${LIST_PATH}:"
cat "${LIST_PATH}"

apt-get update
apt-get install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

systemctl enable --now docker

# 腾讯云内网加速只在云服务器上能解析。已配置过则不重启 Docker。
if getent hosts mirror.ccs.tencentyun.com >/dev/null 2>&1; then
  if ! docker info 2>/dev/null | grep -q 'mirror.ccs.tencentyun.com'; then
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
    echo "已启用腾讯云镜像加速。"
  fi
fi

echo
docker version
echo
docker compose version
echo
echo "Docker 安装完成。需要时再执行: docker run hello-world"
