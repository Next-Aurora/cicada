import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"

import { getTrustedOrigins, isGitHubAuthEnabled } from "@/lib/auth-flags"
import { prisma } from "@/lib/prisma"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  trustedOrigins: getTrustedOrigins(),
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
