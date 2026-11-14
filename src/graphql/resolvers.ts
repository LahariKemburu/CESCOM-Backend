import { User } from '../models/User'
import type { Role, Status } from '../models/User'
import { signup, login } from '../services/authService'
import {
  listPendingUsers,
  listUsers,
  approveUser,
  rejectUser,
  updateUserRole,
  setUserActive,
} from '../services/adminService'
import { requireRole } from '../middleware/guards'
import type { Context } from './context'

export const resolvers = {
  Query: {
    health: () => 'CESCOM backend is running',
    me: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.userId) return null
      const user = await User.findById(ctx.userId)
      return user && user.status === 'ACTIVE' ? user : null
    },
    pendingUsers: async (_: unknown, __: unknown, ctx: Context) => {
      await requireRole(ctx, ['ADMIN'])
      return listPendingUsers()
    },
    users: async (_: unknown, args: { status?: Status | null }, ctx: Context) => {
      await requireRole(ctx, ['ADMIN'])
      return listUsers(args.status ?? undefined)
    },
  },
  Mutation: {
    signup: (_: unknown, args: { input: { fullName: string; email: string; password: string } }) =>
      signup(args.input),
    login: (_: unknown, args: { email: string; password: string }) =>
      login(args.email, args.password),
    approveUser: async (_: unknown, args: { id: string; role?: Role | null }, ctx: Context) => {
      await requireRole(ctx, ['ADMIN'])
      return approveUser(args.id, args.role ?? 'EMPLOYEE')
    },
    rejectUser: async (_: unknown, args: { id: string }, ctx: Context) => {
      await requireRole(ctx, ['ADMIN'])
      return rejectUser(args.id)
    },
    updateUserRole: async (_: unknown, args: { id: string; role: Role }, ctx: Context) => {
      const admin = await requireRole(ctx, ['ADMIN'])
      return updateUserRole(admin.id, args.id, args.role)
    },
    setUserActive: async (_: unknown, args: { id: string; active: boolean }, ctx: Context) => {
      const admin = await requireRole(ctx, ['ADMIN'])
      return setUserActive(admin.id, args.id, args.active)
    },
  },
}