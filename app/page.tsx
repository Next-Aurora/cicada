import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: { absolute: "凌风蝉 · cicadar" },
  description: "凌风蝉（cicadar）— 旅行攻略、博客与小工具，持续更新。",
}

const entries = [
  {
    href: "/guides",
    title: "旅行攻略",
    desc: "可执行的行程页，持续更新",
    mark: "旅",
    available: true,
  },
  {
    href: "#",
    title: "博客",
    desc: "随笔与记录",
    mark: "文",
    available: false,
  },
  {
    href: "#",
    title: "小工具",
    desc: "日常好用的小能力",
    mark: "具",
    available: false,
  },
] as const

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="animate-[fade-up_0.7s_ease-out_both] text-center">
          <p className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide">
            <span aria-hidden className="bg-primary size-1.5 rounded-full" />
            旅行 · 记录 · 小工具
          </p>
          <p className="text-foreground mt-6 text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
            风起了，路还在长
          </p>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-base leading-relaxed sm:text-lg">
            旅行攻略已经上线；博客与小工具会陆续补上。
          </p>
          <div className="mt-8 flex justify-center">
            <Button render={<Link href="/guides" />} nativeButton={false} size="lg" className="h-10 rounded-full px-6">
              查看旅行攻略
            </Button>
          </div>
        </header>

        <nav
          aria-label="站点入口"
          className="animate-[fade-up_0.7s_ease-out_0.12s_both] mt-12 w-full sm:mt-14"
        >
        <ul className="grid gap-4 sm:grid-cols-3">
          {entries.map((item) => (
            <li key={item.title}>
              {item.available ? (
                <Link href={item.href} className="group block h-full">
                  <Card
                    className={cn(
                      "relative h-full overflow-hidden border-0 bg-card py-5 shadow-md ring-1 ring-primary/20",
                      "transition-[box-shadow,transform] duration-200",
                      "hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary/35"
                    )}
                  >
                    <div
                      aria-hidden
                      className="from-primary to-sky-500 absolute inset-x-0 top-0 h-1 bg-gradient-to-r"
                    />
                    <CardHeader className="gap-3">
                      <span
                        aria-hidden
                        className="bg-primary/12 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl text-base font-bold"
                      >
                        {item.mark}
                      </span>
                      <CardTitle className="group-hover:text-primary flex items-center gap-1 text-lg font-semibold transition-colors">
                        {item.title}
                        <span className="text-primary text-sm">→</span>
                      </CardTitle>
                      <CardDescription className="text-sm leading-relaxed">{item.desc}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ) : (
                <Card className="border-border/70 bg-muted/45 h-full border border-dashed py-5 shadow-sm ring-0">
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        aria-hidden
                        className="bg-muted text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-xl text-base font-semibold"
                      >
                        {item.mark}
                      </span>
                      <span className="text-muted-foreground bg-background/80 rounded-full px-2 py-0.5 text-[10px] font-medium">
                        即将开放
                      </span>
                    </div>
                    <CardTitle className="text-muted-foreground text-lg font-semibold">{item.title}</CardTitle>
                    <CardDescription>{item.desc}</CardDescription>
                  </CardHeader>
                </Card>
              )}
            </li>
          ))}
        </ul>
        </nav>
      </div>
    </main>
  )
}
