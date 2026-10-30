export const PASSWORD_MIN_LENGTH = 8

export type PasswordRule = {
  id: string
  /** Shown under the password field. Add rules here when the policy grows. */
  label: string
  test: (password: string) => boolean
}

export const passwordRules: PasswordRule[] = [
  {
    id: "min-length",
    label: `至少 ${PASSWORD_MIN_LENGTH} 位`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
]

export function isPasswordValid(password: string) {
  return passwordRules.every((rule) => rule.test(password))
}
