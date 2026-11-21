import { Schema, model } from 'mongoose'
import type { Types } from 'mongoose'
import { UOMS } from './Item'
import type { Uom } from './Item'

export const STOCK_TYPES = ['IN', 'OUT'] as const
export type StockType = (typeof STOCK_TYPES)[number]

export interface IStockMovement {
  item: Types.ObjectId
  itemCode: string
  itemDescription: string
  uom: Uom
  type: StockType
  quantity: number
  balanceAfter: number
  note?: string
  changedBy?: Types.ObjectId
  changedByName: string
  createdAt?: Date
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    item: { type: Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    itemCode: { type: String, required: true },
    itemDescription: { type: String, default: '' },
    uom: { type: String, enum: [...UOMS], required: true },
    type: { type: String, enum: [...STOCK_TYPES], required: true },
    quantity: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    note: { type: String },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changedByName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

stockMovementSchema.index({ createdAt: -1 })

export const StockMovement = model<IStockMovement>('StockMovement', stockMovementSchema)