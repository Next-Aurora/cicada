type StandardIssue = {
  message: string
}

export function stringBody<T>(parse: (value: unknown) => T | string) {
  return {
    "~standard": {
      version: 1 as const,
      vendor: "cicada",
      validate(value: unknown) {
        const parsed = parse(value)
        if (typeof parsed === "string") {
          return { issues: [{ message: parsed } satisfies StandardIssue] }
        }
        return { value: parsed }
      },
    },
  }
}

export function readStringField(record: unknown, key: string) {
  if (!record || typeof record !== "object" || !(key in record)) return null
  const value = (record as Record<string, unknown>)[key]
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 256) return null
  return trimmed
}
