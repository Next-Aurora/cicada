"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function AuthMenu() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return <div className="text-muted-foreground h-8 text-sm" aria-hidden />
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground max-w-[10rem] truncate text-sm sm:max-w-[14rem]">
          {session.user.name || session.user.email}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void authClient.signOut()
          }}
        >
          退出
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Button render={<Link href="/login" />} nativeButton={false} variant="ghost" size="sm">
        登录
      </Button>
      <Button render={<Link href="/register" />} nativeButton={false} variant="outline" size="sm">
        注册
      </Button>
    </div>
  )
}
