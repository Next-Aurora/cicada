import type { Metadata } from "next"

import { SiteChrome } from "@/components/site-chrome"
import { ThemeProvider } from "@/components/theme-provider"
import { getIdleTimeoutMs } from "@/lib/auth-idle"
import { cn } from "@/lib/utils"

import "styles/tailwind.css"

export const metadata: Metadata = {
  metadataBase: new URL("https://www.cicadar.cn"),
  title: {
    default: "凌风蝉 · cicadar",
    template: "%s · 凌风蝉",
  },
  description: "凌风蝉（cicadar）— 旅行攻略、博客与小工具，持续更新。",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const idleTimeoutMs = getIdleTimeoutMs()

  return (
    <html lang="zh-CN" suppressHydrationWarning className={cn("font-sans antialiased")}>
      <body>
        <ThemeProvider>
          <SiteChrome idleTimeoutMs={idleTimeoutMs}>{children}</SiteChrome>
        </ThemeProvider>
      </body>
    </html>
  )
}
