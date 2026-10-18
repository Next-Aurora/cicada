"use client"

import { usePathname } from "next/navigation"

import { AuthMenu } from "@/components/auth-menu"
import { IdleSessionGuard } from "@/components/idle-session-guard"

type SiteChromeProps = {
  children: React.ReactNode
  idleTimeoutMs: number
}

export function SiteChrome({ children, idleTimeoutMs }: SiteChromeProps) {
  const pathname = usePathname()
  const hideFloatingAuth = pathname.startsWith("/g/")

  return (
    <>
      <IdleSessionGuard timeoutMs={idleTimeoutMs} />
      {hideFloatingAuth ? null : (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-end px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <div className="pointer-events-auto">
            <AuthMenu />
          </div>
        </div>
      )}
      {children}
    </>
  )
}
