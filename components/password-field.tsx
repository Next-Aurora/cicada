"use client"

import { Check, Eye, EyeOff } from "lucide-react"
import { useId, useState } from "react"

import { authFieldClass } from "@/components/auth-card"
import { useI18n } from "@/components/locale-provider"
import { Input } from "@/components/ui/input"
import { fill } from "@/lib/i18n/messages"
import { PASSWORD_MIN_LENGTH, passwordRules } from "@/lib/password-policy"
import { cn } from "@/lib/utils"

type PasswordFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  /** After a blocked submit, unmet rules switch from a hint to an error. */
  attempted?: boolean
  autoComplete?: string
  onInvalidAttempt?: () => void
}

export function PasswordField({
  id,
  value,
  onChange,
  attempted = false,
  autoComplete = "new-password",
  onInvalidAttempt,
}: PasswordFieldProps) {
  const { m } = useI18n()
  const [visible, setVisible] = useState(false)
  const rulesId = useId()
  const showError = passwordRules.some((rule) => !rule.test(value)) && (attempted || value.length > 0)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          aria-invalid={showError || undefined}
          aria-describedby={rulesId}
          className={cn(authFieldClass, "pr-10 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden")}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onInvalid={(event) => {
            event.preventDefault()
            onInvalidAttempt?.()
          }}
        />
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground focus-visible:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl outline-none"
          aria-label={visible ? m.password.hide : m.password.show}
          aria-pressed={visible}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
      <ul id={rulesId} className="flex flex-col gap-1" aria-live="polite">
        {passwordRules.map((rule) => {
          const met = rule.test(value)
          const unmet = !met && (attempted || value.length > 0)
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-1.5 text-xs leading-relaxed",
                met ? "text-primary" : unmet ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {met ? (
                <Check className="size-3.5 shrink-0" aria-hidden />
              ) : (
                <span
                  aria-hidden
                  className={cn("size-1 shrink-0 rounded-full", unmet ? "bg-destructive" : "bg-muted-foreground/70")}
                />
              )}
              <span className="sr-only">{met ? m.password.met : unmet ? m.password.unmet : m.password.required}</span>
              {rule.id === "min-length" ? fill(m.password.minLength, { n: PASSWORD_MIN_LENGTH }) : rule.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
