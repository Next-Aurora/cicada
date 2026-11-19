"use client"

import Image from "next/image"
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
        <div className="border-border/60 mx-auto max-w-6xl border-t pt-6">
          <div className="relative">
            <div className="flex flex-col items-center gap-1.5 text-center sm:px-36">
              <p className="text-muted-foreground text-xs leading-relaxed">
                © {new Date().getFullYear()} 凌风蝉 <span className="uppercase">cicadar</span> {m.footer.rights}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Image src="/assets/beian.png" alt="备案" width={16} height={16} />
                <a
                  href="https://beian.mps.gov.cn/#/query/webSearch?code=51013202000192"
                  rel="noreferrer"
                  target="_blank"
                  className="text-muted-foreground/80 hover:text-foreground text-xs underline-offset-4 transition-colors hover:underline"
                >
                  川公网安备51013202000192号
                </a>

                <a
                  href="https://beian.miit.gov.cn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground/80 hover:text-foreground text-xs underline-offset-4 transition-colors hover:underline"
                >
                  蜀ICP备2024112200号-2
                </a>
              </div>
            </div>
            <div className="mt-3 flex justify-end sm:absolute sm:inset-y-0 sm:right-0 sm:mt-0 sm:items-center">
              <LocaleSwitch />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
