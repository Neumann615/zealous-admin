import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

function createDb() {
  const connectionString = process.env.DATABASE_URL

  if (connectionString) {
    const pool = mysql.createPool({
      uri: connectionString,
      decimalNumbers: true, // DECIMAL 列返回 number 而非 string
      timezone: 'Z',       // Date 序列化为 UTC 字符串，避免 "Incorrect datetime value"
    })
    return drizzle(pool, { schema, mode: 'default' })
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'mall',
    decimalNumbers: true, // DECIMAL 列返回 number 而非 string
    timezone: 'Z',       // Date 序列化为 UTC 字符串，避免 "Incorrect datetime value"
  })
  return drizzle(pool, { schema, mode: 'default' })
}

export const db = createDb()
