import { createAdapterFactory } from "better-auth/adapters"

type StoreValue = string | number | boolean | null | string[]

export type AccountRow = {
  id: string
  userId: string
  accountId: string
  providerId: string
}

export type UserRow = {
  id: string
  email: string
  name: string
  emailVerified: boolean
}

export type WechatTicketRow = {
  id: string
  nonceHash: string
  status: string
  userId: string | null
  bindUserId: string | null
  expiresAt: Date
}

type StoreRow = Record<string, unknown>

const dateFields = [
  "createdAt",
  "updatedAt",
  "expiresAt",
  "accessTokenExpiresAt",
  "refreshTokenExpiresAt",
]

export class AuthStoreError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "AuthStoreError"
    this.status = status
  }
}

function reviveRow<T>(row: StoreRow | null): T | null {
  if (!row) return null
  for (const key of dateFields) {
    const value = row[key]
    if (typeof value === "string") row[key] = new Date(value)
  }
  return row as T
}

async function call(path: string, body: unknown) {
  const base = process.env.CICADA_API_URL?.trim().replace(/\/$/, "")
  const token = process.env.CICADA_INTERNAL_TOKEN?.trim()
  if (!base || !token) {
    throw new AuthStoreError("登录服务未配置", 503)
  }

  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cicada-internal-token": token,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const payload = (await response.json().catch(() => null)) as { result?: unknown; message?: string } | null
  if (!response.ok) {
    throw new AuthStoreError(payload?.message || "登录服务暂时不可用", response.status)
  }
  return payload?.result
}

async function execute(body: Record<string, unknown>) {
  return call("/internal/auth-store", body)
}

function asCount(value: unknown) {
  return typeof value === "number" ? value : 0
}

export const authStore = {
  user: {
    findUnique: async (args: { where: { id: string } }) =>
      reviveRow<UserRow>(
        (await execute({
          op: "findOne",
          model: "user",
          where: [{ field: "id", value: args.where.id, operator: "eq", connector: "AND" }],
        })) as StoreRow | null,
      ),
  },
  account: {
    findUnique: async (args: {
      where: { providerId_accountId: { providerId: string; accountId: string } }
    }) =>
      reviveRow<AccountRow>(
        (await execute({
          op: "findOne",
          model: "account",
          where: [
            {
              field: "providerId",
              value: args.where.providerId_accountId.providerId,
              operator: "eq",
              connector: "AND",
            },
            {
              field: "accountId",
              value: args.where.providerId_accountId.accountId,
              operator: "eq",
              connector: "AND",
            },
          ],
        })) as StoreRow | null,
      ),
    findFirst: async (args: {
      where: { userId: string; providerId: string; NOT?: { accountId: string } }
    }) =>
      reviveRow<AccountRow>(
        (await execute({
          op: "findOne",
          model: "account",
          where: [
            { field: "userId", value: args.where.userId, operator: "eq", connector: "AND" },
            { field: "providerId", value: args.where.providerId, operator: "eq", connector: "AND" },
            ...(args.where.NOT
              ? [
                  {
                    field: "accountId",
                    value: args.where.NOT.accountId,
                    operator: "ne" as const,
                    connector: "AND" as const,
                  },
                ]
              : []),
          ],
        })) as StoreRow | null,
      ),
  },
  wechatLoginTicket: {
    create: async (args: { data: Record<string, unknown> }) => {
      const row = reviveRow<WechatTicketRow>(
        (await execute({ op: "create", model: "wechatLoginTicket", data: args.data })) as StoreRow | null,
      )
      if (!row) throw new AuthStoreError("创建登录凭证失败", 500)
      return row
    },
    delete: async (args: { where: { id: string } }) => {
      await execute({
        op: "delete",
        model: "wechatLoginTicket",
        where: [{ field: "id", value: args.where.id, operator: "eq", connector: "AND" }],
      })
    },
    deleteMany: async (args: { where: { expiresAt: { lt: Date } } }) => {
      const count = await execute({
        op: "deleteMany",
        model: "wechatLoginTicket",
        where: [
          {
            field: "expiresAt",
            value: args.where.expiresAt.lt.toISOString(),
            operator: "lt",
            connector: "AND",
          },
        ],
      })
      return { count: asCount(count) }
    },
    findUnique: async (args: { where: { id: string } }) =>
      reviveRow<WechatTicketRow>(
        (await execute({
          op: "findOne",
          model: "wechatLoginTicket",
          where: [{ field: "id", value: args.where.id, operator: "eq", connector: "AND" }],
        })) as StoreRow | null,
      ),
    updateMany: async (args: {
      where: { id: string; status?: string; nonceHash?: string; expiresAt?: { gt: Date } }
      data: Record<string, unknown>
    }) => {
      const where: { field: string; value: StoreValue; operator: string; connector: "AND" }[] = [
        { field: "id", value: args.where.id, operator: "eq", connector: "AND" },
      ]
      if (args.where.status) {
        where.push({ field: "status", value: args.where.status, operator: "eq", connector: "AND" })
      }
      if (args.where.nonceHash) {
        where.push({ field: "nonceHash", value: args.where.nonceHash, operator: "eq", connector: "AND" })
      }
      if (args.where.expiresAt) {
        where.push({
          field: "expiresAt",
          value: args.where.expiresAt.gt.toISOString(),
          operator: "gt",
          connector: "AND",
        })
      }
      const count = await execute({ op: "updateMany", model: "wechatLoginTicket", where, update: args.data })
      return { count: asCount(count) }
    },
  },
  mergeWechatUser: (wechatUserId: string, emailUserId: string) =>
    call("/internal/auth-store/merge-wechat-user", { wechatUserId, emailUserId }),
}

type AdapterWhere = {
  field: string
  value: unknown
  operator?: string
  connector?: "AND" | "OR"
}

function normalizeWhere(where: AdapterWhere[] | undefined) {
  return (where ?? []).map((item) => ({
    field: item.field,
    value: item.value instanceof Date ? item.value.toISOString() : item.value,
    operator: item.operator ?? "eq",
    connector: item.connector ?? "AND",
  }))
}

export function apiAuthAdapter() {
  return createAdapterFactory({
    config: {
      adapterId: "cicada-api",
      adapterName: "Cicada API Adapter",
      usePlural: false,
      debugLogs: false,
      supportsJSON: true,
      supportsDates: false,
      supportsBooleans: true,
      supportsUUIDs: false,
      supportsArrays: false,
      transaction: false,
    },
    adapter: () => ({
      async create({ model, data }) {
        const row = reviveRow<StoreRow>((await execute({ op: "create", model, data })) as StoreRow | null)
        if (!row) throw new AuthStoreError("创建记录失败", 500)
        return row as never
      },
      async findOne({ model, where }) {
        return reviveRow<StoreRow>(
          (await execute({ op: "findOne", model, where: normalizeWhere(where) })) as StoreRow | null,
        ) as never
      },
      async findMany({ model, where, limit, offset, sortBy }) {
        const rows = (await execute({
          op: "findMany",
          model,
          where: normalizeWhere(where),
          limit,
          offset,
          sortBy,
        })) as StoreRow[] | null
        return (rows ?? []).map((row) => reviveRow<StoreRow>(row)!) as never
      },
      async count({ model, where }) {
        return asCount(await execute({ op: "count", model, where: normalizeWhere(where) }))
      },
      async update({ model, where, update }) {
        return reviveRow<StoreRow>(
          (await execute({ op: "update", model, where: normalizeWhere(where), update })) as StoreRow | null,
        ) as never
      },
      async updateMany({ model, where, update }) {
        return asCount(await execute({ op: "updateMany", model, where: normalizeWhere(where), update }))
      },
      async delete({ model, where }) {
        await execute({ op: "delete", model, where: normalizeWhere(where) })
      },
      async deleteMany({ model, where }) {
        return asCount(await execute({ op: "deleteMany", model, where: normalizeWhere(where) }))
      },
      async consumeOne({ model, where }) {
        return reviveRow<StoreRow>(
          (await execute({ op: "consumeOne", model, where: normalizeWhere(where) })) as StoreRow | null,
        ) as never
      },
    }),
  })
}
