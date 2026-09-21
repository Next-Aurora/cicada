import type { Metadata } from "next"

import "styles/tailwind.css"

export const metadata: Metadata = {
  title: {
    default: "逆蝉 · cicadar",
    template: "%s · 逆蝉",
  },
  description: "逆蝉（cicadar）— 个人站点：旅行攻略、博客与小工具。",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
