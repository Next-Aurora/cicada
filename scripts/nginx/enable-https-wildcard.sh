#!/usr/bin/env bash
# 签发 *.域名 + 根域名 的 Let's Encrypt 泛域名证书（DNS-01），并配置自动续期。
# 依赖 acme.sh + 域名解析商 API（默认阿里云 DNS）。
#
# 准备密钥文件（见 dns-credentials.env.example）:
#   sudo mkdir -p /etc/cicadar
#   sudo cp scripts/nginx/dns-credentials.env.example /etc/cicadar/dns-credentials.env
#   sudo chmod 600 /etc/cicadar/dns-credentials.env
#   # 填入 DNS_PROVIDER 与对应 AccessKey
#
# 签发（默认 cicadar.cn → 证书含 cicadar.cn 与 *.cicadar.cn）:
#   sudo bash scripts/nginx/enable-https-wildcard.sh --email you@example.com
#
# 自定义根域 / 凭据路径:
#   sudo bash scripts/nginx/enable-https-wildcard.sh --email you@example.com \
#     --domain example.com --credentials /etc/cicadar/dns-credentials.env
#
# 证书落地:
#   /etc/nginx/ssl/<domain>/fullchain.pem
#   /etc/nginx/ssl/<domain>/privkey.pem
#   /etc/nginx/snippets/ssl-<domain>.conf
#
# 续期: acme.sh 自带 cron；续期后执行 reloadcmd（nginx -t && reload）。

set -euo pipefail

usage() {
  cat <<'EOF'
用法:
  sudo bash scripts/nginx/enable-https-wildcard.sh --email 邮箱
  sudo bash scripts/nginx/enable-https-wildcard.sh --email 邮箱 --domain cicadar.cn

选项:
  --email EMAIL           Let's Encrypt / acme.sh 账号邮箱（必填，除非 --setup-only）
  --domain DOMAIN         根域名；将签发 DOMAIN + *.DOMAIN（默认 cicadar.cn）
  --credentials PATH      DNS API 凭据文件（默认 /etc/cicadar/dns-credentials.env）
  --dns PROVIDER          覆盖凭据里的 DNS_PROVIDER：aliyun|dnspod|tencent|cloudflare
  --staging               使用 Let's Encrypt staging（测试）
  --force                 强制重新签发
  --dnssleep SECONDS      写入 TXT 后等待秒数再校验（默认 120；二次验证 NXDOMAIN 可加大）
  --setup-only            只安装 acme.sh，不申请证书
  --china                 从 Gitee 安装 acme.sh（大陆访问 GitHub 超时请加此项）
  -h, --help              显示帮助

说明:
  - 泛域名必须用 DNS-01，不能用 enable-https.sh（HTTP-01）。
  - *.example.com 不覆盖 example.com 本身，本脚本会两张名字打进同一张证书。
  - 新子域（如 api.example.com）只要 DNS A 指到本机，nginx 配好后即可直接用同一张证，无需重签。
  - 大陆机器安装失败（curl error 28）请加 --china，见 acme.sh Wiki「Install-in-China」。
  - 若报 TXT NXDOMAIN：确认域名 NS 指向当前解析商，且域名在该 API 账号下；可加大 --dnssleep。
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
DOMAIN="cicadar.cn"
CREDENTIALS="/etc/cicadar/dns-credentials.env"
DNS_PROVIDER_OVERRIDE=""
STAGING=0
FORCE=0
SETUP_ONLY=0
CHINA_MIRROR=0
DNS_SLEEP=120

while [[ $# -gt 0 ]]; do
  case "$1" in
    --email)
      EMAIL="${2:-}"
      shift 2
      ;;
    --domain)
      DOMAIN="${2:-}"
      shift 2
      ;;
    --credentials)
      CREDENTIALS="${2:-}"
      shift 2
      ;;
    --dns)
      DNS_PROVIDER_OVERRIDE="${2:-}"
      shift 2
      ;;
    --staging)
      STAGING=1
      shift
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --dnssleep)
      DNS_SLEEP="${2:-}"
      shift 2
      ;;
    --setup-only)
      SETUP_ONLY=1
      shift
      ;;
    --china)
      CHINA_MIRROR=1
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

if [[ ! "${DNS_SLEEP}" =~ ^[0-9]+$ ]]; then
  echo "--dnssleep 必须是非负整数，当前: ${DNS_SLEEP}" >&2
  exit 1
fi

if [[ ! "${DOMAIN}" =~ ^[A-Za-z0-9.-]+$ || "${DOMAIN}" == *..* || "${DOMAIN}" == .* || "${DOMAIN}" == *. ]]; then
  echo "域名不合法: ${DOMAIN}" >&2
  exit 1
fi

if [[ "${SETUP_ONLY}" -eq 0 && -z "${EMAIL}" ]]; then
  echo "申请证书需要 --email。若只装工具: --setup-only" >&2
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
apt-get install -y curl cron ca-certificates git

ACME_HOME="/root/.acme.sh"
ACME_BIN="${ACME_HOME}/acme.sh"
ACME_GITEE="https://gitee.com/neilpang/acme.sh.git"

install_acme_from_gitee() {
  echo "从 Gitee 安装 acme.sh（大陆镜像）..."
  local tmp
  tmp="$(mktemp -d)"
  # shellcheck disable=SC2064
  trap "rm -rf '${tmp}'" RETURN
  if ! git clone --depth 1 "${ACME_GITEE}" "${tmp}/acme.sh"; then
    echo "Gitee clone 失败。请检查网络，或手动:" >&2
    echo "  git clone ${ACME_GITEE} && cd acme.sh && ./acme.sh --install -m ${EMAIL}" >&2
    exit 1
  fi
  (
    cd "${tmp}/acme.sh"
    ./acme.sh --install -m "${EMAIL}"
  )
}

install_acme() {
  if [[ -x "${ACME_BIN}" ]]; then
    echo "已安装 acme.sh: ${ACME_BIN}"
  else
    if [[ -z "${EMAIL}" ]]; then
      echo "首次安装需要 --email。" >&2
      exit 1
    fi
    if [[ "${CHINA_MIRROR}" -eq 1 ]]; then
      install_acme_from_gitee
    else
      echo "安装 acme.sh（官方 get.acme.sh；若 GitHub 超时请加 --china）..."
      set +e
      curl -fsSL --connect-timeout 15 --max-time 120 https://get.acme.sh | sh -s email="${EMAIL}"
      curl_rc=$?
      set -e
      if [[ "${curl_rc}" -ne 0 || ! -x "${ACME_BIN}" ]]; then
        echo "官方安装失败（常为访问 GitHub 超时），改用 Gitee ..."
        install_acme_from_gitee
      fi
    fi
  fi

  if [[ ! -x "${ACME_BIN}" ]]; then
    echo "acme.sh 未安装成功: ${ACME_BIN}" >&2
    echo "大陆用户请: sudo bash scripts/nginx/enable-https-wildcard.sh --email ... --china" >&2
    exit 1
  fi

  # 固定 Let's Encrypt（acme.sh 默认可能是 ZeroSSL）
  "${ACME_BIN}" --set-default-ca --server letsencrypt >/dev/null
  if [[ -n "${EMAIL}" ]]; then
    "${ACME_BIN}" --register-account -m "${EMAIL}" >/dev/null 2>&1 || true
  fi
}

install_acme

if [[ "${SETUP_ONLY}" -eq 1 ]]; then
  echo "--setup-only 完成。下一步准备 ${CREDENTIALS} 后去掉该参数再跑。"
  exit 0
fi

if [[ ! -f "${CREDENTIALS}" ]]; then
  echo "找不到 DNS 凭据文件: ${CREDENTIALS}" >&2
  echo "请复制 scripts/nginx/dns-credentials.env.example 并填入密钥。" >&2
  exit 1
fi

# 只导出安全的 KEY=VALUE，避免凭据文件里的命令注入
set -a
# shellcheck disable=SC1090
source "${CREDENTIALS}"
set +a

DNS_PROVIDER="${DNS_PROVIDER_OVERRIDE:-${DNS_PROVIDER:-aliyun}}"
DNS_PROVIDER="$(echo "${DNS_PROVIDER}" | tr '[:upper:]' '[:lower:]')"

DNS_API=""
case "${DNS_PROVIDER}" in
  aliyun | ali | dns_ali)
    DNS_API="dns_ali"
    if [[ -z "${Ali_Key:-}" || -z "${Ali_Secret:-}" ]]; then
      echo "阿里云 DNS 需要在凭据文件中设置 Ali_Key 与 Ali_Secret。" >&2
      exit 1
    fi
    export Ali_Key Ali_Secret
    ;;
  dnspod | dp | dns_dp)
    DNS_API="dns_dp"
    if [[ -z "${DP_Id:-}" || -z "${DP_Key:-}" ]]; then
      echo "DNSPod 需要在凭据文件中设置 DP_Id 与 DP_Key。" >&2
      exit 1
    fi
    export DP_Id DP_Key
    ;;
  tencent | dns_tencent)
    DNS_API="dns_tencent"
    if [[ -z "${Tencent_SecretId:-}" || -z "${Tencent_SecretKey:-}" ]]; then
      echo "腾讯云 DNS 需要 Tencent_SecretId 与 Tencent_SecretKey。" >&2
      exit 1
    fi
    export Tencent_SecretId Tencent_SecretKey
    ;;
  cloudflare | cf | dns_cf)
    DNS_API="dns_cf"
    if [[ -n "${CF_Token:-}" ]]; then
      export CF_Token
      unset CF_Key CF_Email 2>/dev/null || true
    elif [[ -n "${CF_Key:-}" && -n "${CF_Email:-}" ]]; then
      export CF_Key CF_Email
    else
      echo "Cloudflare 需要 CF_Token，或 CF_Key + CF_Email。" >&2
      exit 1
    fi
    ;;
  *)
    echo "不支持的 DNS_PROVIDER: ${DNS_PROVIDER}" >&2
    echo "可选: aliyun | dnspod | tencent | cloudflare" >&2
    exit 1
    ;;
esac

SSL_DIR="/etc/nginx/ssl/${DOMAIN}"
SNIPPET="/etc/nginx/snippets/ssl-${DOMAIN}.conf"
install -d -m 0755 "${SSL_DIR}"
install -d -m 0755 /etc/nginx/snippets

issue_args=(
  --issue
  -d "${DOMAIN}"
  -d "*.${DOMAIN}"
  --dns "${DNS_API}"
  --server letsencrypt
  --dnssleep "${DNS_SLEEP}"
)

if [[ "${STAGING}" -eq 1 ]]; then
  issue_args+=(--staging)
  echo "使用 Let's Encrypt staging（测试证书）。"
fi
if [[ "${FORCE}" -eq 1 ]]; then
  issue_args+=(--force)
fi

echo "申请泛域名证书: ${DOMAIN} + *.${DOMAIN}（DNS API=${DNS_API}，dnssleep=${DNS_SLEEP}s）"
echo "请确认 ${DOMAIN} 的 NS 已指向当前 DNS_PROVIDER（${DNS_PROVIDER}）账号下的该域名。"
set +e
"${ACME_BIN}" "${issue_args[@]}"
issue_rc=$?
set -e

# 2 = 证书未到期跳过重签，视为成功
if [[ "${issue_rc}" -ne 0 && "${issue_rc}" -ne 2 ]]; then
  echo "acme.sh 签发失败（exit=${issue_rc}）。" >&2
  echo "若错误含 TXT / NXDOMAIN / secondary validation，在服务器上自检:" >&2
  echo "  dig NS ${DOMAIN} +short" >&2
  echo "  dig TXT _acme-challenge.${DOMAIN} +short   # 签发过程中应能查到" >&2
  echo "并确认：域名在 API 对应控制台里；NS 已改到该解析商且生效；可加大 --dnssleep 180。" >&2
  exit "${issue_rc}"
fi

reload_cmd='nginx -t && systemctl reload nginx'

echo "安装证书到 ${SSL_DIR} ，并注册续期后 reload nginx"
"${ACME_BIN}" --install-cert -d "${DOMAIN}" \
  --key-file "${SSL_DIR}/privkey.pem" \
  --fullchain-file "${SSL_DIR}/fullchain.pem" \
  --reloadcmd "${reload_cmd}"

chmod 640 "${SSL_DIR}/privkey.pem" "${SSL_DIR}/fullchain.pem" 2>/dev/null || true
# nginx worker 常为 www-data；若组可读更稳妥
if getent group www-data >/dev/null 2>&1; then
  chgrp www-data "${SSL_DIR}/privkey.pem" "${SSL_DIR}/fullchain.pem" 2>/dev/null || true
fi

cat > "${SNIPPET}" <<EOF
# 由 scripts/nginx/enable-https-wildcard.sh 生成（${DOMAIN} + *.${DOMAIN}）
# 在 server { listen 443 ssl; ... } 内: include ${SNIPPET};
ssl_certificate     ${SSL_DIR}/fullchain.pem;
ssl_certificate_key ${SSL_DIR}/privkey.pem;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
ssl_protocols TLSv1.2 TLSv1.3;
EOF

# 确保 cron 续期存在（acme.sh 安装时一般已写入）
if ! crontab -l 2>/dev/null | grep -q '\.acme\.sh/acme\.sh'; then
  "${ACME_BIN}" --install-cronjob >/dev/null 2>&1 || true
fi

if command -v nginx >/dev/null 2>&1; then
  if nginx -t 2>/dev/null; then
    systemctl reload nginx 2>/dev/null || true
  else
    echo "提示: 证书已装好，但当前 nginx 配置尚未引用新证书或仍有语法问题。"
    echo "      在 443 server 中加入: include ${SNIPPET};"
  fi
fi

echo
echo "泛域名证书已就绪。"
echo "  证书: ${SSL_DIR}/fullchain.pem"
echo "  私钥: ${SSL_DIR}/privkey.pem"
echo "  片段: ${SNIPPET}"
echo
echo "nginx 示例（每个 HTTPS server）:"
echo "  listen 443 ssl;"
echo "  listen [::]:443 ssl;"
echo "  http2 on;"
echo "  server_name foo.${DOMAIN};"
echo "  include ${SNIPPET};"
echo
echo "续期检查: ${ACME_BIN} --list"
echo "手动续期: ${ACME_BIN} --cron"
echo "cicadar 主站模板见 scripts/nginx/cicadar.conf（取消 HTTPS 注释并改用上述 snippet）。"
