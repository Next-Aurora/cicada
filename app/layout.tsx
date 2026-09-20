import type { Metadata } from "next"

import "styles/tailwind.css"

export const metadata: Metadata = {
  title: {
    default: "蝉 · cicada",
    template: "%s · 蝉",
  },
  description: "蝉（cicada）— 个人站点：旅行攻略、博客与小工具。",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
