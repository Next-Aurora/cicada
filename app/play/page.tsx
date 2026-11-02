import type { Metadata } from "next"
import { headers } from "next/headers"

import { PlayStudio } from "@/components/play/play-studio"
import { auth } from "@/lib/auth"
import { getLocale } from "@/lib/i18n/get-locale"
import { messages } from "@/lib/i18n/messages"

export async function generateMetadata(): Promise<Metadata> {
  const copy = messages[await getLocale()].play
  return { title: copy.title, description: copy.description }
}

export default async function PlayPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  return <PlayStudio signedIn={Boolean(session?.user)} />
}
