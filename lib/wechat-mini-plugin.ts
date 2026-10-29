import { APIError, createAuthEndpoint, getSessionFromCtx } from "better-auth/api"
import { setSessionCookie } from "better-auth/cookies"

import { isWeChatMiniAuthEnabled } from "@/lib/auth-flags"
import { AuthStoreError, authStore } from "@/lib/auth-store"
import { readStringField, stringBody } from "@/lib/standard-schema"
import { decideWechatUserBinding, isWechatPlaceholderEmail } from "@/lib/wechat-bind"
import { isWechatIdentityMethod, isWechatIdentityMethodEnabled } from "@/lib/wechat-identity"
import {
  WECHAT_MINI_PROVIDER_ID,
  WECHAT_NONCE_COOKIE,
  WECHAT_TICKET_CONSUMED,
  WECHAT_TICKET_PENDING,
  WECHAT_TICKET_READY,
  WECHAT_TICKET_TTL_SECONDS,
  WechatMiniError,
  createMiniProgramScheme,
  createWechatNonce,
  createWechatTicketId,
  exchangeMiniProgramCode,
  hashWechatNonce,
  wechatUserEmail,
} from "@/lib/wechat-mini"

type TicketBody = { ticket: string }
type CompleteBody = { ticket: string; code: string }
type BindIdentityBody = {
  method: string
  email?: string
  password?: string
  phone?: string
}

const emptyBody = stringBody(() => ({}))

const ticketBody = stringBody((value: unknown) => {
  const ticket = readStringField(value, "ticket")
  if (!ticket) return "登录凭证不正确"
  return { ticket } satisfies TicketBody
})

const completeBody = stringBody((value: unknown) => {
  const ticket = readStringField(value, "ticket")
  const code = readStringField(value, "code")
  if (!ticket || !code) return "登录凭证不正确"
  return { ticket, code } satisfies CompleteBody
})

const bindIdentityBody = stringBody((value: unknown) => {
  const method = readStringField(value, "method")
  if (!method || !isWechatIdentityMethod(method)) return "请选择绑定方式"
  if (!isWechatIdentityMethodEnabled(method)) return "该绑定方式暂未开放"

  if (method === "email") {
    const email = readStringField(value, "email")
    const password =
      value &&
      typeof value === "object" &&
      "password" in value &&
      typeof (value as { password?: unknown }).password === "string"
        ? (value as { password: string }).password
        : null
    if (!email || !password) return "请填写邮箱和密码"
    if (password.length < 8 || password.length > 128) return "密码不正确"
    return { method, email, password } satisfies BindIdentityBody
  }

  // Reserved for SMS / phone password later.
  return "该绑定方式暂未开放"
})

function assertEnabled() {
  if (!isWeChatMiniAuthEnabled()) {
    throw APIError.fromStatus("NOT_FOUND", { message: "微信登录未开启" })
  }
}

function asApiError(error: unknown): never {
  if (error instanceof WechatMiniError) {
    throw APIError.fromStatus("BAD_REQUEST", { message: error.message })
  }
  throw error
}

type PasswordAuthContext = {
  context: {
    internalAdapter: {
      findUserByEmail: (
        email: string,
        opts?: { includeAccounts?: boolean },
      ) => Promise<{
        user: { id: string; email: string }
        accounts: Array<{ providerId: string; accountId: string; password?: string | null }>
      } | null>
    }
    password: {
      hash: (password: string) => Promise<string>
      verify: (input: { hash: string; password: string }) => Promise<boolean>
    }
  }
}

async function verifyEmailPasswordUser(ctx: PasswordAuthContext, email: string, password: string) {
  const userRecord = await ctx.context.internalAdapter.findUserByEmail(email.toLowerCase(), {
    includeAccounts: true,
  })
  const credentialAccount = userRecord?.accounts.find(
    (account) => account.providerId === "credential" && account.accountId === userRecord.user.id,
  )
  if (!userRecord || !credentialAccount?.password) {
    await ctx.context.password.hash(password)
    throw APIError.fromStatus("UNAUTHORIZED", { message: "邮箱或密码不正确" })
  }
  if (isWechatPlaceholderEmail(userRecord.user.email)) {
    throw APIError.fromStatus("BAD_REQUEST", { message: "无法绑定到微信临时账号" })
  }
  if (
    !(await ctx.context.password.verify({
      hash: credentialAccount.password,
      password,
    }))
  ) {
    throw APIError.fromStatus("UNAUTHORIZED", { message: "邮箱或密码不正确" })
  }
  return userRecord.user
}

async function upgradeWechatUserWithEmail(
  ctx: PasswordAuthContext & {
    context: {
      internalAdapter: PasswordAuthContext["context"]["internalAdapter"] & {
        updateUser: (userId: string, data: Record<string, unknown>) => Promise<{ id: string }>
        createAccount: (account: Record<string, unknown>) => Promise<unknown>
        updatePassword: (userId: string, passwordHash: string) => Promise<unknown>
        findAccounts: (userId: string) => Promise<Array<{ providerId: string }>>
      }
    }
  },
  wechatUserId: string,
  email: string,
  password: string,
) {
  const existing = await ctx.context.internalAdapter.findUserByEmail(email.toLowerCase(), {
    includeAccounts: true,
  })
  if (existing && existing.user.id !== wechatUserId) {
    const emailUser = await verifyEmailPasswordUser(ctx, email, password)
    await mergeWechatUserIntoEmailUser({
      wechatUserId,
      emailUserId: emailUser.id,
    })
    return emailUser.id
  }

  const passwordHash = await ctx.context.password.hash(password)
  await ctx.context.internalAdapter.updateUser(wechatUserId, {
    email: email.toLowerCase(),
    emailVerified: true,
  })
  const accounts = await ctx.context.internalAdapter.findAccounts(wechatUserId)
  const hasCredential = accounts.some((account) => account.providerId === "credential")
  if (hasCredential) {
    await ctx.context.internalAdapter.updatePassword(wechatUserId, passwordHash)
  } else {
    await ctx.context.internalAdapter.createAccount({
      userId: wechatUserId,
      providerId: "credential",
      accountId: wechatUserId,
      password: passwordHash,
    })
  }
  return wechatUserId
}

async function resolveBindTarget(input: {
  bindUserId: string | null
  openid: string
}) {
  const existing = await authStore.account.findUnique({
    where: {
      providerId_accountId: { providerId: WECHAT_MINI_PROVIDER_ID, accountId: input.openid },
    },
  })

  let bindUserIsPlaceholderEmail = false
  let bindUserAlreadyHasOtherWechat = false
  if (input.bindUserId) {
    const bindUser = await authStore.user.findUnique({ where: { id: input.bindUserId } })
    if (!bindUser) {
      throw APIError.fromStatus("BAD_REQUEST", { message: "要绑定的邮箱账号不存在" })
    }
    bindUserIsPlaceholderEmail = isWechatPlaceholderEmail(bindUser.email)
    const otherWechat = await authStore.account.findFirst({
      where: {
        userId: input.bindUserId,
        providerId: WECHAT_MINI_PROVIDER_ID,
        NOT: { accountId: input.openid },
      },
    })
    bindUserAlreadyHasOtherWechat = Boolean(otherWechat)
  }

  const decision = decideWechatUserBinding({
    existingWechatUserId: existing?.userId ?? null,
    bindUserId: input.bindUserId,
    bindUserIsPlaceholderEmail,
    bindUserAlreadyHasOtherWechat,
  })
  if (!decision.ok) {
    throw APIError.fromStatus("BAD_REQUEST", { message: decision.message })
  }
  return { decision, existing }
}

async function mergeWechatUserIntoEmailUser(input: {
  wechatUserId: string
  emailUserId: string
}) {
  const { wechatUserId, emailUserId } = input
  if (wechatUserId === emailUserId) return

  const wechatAccount = await authStore.account.findFirst({
    where: { userId: wechatUserId, providerId: WECHAT_MINI_PROVIDER_ID },
  })
  if (!wechatAccount) {
    throw APIError.fromStatus("BAD_REQUEST", { message: "当前账号没有可绑定的微信" })
  }

  const emailAlreadyHasOtherWechat = await authStore.account.findFirst({
    where: {
      userId: emailUserId,
      providerId: WECHAT_MINI_PROVIDER_ID,
      NOT: { accountId: wechatAccount.accountId },
    },
  })
  if (emailAlreadyHasOtherWechat) {
    throw APIError.fromStatus("BAD_REQUEST", { message: "该邮箱账号已绑定其他微信" })
  }

  try {
    await authStore.mergeWechatUser(wechatUserId, emailUserId)
  } catch (error) {
    if (error instanceof AuthStoreError && error.status === 400) {
      throw APIError.fromStatus("BAD_REQUEST", { message: error.message })
    }
    throw error
  }
}

export function wechatMiniPlugin() {
  return {
    id: "wechat-mini",
    endpoints: {
      wechatMiniStart: createAuthEndpoint(
        "/wechat-mini/start",
        {
          method: "POST",
          body: emptyBody,
          requireHeaders: true,
          metadata: { noStore: true },
        },
        async (ctx) => {
          assertEnabled()

          // Already signed in with a real email account: bind WeChat to that user.
          let bindUserId: string | null = null
          const session = await getSessionFromCtx(ctx)
          if (session?.user?.id && !isWechatPlaceholderEmail(session.user.email)) {
            bindUserId = session.user.id
          }

          const ticket = createWechatTicketId()
          const nonce = createWechatNonce()
          const expiresAt = new Date(Date.now() + WECHAT_TICKET_TTL_SECONDS * 1000)

          if (Math.random() < 0.05) {
            await authStore.wechatLoginTicket.deleteMany({
              where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            })
          }

          await authStore.wechatLoginTicket.create({
            data: {
              id: ticket,
              nonceHash: hashWechatNonce(nonce),
              status: WECHAT_TICKET_PENDING,
              bindUserId,
              expiresAt,
            },
          })

          let openlink: string
          try {
            openlink = await createMiniProgramScheme(ticket, { bindReady: Boolean(bindUserId) })
          } catch (error) {
            await authStore.wechatLoginTicket.delete({ where: { id: ticket } }).catch(() => undefined)
            asApiError(error)
          }

          const attributes = ctx.context.authCookies.sessionToken.attributes
          await ctx.setSignedCookie(WECHAT_NONCE_COOKIE, nonce, ctx.context.secret, {
            httpOnly: true,
            secure: attributes.secure,
            sameSite: attributes.sameSite,
            path: "/",
            maxAge: WECHAT_TICKET_TTL_SECONDS,
          })

          return ctx.json({ ticket, openlink, bindReady: Boolean(bindUserId) })
        },
      ),
      wechatMiniComplete: createAuthEndpoint(
        "/wechat-mini/complete",
        {
          method: "POST",
          body: completeBody,
          metadata: {
            noStore: true,
            $Infer: { body: {} as CompleteBody },
          },
        },
        async (ctx) => {
          assertEnabled()
          const { ticket, code } = ctx.body as CompleteBody
          const row = await authStore.wechatLoginTicket.findUnique({ where: { id: ticket } })
          if (!row || row.expiresAt.getTime() <= Date.now() || row.status === WECHAT_TICKET_CONSUMED) {
            throw APIError.fromStatus("BAD_REQUEST", { message: "登录已过期，请回到网页重新登录" })
          }
          if (row.status === WECHAT_TICKET_READY) {
            return ctx.json({ ok: true })
          }

          let openid: string
          try {
            openid = (await exchangeMiniProgramCode(code)).openid
          } catch (error) {
            asApiError(error)
          }

          const bindUserId = row.bindUserId
          const { decision } = await resolveBindTarget({ bindUserId, openid })
          let userId = decision.userId

          if (decision.action === "create") {
            try {
              const user = await ctx.context.internalAdapter.createUser(
                {
                  email: wechatUserEmail(openid),
                  name: "微信用户",
                  emailVerified: true,
                },
                { method: "wechat-mini" },
              )
              if (!user) {
                throw APIError.fromStatus("INTERNAL_SERVER_ERROR", { message: "登录失败，请重试" })
              }
              await ctx.context.internalAdapter.createAccount({
                userId: user.id,
                providerId: WECHAT_MINI_PROVIDER_ID,
                accountId: openid,
              })
              userId = user.id
            } catch (error) {
              const raced = await authStore.account.findUnique({
                where: {
                  providerId_accountId: { providerId: WECHAT_MINI_PROVIDER_ID, accountId: openid },
                },
              })
              if (!raced) throw error
              userId = raced.userId
            }
          } else if (decision.action === "link") {
            await ctx.context.internalAdapter.createAccount({
              userId: decision.userId,
              providerId: WECHAT_MINI_PROVIDER_ID,
              accountId: openid,
            })
            userId = decision.userId
          }

          const updated = await authStore.wechatLoginTicket.updateMany({
            where: { id: ticket, status: WECHAT_TICKET_PENDING, expiresAt: { gt: new Date() } },
            data: {
              status: WECHAT_TICKET_READY,
              userId,
              bindUserId: bindUserId ?? row.bindUserId,
            },
          })
          if (updated.count !== 1) {
            const latest = await authStore.wechatLoginTicket.findUnique({ where: { id: ticket } })
            if (latest?.status !== WECHAT_TICKET_READY) {
              throw APIError.fromStatus("BAD_REQUEST", { message: "登录已过期，请回到网页重新登录" })
            }
          }

          return ctx.json({ ok: true })
        },
      ),
      wechatMiniPoll: createAuthEndpoint(
        "/wechat-mini/poll",
        {
          method: "POST",
          body: ticketBody,
          requireHeaders: true,
          metadata: {
            noStore: true,
            $Infer: { body: {} as TicketBody },
          },
        },
        async (ctx) => {
          assertEnabled()
          const nonce = await ctx.getSignedCookie(WECHAT_NONCE_COOKIE, ctx.context.secret)
          if (typeof nonce !== "string" || !nonce) {
            return ctx.json({ status: "restart" as const })
          }

          const { ticket } = ctx.body as TicketBody
          const row = await authStore.wechatLoginTicket.findUnique({ where: { id: ticket } })
          if (!row || row.nonceHash !== hashWechatNonce(nonce)) {
            return ctx.json({ status: "restart" as const })
          }
          if (row.expiresAt.getTime() <= Date.now()) {
            return ctx.json({ status: "expired" as const })
          }
          if (row.status !== WECHAT_TICKET_READY || !row.userId) {
            return ctx.json({ status: "pending" as const })
          }

          const claimed = await authStore.wechatLoginTicket.updateMany({
            where: {
              id: row.id,
              nonceHash: row.nonceHash,
              status: WECHAT_TICKET_READY,
              expiresAt: { gt: new Date() },
            },
            data: { status: WECHAT_TICKET_CONSUMED },
          })
          if (claimed.count !== 1) {
            return ctx.json({ status: "pending" as const })
          }

          const user = await ctx.context.internalAdapter.findUserById(row.userId)
          if (!user) {
            throw APIError.fromStatus("BAD_REQUEST", { message: "登录失败，请重试" })
          }
          const session = await ctx.context.internalAdapter.createSession(user.id)
          if (!session) {
            throw APIError.fromStatus("INTERNAL_SERVER_ERROR", { message: "登录失败，请重试" })
          }
          await setSessionCookie(ctx, { session, user })
          return ctx.json({
            status: "ok" as const,
            requireBindIdentity: isWechatPlaceholderEmail(user.email),
          })
        },
      ),
      wechatMiniBindIdentity: createAuthEndpoint(
        "/wechat-mini/bind-identity",
        {
          method: "POST",
          body: bindIdentityBody,
          requireHeaders: true,
          metadata: {
            noStore: true,
            $Infer: { body: {} as BindIdentityBody },
          },
        },
        async (ctx) => {
          assertEnabled()
          const session = await getSessionFromCtx(ctx)
          if (!session?.user) {
            throw APIError.fromStatus("UNAUTHORIZED", { message: "请先完成微信登录" })
          }
          if (!isWechatPlaceholderEmail(session.user.email)) {
            throw APIError.fromStatus("BAD_REQUEST", { message: "当前账号已完成绑定" })
          }

          const body = ctx.body as BindIdentityBody
          let userId = session.user.id

          if (body.method === "email") {
            if (!body.email || !body.password) {
              throw APIError.fromStatus("BAD_REQUEST", { message: "请填写邮箱和密码" })
            }
            userId = await upgradeWechatUserWithEmail(
              ctx as Parameters<typeof upgradeWechatUserWithEmail>[0],
              session.user.id,
              body.email,
              body.password,
            )
          } else {
            throw APIError.fromStatus("BAD_REQUEST", { message: "该绑定方式暂未开放" })
          }

          const user = await ctx.context.internalAdapter.findUserById(userId)
          if (!user) {
            throw APIError.fromStatus("INTERNAL_SERVER_ERROR", { message: "绑定失败，请重试" })
          }
          const nextSession = await ctx.context.internalAdapter.createSession(user.id)
          if (!nextSession) {
            throw APIError.fromStatus("INTERNAL_SERVER_ERROR", { message: "绑定失败，请重试" })
          }
          await setSessionCookie(ctx, { session: nextSession, user })
          return ctx.json({ ok: true, method: body.method })
        },
      ),
    },
    rateLimit: [
      {
        pathMatcher(path: string) {
          return path.startsWith("/wechat-mini/")
        },
        window: 60,
        max: 30,
      },
    ],
  }
}
