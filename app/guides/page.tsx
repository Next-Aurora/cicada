import { Metadata } from "next"
import Link from "next/link"

import { listGuides } from "lib/guides"

export const metadata: Metadata = {
  title: "旅行攻略",
  description: "由 travel-guide 生成的行程列表",
}

export default function GuidesPage() {
  const guides = listGuides()

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-12 sm:py-16">
      <header className="mb-10">
        <p className="text-primary-700 dark:text-primary-300 text-sm font-semibold tracking-wide">travel-guide</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">旅行攻略</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-gray-500 dark:text-gray-400">
          攻略落盘在仓库 <code className="text-sm">guides/&lt;slug&gt;/</code>，同步到{" "}
          <code className="text-sm">public/guides/</code> 后 push 即可上线。
        </p>
        <p className="mt-4">
          <Link href="/" className="text-primary-700 dark:text-primary-300 text-sm font-semibold hover:underline">
            ← 返回首页
          </Link>
        </p>
      </header>

      {guides.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          暂无攻略。添加 <code>guides/&lt;slug&gt;/index.html</code> 后执行{" "}
          <code>pnpm sync-guides</code> 再构建。
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/g/${g.slug}`}
                className="block rounded-lg border border-gray-200 bg-white px-5 py-4 transition hover:border-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-400"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{g.title}</h2>
                  {g.dates ? <span className="text-sm text-gray-500 dark:text-gray-400">{g.dates}</span> : null}
                </div>
                {(g.destination || g.summary) && (
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
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
