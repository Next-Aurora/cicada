import type { Metadata } from "next"
import Link from "next/link"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { listGuides } from "@/lib/guides"
import { getLocale } from "@/lib/i18n/get-locale"
import { messages } from "@/lib/i18n/messages"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const m = messages[await getLocale()].guides
  return {
    title: m.title,
    description: m.description,
  }
}

export default async function GuidesPage() {
  const guides = listGuides()
  const m = messages[await getLocale()].guides

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 sm:px-8 sm:py-14 lg:px-10">
      <header className="mb-10 max-w-3xl animate-[fade-up_0.6s_ease-out_both]">
        <h1 className="font-heading text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">{m.title}</h1>
        <p className="text-muted-foreground mt-3 max-w-xl text-base leading-relaxed">
          {m.introBefore}
          <code className="bg-muted rounded-md px-1.5 py-0.5 text-sm">guides/</code>
          {m.introAfter}
        </p>
      </header>

      {guides.length === 0 ? (
        <Card className="bg-card/80 ring-foreground/10 border-0 ring-1">
          <CardHeader>
            <CardTitle className="text-base">{m.emptyTitle}</CardTitle>
            <CardDescription>
              {m.emptyBefore}
              <code>guides/&lt;slug&gt;/index.html</code>
              {m.emptyAfter}
              <code>pnpm sync-guides</code>
              {m.emptyEnd}
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
                    "bg-card/85 ring-foreground/10 h-full border-0 py-5 shadow-sm ring-1 backdrop-blur-sm transition duration-300",
                    "hover:ring-primary/25 hover:-translate-y-0.5 hover:shadow-md"
                  )}
                >
                  <CardHeader className="gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="group-hover:text-primary pr-2 text-lg leading-snug transition">
                        {g.title}
                        <span className="text-primary ml-1 inline-block transition group-hover:translate-x-0.5">→</span>
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
