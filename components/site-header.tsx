"use client"

import { AuthMenu } from "@/components/auth-menu"
import { SiteBrand } from "@/components/site-brand"

export function SiteHeader() {
  return (
    <header className="border-border/60 bg-background/75 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:px-8 lg:px-10">
        <SiteBrand />
        <AuthMenu />
      </div>
    </header>
  )
}
