import type { RecordModel } from 'pocketbase'
import { pb } from './pocketbase'

type GeneratedAccount = {
  code: string
}

type AuthenticatedAccount = {
  token: string
  record: RecordModel
}

export const normalizeAccountCode = (value: string) => value.replace(/\D/g, '').slice(0, 16)

export const formatAccountCode = (value: string) =>
  normalizeAccountCode(value).replace(/(\d{4})(?=\d)/g, '$1 ')

// Development builds sign in with a fixed account number instead of asking the
// server for a random one, so the 16 digits never get lost mid-session.
// VITE_DEV_ACCOUNT_CODE picks a different identity. Production bundles never
// reach this: import.meta.env.DEV is inlined as false and the branch is dropped.
const DEV_ACCOUNT_CODE = '9501432574327101'

const devAccountCode = () => {
  const code = normalizeAccountCode(import.meta.env.VITE_DEV_ACCOUNT_CODE || DEV_ACCOUNT_CODE)
  if (code.length !== 16) {
    throw new Error('VITE_DEV_ACCOUNT_CODE must contain exactly 16 digits.')
  }
  return code
}

/** The fixed development account number, or '' in production builds. */
export const developmentAccountCode = (): string => {
  if (!import.meta.env.DEV) return ''
  try {
    return devAccountCode()
  } catch (error) {
    console.error(error)
    return ''
  }
}

export const generateAccountNumber = async (): Promise<GeneratedAccount> =>
  import.meta.env.DEV
    ? { code: devAccountCode() }
    : pb.send<GeneratedAccount>('/api/account-number', { method: 'POST' })

export const loginWithAccountCode = async (value: string, name?: string) => {
  const code = normalizeAccountCode(value)
  if (code.length !== 16) throw new Error('Enter all 16 digits.')

  const result = await pb.send<AuthenticatedAccount>('/api/accounts/sign-in', {
    method: 'POST',
    body: { code, name: name?.trim() || '' },
  })
  pb.authStore.save(result.token, result.record)
  return result
}
