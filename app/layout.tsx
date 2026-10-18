import type { Metadata } from "next"

import { SiteChrome } from "@/components/site-chrome"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

import "styles/tailwind.css"

export const metadata: Metadata = {
  metadataBase: new URL("https://www.cicadar.cn"),
  title: {
    default: "逆蝉 · cicadar",
    template: "%s · 逆蝉",
  },
  description: "逆蝉（cicadar）— 个人站点：旅行攻略、博客与小工具。",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={cn("font-sans antialiased")}>
      <body>
        <ThemeProvider>
          <SiteChrome>{children}</SiteChrome>
        </ThemeProvider>
      </body>
    </html>
  )
}
