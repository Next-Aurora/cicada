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
        "relative w-full overflow-hidden border-0 bg-card py-5 shadow-md ring-1 ring-primary/20",
        className
      )}
    >
      <div
        aria-hidden
        className="from-primary to-sky-500 absolute inset-x-0 top-0 h-1 bg-gradient-to-r"
      />
      {children}
    </Card>
  )
}

export function AuthDivider() {
  return (
    <div className="text-muted-foreground flex items-center gap-3 text-xs" role="separator">
      <span className="bg-border/80 h-px flex-1" />
      或
      <span className="bg-border/80 h-px flex-1" />
    </div>
  )
}

export const authFieldClass = "h-10 rounded-xl bg-background/80 md:text-sm"
export const authPrimaryButtonClass = "mt-1 h-10 w-full rounded-full font-medium"
export const authSecondaryButtonClass =
  "h-10 w-full rounded-full border-border/80 bg-background/60 font-medium"
