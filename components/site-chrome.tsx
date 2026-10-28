"use client"

import { usePathname } from "next/navigation"

import { AuthMenu } from "@/components/auth-menu"
import { IdleSessionGuard } from "@/components/idle-session-guard"
import { PageAtmosphere } from "@/components/page-atmosphere"

type SiteChromeProps = {
  children: React.ReactNode
  idleTimeoutMs: number
}

export function SiteChrome({ children, idleTimeoutMs }: SiteChromeProps) {
  const pathname = usePathname()
  const hideFloatingAuth = pathname.startsWith("/g/")

  return (
    <div className="flex min-h-dvh flex-col">
      <PageAtmosphere />
      <IdleSessionGuard timeoutMs={idleTimeoutMs} />
      {hideFloatingAuth ? null : (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-end px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <div className="bg-card/75 pointer-events-auto rounded-full p-1 shadow-sm ring-1 ring-foreground/10 backdrop-blur-md">
            <AuthMenu />
          </div>
        </div>
      )}
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
