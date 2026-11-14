import mongoose from 'mongoose'
import { GraphQLError } from 'graphql'
import { User, ROLES } from '../models/User'
import type { Role, Status } from '../models/User'
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

export const listUsers = (status?: Status) =>
  User.find(status ? { status } : {}).sort({ createdAt: -1 })

export async function approveUser(id: string, role: Role = 'EMPLOYEE') {
  if (!ROLES.includes(role)) fail('Invalid role', 'BAD_USER_INPUT')
  const user = await findUser(id)
  if (user.status !== 'PENDING' && user.status !== 'REJECTED') {
    fail('Only pending or rejected requests can be approved', 'BAD_USER_INPUT')
  }

  user.status = 'ACTIVE'
  user.role = role
  if (!user.employeeId) user.employeeId = await generateEmployeeId()
  await user.save()
  return user
}

export async function rejectUser(id: string) {
  const user = await findUser(id)
  if (user.status !== 'PENDING') fail('Only pending requests can be rejected', 'BAD_USER_INPUT')
  user.status = 'REJECTED'
  await user.save()
  return user
}

// Admins cannot change their own role, so at least one active admin always remains.
export async function updateUserRole(adminId: string, id: string, role: Role) {
  if (!ROLES.includes(role)) fail('Invalid role', 'BAD_USER_INPUT')
  const user = await findUser(id)
  if (user.id === adminId) fail('You cannot change your own role', 'BAD_USER_INPUT')
  if (user.status !== 'ACTIVE') fail('Only active users can have their role changed', 'BAD_USER_INPUT')

  user.role = role
  await user.save()
  return user
}

export async function setUserActive(adminId: string, id: string, active: boolean) {
  const user = await findUser(id)
  if (user.id === adminId) fail('You cannot deactivate your own account', 'BAD_USER_INPUT')

  if (active) {
    if (user.status !== 'INACTIVE') fail('This user is not deactivated', 'BAD_USER_INPUT')
    user.status = 'ACTIVE'
  } else {
    if (user.status !== 'ACTIVE') fail('Only active users can be deactivated', 'BAD_USER_INPUT')
    user.status = 'INACTIVE'
  }
  await user.save()
  return user
}