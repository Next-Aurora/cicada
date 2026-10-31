"use client"

import { createContext, useContext } from "react"

import type { Locale } from "@/lib/i18n/locale"
import { messages, type Messages } from "@/lib/i18n/messages"

type LocaleContextValue = {
  locale: Locale
  m: Messages
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={{ locale, m: messages[locale] }}>{children}</LocaleContext.Provider>
}

export function useI18n() {
  const value = useContext(LocaleContext)
  if (!value) {
    throw new Error("useI18n must be used inside LocaleProvider")
  }
  return value
}
