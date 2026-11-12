import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { Role } from '../models/User'

export type TokenPayload = { userId: string; role: Role }

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set in .env')
  return secret
}

export const hashPassword = (plain: string) => bcrypt.hash(plain, 12)

export const comparePassword = (plain: string, hash: string) => bcrypt.compare(plain, hash)

export const signToken = (payload: TokenPayload) =>
  jwt.sign(payload, getSecret(), { expiresIn: '7d' })

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getSecret()) as TokenPayload
  } catch {
    return null
  }
}