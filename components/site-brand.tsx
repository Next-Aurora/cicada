import Link from "next/link"

export function SiteBrand() {
  return (
    <Link
      href="/"
      className="inline-flex min-w-0 items-center gap-2 rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span className="font-heading from-primary via-teal-600 to-sky-500 bg-gradient-to-br bg-clip-text text-lg leading-none font-extrabold tracking-tight text-transparent sm:text-xl">
        凌风蝉
      </span>
      <span className="text-muted-foreground hidden text-xs leading-none font-medium tracking-wider uppercase sm:inline sm:text-[13px]">
        cicadar
      </span>
    </Link>
  )
}
