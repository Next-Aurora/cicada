"use client"

import { ChevronDown, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { useI18n } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { clearLastActivityTs, openIdleChannel, publishIdleMessage } from "@/lib/auth-idle-client"
import { cn } from "@/lib/utils"

async function signOut(router: ReturnType<typeof useRouter>) {
  const channel = openIdleChannel()
  publishIdleMessage(channel, { type: "logout", reason: "manual" })
  channel?.close()
  clearLastActivityTs()
  await authClient.signOut()
  router.refresh()
}

function AccountMenu({ name, onSignOut }: { name: string; onSignOut: () => Promise<void> }) {
  const { m } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="text-foreground/80 hover:bg-muted/70 focus-visible:ring-ring/50 flex h-8 max-w-[10rem] items-center gap-1 rounded-full px-2.5 text-sm outline-none focus-visible:ring-3 sm:max-w-[14rem]"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          if (window.matchMedia("(hover: hover)").matches) return
          setOpen((current) => !current)
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <span className="truncate">{name}</span>
        <ChevronDown
          aria-hidden
          className={cn("text-muted-foreground size-3.5 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="absolute top-full right-0 z-50 pt-1.5">
          <div className="bg-popover ring-foreground/10 min-w-28 rounded-xl p-1 shadow-md ring-1" role="menu">
            <button
              type="button"
              role="menuitem"
              className="hover:bg-muted flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm"
              onClick={() => void onSignOut()}
            >
              <LogOut aria-hidden className="text-muted-foreground size-3.5" />
              {m.nav.signOut}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function AuthMenu() {
  const router = useRouter()
  const { m } = useI18n()
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return <div className="text-muted-foreground h-8 text-sm" aria-hidden />
  }

  if (session?.user) {
    return <AccountMenu name={session.user.name || session.user.email} onSignOut={() => signOut(router)} />
  }

  return (
    <div className="bg-muted/50 ring-foreground/10 flex items-center gap-0.5 rounded-full p-0.5 ring-1">
      <Button
        render={<Link href="/login" />}
        nativeButton={false}
        variant="ghost"
        size="sm"
        className={cn("h-8 rounded-full px-3.5 text-sm font-medium", "hover:bg-background/80")}
      >
        {m.nav.signIn}
      </Button>
      <Button
        render={<Link href="/register" />}
        nativeButton={false}
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 rounded-full px-3.5 text-sm font-medium",
          "bg-background text-primary hover:bg-background shadow-sm"
        )}
      >
        {m.nav.signUp}
      </Button>
    </div>
  )
}
