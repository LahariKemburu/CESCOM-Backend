import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db'
import { User } from '../models/User'
import { hashPassword } from '../utils/auth'
import { generateEmployeeId } from '../utils/employeeId'

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const fullName = process.env.ADMIN_NAME?.trim() || 'System Admin'

  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env')
  if (password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters')

  await connectDB()

  const existing = await User.findOne({ email })
  if (existing) {
    console.log(`Admin already exists: ${email}`)
  } else {
    await User.create({
      fullName,
      email,
      password: await hashPassword(password),
      role: 'ADMIN',
      status: 'ACTIVE',
      employeeId: await generateEmployeeId(),
    })
    console.log(`Admin created: ${email}`)
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})