import type { Metadata } from "next"

import { LocaleProvider } from "@/components/locale-provider"
import { SiteChrome } from "@/components/site-chrome"
import { ThemeProvider } from "@/components/theme-provider"
import { getIdleTimeoutMs } from "@/lib/auth-idle"
import { getLocale } from "@/lib/i18n/get-locale"
import { htmlLang } from "@/lib/i18n/locale"
import { messages } from "@/lib/i18n/messages"
import { cn } from "@/lib/utils"

import "styles/tailwind.css"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const m = messages[locale]
  return {
    metadataBase: new URL("https://www.cicadar.cn"),
    title: {
      default: m.meta.siteTitle,
      template: m.meta.titleTemplate,
    },
    description: m.meta.siteDescription,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const idleTimeoutMs = getIdleTimeoutMs()

  return (
    <html lang={htmlLang(locale)} suppressHydrationWarning className={cn("font-sans antialiased")}>
      <body>
        <ThemeProvider>
          <LocaleProvider locale={locale}>
            <SiteChrome idleTimeoutMs={idleTimeoutMs}>{children}</SiteChrome>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
