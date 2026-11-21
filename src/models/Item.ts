import { Schema, model } from 'mongoose'
import type { Types } from 'mongoose'

export const UOMS = ['EACH', 'METER', 'KILOGRAM'] as const
export type Uom = (typeof UOMS)[number]

export interface IItem {
  itemCode: string
  description: string
  uom: Uom
  quantity: number
  updatedBy?: Types.ObjectId
}

const itemSchema = new Schema<IItem>(
  {
    itemCode: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true, trim: true },
    uom: { type: String, enum: [...UOMS], required: true },
    quantity: { type: Number, default: 0, min: 0 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

export const Item = model<IItem>('Item', itemSchema)