import { User } from '../models/User'
import type { Role } from '../models/User'
import { signup, login } from '../services/authService'
import { listPendingUsers, approveUser, rejectUser } from '../services/adminService'
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
  },
}