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
    emoji: "🗺️",
    accent: "from-teal-500/15 to-sky-400/10",
  },
  {
    href: "#",
    title: "博客",
    desc: "随笔与记录 · 即将开放",
    available: false,
    emoji: "✍️",
    accent: "from-violet-500/10 to-fuchsia-400/10",
  },
  {
    href: "#",
    title: "小工具",
    desc: "日常好用的小能力 · 即将开放",
    available: false,
    emoji: "🧰",
    accent: "from-amber-500/15 to-orange-400/10",
  },
] as const

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-14 sm:px-8 sm:py-20">
      <header className="animate-[fade-up_0.7s_ease-out_both] text-center sm:text-left">
        <p className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide">
          <span aria-hidden className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
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
          <Button
            render={<Link href="/guides" />}
            nativeButton={false}
            size="lg"
            className="shadow-primary/25 h-10 rounded-full px-6 shadow-lg"
          >
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

      <nav
        aria-label="站点入口"
        className="animate-[fade-up_0.7s_ease-out_0.12s_both] mt-14 sm:mt-16"
      >
        <ul className="grid gap-4 sm:grid-cols-3">
          {entries.map((item, index) => (
            <li
              key={item.title}
              className="animate-[fade-up_0.65s_ease-out_both]"
              style={{ animationDelay: `${0.08 * index + 0.15}s` }}
            >
              {item.available ? (
                <Link href={item.href} className="group block h-full">
                  <Card
                    className={cn(
                      "h-full border-0 bg-card/80 py-5 shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm transition duration-300",
                      "hover:-translate-y-1 hover:shadow-md hover:ring-primary/30"
                    )}
                  >
                    <CardHeader className="gap-3">
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br text-xl",
                          item.accent
                        )}
                      >
                        {item.emoji}
                      </span>
                      <CardTitle className="group-hover:text-primary flex items-center gap-1 text-lg transition">
                        {item.title}
                        <span className="text-primary inline-block transition group-hover:translate-x-0.5">
                          →
                        </span>
                      </CardTitle>
                      <CardDescription className="text-sm leading-relaxed">{item.desc}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ) : (
                <Card className="h-full border-0 bg-muted/40 py-5 opacity-90 ring-1 ring-foreground/5">
                  <CardHeader className="gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br text-xl grayscale",
                        item.accent
                      )}
                    >
                      {item.emoji}
                    </span>
                    <CardTitle className="text-muted-foreground flex items-center gap-2 text-lg">
                      {item.title}
                      <span className="bg-muted-foreground/15 text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                        即将开放
                      </span>
                    </CardTitle>
                    <CardDescription>{item.desc}</CardDescription>
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
