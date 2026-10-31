"use client"

import { usePathname } from "next/navigation"

import { IdleSessionGuard } from "@/components/idle-session-guard"
import { LocaleSwitch } from "@/components/locale-switch"
import { useI18n } from "@/components/locale-provider"
import { PageAtmosphere } from "@/components/page-atmosphere"
import { SiteHeader } from "@/components/site-header"

type SiteChromeProps = {
  children: React.ReactNode
  idleTimeoutMs: number
}

export function SiteChrome({ children, idleTimeoutMs }: SiteChromeProps) {
  const pathname = usePathname()
  const { m } = useI18n()
  const hideSiteHeader = pathname.startsWith("/g/")

  return (
    <div className="flex min-h-dvh flex-col">
      <PageAtmosphere />
      <IdleSessionGuard timeoutMs={idleTimeoutMs} />
      {hideSiteHeader ? null : <SiteHeader />}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <footer className="shrink-0 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8 lg:px-10">
        <div className="border-border/60 mx-auto grid max-w-6xl items-center gap-x-4 gap-y-3 border-t pt-6 sm:grid-cols-[1fr_auto_1fr]">
          <div className="hidden sm:block" aria-hidden />
          <div className="flex flex-col items-center gap-1.5 text-center">
            <p className="text-muted-foreground text-xs leading-relaxed">
              © {new Date().getFullYear()} 凌风蝉 <span className="uppercase">cicadar</span> {m.footer.rights}
            </p>
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground/80 hover:text-foreground text-xs underline-offset-4 transition-colors hover:underline"
            >
              蜀ICP备2024112200号-2
            </a>
          </div>
          <div className="justify-self-end">
            <LocaleSwitch />
          </div>
        </div>
      </footer>
    </div>
  )
}
