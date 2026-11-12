import type { Role } from '../models/User'

export type Context = {
  userId: string | null
  role: Role | null
}