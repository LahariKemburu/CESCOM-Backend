import mongoose, { Types } from 'mongoose'
import { GraphQLError } from 'graphql'
import { Item, UOMS } from '../models/Item'
import type { Uom } from '../models/Item'
import { ItemChange } from '../models/ItemChange'
import type { ChangeAction, FieldChange } from '../models/ItemChange'
import { StockMovement } from '../models/StockMovement'
import type { StockType } from '../models/StockMovement'
import type { Role } from '../models/User'

export type Actor = { id: string | null; name: string; role: Role | null }

export type ItemInput = {
  itemCode: string
  description: string
  uom: string
  quantity?: number | null
}

export type StockFilter = 'IN_STOCK' | 'OUT_OF_STOCK'

export type ItemListArgs = {
  search?: string | null
  uom?: Uom | null
  stock?: StockFilter | null
  page?: number | null
  pageSize?: number | null
}

export type ImportResult = {
  created: number
  updated: number
  unchanged: number
  skipped: { row: number; reason: string }[]
}

const MAX_QUANTITY = 1_000_000_000

function fail(message: string, code = 'BAD_USER_INPUT'): never {
  throw new GraphQLError(message, { extensions: { code } })
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const exactCode = (code: string) => new RegExp(`^${escapeRegex(code)}$`, 'i')
const toId = (id: string | null) => (id ? new Types.ObjectId(id) : undefined)

const UOM_ALIASES: Record<string, Uom> = {
  each: 'EACH',
  ea: 'EACH',
  meter: 'METER',
  metre: 'METER',
  m: 'METER',
  kilogram: 'KILOGRAM',
  kg: 'KILOGRAM',
}

function parseUom(value: string): Uom | null {
  const v = value.trim()
  if ((UOMS as readonly string[]).includes(v.toUpperCase())) return v.toUpperCase() as Uom
  return UOM_ALIASES[v.toLowerCase()] ?? null
}

function checkCode(value: string): string {
  const code = value.trim()
  if (!code) fail('Item code is required')
  if (code.length > 50) fail('Item code must be 50 characters or fewer')
  if (/\s/.test(code)) fail('Item code cannot contain spaces')
  return code
}

function checkDescription(value: string): string {
  const description = value.trim()
  if (!description) fail('Description is required')
  if (description.length > 500) fail('Description must be 500 characters or fewer')
  return description
}

function checkUom(value: string): Uom {
  const uom = parseUom(value)
  if (!uom) fail('UOM must be one of: Each, Meter, Kilogram')
  return uom
}

function checkQuantity(value: number): number {
  if (!Number.isInteger(value)) fail('Quantity must be a whole number')
  if (value < 1) fail('Quantity must be at least 1')
  if (value > MAX_QUANTITY) fail('Quantity is too large')
  return value
}

function checkOpeningStock(value?: number | null): number {
  if (value == null || value === 0) return 0
  if (value < 0) fail('Opening stock cannot be negative')
  return checkQuantity(value)
}

function checkNote(value?: string | null): string | undefined {
  const note = value?.trim()
  if (!note) return undefined
  if (note.length > 200) fail('Note must be 200 characters or fewer')
  return note
}

function isDuplicateKey(err: unknown) {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000
}

async function persist(save: () => Promise<unknown>) {
  try {
    await save()
  } catch (err) {
    if (isDuplicateKey(err)) fail('An item with this code already exists')
    throw err
  }
}

async function assertCodeFree(code: string, exceptId?: Types.ObjectId) {
  const query = Item.findOne({ itemCode: exactCode(code) })
  if (exceptId) query.where('_id').ne(exceptId)
  const clash = await query
  if (clash) fail(`Item code ${clash.itemCode} already exists`)
}

async function findItem(id: string) {
  if (!mongoose.isValidObjectId(id)) fail('Invalid item id')
  const item = await Item.findById(id)
  if (!item) fail('Item not found', 'NOT_FOUND')
  return item
}

async function logChange(
  actor: Actor,
  itemId: Types.ObjectId,
  action: ChangeAction,
  changes: FieldChange[],
) {
  await ItemChange.create({
    item: itemId,
    action,
    changes,
    changedBy: toId(actor.id),
    changedByName: actor.name,
  })
}

async function recordMovement(
  actor: Actor,
  item: { _id: Types.ObjectId; itemCode: string; description: string; uom: Uom },
  type: StockType,
  quantity: number,
  balanceAfter: number,
  note?: string,
) {
  await StockMovement.create({
    item: item._id,
    itemCode: item.itemCode,
    itemDescription: item.description.slice(0, 200),
    uom: item.uom,
    type,
    quantity,
    balanceAfter,
    note,
    changedBy: toId(actor.id),
    changedByName: actor.name,
  })
}

export async function listItems(args: ItemListArgs) {
  const page = Math.max(1, Math.floor(args.page ?? 1))
  const pageSize = Math.min(100, Math.max(1, Math.floor(args.pageSize ?? 20)))

  const query = Item.find()
  if (args.uom) query.where('uom').equals(args.uom)
  if (args.stock === 'IN_STOCK') query.where('quantity').gt(0)
  if (args.stock === 'OUT_OF_STOCK') query.where('quantity').lte(0)
  const search = args.search?.trim()
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i')
    query.or([{ itemCode: rx }, { description: rx }])
  }

  const filter = query.getFilter()
  const [items, total] = await Promise.all([
    Item.find(filter)
      .sort({ itemCode: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    Item.countDocuments(filter),
  ])

  return { items, total, page, pageSize }
}

export const getItem = (id: string) => findItem(id)

export async function getItemStats() {
  const [total, inStock] = await Promise.all([
    Item.countDocuments(),
    Item.countDocuments({ quantity: { $gt: 0 } }),
  ])
  return { total, inStock, outOfStock: total - inStock }
}

export async function getItemHistory(id: string) {
  const item = await findItem(id)
  return ItemChange.find({ item: item._id }).sort({ createdAt: -1 }).limit(100)
}

export async function createItem(actor: Actor, input: ItemInput) {
  const itemCode = checkCode(input.itemCode)
  const description = checkDescription(input.description)
  const uom = checkUom(input.uom)
  const opening = checkOpeningStock(input.quantity)
  await assertCodeFree(itemCode)

  const item = new Item({ itemCode, description, uom, quantity: opening, updatedBy: toId(actor.id) })
  await persist(() => item.save())
  await logChange(actor, item._id, 'CREATE', [
    { field: 'itemCode', oldValue: null, newValue: itemCode },
    { field: 'description', oldValue: null, newValue: description },
    { field: 'uom', oldValue: null, newValue: uom },
  ])
  if (opening > 0) await recordMovement(actor, item, 'IN', opening, opening, 'Opening stock')
  return item
}

export async function updateItem(
  actor: Actor,
  id: string,
  input: { itemCode?: string | null; description?: string | null; uom?: string | null },
) {
  const item = await findItem(id)
  const changes: FieldChange[] = []

  if (input.itemCode != null) {
    const code = checkCode(input.itemCode)
    if (code !== item.itemCode) {
      if (actor.role !== 'ADMIN') fail('Only an admin can change an item code', 'FORBIDDEN')
      await assertCodeFree(code, item._id)
      changes.push({ field: 'itemCode', oldValue: item.itemCode, newValue: code })
      item.itemCode = code
    }
  }

  if (input.description != null) {
    const description = checkDescription(input.description)
    if (description !== item.description) {
      changes.push({ field: 'description', oldValue: item.description, newValue: description })
      item.description = description
    }
  }

  if (input.uom != null) {
    const uom = checkUom(input.uom)
    if (uom !== item.uom) {
      changes.push({ field: 'uom', oldValue: item.uom, newValue: uom })
      item.uom = uom
    }
  }

  if (changes.length === 0) return item

  item.updatedBy = toId(actor.id)
  await persist(() => item.save())
  await logChange(actor, item._id, 'UPDATE', changes)
  return item
}

// Increase (IN) or decrease (OUT) the stock count. The decrease is atomic and can never go below 0.
export async function adjustStock(
  actor: Actor,
  id: string,
  type: StockType,
  quantityInput: number,
  noteInput?: string | null,
) {
  if (!mongoose.isValidObjectId(id)) fail('Invalid item id')
  const quantity = checkQuantity(quantityInput)
  const note = checkNote(noteInput)

  const filter = type === 'OUT' ? { _id: id, quantity: { $gte: quantity } } : { _id: id }
  const item = await Item.findOneAndUpdate(
    filter,
    {
      $inc: { quantity: type === 'IN' ? quantity : -quantity },
      $set: { updatedBy: toId(actor.id) },
    },
    { returnDocument: 'after' },
  )

  if (!item) {
    const existing = await Item.findById(id)
    if (!existing) fail('Item not found', 'NOT_FOUND')
    fail(`Not enough stock. Available: ${existing.quantity}`)
  }

  await recordMovement(actor, item, type, quantity, item.quantity, note)
  return item
}

export async function deleteItem(actor: Actor, id: string) {
  const item = await findItem(id)
  if (item.quantity > 0) {
    fail(`Reduce the stock to 0 before deleting this item (current stock: ${item.quantity})`)
  }

  await logChange(actor, item._id, 'DELETE', [
    { field: 'itemCode', oldValue: item.itemCode, newValue: null },
    { field: 'description', oldValue: item.description, newValue: null },
    { field: 'uom', oldValue: item.uom, newValue: null },
  ])
  await item.deleteOne()
  return { message: `${item.itemCode} was deleted.` }
}

// Stock changes for the last N days, for one item or for all items.
export async function getStockSummary(args: {
  days?: number | null
  itemId?: string | null
  limit?: number | null
}) {
  const days = Math.min(90, Math.max(1, Math.floor(args.days ?? 4)))
  const limit = Math.min(500, Math.max(1, Math.floor(args.limit ?? (args.itemId ? 500 : 200))))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  if (args.itemId && !mongoose.isValidObjectId(args.itemId)) fail('Invalid item id')
  const filter = args.itemId
    ? { createdAt: { $gte: since }, item: new Types.ObjectId(args.itemId) }
    : { createdAt: { $gte: since } }

  const [movements, grouped] = await Promise.all([
    StockMovement.find(filter).sort({ createdAt: -1 }).limit(limit),
    StockMovement.aggregate<{ _id: StockType; quantity: number; count: number }>([
      { $match: filter },
      { $group: { _id: '$type', quantity: { $sum: '$quantity' }, count: { $sum: 1 } } },
    ]),
  ])

  const pick = (type: StockType) => grouped.find((g) => g._id === type)
  return {
    days,
    inQuantity: pick('IN')?.quantity ?? 0,
    outQuantity: pick('OUT')?.quantity ?? 0,
    inCount: pick('IN')?.count ?? 0,
    outCount: pick('OUT')?.count ?? 0,
    movements,
  }
}

// Used by the import script. New codes are created, existing codes get their description and UOM updated.
export async function importItemRows(rows: ItemInput[], actor: Actor): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, unchanged: 0, skipped: [] }
  const all = await Item.find()
  const byCode = new Map(all.map((i) => [i.itemCode.toLowerCase(), i]))
  const seen = new Set<string>()

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2 // row 1 is the header
    try {
      const itemCode = checkCode(row.itemCode)
      const description = checkDescription(row.description)
      const uom = checkUom(row.uom)

      const key = itemCode.toLowerCase()
      if (seen.has(key)) fail('Duplicate item code in the file')
      seen.add(key)

      const current = byCode.get(key)
      if (!current) {
        const item = new Item({ itemCode, description, uom, updatedBy: toId(actor.id) })
        await persist(() => item.save())
        await logChange(actor, item._id, 'IMPORT', [
          { field: 'itemCode', oldValue: null, newValue: itemCode },
          { field: 'description', oldValue: null, newValue: description },
          { field: 'uom', oldValue: null, newValue: uom },
        ])
        result.created += 1
        continue
      }

      const changes: FieldChange[] = []
      if (current.description !== description) {
        changes.push({ field: 'description', oldValue: current.description, newValue: description })
        current.description = description
      }
      if (current.uom !== uom) {
        changes.push({ field: 'uom', oldValue: current.uom, newValue: uom })
        current.uom = uom
      }
      if (changes.length === 0) {
        result.unchanged += 1
        continue
      }

      current.updatedBy = toId(actor.id)
      await persist(() => current.save())
      await logChange(actor, current._id, 'IMPORT', changes)
      result.updated += 1
    } catch (err) {
      result.skipped.push({
        row: rowNumber,
        reason: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return result
}