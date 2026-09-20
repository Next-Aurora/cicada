import Link from "next/link"
import { notFound } from "next/navigation"

import { guideExists, listGuides } from "lib/guides"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return listGuides().map((g) => ({ slug: g.slug }))
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  if (!guideExists(slug)) notFound()

  const src = `/guides/${slug}/index.html`

  return (
    <div className="flex h-dvh flex-col bg-[var(--color-cicada-bg)]">
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--color-cicada-hairline)] bg-[var(--color-cicada-surface)] px-4 py-2">
        <Link href="/guides" className="text-sm font-semibold text-[var(--color-cicada-accent)] hover:underline">
          ← 旅行攻略
        </Link>
        <span className="text-sm text-[var(--color-cicada-muted)]">{slug}</span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-sm text-[var(--color-cicada-muted)] hover:text-[var(--color-cicada-accent)]"
        >
          单独打开
        </a>
      </header>
      <iframe title={slug} src={src} className="min-h-0 w-full flex-1 border-0 bg-white" />
    </div>
  )
}
