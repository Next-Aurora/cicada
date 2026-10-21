/** Extensible binding methods after WeChat login. Phone is reserved for later. */
export const WECHAT_IDENTITY_METHODS = ["email", "phone"] as const

export type WechatIdentityMethod = (typeof WECHAT_IDENTITY_METHODS)[number]

/** Methods currently accepted by the server. */
export const WECHAT_IDENTITY_METHODS_ENABLED = ["email"] as const satisfies readonly WechatIdentityMethod[]

export type WechatIdentityMethodEnabled = (typeof WECHAT_IDENTITY_METHODS_ENABLED)[number]

export function isWechatIdentityMethod(value: string): value is WechatIdentityMethod {
  return (WECHAT_IDENTITY_METHODS as readonly string[]).includes(value)
}

export function isWechatIdentityMethodEnabled(value: string): value is WechatIdentityMethodEnabled {
  return (WECHAT_IDENTITY_METHODS_ENABLED as readonly string[]).includes(value)
}

export function wechatIdentityMethodLabel(method: WechatIdentityMethod) {
  switch (method) {
    case "email":
      return "邮箱"
    case "phone":
      return "手机号"
  }
}
