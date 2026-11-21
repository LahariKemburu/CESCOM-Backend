import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import mongoose from 'mongoose'
import ExcelJS from 'exceljs'
import { parse } from 'csv-parse/sync'
import { connectDB } from '../config/db'
import { importItemRows } from '../services/itemService'
import type { ItemInput } from '../services/itemService'

type RawRow = Record<string, string>

// Reads the first sheet. Row 1 must be the header row.
async function readXlsx(file: string): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(file)
  const sheet = workbook.worksheets[0]
  if (!sheet) throw new Error('The workbook has no sheets')

  const headers: string[] = []
  sheet.getRow(1).eachCell((cell, col) => {
    headers[col] = cell.text.trim().toLowerCase()
  })

  const rows: RawRow[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const record: RawRow = {}
    let hasValue = false
    headers.forEach((header, col) => {
      if (!header) return
      const text = row.getCell(col).text.trim()
      if (text) hasValue = true
      record[header] = text
    })
    if (hasValue) rows.push(record)
  })
  return rows
}

function readCsv(file: string): RawRow[] {
  const records = parse(fs.readFileSync(file, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as RawRow[]
  return records.map((record) =>
    Object.fromEntries(Object.entries(record).map(([key, value]) => [key.trim().toLowerCase(), value])),
  )
}

async function main() {
  const file = process.argv[2]
  if (!file) throw new Error('Usage: npm run import:items -- data/items.xlsx')

  const fullPath = path.resolve(file)
  if (!fs.existsSync(fullPath)) throw new Error(`File not found: ${fullPath}`)

  const ext = path.extname(fullPath).toLowerCase()
  if (ext !== '.xlsx' && ext !== '.csv') throw new Error('Use an .xlsx or .csv file')

  const raw = ext === '.xlsx' ? await readXlsx(fullPath) : readCsv(fullPath)
  if (raw.length === 0) throw new Error('The file has no rows')

  const first = raw[0]
  const hasItem = 'item' in first || 'item code' in first
  if (!hasItem || !('description' in first) || !('uom' in first)) {
    throw new Error('The file must have the columns: Item, Description, UOM')
  }

  const rows: ItemInput[] = raw.map((r) => ({
    itemCode: r['item'] ?? r['item code'] ?? '',
    description: r['description'] ?? '',
    uom: r['uom'] ?? '',
  }))

  await connectDB()
  const result = await importItemRows(rows, { id: null, name: 'Import script', role: null })

  console.log(`Created:   ${result.created}`)
  console.log(`Updated:   ${result.updated}`)
  console.log(`Unchanged: ${result.unchanged}`)
  console.log(`Skipped:   ${result.skipped.length}`)
  for (const s of result.skipped) console.log(`  row ${s.row}: ${s.reason}`)

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})