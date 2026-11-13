import { GraphQLError } from 'graphql'
import { User } from '../models/User'
import { hashPassword, comparePassword, signToken } from '../utils/auth'

type SignupInput = { fullName: string; email: string; password: string }

function fail(message: string, code: string): never {
  throw new GraphQLError(message, { extensions: { code } })
}

export async function signup(input: SignupInput) {
  const fullName = input.fullName.trim()
  const email = input.email.trim().toLowerCase()

  if (!fullName) fail('Full name is required', 'BAD_USER_INPUT')
  if (!/^\S+@\S+\.\S+$/.test(email)) fail('Enter a valid email', 'BAD_USER_INPUT')
  if (input.password.length < 8) fail('Password must be at least 8 characters', 'BAD_USER_INPUT')

  const existing = await User.findOne({ email })
  if (existing) fail('An account with this email already exists', 'BAD_USER_INPUT')

  const password = await hashPassword(input.password)
  // Role and status are never taken from the request. Defaults: EMPLOYEE and PENDING.
  await User.create({ fullName, email, password })

  return {
    message: 'Your registration request has been submitted and is awaiting administrator approval.',
  }
}

export async function login(emailInput: string, passwordInput: string) {
  const email = emailInput.trim().toLowerCase()
  const user = await User.findOne({ email }).select('+password')
  const valid = user ? await comparePassword(passwordInput, user.password) : false

  if (!user || !valid) fail('Invalid email or password', 'UNAUTHENTICATED')
  if (user.status === 'PENDING') fail('Your account is awaiting administrator approval', 'FORBIDDEN')
  if (user.status === 'REJECTED') fail('Your registration request was rejected', 'FORBIDDEN')

  const token = signToken({ userId: user.id, role: user.role })
  return { token, user }
}