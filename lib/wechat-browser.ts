export function isWeChatInAppBrowser(userAgent: string) {
  return /MicroMessenger/i.test(userAgent)
}
