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
    <div className="flex h-dvh flex-col bg-white dark:bg-gray-950">
      <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
        <Link href="/guides" className="text-primary-700 dark:text-primary-300 text-sm font-semibold hover:underline">
          ← 全部攻略
        </Link>
        <span className="text-sm text-gray-500 dark:text-gray-400">{slug}</span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
        >
          单独打开
        </a>
      </header>
      <iframe title={slug} src={src} className="min-h-0 w-full flex-1 border-0 bg-white" />
    </div>
  )
}
