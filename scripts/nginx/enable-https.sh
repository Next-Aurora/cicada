#!/usr/bin/env bash
# 一键为 Nginx 站点启用 Let's Encrypt HTTPS，并打开自动续期。
# 默认给整站常用域名签同一张 SAN 证书（可按需增删）。
#
# 首次（邮箱必填）:
#   sudo bash scripts/nginx/enable-https.sh --email you@example.com
#
# 自定义域名列表（逗号分隔；会 expand 进同一张证书）:
#   sudo bash scripts/nginx/enable-https.sh --email you@example.com \
#     --domains cicadar.cn,www.cicadar.cn,cd.cicadar.cn,api.cicadar.cn
#
# 仅安装 certbot + 续期钩子，不申请证书:
#   sudo bash scripts/nginx/enable-https.sh --setup-only
#
# 前置：各域名 DNS 已指向本机；nginx 已为这些域名配置了 listen 80。
# 安全组 / 防火墙需放行 80（校验）与 443。
#
# 若需要 *.域名 泛证书，请用 enable-https-wildcard.sh（DNS-01），不要用本脚本。

set -euo pipefail

usage() {
  cat <<'EOF'
用法:
  sudo bash scripts/nginx/enable-https.sh --email 邮箱
  sudo bash scripts/nginx/enable-https.sh --email 邮箱 --domains 域1,域2,...
  sudo bash scripts/nginx/enable-https.sh --setup-only

选项:
  --email EMAIL       Let's Encrypt 账号邮箱（申请证书时必填）
  --domains LIST      逗号分隔域名；默认 cicadar.cn,www.cicadar.cn,cd.cicadar.cn
  --cert-name NAME    证书名（默认取域名列表第一个，便于续期与 expand）
  --no-redirect       不把 HTTP 301 到 HTTPS（默认会跳转）
  --staging           使用 Let's Encrypt 测试环境（调试用）
  --setup-only        只装 certbot、开 timer、写续期钩子
  -h, --help          显示帮助

说明:
  - 同一张证书可挂多个子域；以后加域名再跑一遍并带上完整 --domains 即可 expand。
  - 通配符 *.cicadar.cn 需要 DNS-01，本脚本用 HTTP-01，不签通配符。
  - 续期由 systemd certbot.timer 自动跑；成功后 deploy hook 会 reload nginx。
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

EMAIL=""
DOMAINS_CSV="cicadar.cn,www.cicadar.cn,cd.cicadar.cn"
CERT_NAME=""
REDIRECT=1
STAGING=0
SETUP_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --email)
      EMAIL="${2:-}"
      shift 2
      ;;
    --domains)
      DOMAINS_CSV="${2:-}"
      shift 2
      ;;
    --cert-name)
      CERT_NAME="${2:-}"
      shift 2
      ;;
    --no-redirect)
      REDIRECT=0
      shift
      ;;
    --staging)
      STAGING=1
      shift
      ;;
    --setup-only)
      SETUP_ONLY=1
      shift
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

DOMAINS_CSV="${DOMAINS_CSV// /}"
if [[ -z "${DOMAINS_CSV}" ]]; then
  echo "--domains 不能为空。" >&2
  exit 1
fi

IFS=',' read -r -a DOMAINS <<< "${DOMAINS_CSV}"
for d in "${DOMAINS[@]}"; do
  if [[ ! "${d}" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "域名不合法: ${d}" >&2
    exit 1
  fi
done

if [[ -z "${CERT_NAME}" ]]; then
  CERT_NAME="${DOMAINS[0]}"
fi
if [[ ! "${CERT_NAME}" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "证书名不合法: ${CERT_NAME}" >&2
  exit 1
fi

if [[ "${SETUP_ONLY}" -eq 0 && -z "${EMAIL}" ]]; then
  echo "申请证书需要 --email。若只想装工具: --setup-only" >&2
  usage >&2
  exit 1
fi

if [[ -n "${EMAIL}" && ! "${EMAIL}" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
  echo "邮箱看起来不合法: ${EMAIL}" >&2
  exit 1
fi

echo "系统: Ubuntu ${VERSION_ID:-?} (${UBUNTU_CODENAME:-${VERSION_CODENAME:-?}})"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y certbot python3-certbot-nginx

install -d -m 0755 /var/www/certbot
install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy

hook=/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
cat > "${hook}" <<'EOF'
#!/usr/bin/env bash
# 证书续期成功后 reload nginx（由 enable-https.sh 写入）。
set -euo pipefail
if command -v nginx >/dev/null 2>&1; then
  nginx -t
  systemctl reload nginx
fi
EOF
chmod 0755 "${hook}"

systemctl enable --now certbot.timer 2>/dev/null || true
systemctl start certbot.timer 2>/dev/null || true

echo "已安装 certbot，并写入续期后 reload nginx 的 hook。"
if systemctl is-active --quiet certbot.timer 2>/dev/null; then
  systemctl list-timers certbot.timer --no-pager || true
else
  echo "提示: 未检测到 certbot.timer；可用: sudo certbot renew --dry-run" >&2
fi

if [[ "${SETUP_ONLY}" -eq 1 ]]; then
  echo "--setup-only 完成。申请证书时去掉该参数再跑一遍。"
  exit 0
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "未找到 nginx。请先: sudo bash scripts/nginx/install.sh" >&2
  exit 1
fi

if ! systemctl is-active --quiet nginx; then
  systemctl enable --now nginx
fi

nginx -t

certbot_args=(
  --nginx
  --non-interactive
  --agree-tos
  --email "${EMAIL}"
  --cert-name "${CERT_NAME}"
  --expand
)

if [[ "${REDIRECT}" -eq 1 ]]; then
  certbot_args+=(--redirect)
else
  certbot_args+=(--no-redirect)
fi

if [[ "${STAGING}" -eq 1 ]]; then
  certbot_args+=(--staging)
  echo "使用 Let's Encrypt staging（测试证书，浏览器会不信任）。"
fi

for d in "${DOMAINS[@]}"; do
  certbot_args+=(-d "${d}")
done

echo "申请 / 扩展证书: ${DOMAINS[*]}（cert-name=${CERT_NAME}）"
certbot "${certbot_args[@]}"

nginx -t
systemctl reload nginx

echo
echo "HTTPS 已启用。"
echo "证书目录: /etc/letsencrypt/live/${CERT_NAME}/"
echo "检查: curl -fsSI https://${DOMAINS[0]}/ | head"
echo "续期演练: sudo certbot renew --dry-run"
echo "以后加子域: 把新域名并入 --domains 再跑本脚本即可 expand。"
