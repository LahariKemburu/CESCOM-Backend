import { GraphQLError } from 'graphql'
import type { Context } from '../graphql/context'
import { User } from '../models/User'
import type { Role } from '../models/User'

export function requireAuth(ctx: Context): string {
  if (!ctx.userId) {
    throw new GraphQLError('You must be logged in', { extensions: { code: 'UNAUTHENTICATED' } })
  }
  return ctx.userId
}

// Checks the database, not just the token, so role changes take effect immediately.
export async function requireRole(ctx: Context, roles: Role[]) {
  const userId = requireAuth(ctx)
  const user = await User.findById(userId)
  if (!user || user.status !== 'ACTIVE' || !roles.includes(user.role)) {
    throw new GraphQLError('You do not have permission', { extensions: { code: 'FORBIDDEN' } })
  }
  return user
}