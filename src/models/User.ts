import { Schema, model } from 'mongoose'

export const ROLES = ['ADMIN', 'WAREHOUSE_MANAGER', 'EMPLOYEE'] as const
export const STATUSES = ['PENDING', 'ACTIVE', 'REJECTED'] as const

export type Role = (typeof ROLES)[number]
export type Status = (typeof STATUSES)[number]

export interface IUser {
  fullName: string
  email: string
  password: string
  employeeId?: string
  role: Role
  status: Status
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    employeeId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: [...ROLES], default: 'EMPLOYEE' },
    status: { type: String, enum: [...STATUSES], default: 'PENDING' },
  },
  { timestamps: true },
)

export const User = model<IUser>('User', userSchema)