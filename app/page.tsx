import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: { absolute: "逆蝉 · cicadar" },
  description: "逆蝉（cicadar）— 个人站点：旅行攻略、博客与小工具。",
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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16 sm:px-8">
      <header className="animate-[fade-up_0.7s_ease-out_both]">
        <h1 className="font-heading text-primary text-[clamp(3.25rem,14vw,5.75rem)] leading-none font-bold tracking-tight">
          逆蝉
        </h1>
        <p className="text-muted-foreground mt-3 text-lg tracking-[0.2em] sm:text-xl">cicadar</p>
        <p className="text-foreground mt-6 max-w-md text-base leading-relaxed sm:text-lg">
          个人站点。旅行攻略已经上线；博客与小工具会陆续长出来。
        </p>
        <Button render={<Link href="/guides" />} nativeButton={false} className="mt-8" size="lg">
          查看旅行攻略
        </Button>
      </header>

      <nav
        aria-label="站点入口"
        className="animate-[fade-up_0.7s_ease-out_0.12s_both] border-border mt-14 border-t pt-8"
      >
        <ul className="flex flex-col gap-6">
          {entries.map((item) => (
            <li key={item.title}>
              {item.available ? (
                <Link href={item.href} className="group block max-w-md">
                  <span className="text-foreground group-hover:text-primary text-xl font-semibold transition sm:text-2xl">
                    {item.title}
                    <span className="text-primary ml-2 inline-block transition group-hover:translate-x-1">→</span>
                  </span>
                  <span className="text-muted-foreground mt-1 block text-sm">{item.desc}</span>
                </Link>
              ) : (
                <div className="max-w-md opacity-55">
                  <span className="text-muted-foreground text-xl font-semibold sm:text-2xl">{item.title}</span>
                  <span className="text-muted-foreground mt-1 block text-sm">{item.desc}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </main>
  )
}
