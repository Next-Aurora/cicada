import Link from "next/link"

type AuthPageShellProps = {
  title: string
  description?: string
  children: React.ReactNode
}

export function AuthPageShell({ title, description, children }: AuthPageShellProps) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-8 sm:px-8">
      <div className="animate-[fade-up_0.7s_ease-out_both] mx-auto w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="font-heading text-foreground/80 text-2xl font-medium leading-snug tracking-tight sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm leading-relaxed sm:text-base">
              {description}
            </p>
          ) : null}
        </header>

        {children}

        <p className="mt-8 text-center">
          <Link
            href="/"
            className="text-muted-foreground hover:text-primary text-sm transition-colors hover:underline hover:underline-offset-4"
          >
            ← 返回首页
          </Link>
        </p>
      </div>
    </main>
  )
}
