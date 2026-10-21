export const WECHAT_PLACEHOLDER_EMAIL_SUFFIX = "@users.cicada.invalid"

export function isWechatPlaceholderEmail(email: string) {
  return email.toLowerCase().endsWith(WECHAT_PLACEHOLDER_EMAIL_SUFFIX)
}

export type WechatBindDecision =
  | { ok: true; userId: string; action: "reuse" | "link" | "create" }
  | { ok: false; message: string }

/**
 * Decide how a mini-program openid should map to a site user.
 * `bindUserId` is set only after email/password or an existing web session is verified.
 */
export function decideWechatUserBinding(input: {
  existingWechatUserId: string | null
  bindUserId: string | null
  bindUserIsPlaceholderEmail: boolean
  bindUserAlreadyHasOtherWechat: boolean
}): WechatBindDecision {
  const { existingWechatUserId, bindUserId, bindUserIsPlaceholderEmail, bindUserAlreadyHasOtherWechat } =
    input

  if (bindUserId) {
    if (bindUserIsPlaceholderEmail) {
      return { ok: false, message: "无法绑定到微信临时账号" }
    }
    if (existingWechatUserId && existingWechatUserId !== bindUserId) {
      return { ok: false, message: "该微信已绑定其他账号" }
    }
    if (bindUserAlreadyHasOtherWechat && existingWechatUserId !== bindUserId) {
      return { ok: false, message: "该邮箱账号已绑定其他微信" }
    }
    if (existingWechatUserId === bindUserId) {
      return { ok: true, userId: bindUserId, action: "reuse" }
    }
    return { ok: true, userId: bindUserId, action: "link" }
  }

  if (existingWechatUserId) {
    return { ok: true, userId: existingWechatUserId, action: "reuse" }
  }

  return { ok: true, userId: "", action: "create" }
}
