"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { useI18n } from "@/components/locale-provider"
import { setLocale } from "@/lib/i18n/actions"
import type { Locale } from "@/lib/i18n/locale"
import { cn } from "@/lib/utils"

export function LocaleSwitch() {
  const { locale, m } = useI18n()
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function choose(next: Locale) {
    if (next === locale || pending) return
    setPending(true)
    try {
      await setLocale(next)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      role="group"
      aria-label={m.nav.language}
      className="bg-muted/50 ring-foreground/10 flex items-center rounded-full p-0.5 ring-1"
    >
      <LocaleButton
        current={locale === "zh"}
        pending={pending}
        label="中"
        title={m.nav.chinese}
        onClick={() => void choose("zh")}
      />
      <LocaleButton
        current={locale === "yue"}
        pending={pending}
        label="粤"
        title={m.nav.cantonese}
        onClick={() => void choose("yue")}
      />
      <LocaleButton
        current={locale === "en"}
        pending={pending}
        label="EN"
        title={m.nav.english}
        onClick={() => void choose("en")}
      />
    </div>
  )
}

function LocaleButton({
  current,
  pending,
  label,
  title,
  onClick,
}: {
  current: boolean
  pending: boolean
  label: string
  title: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={current}
      disabled={pending}
      onClick={onClick}
      className={cn(
        "h-8 rounded-full px-2.5 text-xs font-medium",
        current ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  )
}
