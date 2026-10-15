import type { Metadata } from "next"
import Link from "next/link"

import { listGuides } from "@/lib/guides"

export const metadata: Metadata = {
  title: "旅行攻略",
  description: "逆蝉 · 旅行攻略列表",
}

export default function GuidesPage() {
  const guides = listGuides()

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12 sm:px-8 sm:py-16">
      <header className="mb-10">
        <Link href="/" className="text-primary text-sm font-semibold hover:underline">
          ← 逆蝉
        </Link>
        <h1 className="font-heading text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-4xl">旅行攻略</h1>
        <p className="text-muted-foreground mt-3 max-w-xl text-base leading-relaxed">
          由 travel-guide 生成的行程页。新攻略写入仓库 <code className="text-sm">guides/</code> 后同步上线。
        </p>
      </header>

      {guides.length === 0 ? (
        <p className="border-border bg-card text-muted-foreground border px-4 py-6">
          暂无攻略。添加 <code>guides/&lt;slug&gt;/index.html</code> 后执行 <code>pnpm sync-guides</code>。
        </p>
      ) : (
        <ul className="border-border flex flex-col gap-8 border-t pt-8">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link href={`/g/${g.slug}`} className="group block max-w-xl">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-foreground group-hover:text-primary text-xl font-semibold transition">
                    {g.title}
                    <span className="text-primary ml-2 transition group-hover:translate-x-1">→</span>
                  </h2>
                  {g.dates ? <span className="text-muted-foreground text-sm">{g.dates}</span> : null}
                </div>
                {(g.destination || g.summary) && (
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {g.destination ? `${g.destination} · ` : ""}
                    {g.summary || ""}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
