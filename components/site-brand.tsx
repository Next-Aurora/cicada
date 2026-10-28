import Link from "next/link"

export function SiteBrand() {
  return (
    <Link href="/" className="flex min-w-0 items-baseline gap-2.5 rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">
      <span className="font-heading from-primary via-teal-600 to-sky-500 bg-gradient-to-br bg-clip-text text-lg font-extrabold tracking-tight text-transparent sm:text-xl">
        凌风蝉
      </span>
      <span className="text-muted-foreground hidden text-xs font-medium tracking-[0.28em] uppercase sm:inline sm:text-sm">
        cicadar
      </span>
    </Link>
  )
}
