export const LOCALES = ["zh", "yue", "en"] as const

export type Locale = (typeof LOCALES)[number]

export const LOCALE_COOKIE = "cicada-locale"

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value)
}

export function htmlLang(locale: Locale) {
  if (locale === "en") return "en"
  if (locale === "yue") return "yue-HK"
  return "zh-CN"
}
