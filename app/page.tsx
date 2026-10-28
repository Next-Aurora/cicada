import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: { absolute: "凌风蝉 · cicadar" },
  description: "凌风蝉（cicadar）— 个人站点：旅行攻略、博客与小工具。",
}

const entries = [
  {
    href: "/guides",
    title: "旅行攻略",
    desc: "可执行的行程页，持续更新",
    available: true,
  },
  {
    href: "#",
    title: "博客",
    desc: "随笔与记录 · 即将开放",
    available: false,
  },
  {
    href: "#",
    title: "小工具",
    desc: "日常好用的小能力 · 即将开放",
    available: false,
  },
] as const

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-14 sm:px-8 sm:py-20">
      <header className="animate-[fade-up_0.7s_ease-out_both] text-center sm:text-left">
        <p className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide">
          <span aria-hidden className="bg-primary size-1.5 rounded-full" />
          旅行 · 记录 · 小工具
        </p>
        <h1 className="font-heading mt-6 text-[clamp(2.75rem,12vw,4.5rem)] leading-[1.05] font-extrabold tracking-tight">
          <span className="from-primary via-teal-600 to-sky-500 bg-gradient-to-br bg-clip-text text-transparent dark:via-teal-300 dark:to-sky-300">
            凌风蝉
          </span>
        </h1>
        <p className="text-muted-foreground mt-2 text-sm font-medium tracking-[0.35em] uppercase sm:text-base">
          cicadar
        </p>
        <p className="text-foreground/90 mx-auto mt-6 max-w-lg text-base leading-relaxed sm:mx-0 sm:text-lg">
          轻快的个人站点：攻略已上线，博客和小工具会陆续长出来。
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          <Button render={<Link href="/guides" />} nativeButton={false} size="lg" className="h-10 rounded-full px-6">
            查看旅行攻略
          </Button>
          <Button
            render={<Link href="/login" />}
            nativeButton={false}
            variant="outline"
            size="lg"
            className="h-10 rounded-full px-6"
          >
            登录
          </Button>
        </div>
      </header>

      <nav aria-label="站点入口" className="animate-[fade-up_0.7s_ease-out_0.12s_both] mt-14 sm:mt-16">
        <ul className="grid gap-3 sm:grid-cols-3">
          {entries.map((item) => (
            <li key={item.title}>
              {item.available ? (
                <Link href={item.href} className="group block h-full">
                  <Card
                    className={cn(
                      "h-full border-border/80 bg-card/70 py-4 transition-colors",
                      "hover:border-primary/35 hover:bg-card"
                    )}
                  >
                    <CardHeader className="gap-2">
                      <CardTitle className="group-hover:text-primary flex items-center gap-2 text-base font-semibold transition-colors">
                        <span
                          aria-hidden
                          className="bg-primary/70 group-hover:bg-primary h-4 w-0.5 shrink-0 rounded-full"
                        />
                        {item.title}
                        <span className="text-primary ml-auto text-sm opacity-0 transition group-hover:opacity-100">
                          →
                        </span>
                      </CardTitle>
                      <CardDescription className="pl-2.5 text-sm leading-relaxed">{item.desc}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ) : (
                <Card className="border-border/60 bg-muted/30 h-full py-4">
                  <CardHeader className="gap-2">
                    <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-semibold">
                      <span aria-hidden className="bg-muted-foreground/30 h-4 w-0.5 shrink-0 rounded-full" />
                      {item.title}
                      <span className="text-muted-foreground ml-auto text-[10px] font-medium tracking-wide">
                        即将开放
                      </span>
                    </CardTitle>
                    <CardDescription className="pl-2.5">{item.desc}</CardDescription>
                  </CardHeader>
                </Card>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </main>
  )
}
