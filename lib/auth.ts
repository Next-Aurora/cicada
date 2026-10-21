import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"

import { getTrustedOrigins, isGitHubAuthEnabled, isWeChatMiniAuthEnabled } from "@/lib/auth-flags"
import { SESSION_EXPIRES_IN_SECONDS, SESSION_UPDATE_AGE_SECONDS } from "@/lib/auth-idle"
import { prisma } from "@/lib/prisma"
import { wechatMiniPlugin } from "@/lib/wechat-mini-plugin"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  trustedOrigins: getTrustedOrigins(),
  session: {
    // Long-lived server session; idle auto-logout is enforced in the client guard.
    expiresIn: SESSION_EXPIRES_IN_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
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
  plugins: [...(isWeChatMiniAuthEnabled() ? [wechatMiniPlugin()] : [])],
})
