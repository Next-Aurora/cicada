"use client"

import { useI18n } from "@/components/locale-provider"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type AuthCardProps = {
  children: React.ReactNode
  className?: string
}

/** 与首页入口卡片一致的认证表单容器 */
export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <Card
      className={cn(
        "bg-card ring-primary/20 relative w-full overflow-hidden border-0 py-5 shadow-md ring-1",
        className
      )}
    >
      <div aria-hidden className="from-primary absolute inset-x-0 top-0 h-1 bg-gradient-to-r to-sky-500" />
      {children}
    </Card>
  )
}

export function AuthDivider() {
  const { m } = useI18n()
  return (
    <div className="text-muted-foreground flex items-center gap-3 text-xs" role="separator">
      <span className="bg-border/80 h-px flex-1" />
      {m.auth.or}
      <span className="bg-border/80 h-px flex-1" />
    </div>
  )
}

export const authFieldClass = "h-10 rounded-xl bg-background/80 md:text-sm"
export const authAlertClass =
  "rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm leading-relaxed text-destructive"
export const authPrimaryButtonClass = "mt-1 h-10 w-full rounded-full font-medium"
export const authSecondaryButtonClass = "h-10 w-full rounded-full border-border/80 bg-background/60 font-medium"
