import { Schema, model } from 'mongoose'
import type { Types } from 'mongoose'

export const CHANGE_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DEACTIVATE',
  'REACTIVATE',
  'IMPORT',
  'DELETE',
] as const
export type ChangeAction = (typeof CHANGE_ACTIONS)[number]

export type FieldChange = {
  field: string
  oldValue: string | null
  newValue: string | null
}

export interface IItemChange {
  item: Types.ObjectId
  action: ChangeAction
  changes: FieldChange[]
  changedBy?: Types.ObjectId
  changedByName: string
}

const fieldChangeSchema = new Schema<FieldChange>(
  {
    field: { type: String, required: true },
    oldValue: { type: String, default: null },
    newValue: { type: String, default: null },
  },
  { _id: false },
)

const itemChangeSchema = new Schema<IItemChange>(
  {
    item: { type: Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    action: { type: String, enum: [...CHANGE_ACTIONS], required: true },
    changes: { type: [fieldChangeSchema], default: [] },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changedByName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export const ItemChange = model<IItemChange>('ItemChange', itemChangeSchema)