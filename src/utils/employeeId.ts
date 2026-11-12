import { Counter } from '../models/Counter'

export async function generateEmployeeId(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'employeeId' },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true },
  )
  if (!counter) throw new Error('Could not generate employee ID')
  return `EMP-${String(counter.seq).padStart(4, '0')}`
}