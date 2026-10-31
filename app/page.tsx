import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getLocale } from "@/lib/i18n/get-locale"
import { messages } from "@/lib/i18n/messages"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const m = messages[await getLocale()]
  return {
    title: { absolute: m.meta.siteTitle },
    description: m.meta.siteDescription,
  }
}

export default async function HomePage() {
  const m = messages[await getLocale()].home
  const entries = [
    {
      href: "/guides",
      title: m.guidesTitle,
      desc: m.guidesDesc,
      mark: m.guidesMark,
      available: true,
    },
    {
      href: "#",
      title: m.blogTitle,
      desc: m.blogDesc,
      mark: m.blogMark,
      available: false,
    },
    {
      href: "#",
      title: m.toolsTitle,
      desc: m.toolsDesc,
      mark: m.toolsMark,
      available: false,
    },
  ]

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="animate-[fade-up_0.7s_ease-out_both] text-center">
          <p className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide">
            <span aria-hidden className="bg-primary size-1.5 rounded-full" />
            {m.eyebrow}
          </p>
          <p className="text-foreground mt-6 text-2xl leading-snug font-semibold tracking-tight sm:text-3xl">
            {m.headline}
          </p>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-base leading-relaxed sm:text-lg">{m.lead}</p>
          <div className="mt-8 flex justify-center">
            <Button render={<Link href="/guides" />} nativeButton={false} size="lg" className="h-10 rounded-full px-6">
              {m.cta}
            </Button>
          </div>
        </header>

        <nav aria-label={m.navLabel} className="mt-12 w-full animate-[fade-up_0.7s_ease-out_0.12s_both] sm:mt-14">
          <ul className="grid gap-4 sm:grid-cols-3">
            {entries.map((item) => (
              <li key={item.title}>
                {item.available ? (
                  <Link href={item.href} className="group block h-full">
                    <Card
                      className={cn(
                        "bg-card ring-primary/20 relative h-full overflow-hidden border-0 py-5 shadow-md ring-1",
                        "transition-[box-shadow,transform] duration-200",
                        "hover:ring-primary/35 hover:-translate-y-0.5 hover:shadow-lg"
                      )}
                    >
                      <div
                        aria-hidden
                        className="from-primary absolute inset-x-0 top-0 h-1 bg-gradient-to-r to-sky-500"
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
                          {m.soon}
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
