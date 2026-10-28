import type { Metadata } from "next"
import Link from "next/link"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { listGuides } from "@/lib/guides"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "旅行攻略",
  description: "凌风蝉 · 旅行攻略列表",
}

export default function GuidesPage() {
  const guides = listGuides()

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 sm:px-8 sm:py-14 lg:px-10">
      <header className="animate-[fade-up_0.6s_ease-out_both] mb-10 max-w-3xl">
        <h1 className="font-heading text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
          旅行攻略
        </h1>
        <p className="text-muted-foreground mt-3 max-w-xl text-base leading-relaxed">
          由 travel-guide 生成的行程页。新攻略写入仓库{" "}
          <code className="bg-muted rounded-md px-1.5 py-0.5 text-sm">guides/</code> 后同步上线。
        </p>
      </header>

      {guides.length === 0 ? (
        <Card className="border-0 bg-card/80 ring-1 ring-foreground/10">
          <CardHeader>
            <CardTitle className="text-base">暂无攻略</CardTitle>
            <CardDescription>
              添加 <code>guides/&lt;slug&gt;/index.html</code> 后执行 <code>pnpm sync-guides</code>。
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {guides.map((g, index) => (
            <li
              key={g.slug}
              className="animate-[fade-up_0.6s_ease-out_both]"
              style={{ animationDelay: `${index * 0.06}s` }}
            >
              <Link href={`/g/${g.slug}`} className="group block h-full">
                <Card
                  className={cn(
                    "h-full border-0 bg-card/85 py-5 shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm transition duration-300",
                    "hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/25"
                  )}
                >
                  <CardHeader className="gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="group-hover:text-primary pr-2 text-lg leading-snug transition">
                        {g.title}
                        <span className="text-primary ml-1 inline-block transition group-hover:translate-x-0.5">
                          →
                        </span>
                      </CardTitle>
                      {g.dates ? (
                        <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium">
                          {g.dates}
                        </span>
                      ) : null}
                    </div>
                    {(g.destination || g.summary) && (
                      <CardDescription className="line-clamp-3 text-sm leading-relaxed">
                        {g.destination ? `${g.destination} · ` : ""}
                        {g.summary || ""}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
