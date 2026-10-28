"use client"

import { usePathname } from "next/navigation"

import { IdleSessionGuard } from "@/components/idle-session-guard"
import { PageAtmosphere } from "@/components/page-atmosphere"
import { SiteHeader } from "@/components/site-header"

type SiteChromeProps = {
  children: React.ReactNode
  idleTimeoutMs: number
}

export function SiteChrome({ children, idleTimeoutMs }: SiteChromeProps) {
  const pathname = usePathname()
  const hideSiteHeader = pathname.startsWith("/g/")

  return (
    <div className="flex min-h-dvh flex-col">
      <PageAtmosphere />
      <IdleSessionGuard timeoutMs={idleTimeoutMs} />
      {hideSiteHeader ? null : <SiteHeader />}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <footer className="border-border shrink-0 border-t px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center">
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
        >
          蜀ICP备2024112200号-2
        </a>
      </footer>
    </div>
  )
}
