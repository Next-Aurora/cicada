import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"

import { getTrustedOrigins, isGitHubAuthEnabled } from "@/lib/auth-flags"
import { getIdleTimeoutSeconds } from "@/lib/auth-idle"
import { prisma } from "@/lib/prisma"

const idleTimeoutSeconds = getIdleTimeoutSeconds()

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  trustedOrigins: getTrustedOrigins(),
  session: {
    // Align server session lifetime with idle timeout; client guard signs out earlier on inactivity.
    expiresIn: idleTimeoutSeconds,
    // Refresh when less than half the idle window remains (requires a session request).
    updateAge: Math.max(60, Math.floor(idleTimeoutSeconds / 2)),
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    ...(isGitHubAuthEnabled()
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          },
        }
      : {}),
  },
})
