import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { getGuide, guideExists, listGuides } from "@/lib/guides"
import { getLocale } from "@/lib/i18n/get-locale"
import { messages } from "@/lib/i18n/messages"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return listGuides().map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuide(slug)
  const copy = messages[await getLocale()].guides
  if (!guide) return { title: copy.notFound }

  const description =
    [guide.destination, guide.dates, guide.summary].filter(Boolean).join(" · ") || copy.fallbackDescription

  const images = guide.ogImage ? [guide.ogImage] : undefined

  return {
    title: guide.title,
    description,
    openGraph: {
      title: guide.title,
      description,
      type: "article",
      locale: "zh_CN",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: guide.title,
      description,
      ...(images ? { images } : {}),
    },
  }
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide || !guideExists(slug)) notFound()

  const copy = messages[await getLocale()].guides
  const src = `/guides/${slug}/index.html`
  const label = guide.title

  return (
    <div className="bg-background flex min-h-0 flex-1 flex-col">
      <header className="border-border bg-card flex shrink-0 items-center gap-3 border-b px-4 py-2">
        <Link href="/guides" className="text-primary shrink-0 text-sm font-semibold hover:underline">
          {copy.back}
        </Link>
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm" title={label}>
          {label}
        </span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary shrink-0 text-sm"
        >
          {copy.open}
        </a>
      </header>
      <iframe title={label} src={src} className="min-h-0 w-full flex-1 border-0 bg-white" />
    </div>
  )
}
