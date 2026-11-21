import { User } from '../models/User'
import type { Role, Status } from '../models/User'
import type { Uom } from '../models/Item'
import type { StockType } from '../models/StockMovement'
import { signup, login } from '../services/authService'
import {
  listPendingUsers,
  listUsers,
  approveUser,
  rejectUser,
  updateUserRole,
  setUserActive,
} from '../services/adminService'
import {
  adjustStock,
  createItem,
  deleteItem,
  getItem,
  getItemHistory,
  getItemStats,
  getStockSummary,
  listItems,
  updateItem,
} from '../services/itemService'
import type { Actor, ItemListArgs } from '../services/itemService'
import { requireRole } from '../middleware/guards'
import type { Context } from './context'

const VIEW_ROLES: Role[] = ['ADMIN', 'WAREHOUSE_MANAGER', 'EMPLOYEE']
const MANAGE_ROLES: Role[] = ['ADMIN', 'WAREHOUSE_MANAGER']

const actorOf = (user: { id: string; fullName: string; role: Role }): Actor => ({
  id: user.id,
  name: user.fullName,
  role: user.role,
})

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
    items: async (_: unknown, args: ItemListArgs, ctx: Context) => {
      await requireRole(ctx, VIEW_ROLES)
      return listItems(args)
    },
    item: async (_: unknown, args: { id: string }, ctx: Context) => {
      await requireRole(ctx, VIEW_ROLES)
      return getItem(args.id)
    },
    itemStats: async (_: unknown, __: unknown, ctx: Context) => {
      await requireRole(ctx, VIEW_ROLES)
      return getItemStats()
    },
    stockSummary: async (
      _: unknown,
      args: { days?: number | null; itemId?: string | null; limit?: number | null },
      ctx: Context,
    ) => {
      await requireRole(ctx, VIEW_ROLES)
      return getStockSummary(args)
    },
    itemHistory: async (_: unknown, args: { id: string }, ctx: Context) => {
      await requireRole(ctx, MANAGE_ROLES)
      return getItemHistory(args.id)
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
    createItem: async (
      _: unknown,
      args: { input: { itemCode: string; description: string; uom: Uom; quantity?: number | null } },
      ctx: Context,
    ) => {
      const user = await requireRole(ctx, MANAGE_ROLES)
      return createItem(actorOf(user), args.input)
    },
    updateItem: async (
      _: unknown,
      args: { id: string; input: { itemCode?: string | null; description?: string | null; uom?: Uom | null } },
      ctx: Context,
    ) => {
      const user = await requireRole(ctx, MANAGE_ROLES)
      return updateItem(actorOf(user), args.id, args.input)
    },
    adjustStock: async (
      _: unknown,
      args: { id: string; type: StockType; quantity: number; note?: string | null },
      ctx: Context,
    ) => {
      const user = await requireRole(ctx, MANAGE_ROLES)
      return adjustStock(actorOf(user), args.id, args.type, args.quantity, args.note)
    },
    deleteItem: async (_: unknown, args: { id: string }, ctx: Context) => {
      const user = await requireRole(ctx, MANAGE_ROLES)
      return deleteItem(actorOf(user), args.id)
    },
  },
  StockMovement: {
    itemId: (movement: { item: { toString(): string } }) => movement.item.toString(),
    createdAt: (movement: { createdAt: Date }) => movement.createdAt.toISOString(),
  },
  ItemChange: {
    createdAt: (change: { createdAt: Date }) => change.createdAt.toISOString(),
  },
}