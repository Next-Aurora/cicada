import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "蝉 · cicada",
  description: "蝉（cicada）— 个人站点：旅行攻略、博客与小工具。",
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
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-6 py-16 sm:px-8">
      <header className="animate-[fade-up_0.7s_ease-out_both]">
        <h1 className="font-[family-name:var(--font-cicada-display)] text-[clamp(4.5rem,18vw,7.5rem)] leading-none font-bold tracking-tight text-[var(--color-cicada-accent)]">
          蝉
        </h1>
        <p className="mt-3 text-lg tracking-[0.2em] text-[var(--color-cicada-muted)] uppercase sm:text-xl">cicada</p>
        <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--color-cicada-text)] sm:text-lg">
          个人站点。旅行攻略已经上线；博客与小工具会陆续长出来。
        </p>
      </header>

      <nav
        aria-label="站点入口"
        className="mt-14 animate-[fade-up_0.7s_ease-out_0.12s_both] border-t border-[var(--color-cicada-hairline)] pt-8"
      >
        <ul className="flex flex-col gap-6">
          {entries.map((item) => (
            <li key={item.title}>
              {item.available ? (
                <Link href={item.href} className="group block max-w-md">
                  <span className="text-xl font-semibold text-[var(--color-cicada-text)] transition group-hover:text-[var(--color-cicada-accent)] sm:text-2xl">
                    {item.title}
                    <span className="ml-2 inline-block text-[var(--color-cicada-accent)] transition group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-[var(--color-cicada-muted)]">{item.desc}</span>
                </Link>
              ) : (
                <div className="max-w-md opacity-55">
                  <span className="text-xl font-semibold text-[var(--color-cicada-muted)] sm:text-2xl">{item.title}</span>
                  <span className="mt-1 block text-sm text-[var(--color-cicada-muted)]">{item.desc}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </main>
  )
}
