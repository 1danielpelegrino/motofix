import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto"
import { createServer } from "node:http"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import mysql from "mysql2/promise"
import nodemailer from "nodemailer"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
)
try {
  process.loadEnvFile(path.join(projectRoot, ".env"))
} catch (error) {
  if (error.code !== "ENOENT") throw error
}
const dataRoot = path.resolve(
  process.env.MOTOFIX_DATA_DIR || path.join(projectRoot, "server", "data"),
)
const uploadRoot = path.join(dataRoot, "uploads")
const databasePath = path.join(dataRoot, "motofix.json")
const sqlHost = process.env.DB_HOST || "127.0.0.1"
const sqlPort = Number(process.env.DB_PORT || 3306)
const sqlDatabase = process.env.DB_NAME || "motofix_database"
const sqlPool = mysql.createPool({
  host: sqlHost,
  port: sqlPort,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: sqlDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
})
const sqlTables = {
  users: "motofix_users",
  sessions: "motofix_sessions",
  appState: "motofix_app_state",
  uploads: "motofix_uploads",
  supportTickets: "motofix_support_tickets",
  passwordResetRequests: "motofix_password_reset_requests",
}
const normalizedTables = {
  motorcycles: "motofix_motorcycles",
  bookings: "motofix_bookings",
  complaints: "motofix_complaints",
  conversations: "motofix_conversations",
  messages: "motofix_messages",
  notifications: "motofix_notifications",
}
const publicRoot = path.join(projectRoot, "dist")
const port = Number(process.env.API_PORT || process.env.PORT || 4174)
const appOrigin = (process.env.APP_ORIGIN || "http://localhost:8443").replace(
  /\/$/,
  "",
)
const sessionCookie = "motofix_session"
const oauthCookie = "motofix_oauth_state"
const sessionLifetime = 1000 * 60 * 60 * 24 * 14
const passwordResetTokenLifetime = 1000 * 60 * 30
const demoAccountIds = new Set(["rider-alex", "shop-motohub", "mechanic-marco"])
const allowedStateKeys = new Set([
  "motofix-owner-v1",
  "motofix-profile",
  "motofix-motorcycles",
  "motofix-bookings",
  "motofix-saved-shops",
  "motofix-reservations",
  "motofix-notifications-read",
  "motofix-complaints-v1",
  "motofix-conversations-v1",
  "motofix-business-legitimacy-v1",
])
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
}

let database
let writeQueue = Promise.resolve()
const oauthStates = new Map()
const pendingGoogleSignups = new Map()

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

function passwordResetMailSettings() {
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER?.trim() || ""
  const password = process.env.SMTP_PASSWORD || ""
  const authComplete = Boolean(user && password) || (!user && !password)
  if (
    !process.env.SMTP_HOST?.trim() ||
    !process.env.SMTP_FROM?.trim() ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !authComplete
  ) {
    return null
  }
  return {
    host: process.env.SMTP_HOST.trim(),
    port,
    secure: port === 465 || process.env.SMTP_SECURE === "true",
    from: process.env.SMTP_FROM.trim(),
    user,
    password,
  }
}

async function sendPasswordResetEmail(email, token) {
  const settings = passwordResetMailSettings()
  if (!settings) throw new Error("Password reset email is not configured.")
  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    ...(settings.user
      ? { auth: { user: settings.user, pass: settings.password } }
      : {}),
  })
  const resetUrl = new URL("/", appOrigin)
  resetUrl.searchParams.set("reset_token", token)
  const resetLink = resetUrl.toString()
  const htmlResetLink = resetLink
    .replace(/&/g, "&amp;")
    .replace(/\"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  try {
    await transporter.sendMail({
      from: settings.from,
      to: email,
      subject: "Reset your MotoFix password",
      text:
        "We received a request to reset your MotoFix password. Open this link within 30 minutes to choose a new password:\n\n" +
        resetLink +
        "\n\nIf you did not request this, you can ignore this email.",
      html:
        '<p>We received a request to reset your MotoFix password.</p><p><a href="' +
        htmlResetLink +
        '">Choose a new password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>',
    })
  } finally {
    transporter.close()
  }
}

function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "")
  if (digits.startsWith("63") && digits.length === 12)
    digits = "0" + digits.slice(2)
  return digits
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex")
  return { salt, hash }
}

function passwordMatches(password, user) {
  if (!user.passwordHash || !user.passwordSalt) return false
  const actual = scryptSync(password, user.passwordSalt, 64)
  const expected = Buffer.from(user.passwordHash, "hex")
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    username: user.username || "",
    shopName: user.shopName || "",
    shopId: user.shopId || "",
    homeShopId: user.homeShopId || "",
    accountStatus: user.accountStatus || "Active",
    mechanicId: user.mechanicId || undefined,
    specialization: user.specialization || undefined,
    experience: user.experience || undefined,
    skills: user.skills || undefined,
    employment: user.employment || undefined,
    createdAt: user.createdAt,
    displayId: user.displayId || "",
  }
}

function accountYear(createdAt) {
  const year = String(createdAt || "").slice(0, 4)
  return /^\d{4}$/.test(year) ? year : String(new Date().getFullYear())
}

function assignAccountDisplayIds(users) {
  const groups = new Map()
  const changed = []
  for (const user of users) {
    const year = accountYear(user.createdAt)
    const group = groups.get(year) || []
    group.push(user)
    groups.set(year, group)
  }

  for (const [year, group] of groups) {
    group.sort((left, right) =>
      String(left.createdAt || "").localeCompare(String(right.createdAt || "")) ||
      String(left.id || "").localeCompare(String(right.id || "")),
    )
    const used = new Set()
    const assigned = new Set()
    for (const user of group) {
      const match = new RegExp(`^${year}_(\\d{3,})$`).exec(String(user.displayId || ""))
      const sequence = match ? Number(match[1]) : 0
      if (sequence > 0 && !used.has(sequence)) {
        used.add(sequence)
        assigned.add(user)
      }
    }
    let sequence = 1
    for (const user of group) {
      if (assigned.has(user)) continue
      while (used.has(sequence)) sequence += 1
      const displayId = `${year}_${String(sequence).padStart(3, "0")}`
      if (user.displayId !== displayId) changed.push(user)
      user.displayId = displayId
      used.add(sequence)
      sequence += 1
    }
  }
  return changed
}

function nextAccountDisplayId(createdAt) {
  const year = accountYear(createdAt)
  let highest = 0
  for (const user of database.users) {
    if (accountYear(user.createdAt) !== year) continue
    const match = new RegExp(`^${year}_(\\d{3,})$`).exec(String(user.displayId || ""))
    if (match) highest = Math.max(highest, Number(match[1]))
  }
  return `${year}_${String(highest + 1).padStart(3, "0")}`
}

async function persistAccountDisplayIds(users) {
  if (!users.length) return
  const connection = await sqlPool.getConnection()
  try {
    await connection.beginTransaction()
    for (const user of users) {
      await connection.execute(
        `UPDATE \`${sqlTables.users}\` SET payload = ? WHERE record_key = ?`,
        [JSON.stringify(user), String(user.id)],
      )
    }
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

function createSeedUser(input) {
  const password = hashPassword("MotoFix123!")
  return {
    ...input,
    passwordSalt: password.salt,
    passwordHash: password.hash,
    createdAt: new Date().toISOString(),
    accountStatus: "Active",
    authProvider: "password",
  }
}

function demoAccountsEnabled() {
  return (
    process.env.MOTOFIX_DEMO_ACCOUNTS === "true" ||
    (process.env.NODE_ENV !== "production" &&
      process.env.MOTOFIX_DEMO_ACCOUNTS !== "false")
  )
}

function initialDatabase() {
  const includeDemoAccounts = demoAccountsEnabled()
  return {
    version: 1,
    users: includeDemoAccounts
      ? [
          createSeedUser({
            id: "rider-alex",
            name: "Alex Santos",
            email: "rider@motofix.local",
            phone: "09175550123",
            role: "rider",
            homeShopId: "shop-motohub",
          }),
          createSeedUser({
            id: "shop-motohub",
            name: "Mia Santos",
            email: "owner@motofix.local",
            phone: "09171234567",
            username: "motohub",
            shopName: "MotoHub Service Center",
            role: "shop",
            shopId: "shop-motohub",
          }),
          createSeedUser({
            id: "mechanic-marco",
            name: "Marco Reyes",
            email: "mechanic@motofix.local",
            phone: "09174567890",
            username: "marco",
            role: "mechanic",
            shopId: "shop-motohub",
            mechanicId: "M-01",
          }),
        ]
      : [],
    sessions: {},
    appState: {},
    uploads: {},
    supportTickets: [],
    passwordResetRequests: [],
  }
}

async function loadJsonDatabase() {
  await mkdir(dataRoot, { recursive: true })
  await mkdir(uploadRoot, { recursive: true })
  try {
    const value = JSON.parse(await readFile(databasePath, "utf8"))
    const users = Array.isArray(value.users) ? value.users : []
    return {
      ...initialDatabase(),
      ...value,
      users: demoAccountsEnabled()
        ? users
        : users.filter((user) => !demoAccountIds.has(user.id)),
      sessions: value.sessions || {},
      appState: value.appState || {},
      uploads: value.uploads || {},
      supportTickets: value.supportTickets || [],
      passwordResetRequests: value.passwordResetRequests || [],
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error
    const value = initialDatabase()
    await writeFile(databasePath, JSON.stringify(value, null, 2), "utf8")
    return value
  }
}

async function ensureSqlSchema() {
  for (const table of Object.values(sqlTables)) {
    const keyLength = table === sqlTables.appState ? 512 : 191
    await sqlPool.query(
      `CREATE TABLE IF NOT EXISTS \`${table}\` (\n` +
        `  record_key VARCHAR(${keyLength}) NOT NULL PRIMARY KEY,\n` +
        "  payload LONGTEXT NOT NULL\n" +
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    )
  }
  const normalizedSchemas = [
    `CREATE TABLE IF NOT EXISTS \`${normalizedTables.motorcycles}\` (
      record_key CHAR(64) NOT NULL PRIMARY KEY,
      owner_user_id VARCHAR(191) NOT NULL,
      motorcycle_id VARCHAR(191) NULL,
      bike VARCHAR(191) NULL,
      plate VARCHAR(64) NULL,
      model_year VARCHAR(20) NULL,
      payload LONGTEXT NOT NULL,
      KEY idx_motofix_motorcycles_owner (owner_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS \`${normalizedTables.bookings}\` (
      record_key CHAR(64) NOT NULL PRIMARY KEY,
      booking_id VARCHAR(191) NULL,
      booking_type VARCHAR(20) NOT NULL,
      rider_user_id VARCHAR(191) NOT NULL,
      shop_id VARCHAR(191) NULL,
      motorcycle VARCHAR(191) NULL,
      service_name VARCHAR(191) NULL,
      service_date VARCHAR(32) NULL,
      service_time VARCHAR(32) NULL,
      status VARCHAR(64) NULL,
      payload LONGTEXT NOT NULL,
      KEY idx_motofix_bookings_rider (rider_user_id),
      KEY idx_motofix_bookings_shop (shop_id),
      KEY idx_motofix_bookings_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS \`${normalizedTables.complaints}\` (
      record_key CHAR(64) NOT NULL PRIMARY KEY,
      complaint_id VARCHAR(191) NULL,
      rider_user_id VARCHAR(191) NULL,
      shop_id VARCHAR(191) NULL,
      status VARCHAR(64) NULL,
      category VARCHAR(191) NULL,
      payload LONGTEXT NOT NULL,
      KEY idx_motofix_complaints_rider (rider_user_id),
      KEY idx_motofix_complaints_shop (shop_id),
      KEY idx_motofix_complaints_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS \`${normalizedTables.conversations}\` (
      record_key CHAR(64) NOT NULL PRIMARY KEY,
      conversation_id VARCHAR(191) NOT NULL,
      shop_id VARCHAR(191) NULL,
      message_count INT UNSIGNED NOT NULL DEFAULT 0,
      last_message_at VARCHAR(64) NULL,
      payload LONGTEXT NOT NULL,
      KEY idx_motofix_conversations_id (conversation_id),
      KEY idx_motofix_conversations_shop (shop_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS \`${normalizedTables.messages}\` (
      record_key CHAR(64) NOT NULL PRIMARY KEY,
      message_id VARCHAR(191) NULL,
      conversation_id VARCHAR(191) NOT NULL,
      sender_id VARCHAR(191) NULL,
      sent_at VARCHAR(64) NULL,
      message_text LONGTEXT NULL,
      payload LONGTEXT NOT NULL,
      KEY idx_motofix_messages_conversation (conversation_id),
      KEY idx_motofix_messages_sender (sender_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS \`${normalizedTables.notifications}\` (
      record_key CHAR(64) NOT NULL PRIMARY KEY,
      notification_id VARCHAR(191) NULL,
      owner_user_id VARCHAR(191) NOT NULL,
      title VARCHAR(191) NULL,
      body TEXT NULL,
      route VARCHAR(255) NULL,
      is_read TINYINT(1) NULL,
      created_at VARCHAR(64) NULL,
      payload LONGTEXT NOT NULL,
      KEY idx_motofix_notifications_owner (owner_user_id),
      KEY idx_motofix_notifications_read (is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ]
  for (const schema of normalizedSchemas) await sqlPool.query(schema)
}

async function ensureSqlSchemaWithRetry() {
  const retryableCodes = new Set([
    "ECONNREFUSED",
    "ETIMEDOUT",
    "EHOSTUNREACH",
  ])
  const maxAttempts = 10

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await ensureSqlSchema()
      return
    } catch (error) {
      if (!retryableCodes.has(error.code)) throw error
      if (attempt === maxAttempts) {
        const unavailable = new Error(
          `Cannot connect to MySQL at ${sqlHost}:${sqlPort} for database "${sqlDatabase}". Start MySQL in the XAMPP Control Panel, wait until it is running, then run pnpm dev again (${error.code}).`,
        )
        unavailable.code = "MOTOFIX_MYSQL_UNAVAILABLE"
        throw unavailable
      }
      if (attempt === 1) {
        console.warn(
          `Waiting for MySQL at ${sqlHost}:${sqlPort} to accept connections...`,
        )
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
}

function sqlText(value, maxLength = 191) {
  if (value === null || value === undefined || value === "") return null
  return String(value).slice(0, maxLength)
}

function normalizedRecordKey(table, sourceKey, recordId, index) {
  return createHash("sha256")
    .update(`${table}\u0000${sourceKey}\u0000${recordId ?? ""}\u0000${index}`)
    .digest("hex")
}

function stateCollectionItems(value) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== "object") return []
  return Object.entries(value).map(([id, item]) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? { id: item.id ?? id, ...item }
      : { id, value: item },
  )
}

function normalizedRows(value) {
  const rows = Object.fromEntries(
    Object.keys(normalizedTables).map((key) => [key, []]),
  )

  for (const [sourceKey, record] of Object.entries(value.appState || {})) {
    const match = /^(rider|shop|shared):([^:]+):(.+)$/.exec(sourceKey)
    if (!match) continue
    const [, scopeType, scopeId, stateName] = match
    const stateValue = record?.value
    const items = stateCollectionItems(stateValue)

    if (stateName === "motofix-motorcycles") {
      items.forEach((item, index) => {
        const motorcycle =
          item && typeof item === "object" ? item : { bike: item }
        const id = sqlText(motorcycle.id)
        rows.motorcycles.push([
          normalizedRecordKey("motorcycle", sourceKey, id, index),
          scopeId,
          id,
          sqlText(motorcycle.bike),
          sqlText(motorcycle.plate, 64),
          sqlText(motorcycle.year, 20),
          JSON.stringify(motorcycle),
        ])
      })
    }

    if (
      stateName === "motofix-bookings" ||
      stateName === "motofix-reservations"
    ) {
      items.forEach((item, index) => {
        const booking =
          item && typeof item === "object" ? item : { value: item }
        const id = sqlText(booking.id)
        const riderId =
          scopeType === "rider" ? scopeId : sqlText(booking.riderId) || scopeId
        rows.bookings.push([
          normalizedRecordKey("booking", sourceKey, id, index),
          id,
          stateName === "motofix-bookings" ? "booking" : "reservation",
          riderId,
          sqlText(booking.shopId || booking.shop),
          sqlText(booking.motorcycle || booking.bike),
          sqlText(booking.service),
          sqlText(booking.date, 32),
          sqlText(booking.time, 32),
          sqlText(booking.status, 64),
          JSON.stringify(booking),
        ])
      })
    }

    if (stateName === "motofix-complaints-v1") {
      items.forEach((item, index) => {
        const complaint =
          item && typeof item === "object" ? item : { value: item }
        const service =
          complaint.service && typeof complaint.service === "object"
            ? complaint.service
            : {}
        const id = sqlText(complaint.id)
        rows.complaints.push([
          normalizedRecordKey("complaint", sourceKey, id, index),
          id,
          sqlText(complaint.riderId) ||
            (scopeType === "rider" ? scopeId : null),
          sqlText(service.shopId || complaint.shopId) ||
            (scopeType === "shared" ? scopeId : null),
          sqlText(complaint.status, 64),
          sqlText(complaint.category),
          JSON.stringify(complaint),
        ])
      })
    }

    if (stateName === "motofix-conversations-v1") {
      const threads = new Map()
      items.forEach((item, index) => {
        const message =
          item && typeof item === "object" ? item : { text: String(item ?? "") }
        const conversationId = sqlText(
          message.thread || message.conversationId || `thread-${index}`,
        )
        if (!threads.has(conversationId)) threads.set(conversationId, [])
        threads.get(conversationId).push({ message, index })
      })
      for (const [conversationId, entries] of threads) {
        const lastMessageAt =
          entries
            .map(({ message }) => message.time || message.createdAt)
            .filter(Boolean)
            .at(-1) || null
        rows.conversations.push([
          normalizedRecordKey("conversation", sourceKey, conversationId, 0),
          conversationId,
          scopeId,
          entries.length,
          sqlText(lastMessageAt, 64),
          JSON.stringify({
            conversationId,
            messageCount: entries.length,
            lastMessageAt,
          }),
        ])
        entries.forEach(({ message, index }) => {
          const id = sqlText(message.id)
          rows.messages.push([
            normalizedRecordKey(
              "message",
              sourceKey,
              id || conversationId,
              index,
            ),
            id,
            conversationId,
            sqlText(message.sender),
            sqlText(message.time || message.createdAt, 64),
            sqlText(message.text ?? message.body, 1000000),
            JSON.stringify(message),
          ])
        })
      }
    }

    if (stateName === "motofix-notifications-read") {
      rows.notifications.push([
        normalizedRecordKey("notification", sourceKey, "all-read-state", 0),
        "all-read-state",
        scopeId,
        "Notification read state",
        null,
        null,
        Boolean(stateValue) ? 1 : 0,
        sqlText(record?.updatedAt, 64),
        JSON.stringify({ allRead: Boolean(stateValue) }),
      ])
    }

    if (stateName === "motofix-owner-v1") {
      const notices = stateValue?.notices || stateValue?.notifications || []
      stateCollectionItems(notices).forEach((notification, index) => {
        const item =
          notification && typeof notification === "object"
            ? notification
            : { text: notification }
        const id = sqlText(item.id)
        rows.notifications.push([
          normalizedRecordKey("notification", sourceKey, id, index),
          id,
          scopeId,
          sqlText(item.title),
          sqlText(item.text || item.body, 1000),
          sqlText(item.route, 255),
          item.read === undefined ? null : item.read ? 1 : 0,
          sqlText(item.createdAt || item.time, 64),
          JSON.stringify(item),
        ])
      })
    }
  }

  return rows
}

async function replaceNormalizedSqlSnapshot(connection, value) {
  const rows = normalizedRows(value)
  const definitions = {
    motorcycles: [
      "record_key",
      "owner_user_id",
      "motorcycle_id",
      "bike",
      "plate",
      "model_year",
      "payload",
    ],
    bookings: [
      "record_key",
      "booking_id",
      "booking_type",
      "rider_user_id",
      "shop_id",
      "motorcycle",
      "service_name",
      "service_date",
      "service_time",
      "status",
      "payload",
    ],
    complaints: [
      "record_key",
      "complaint_id",
      "rider_user_id",
      "shop_id",
      "status",
      "category",
      "payload",
    ],
    conversations: [
      "record_key",
      "conversation_id",
      "shop_id",
      "message_count",
      "last_message_at",
      "payload",
    ],
    messages: [
      "record_key",
      "message_id",
      "conversation_id",
      "sender_id",
      "sent_at",
      "message_text",
      "payload",
    ],
    notifications: [
      "record_key",
      "notification_id",
      "owner_user_id",
      "title",
      "body",
      "route",
      "is_read",
      "created_at",
      "payload",
    ],
  }

  for (const [collection, table] of Object.entries(normalizedTables)) {
    await connection.query(`DELETE FROM \`${table}\``)
    const columns = definitions[collection]
    const placeholders = columns.map(() => "?").join(", ")
    for (const row of rows[collection]) {
      await connection.execute(
        `INSERT INTO \`${table}\` (${columns.join(", ")}) VALUES (${placeholders})`,
        row,
      )
    }
  }
}

async function backfillNormalizedSqlTables(value) {
  const connection = await sqlPool.getConnection()
  try {
    await connection.beginTransaction()
    await replaceNormalizedSqlSnapshot(connection, value)
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

function rowsForSql(table, value) {
  if (table === "users")
    return value.users.map((item) => [item.id, JSON.stringify(item)])
  if (table === "sessions" || table === "appState" || table === "uploads") {
    return Object.entries(value[table]).map(([key, item]) => [
      key,
      JSON.stringify(item),
    ])
  }
  return value[table].map((item, index) => [
    String(item.id || `${table}-${index}`),
    JSON.stringify(item),
  ])
}

async function replaceSqlSnapshot(value) {
  const connection = await sqlPool.getConnection()
  try {
    await connection.beginTransaction()
    for (const [collection, table] of Object.entries(sqlTables)) {
      await connection.query(`DELETE FROM \`${table}\``)
      for (const [key, payload] of rowsForSql(collection, value)) {
        await connection.execute(
          `INSERT INTO \`${table}\` (record_key, payload) VALUES (?, ?)`,
          [String(key), payload],
        )
      }
    }
    await replaceNormalizedSqlSnapshot(connection, value)
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function readSqlSnapshot() {
  const value = initialDatabase()
  let hasRecords = false
  for (const [collection, table] of Object.entries(sqlTables)) {
    const [rows] = await sqlPool.query(
      `SELECT record_key, payload FROM \`${table}\``,
    )
    if (rows.length) hasRecords = true
    if (collection === "users") {
      value.users = rows.map((row) => JSON.parse(row.payload))
    } else if (
      collection === "sessions" ||
      collection === "appState" ||
      collection === "uploads"
    ) {
      value[collection] = Object.fromEntries(
        rows.map((row) => [row.record_key, JSON.parse(row.payload)]),
      )
    } else {
      value[collection] = rows.map((row) => JSON.parse(row.payload))
    }
  }
  return { value, hasRecords }
}

async function loadDatabase() {
  await mkdir(dataRoot, { recursive: true })
  await mkdir(uploadRoot, { recursive: true })
  await ensureSqlSchemaWithRetry()
  const { value, hasRecords } = await readSqlSnapshot()
  if (hasRecords) {
    const changedDisplayIds = assignAccountDisplayIds(value.users)
    if (changedDisplayIds.length) {
      try {
        await persistAccountDisplayIds(changedDisplayIds)
      } catch (error) {
        console.warn("MotoFix account IDs could not be saved to SQL:", error.message)
      }
    }
    value.users = demoAccountsEnabled()
      ? value.users
      : value.users.filter((user) => !demoAccountIds.has(user.id))
    await backfillNormalizedSqlTables(value)
    return value
  }

  // Keep existing local records when the XAMPP database is first connected.
  const legacyValue = await loadJsonDatabase()
  assignAccountDisplayIds(legacyValue.users)
  await replaceSqlSnapshot(legacyValue)
  return legacyValue
}

function persistDatabase() {
  const snapshot = JSON.parse(JSON.stringify(database))
  writeQueue = writeQueue
    .catch(() => {})
    .then(async () => {
      await replaceSqlSnapshot(snapshot)
      try {
        const temporaryPath = databasePath + ".tmp"
        await writeFile(
          temporaryPath,
          JSON.stringify(snapshot, null, 2),
          "utf8",
        )
        await rename(temporaryPath, databasePath)
      } catch (error) {
        console.warn(
          "MotoFix database mirror could not be updated:",
          error.message,
        )
      }
    })
  return writeQueue
}

function json(response, status, value, extraHeaders = {}) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  })
  response.end(JSON.stringify(value))
}

function redirect(response, location, headers = {}) {
  response.writeHead(302, {
    Location: location,
    "Cache-Control": "no-store",
    ...headers,
  })
  response.end()
}

function cookieOptions(maxAge, httpOnly = true) {
  const options = ["Path=/", "SameSite=Lax", "Max-Age=" + maxAge]
  if (httpOnly) options.push("HttpOnly")
  if (process.env.COOKIE_SECURE === "true") options.push("Secure")
  return options.join("; ")
}

function parseOrigin(value) {
  if (typeof value !== "string" || !value.trim()) return ""
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return ""
    return parsed.origin
  } catch {
    return ""
  }
}

function isGoogleWebOriginAllowed(origin) {
  if (!origin) return false
  const parsed = new URL(origin)
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase()
  const isLocalhost =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    /^127(?:\.\d{1,3}){3}$/.test(hostname)
  const isRawIp =
    isLocalhost ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ||
    hostname.includes(":")
  return isLocalhost || (parsed.protocol === "https:" && !isRawIp)
}

function googleCallbackEntry(value) {
  if (typeof value !== "string" || !value.trim()) return null
  try {
    const parsed = new URL(value)
    if (
      parsed.pathname !== "/api/auth/google/callback" ||
      parsed.search ||
      parsed.hash ||
      !isGoogleWebOriginAllowed(parsed.origin)
    ) {
      return null
    }
    return { url: value.trim(), origin: parsed.origin }
  } catch {
    return null
  }
}

function readCookies(request) {
  const result = {}
  for (const entry of String(request.headers.cookie || "").split(";")) {
    const split = entry.indexOf("=")
    if (split < 0) continue
    result[entry.slice(0, split).trim()] = decodeURIComponent(
      entry.slice(split + 1).trim(),
    )
  }
  return result
}

function sessionTokenHash(token) {
  return createHash("sha256").update(token).digest("hex")
}

function getSession(request) {
  const token = readCookies(request)[sessionCookie]
  if (!token) return null
  const key = sessionTokenHash(token)
  const session = database.sessions[key]
  if (!session || session.expiresAt <= Date.now()) {
    delete database.sessions[key]
    return null
  }
  const user = database.users.find((entry) => entry.id === session.userId)
  return user ? { user, key } : null
}

function newSession(user, response) {
  const token = randomBytes(32).toString("base64url")
  const key = sessionTokenHash(token)
  database.sessions[key] = {
    userId: user.id,
    expiresAt: Date.now() + sessionLifetime,
  }
  response.setHeader(
    "Set-Cookie",
    sessionCookie +
      "=" +
      encodeURIComponent(token) +
      "; " +
      cookieOptions(sessionLifetime / 1000),
  )
}

function findUser(identity) {
  const value = normalize(identity)
  const phone = normalizePhone(identity)
  return database.users.find(
    (user) =>
      normalize(user.email) === value ||
      normalize(user.username) === value ||
      (phone.length >= 7 && normalizePhone(user.phone) === phone),
  )
}

function passwordIsValid(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    password.length <= 200
  )
}

async function readBytes(request, maxBytes = 8 * 1024 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > maxBytes) {
      const error = new Error("The request is too large.")
      error.status = 413
      throw error
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function readJson(request) {
  const bytes = await readBytes(request)
  if (!bytes.length) return {}
  try {
    return JSON.parse(bytes.toString("utf8"))
  } catch {
    const error = new Error("Send valid JSON.")
    error.status = 400
    throw error
  }
}

function requiredText(value, label, maxLength = 160) {
  const text = String(value || "").trim()
  if (!text || text.length > maxLength) {
    const error = new Error(label + " is required.")
    error.status = 400
    throw error
  }
  return text
}

function createBusinessLegitimacyRecord(input, owner, shopName, address) {
  const details = input && typeof input === "object" ? input : {}
  const legalName = requiredText(
    details.legalName || shopName,
    "Legal business name",
    200,
  )
  const entity = requiredText(details.entity, "Business type / entity", 160)
  const registration = requiredText(
    details.registration,
    "DTI / SEC / CDA registration number",
    160,
  )
  const text = (value, max = 200) => String(value || "").trim().slice(0, max)
  return {
    legalName,
    tradeName: text(details.tradeName || shopName),
    entity,
    owner: owner.name,
    email: owner.email,
    phone: owner.phone,
    address,
    registration,
    registeredOn: text(details.registeredOn, 40),
    tin: text(details.tin, 80),
    bir: text(details.bir),
    permit: text(details.permit),
    permitIssued: text(details.permitIssued, 40),
    permitExpiry: text(details.permitExpiry, 40),
    barangay: text(details.barangay),
    fireCertificate: text(details.fireCertificate),
    fireExpiry: text(details.fireExpiry, 40),
    sanitaryApplicable: Boolean(text(details.sanitaryPermit)),
    sanitaryPermit: text(details.sanitaryPermit),
    documents: {},
    status: "Draft",
    submitted: "",
  }
}

function saveBusinessLegitimacy(user, input) {
  const key = "shop:" + user.id + ":motofix-business-legitimacy-v1"
  database.appState[key] = {
    value: createBusinessLegitimacyRecord(
      input,
      user,
      user.shopName,
      user.shopAddress,
    ),
    updatedAt: new Date().toISOString(),
  }
}

function scopeFor(user) {
  return user.shopId || user.homeShopId || "shop-motohub"
}

function stateBucket(user, key) {
  if (!allowedStateKeys.has(key)) return null
  if (key === "motofix-owner-v1") {
    if (user.role !== "shop" && user.role !== "mechanic") return null
    return "shop:" + (user.role === "shop" ? user.id : user.shopId) + ":" + key
  }
  if (key === "motofix-complaints-v1" || key === "motofix-conversations-v1") {
    return "shared:" + scopeFor(user) + ":" + key
  }
  if (key === "motofix-business-legitimacy-v1") {
    if (user.role !== "shop") return null
    return "shop:" + user.id + ":" + key
  }
  if (user.role !== "rider") return null
  return "rider:" + user.id + ":" + key
}

function sanitizeState(value, depth = 0) {
  if (depth > 18) {
    const error = new Error("State data is nested too deeply.")
    error.status = 400
    throw error
  }
  if (Array.isArray(value))
    return value.slice(0, 10000).map((entry) => sanitizeState(entry, depth + 1))
  if (!value || typeof value !== "object") {
    if (typeof value === "string") return value.slice(0, 500000)
    return value
  }
  const clean = {}
  for (const [key, entry] of Object.entries(value)) {
    if (/^(password|temporarypassword|temppassword|secret|token)$/i.test(key))
      continue
    clean[key.slice(0, 120)] = sanitizeState(entry, depth + 1)
  }
  return clean
}

function syncMechanicStatuses(owner, ownerState) {
  const mechanics = Array.isArray(ownerState?.mechanics)
    ? ownerState.mechanics
    : []
  for (const user of database.users) {
    if (user.role !== "mechanic" || user.shopId !== owner.id) continue
    const record = mechanics.find(
      (entry) =>
        entry.id === user.mechanicId ||
        normalize(entry.email) === normalize(user.email) ||
        normalize(entry.username) === normalize(user.username),
    )
    if (record)
      user.accountStatus =
        String(record.status || "Available").toLowerCase() === "inactive"
          ? "Inactive"
          : "Active"
  }
}

function accountDisabled(user) {
  if (String(user.accountStatus || "").toLowerCase() === "inactive") return true
  if (user.role !== "mechanic" || !user.shopId) return false
  const bucket = "shop:" + user.shopId + ":motofix-owner-v1"
  const data = database.appState[bucket]?.value
  const record = Array.isArray(data?.mechanics)
    ? data.mechanics.find(
        (entry) =>
          entry.id === user.mechanicId ||
          normalize(entry.email) === normalize(user.email) ||
          normalize(entry.username) === normalize(user.username),
      )
    : null
  return String(record?.status || "").toLowerCase() === "inactive"
}

function setStateValue(user, key, value) {
  const bucket = stateBucket(user, key)
  if (!bucket) {
    const error = new Error("This account cannot access that data.")
    error.status = 403
    throw error
  }
  const clean = sanitizeState(value)
  if (Buffer.byteLength(JSON.stringify(clean), "utf8") > 8 * 1024 * 1024) {
    const error = new Error("This data is too large to save.")
    error.status = 413
    throw error
  }
  database.appState[bucket] = {
    value: clean,
    updatedAt: new Date().toISOString(),
  }
  if (key === "motofix-owner-v1") {
    const owner = database.users.find(
      (entry) => entry.id === (user.role === "shop" ? user.id : user.shopId),
    )
    if (owner) syncMechanicStatuses(owner, clean)
  }
  return database.appState[bucket]
}

function fileScope(user) {
  return scopeFor(user)
}

function safeFileName(value) {
  return (
    path
      .basename(String(value || "upload"))
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120) || "upload"
  )
}

function multipartFile(body, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "")
  const boundary = match?.[1] || match?.[2]
  if (!boundary) return null
  const marker = Buffer.from("--" + boundary)
  let cursor = body.indexOf(marker)
  while (cursor >= 0) {
    cursor += marker.length
    if (body[cursor] === 45 && body[cursor + 1] === 45) return null
    if (body[cursor] === 13 && body[cursor + 1] === 10) cursor += 2
    const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), cursor)
    if (headerEnd < 0) return null
    const nextBoundary = body.indexOf(marker, headerEnd + 4)
    if (nextBoundary < 0) return null
    const headers = body.slice(cursor, headerEnd).toString("utf8")
    const filename = /filename="([^"]*)"/i.exec(headers)?.[1]
    const mime = /content-type:\s*([^\r\n]+)/i
      .exec(headers)?.[1]
      ?.trim()
      .toLowerCase()
    if (filename !== undefined) {
      let end = nextBoundary
      if (body[end - 2] === 13 && body[end - 1] === 10) end -= 2
      return {
        filename: safeFileName(filename),
        mime: mime || "application/octet-stream",
        bytes: body.slice(headerEnd + 4, end),
      }
    }
    cursor = nextBoundary
  }
  return null
}

function publicFile(file) {
  return { id: file.id, name: file.name, size: file.size, type: file.type }
}

async function serveUploadedFile(request, response, id) {
  const session = getSession(request)
  if (!session)
    return json(response, 401, { error: "Sign in to open this file." })
  const file = database.uploads[id]
  if (!file || file.scope !== fileScope(session.user))
    return json(response, 404, { error: "File not found." })
  try {
    const content = await readFile(path.join(uploadRoot, file.storedName))
    response.writeHead(200, {
      "Cache-Control": "private, no-store",
      "Content-Disposition":
        'attachment; filename="' + safeFileName(file.name) + '"',
      "Content-Length": content.length,
      "Content-Type": file.type,
      "X-Content-Type-Options": "nosniff",
    })
    response.end(content)
  } catch {
    json(response, 404, { error: "The uploaded file is no longer available." })
  }
}

async function startGoogle(request, response, url) {
  const role = url.searchParams.get("role")
  if (role !== "rider" && role !== "shop" && role !== "login") {
    return redirect(response, "/?auth_error=bad_google_role")
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return redirect(response, "/?auth_error=google_not_configured")
  }

  // The client supplies the page origin because the API is behind Vite's proxy,
  // which rewrites the Host header. Keep the OAuth state cookie and callback on
  // one origin; otherwise a phone can be sent to its own localhost after Google.
  const sourceOrigin =
    parseOrigin(url.searchParams.get("origin")) ||
    parseOrigin(request.headers.referer)
  if (!sourceOrigin) {
    return redirect(response, "/?auth_error=google_origin_mismatch")
  }
  if (!isGoogleWebOriginAllowed(sourceOrigin)) {
    return redirect(response, "/?auth_error=google_origin_invalid")
  }

  const callbackCandidates = [
    process.env.GOOGLE_CALLBACK_URL ||
      parseOrigin(appOrigin) + "/api/auth/google/callback",
    ...(process.env.GOOGLE_CALLBACK_URLS || "").split(","),
  ]
    .map(googleCallbackEntry)
    .filter(Boolean)
  const callback = callbackCandidates.find(
    (entry) => entry.origin === sourceOrigin,
  )
  if (!callback) {
    return redirect(response, "/?auth_error=google_callback_mismatch")
  }

  const state = randomBytes(24).toString("hex")
  const verifier = randomBytes(32).toString("base64url")
  const challenge = createHash("sha256").update(verifier).digest("base64url")
  oauthStates.set(state, {
    verifier,
    role,
    origin: sourceOrigin,
    callback: callback.url,
    expiresAt: Date.now() + 10 * 60 * 1000,
  })
  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  googleUrl.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: callback.url,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString()
  return redirect(response, googleUrl.toString(), {
    "Set-Cookie":
      oauthCookie + "=" + encodeURIComponent(state) + "; " + cookieOptions(600),
  })
}

async function finishGoogle(request, response, url) {
  const state = url.searchParams.get("state") || ""
  const flow = oauthStates.get(state)
  oauthStates.delete(state)
  if (
    !flow ||
    flow.expiresAt < Date.now() ||
    readCookies(request)[oauthCookie] !== state
  ) {
    return redirect(response, "/?auth_error=google_state_expired")
  }
  if (url.searchParams.has("error")) {
    return redirect(response, "/?auth_error=google_cancelled")
  }
  const callback = flow.callback
  let user = null
  let originalUser = null
  let createdUserId = null
  let sessionKeysBefore = null
  let failureStage = "token_exchange"
  let providerErrorCode = ""
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: url.searchParams.get("code") || "",
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: callback,
        grant_type: "authorization_code",
        code_verifier: flow.verifier,
      }),
    })
    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok || !tokenData.access_token) {
      providerErrorCode = String(tokenData.error || "unknown")
      throw new Error("Google token exchange failed.")
    }
    failureStage = "profile_lookup"
    const profileResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: "Bearer " + tokenData.access_token },
      },
    )
    const profile = await profileResponse.json()
    if (
      !profileResponse.ok ||
      !profile.sub ||
      !profile.email ||
      profile.email_verified !== true
    ) {
      throw new Error("Google did not return a verified email address.")
    }
    failureStage = "account_save"
    const email = normalize(profile.email)
    const subjectUser = database.users.find(
      (entry) => entry.googleSubject === profile.sub,
    )
    const emailUser = findUser(email)
    if (subjectUser && emailUser && subjectUser.id !== emailUser.id) {
      return redirect(
        response,
        flow.origin + "/?auth_error=google_account_conflict",
        {
          "Set-Cookie": oauthCookie + "=; " + cookieOptions(0),
        },
      )
    }
    user = subjectUser || emailUser
    if (user?.googleSubject && user.googleSubject !== profile.sub) {
      return redirect(
        response,
        flow.origin + "/?auth_error=google_account_conflict",
        {
          "Set-Cookie": oauthCookie + "=; " + cookieOptions(0),
        },
      )
    }
    if (flow.role === "login" && !user) {
      const token = randomBytes(32).toString("base64url")
      pendingGoogleSignups.set(token, {
        subject: profile.sub,
        email,
        name: requiredText(profile.name || profile.email.split("@")[0], "Your name"),
        expiresAt: Date.now() + 10 * 60 * 1000,
      })
      return redirect(response, flow.origin + "/?google_signup_pending=" + encodeURIComponent(token), {
        "Set-Cookie": oauthCookie + "=; " + cookieOptions(0),
      })
    }
    if (flow.role !== "login" && user && user.role !== flow.role) {
      return redirect(
        response,
        flow.origin + "/?auth_error=google_role_conflict",
        {
          "Set-Cookie": oauthCookie + "=; " + cookieOptions(0),
        },
      )
    }
    if (user && accountDisabled(user)) {
      return redirect(
        response,
        flow.origin + "/?auth_error=google_account_inactive",
        {
          "Set-Cookie": oauthCookie + "=; " + cookieOptions(0),
        },
      )
    }
    originalUser = user ? { ...user } : null
    sessionKeysBefore = new Set(Object.keys(database.sessions))
    if (!user) {
      const createdAt = new Date().toISOString()
      user = {
        id: "user-" + randomUUID(),
        name: requiredText(
          profile.name || profile.email.split("@")[0],
          "Your name",
        ),
        email,
        phone: "",
        role: flow.role,
        shopName: "",
        username: "",
        shopId: flow.role === "shop" ? "" : undefined,
        homeShopId: flow.role === "rider" ? "shop-motohub" : undefined,
        accountStatus: flow.role === "shop" ? "Pending Verification" : "Active",
        authProvider: "google",
        googleSubject: profile.sub,
        createdAt,
        displayId: nextAccountDisplayId(createdAt),
      }
      if (flow.role === "shop") {
        user.shopName = user.name + " Motor Shop"
        user.shopId = user.id
      }
      database.users.push(user)
      createdUserId = user.id
    } else {
      if (!user.googleSubject) user.googleSubject = profile.sub
      if (subjectUser && normalize(user.email) !== email) user.email = email
    }
    newSession(user, response)
    const sessionHeader = response.getHeader("Set-Cookie")
    response.setHeader("Set-Cookie", [
      sessionHeader,
      oauthCookie + "=; " + cookieOptions(0),
    ])
    await persistDatabase()
    return redirect(
      response,
      flow.origin + `/?oauth=success&oauth_created=${createdUserId ? "1" : "0"}`,
    )
  } catch (error) {
    const failureCode =
      providerErrorCode ||
      String(error?.cause?.code || error?.code || error?.name || "unknown")
    console.error("MotoFix Google sign-up failed:", {
      stage: failureStage,
      code: failureCode,
    })
    if (sessionKeysBefore) {
      for (const key of Object.keys(database.sessions)) {
        if (!sessionKeysBefore.has(key)) delete database.sessions[key]
      }
    }
    if (createdUserId) {
      database.users = database.users.filter(
        (entry) => entry.id !== createdUserId,
      )
    } else if (user && originalUser) {
      for (const key of Object.keys(user)) delete user[key]
      Object.assign(user, originalUser)
    }
    const authError =
      failureStage === "token_exchange"
        ? providerErrorCode === "invalid_client"
          ? "google_credentials_rejected"
          : "google_token_exchange_failed"
        : failureStage === "account_save"
          ? "google_account_save_failed"
          : "google_profile_failed"
    return redirect(response, flow.origin + "/?auth_error=" + authError, {
      "Set-Cookie": oauthCookie + "=; " + cookieOptions(0),
    })
  }
}

async function handleApi(request, response, url) {
  const method = request.method || "GET"
  const pathname = url.pathname

  if (method === "GET" && pathname === "/api/health") {
    return json(response, 200, { ok: true, service: "MotoFix API", version: 1 })
  }
  if (method === "GET" && pathname === "/api/auth/google/start")
    return startGoogle(request, response, url)
  if (method === "GET" && pathname === "/api/auth/google/callback")
    return finishGoogle(request, response, url)

  if (method === "GET" && pathname === "/api/auth/google/pending-signup") {
    const token = url.searchParams.get("token") || ""
    const pending = pendingGoogleSignups.get(token)
    if (!pending || pending.expiresAt < Date.now()) {
      pendingGoogleSignups.delete(token)
      return json(response, 410, {
        error: "Google account setup expired. Start again with Continue with Google.",
      })
    }
    return json(response, 200, { name: pending.name, email: pending.email })
  }

  if (method === "POST" && pathname === "/api/auth/google/complete-signup") {
    const body = await readJson(request)
    const token = String(body.token || "")
    const pending = pendingGoogleSignups.get(token)
    if (!pending || pending.expiresAt < Date.now()) {
      pendingGoogleSignups.delete(token)
      return json(response, 410, {
        error: "Google account setup expired. Start again with Continue with Google.",
      })
    }
    if (body.role !== "rider" && body.role !== "shop") {
      return json(response, 400, { error: "Choose a valid MotoFix account type." })
    }
    const phone = requiredText(body.phone, "Mobile number", 40)
    if (
      database.users.some(
        (user) =>
          normalize(user.email) === pending.email ||
          normalizePhone(user.phone) === normalizePhone(phone),
      )
    ) {
      return json(response, 409, {
        error: "An account already uses that email or mobile number. Sign in or use another mobile number.",
      })
    }
    const shopName = body.role === "shop" ? requiredText(body.shopName, "Motor shop name") : ""
    const shopAddress = body.role === "shop" ? requiredText(body.shopAddress, "Shop address", 300) : ""
    const createdAt = new Date().toISOString()
    const user = {
      id: "user-" + randomUUID(),
      name: pending.name,
      email: pending.email,
      phone,
      role: body.role,
      username: "",
      shopName,
      shopAddress,
      shopId: body.role === "shop" ? "" : undefined,
      homeShopId: body.role === "rider" ? "shop-motohub" : undefined,
      accountStatus: body.role === "shop" ? "Pending Verification" : "Active",
      authProvider: "google",
      googleSubject: pending.subject,
      createdAt,
      displayId: nextAccountDisplayId(createdAt),
    }
    if (body.role === "shop") user.shopId = user.id
    if (body.role === "shop") saveBusinessLegitimacy(user, body.businessLegitimacy)
    database.users.push(user)
    newSession(user, response)
    try {
      await persistDatabase()
    } catch (error) {
      database.users = database.users.filter((entry) => entry.id !== user.id)
      for (const [key, session] of Object.entries(database.sessions)) {
        if (session.userId === user.id) delete database.sessions[key]
      }
      if (body.role === "shop") delete database.appState["shop:" + user.id + ":motofix-business-legitimacy-v1"]
      throw error
    }
    pendingGoogleSignups.delete(token)
    return json(response, 201, { user: safeUser(user) })
  }

  if (method === "POST" && pathname === "/api/auth/register") {
    const body = await readJson(request)
    const role = body.role
    if (role !== "rider" && role !== "shop") {
      return json(response, 400, {
        error: "Choose Motorcycle Rider or Motor Shop to create an account.",
      })
    }
    const name = requiredText(body.name, "Full name")
    const email = normalize(body.email)
    const phone = requiredText(body.phone, "Mobile number", 40)
    const password = body.password
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return json(response, 400, { error: "Enter a valid email address." })
    if (!passwordIsValid(password))
      return json(response, 400, {
        error: "Password must be at least 8 characters.",
      })
    const shopName =
      role === "shop" ? requiredText(body.shopName, "Motor shop name") : ""
    const shopAddress =
      role === "shop" ? requiredText(body.shopAddress, "Shop address", 300) : ""
    if (
      database.users.some(
        (user) =>
          normalize(user.email) === email ||
          normalizePhone(user.phone) === normalizePhone(phone),
      )
    ) {
      return json(response, 409, {
        error: "An account already uses that email or mobile number.",
      })
    }
    const passwordData = hashPassword(password)
    const createdAt = new Date().toISOString()
    const user = {
      id: "user-" + randomUUID(),
      name,
      email,
      phone,
      role,
      username: "",
      shopName,
      shopAddress,
      shopId: role === "shop" ? "" : undefined,
      homeShopId: role === "rider" ? "shop-motohub" : undefined,
      passwordSalt: passwordData.salt,
      passwordHash: passwordData.hash,
      accountStatus: role === "shop" ? "Pending Verification" : "Active",
      authProvider: "password",
      createdAt,
      displayId: nextAccountDisplayId(createdAt),
    }
    if (role === "shop") user.shopId = user.id
    if (role === "shop") saveBusinessLegitimacy(user, body.businessLegitimacy)
    database.users.push(user)
    newSession(user, response)
    await persistDatabase()
    return json(response, 201, { user: safeUser(user) })
  }

  if (method === "PATCH" && pathname === "/api/auth/shop-registration") {
    const session = getSession(request)
    if (!session || session.user.role !== "shop") {
      return json(response, 403, { error: "Only a motor shop owner can update shop registration details." })
    }
    const body = await readJson(request)
    session.user.shopName = requiredText(body.shopName, "Motor shop name")
    session.user.shopAddress = requiredText(body.shopAddress, "Shop address", 300)
    await persistDatabase()
    return json(response, 200, { user: safeUser(session.user) })
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    const body = await readJson(request)
    const user = findUser(body.identity)
    if (!user || !passwordMatches(String(body.password || ""), user)) {
      return json(response, 401, {
        error: "Email, mobile number, username, or password is incorrect.",
      })
    }
    if (accountDisabled(user)) {
      return json(response, 403, {
        error: "This account is inactive. Contact the motor shop owner.",
      })
    }
    newSession(user, response)
    await persistDatabase()
    return json(response, 200, { user: safeUser(user) })
  }

  if (method === "POST" && pathname === "/api/auth/logout") {
    const session = getSession(request)
    if (session) delete database.sessions[session.key]
    await persistDatabase()
    return json(response, 200, { ok: true }, {
      "Set-Cookie": sessionCookie + "=; " + cookieOptions(0),
    })
  }

  if (method === "GET" && pathname === "/api/auth/session") {
    const session = getSession(request)
    if (!session || accountDisabled(session.user)) {
      return json(response, 200, { user: null })
    }
    return json(response, 200, { user: safeUser(session.user) })
  }

  if (method === "PATCH" && pathname === "/api/auth/profile") {
    const session = getSession(request)
    if (!session) {
      return json(response, 401, { error: "Sign in to update your account." })
    }
    const body = await readJson(request)
    const hasName = body.name !== undefined
    const hasPhone = body.phone !== undefined
    if (hasName && session.user.role !== "shop") {
      return json(response, 403, {
        error: "Only motor shop owners can update this account name here.",
      })
    }
    if (!hasName && !hasPhone) {
      return json(response, 400, { error: "Enter an account detail to update." })
    }
    if (hasName) session.user.name = requiredText(body.name, "Owner name", 120)
    if (hasPhone) {
      const phone = requiredText(body.phone, "Mobile number", 40)
      const duplicate = database.users.some(
        (user) => user.id !== session.user.id && normalizePhone(user.phone) === normalizePhone(phone),
      )
      if (duplicate) {
        return json(response, 409, { error: "Another account already uses that mobile number." })
      }
      session.user.phone = phone
    }
    await persistDatabase()
    return json(response, 200, { user: safeUser(session.user) })
  }

  if (method === "POST" && pathname === "/api/auth/forgot-password") {
    const body = await readJson(request)
    const email = normalize(body.identity)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) {
      return json(response, 400, {
        error: "Enter a valid email address for your MotoFix account.",
      })
    }
    if (!passwordResetMailSettings()) {
      return json(response, 503, {
        error:
          "Password reset email is not configured. The app administrator must add SMTP settings to .env and restart MotoFix.",
      })
    }

    const user = database.users.find(
      (entry) => normalize(entry.email) === email,
    )
    const token = user ? randomBytes(32).toString("hex") : ""
    const resetRequest = {
      id: "reset-" + randomUUID(),
      userId: user?.id || null,
      emailHash: createHash("sha256").update(email).digest("hex"),
      requestedAt: new Date().toISOString(),
      expiresAt: user
        ? new Date(Date.now() + passwordResetTokenLifetime).toISOString()
        : null,
      tokenHash: token
        ? createHash("sha256").update(token).digest("hex")
        : null,
      usedAt: null,
    }
    database.passwordResetRequests.push(resetRequest)
    database.passwordResetRequests = database.passwordResetRequests.slice(-500)
    await persistDatabase()

    if (user && token) {
      try {
        await sendPasswordResetEmail(email, token)
      } catch (error) {
        resetRequest.usedAt = new Date().toISOString()
        await persistDatabase().catch(() => undefined)
        console.error("MotoFix password reset email could not be delivered:", {
          code: error?.code || "SMTP_SEND_FAILED",
          responseCode: Number(error?.responseCode) || null,
        })
      }
    }
    return json(response, 202, {
      message:
        "If an account matches, a reset link will be sent when email delivery is available. Check your inbox and spam folder.",
    })
  }

  if (method === "POST" && pathname === "/api/auth/reset-password") {
    const body = await readJson(request)
    const token = String(body.token || "")
    const newPassword = String(body.newPassword || "")
    if (!passwordIsValid(newPassword)) {
      return json(response, 400, {
        error: "New password must be at least 8 characters.",
      })
    }
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return json(response, 400, {
        error: "This reset link is invalid or expired. Request a new one.",
      })
    }

    const tokenHash = createHash("sha256").update(token).digest("hex")
    const resetRequest = database.passwordResetRequests.find((entry) => {
      if (entry.usedAt || !entry.tokenHash || !entry.expiresAt) return false
      const expected = Buffer.from(String(entry.tokenHash), "hex")
      const actual = Buffer.from(tokenHash, "hex")
      return (
        expected.length === actual.length && timingSafeEqual(expected, actual)
      )
    })
    const expiresAt = Date.parse(resetRequest?.expiresAt || "")
    if (
      !resetRequest ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      return json(response, 400, {
        error: "This reset link is invalid or expired. Request a new one.",
      })
    }
    const user = database.users.find(
      (entry) => entry.id === resetRequest.userId,
    )
    if (!user) {
      return json(response, 400, {
        error: "This reset link is invalid or expired. Request a new one.",
      })
    }

    const oldPassword = {
      passwordHash: user.passwordHash,
      passwordSalt: user.passwordSalt,
    }
    const now = new Date().toISOString()
    const resetRequestsForUser = database.passwordResetRequests
      .filter(
        (entry) => entry.userId === user.id && entry.tokenHash && !entry.usedAt,
      )
      .map((entry) => ({ entry, usedAt: entry.usedAt }))
    const revokedSessions = Object.entries(database.sessions).filter(
      ([, session]) => session.userId === user.id,
    )
    const passwordData = hashPassword(newPassword)
    user.passwordSalt = passwordData.salt
    user.passwordHash = passwordData.hash
    for (const entry of resetRequestsForUser) entry.entry.usedAt = now
    for (const [key] of revokedSessions) delete database.sessions[key]

    try {
      await persistDatabase()
    } catch (error) {
      user.passwordHash = oldPassword.passwordHash
      user.passwordSalt = oldPassword.passwordSalt
      for (const entry of resetRequestsForUser)
        entry.entry.usedAt = entry.usedAt
      for (const [key, session] of revokedSessions)
        database.sessions[key] = session
      throw error
    }
    return json(response, 200, { ok: true })
  }

  if (method === "POST" && pathname === "/api/auth/change-password") {
    const session = getSession(request)
    if (!session)
      return json(response, 401, { error: "Sign in to update your password." })
    const body = await readJson(request)
    if (!passwordMatches(String(body.currentPassword || ""), session.user)) {
      return json(response, 400, {
        error: "Your current password is incorrect.",
      })
    }
    if (!passwordIsValid(body.newPassword)) {
      return json(response, 400, {
        error: "New password must be at least 8 characters.",
      })
    }
    const passwordData = hashPassword(body.newPassword)
    session.user.passwordSalt = passwordData.salt
    session.user.passwordHash = passwordData.hash
    session.user.authProvider = "password"
    await persistDatabase()
    return json(response, 200, { ok: true })
  }

  const session = getSession(request)
  if (
    pathname.startsWith("/api/") &&
    pathname !== "/api/auth/session" &&
    !session
  ) {
    return json(response, 401, { error: "Sign in to continue." })
  }

  if (method === "GET" && pathname === "/api/shops/directory") {
    if (session.user.role !== "rider") {
      return json(response, 403, { error: "Shop locations are available in the rider account." })
    }
    const locations = [
      [53, 35], [59, 40], [66, 31], [69, 50], [44, 39], [57, 57],
      [32, 35], [73, 65], [49, 22], [37, 58],
    ]
    const shops = database.users
      .filter((user) => user.role === "shop" && !demoAccountIds.has(user.id) && !accountDisabled(user))
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
      .map((user, index) => ({
        id: user.id,
        name: String(user.shopName || user.name || "Motor Shop"),
        phone: String(user.phone || ""),
        address: String(user.shopAddress || "Panabo City"),
        services: ["Oil Change", "General Maintenance", "Brake Service"],
        open: true,
        available: true,
        rating: 5,
        reviews: 0,
        distance: Number((1.5 + (index % 5) * 0.4).toFixed(1)),
        mapPosition: locations[index % locations.length],
      }))
    return json(response, 200, { shops })
  }

  if (method === "GET" && pathname.startsWith("/api/state/")) {
    const key = decodeURIComponent(pathname.slice("/api/state/".length))
    const bucket = stateBucket(session.user, key)
    if (!bucket)
      return json(response, 403, {
        error: "This account cannot access that data.",
      })
    const record = database.appState[bucket]
    return json(response, 200, {
      value: record?.value ?? null,
      updatedAt: record?.updatedAt ?? null,
    })
  }

  if (method === "PUT" && pathname.startsWith("/api/state/")) {
    const key = decodeURIComponent(pathname.slice("/api/state/".length))
    const body = await readJson(request)
    const record = setStateValue(session.user, key, body.value)
    await persistDatabase()
    return json(response, 200, { updatedAt: record.updatedAt })
  }

  if (method === "POST" && pathname === "/api/support/tickets") {
    const body = await readJson(request)
    const ticket = {
      id: "SUP-" + randomUUID().slice(0, 8).toUpperCase(),
      subject: requiredText(body.subject, "Subject", 180),
      message: requiredText(body.message, "Message", 4000),
      accountId: session.user.id,
      accountRole: session.user.role,
      shopId: scopeFor(session.user),
      status: "Open",
      createdAt: new Date().toISOString(),
    }
    database.supportTickets.push(ticket)
    database.supportTickets = database.supportTickets.slice(-1000)
    await persistDatabase()
    return json(response, 201, { id: ticket.id, status: ticket.status })
  }

  if (method === "POST" && pathname === "/api/mechanics") {
    if (session.user.role !== "shop")
      return json(response, 403, {
        error: "Only the shop owner can create mechanic accounts.",
      })
    const body = await readJson(request)
    const name = requiredText(body.name, "Mechanic name")
    const email = normalize(body.email)
    const phone = requiredText(body.phone, "Mobile number", 40)
    const username = normalize(body.username)
    const password = body.password
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return json(response, 400, {
        error: "Enter a valid mechanic email address.",
      })
    if (!username)
      return json(response, 400, {
        error: "Enter a username for this mechanic.",
      })
    if (!passwordIsValid(password))
      return json(response, 400, {
        error: "Password must be at least 8 characters.",
      })
    if (
      database.users.some(
        (user) =>
          normalize(user.email) === email ||
          normalizePhone(user.phone) === normalizePhone(phone) ||
          normalize(user.username) === username,
      )
    )
      return json(response, 409, {
        error: "A MotoFix account already uses that email, phone, or username.",
      })

    const passwordData = hashPassword(password)
    const mechanicId = "M-" + randomUUID().slice(0, 8).toUpperCase()
    const createdAt = new Date().toISOString()
    const user = {
      id: "mechanic-" + randomUUID(),
      name,
      email,
      phone,
      username,
      role: "mechanic",
      shopId: session.user.id,
      mechanicId,
      specialization: String(body.specialization || ""),
      experience: String(body.experience || ""),
      skills: String(body.skills || ""),
      employment: String(body.employment || "Full-time"),
      accountStatus: "Active",
      passwordSalt: passwordData.salt,
      passwordHash: passwordData.hash,
      authProvider: "password",
      createdAt,
      displayId: nextAccountDisplayId(createdAt),
    }
    database.users.push(user)
    await persistDatabase()
    return json(response, 201, { mechanicId, user: safeUser(user) })
  }

  if (
    method === "POST" &&
    pathname.startsWith("/api/mechanics/") &&
    pathname.endsWith("/reset-password")
  ) {
    if (session.user.role !== "shop")
      return json(response, 403, {
        error: "Only the shop owner can reset mechanic passwords.",
      })
    const mechanicId = decodeURIComponent(
      pathname.slice("/api/mechanics/".length, -"/reset-password".length),
    )
    const user = database.users.find(
      (entry) =>
        entry.role === "mechanic" &&
        entry.shopId === session.user.id &&
        entry.mechanicId === mechanicId,
    )
    if (!user)
      return json(response, 404, { error: "Mechanic account not found." })
    const password = "MotoFix-" + randomBytes(12).toString("base64url")
    const passwordData = hashPassword(password)
    user.passwordSalt = passwordData.salt
    user.passwordHash = passwordData.hash
    await persistDatabase()
    return json(response, 200, { password })
  }

  if (method === "PATCH" && pathname.startsWith("/api/mechanics/")) {
    if (session.user.role !== "shop")
      return json(response, 403, {
        error: "Only the shop owner can edit mechanic accounts.",
      })
    const mechanicId = decodeURIComponent(
      pathname.slice("/api/mechanics/".length),
    )
    const user = database.users.find(
      (entry) =>
        entry.role === "mechanic" &&
        entry.shopId === session.user.id &&
        entry.mechanicId === mechanicId,
    )
    if (!user)
      return json(response, 404, { error: "Mechanic account not found." })
    const body = await readJson(request)
    const email = normalize(body.email)
    const phone = requiredText(body.phone, "Mobile number", 40)
    const username = normalize(body.username)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return json(response, 400, {
        error: "Enter a valid mechanic email address.",
      })
    if (!username)
      return json(response, 400, {
        error: "Enter a username for this mechanic.",
      })
    if (
      database.users.some(
        (entry) =>
          entry.id !== user.id &&
          (normalize(entry.email) === email ||
            normalizePhone(entry.phone) === normalizePhone(phone) ||
            normalize(entry.username) === username),
      )
    )
      return json(response, 409, {
        error: "Another MotoFix account uses that email, phone, or username.",
      })
    user.name = requiredText(body.name, "Mechanic name")
    user.email = email
    user.phone = phone
    user.username = username
    user.specialization = String(body.specialization || "")
    user.experience = String(body.experience || "")
    user.skills = String(body.skills || "")
    user.employment = String(body.employment || "Full-time")
    if (body.password) {
      if (!passwordIsValid(body.password))
        return json(response, 400, {
          error: "Password must be at least 8 characters.",
        })
      const passwordData = hashPassword(body.password)
      user.passwordSalt = passwordData.salt
      user.passwordHash = passwordData.hash
    }
    await persistDatabase()
    return json(response, 200, { user: safeUser(user) })
  }

  if (method === "POST" && pathname === "/api/files") {
    const contentType = String(request.headers["content-type"] || "")
    const body = await readBytes(request, 5 * 1024 * 1024 + 64 * 1024)
    const uploaded = multipartFile(body, contentType)
    if (!uploaded || !uploaded.bytes.length)
      return json(response, 400, { error: "Choose a PDF, JPG, or PNG file." })
    if (
      !["application/pdf", "image/jpeg", "image/png"].includes(uploaded.mime)
    ) {
      return json(response, 415, { error: "Choose a PDF, JPG, or PNG file." })
    }
    if (uploaded.bytes.length > 5 * 1024 * 1024)
      return json(response, 413, {
        error: "Each file must be 5 MB or smaller.",
      })
    const ext = path.extname(uploaded.filename).toLowerCase()
    const expectedExt = {
      "application/pdf": ".pdf",
      "image/jpeg": ".jpg",
      "image/png": ".png",
    }[uploaded.mime]
    const storedName = randomUUID() + expectedExt
    const id = randomUUID()
    await writeFile(path.join(uploadRoot, storedName), uploaded.bytes, {
      flag: "wx",
    })
    database.uploads[id] = {
      id,
      storedName,
      name: uploaded.filename,
      size: uploaded.bytes.length,
      type: uploaded.mime,
      extension: ext,
      scope: fileScope(session.user),
      uploadedBy: session.user.id,
      createdAt: new Date().toISOString(),
    }
    await persistDatabase()
    return json(response, 201, publicFile(database.uploads[id]))
  }

  if (method === "GET" && pathname.startsWith("/api/files/")) {
    const id = pathname.slice("/api/files/".length)
    return serveUploadedFile(request, response, id)
  }

  if (pathname.startsWith("/api/"))
    return json(response, 404, { error: "API route not found." })
  return null
}

async function serveStatic(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" })
    return response.end()
  }
  let pathname
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    response.writeHead(400)
    return response.end("Bad request")
  }
  const target = path.resolve(publicRoot, "." + pathname)
  if (target !== publicRoot && !target.startsWith(publicRoot + path.sep)) {
    response.writeHead(403)
    return response.end("Forbidden")
  }
  let filePath = target
  try {
    const stat = await readFile(filePath)
    const type =
      mimeTypes[path.extname(filePath).toLowerCase()] ||
      "application/octet-stream"
    response.writeHead(200, {
      "Cache-Control":
        path.basename(filePath) === "index.html"
          ? "no-cache"
          : "public, max-age=31536000, immutable",
      "Content-Length": stat.length,
      "Content-Type": type,
      "X-Content-Type-Options": "nosniff",
    })
    return response.end(request.method === "HEAD" ? undefined : stat)
  } catch (error) {
    if (error.code !== "ENOENT" && error.code !== "EISDIR") throw error
  }
  if (path.extname(pathname)) {
    response.writeHead(404)
    return response.end("Not found")
  }
  filePath = path.join(publicRoot, "index.html")
  try {
    const html = await readFile(filePath)
    response.writeHead(200, {
      "Cache-Control": "no-cache",
      "Content-Type": "text/html; charset=utf-8",
    })
    return response.end(html)
  } catch {
    response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" })
    response.end("Build the app first with pnpm build.")
  }
}

async function main() {
  database = await loadDatabase()
  for (const [key, value] of Object.entries(database.sessions)) {
    if (!value || value.expiresAt <= Date.now()) delete database.sessions[key]
  }
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(
        request.url || "/",
        "http://" + (request.headers.host || "localhost"),
      )
      if (url.pathname.startsWith("/api/")) {
        const handled = await handleApi(request, response, url)
        if (handled !== null) return
      }
      await serveStatic(request, response, url)
    } catch (error) {
      const status = Number(error.status) || 500
      if (status >= 500) console.error("MotoFix API error:", error)
      if (!response.headersSent)
        json(response, status, {
          error:
            status === 500
              ? "The server could not complete that request."
              : error.message,
        })
      else response.destroy()
    }
  })
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `MotoFix API could not listen on port ${port}: the port is already in use. Close the other process or set API_PORT to an unused port.`,
      )
    } else {
      console.error("MotoFix API could not listen:", error.message)
    }
    void sqlPool.end().then(
      () => {
        process.exitCode = 1
      },
      () => {
        process.exitCode = 1
      },
    )
  })
  server.listen(port, "0.0.0.0", () => {
    console.log(
      "MotoFix API and web server listening on http://localhost:" + port,
    )
  })
  const shutdown = () =>
    server.close(async () => {
      await sqlPool.end()
      process.exit(0)
    })
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch((error) => {
  if (error.code === "MOTOFIX_MYSQL_UNAVAILABLE") {
    console.error("MotoFix could not start:", error.message)
  } else {
    console.error("MotoFix could not start:", error)
  }
  process.exitCode = 1
})
