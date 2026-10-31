"use server"

import { cookies } from "next/headers"

import { isLocale, type Locale, LOCALE_COOKIE } from "@/lib/i18n/locale"

export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) return
  const jar = await cookies()
  jar.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
}
