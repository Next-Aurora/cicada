"use client"

import { usePathname } from "next/navigation"

import { AuthMenu } from "@/components/auth-menu"

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideFloatingAuth = pathname.startsWith("/g/")

  return (
    <>
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
