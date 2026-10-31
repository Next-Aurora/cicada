import { cookies } from "next/headers"

import { isLocale, type Locale, LOCALE_COOKIE } from "@/lib/i18n/locale"

export async function getLocale(): Promise<Locale> {
  const jar = await cookies()
  const value = jar.get(LOCALE_COOKIE)?.value
  return isLocale(value) ? value : "zh"
}
