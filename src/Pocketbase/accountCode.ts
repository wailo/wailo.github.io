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

export const generateAccountNumber = () =>
  pb.send<GeneratedAccount>('/api/account-number', { method: 'POST' })

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
