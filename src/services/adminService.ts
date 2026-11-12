import mongoose from 'mongoose'
import { GraphQLError } from 'graphql'
import { User, ROLES } from '../models/User'
import type { Role } from '../models/User'
import { generateEmployeeId } from '../utils/employeeId'

function fail(message: string, code: string): never {
  throw new GraphQLError(message, { extensions: { code } })
}

async function findUser(id: string) {
  if (!mongoose.isValidObjectId(id)) fail('Invalid user id', 'BAD_USER_INPUT')
  const user = await User.findById(id)
  if (!user) fail('User not found', 'NOT_FOUND')
  return user
}

export const listPendingUsers = () => User.find({ status: 'PENDING' }).sort({ createdAt: 1 })

export async function approveUser(id: string, role: Role = 'EMPLOYEE') {
  if (!ROLES.includes(role)) fail('Invalid role', 'BAD_USER_INPUT')
  const user = await findUser(id)
  if (user.status === 'ACTIVE') fail('User is already approved', 'BAD_USER_INPUT')

  user.status = 'ACTIVE'
  user.role = role
  if (!user.employeeId) user.employeeId = await generateEmployeeId()
  await user.save()
  return user
}

export async function rejectUser(id: string) {
  const user = await findUser(id)
  if (user.status === 'ACTIVE') fail('Cannot reject an active user', 'BAD_USER_INPUT')
  user.status = 'REJECTED'
  await user.save()
  return user
}