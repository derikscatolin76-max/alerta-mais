import { DEMO_REPORTS, type Report, type User } from './data'

const KEYS = { users: 'alertamais.users', session: 'alertamais.session', reports: 'alertamais.reports' }

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false // cota cheia ou armazenamento bloqueado
  }
}

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  return btoa(unescape(encodeURIComponent(`${salt}:${password}`)))
}

export const digits = (v: string) => v.replace(/\D/g, '')

// ---- usuários / sessão ----
export const getUsers = () => read<User[]>(KEYS.users, [])
export const getSessionId = () => read<string | null>(KEYS.session, null)
export const setSessionId = (id: string | null) => (id ? write(KEYS.session, id) : localStorage.removeItem(KEYS.session))

export async function registerUser(input: { name: string; email: string; phone: string; password: string }): Promise<User> {
  const users = getUsers()
  const email = input.email.trim().toLowerCase()
  if (users.some((u) => u.email === email)) throw new Error('Já existe uma conta com este e-mail.')
  const id = uid()
  const user: User = {
    id,
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
    passHash: await hashPassword(input.password, id),
    createdAt: new Date().toISOString(),
  }
  if (!write(KEYS.users, [...users, user])) throw new Error('Não foi possível salvar a conta neste navegador.')
  return user
}

export async function loginUser(identifier: string, password: string): Promise<User> {
  const id = identifier.trim().toLowerCase()
  const phone = digits(id)
  const user = getUsers().find((u) => u.email === id || (phone.length >= 8 && digits(u.phone) === phone))
  if (!user || user.passHash !== (await hashPassword(password, user.id))) throw new Error('E-mail/telefone ou senha incorretos.')
  return user
}

// ---- denúncias ----
/** Retorna as denúncias salvas + exemplos. */
export const getReports = (): Report[] => [...read<Report[]>(KEYS.reports, []), ...DEMO_REPORTS]
const getSaved = () => read<Report[]>(KEYS.reports, [])

export function addReport(report: Report): boolean {
  return write(KEYS.reports, [report, ...getSaved()])
}

export function removeReport(id: string): void {
  write(KEYS.reports, getSaved().filter((r) => r.id !== id))
}

export function updateReport(id: string, patch: Partial<Report>): void {
  write(KEYS.reports, getSaved().map((r) => (r.id === id ? { ...r, ...patch } : r)))
}
