import { getAppState, saveAppState, type AppUser } from "./api"

const appKeys = [
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
]
const scopeKey = "motofix-state-scope"
const timers = new Map<string, number>()
const pending = new Set<string>()
let syncingEnabled = false
let originalSetItem: Storage["setItem"] | undefined

function keysForRole(role: AppUser["role"]) {
  if (role === "rider") {
    return [
      "motofix-profile",
      "motofix-motorcycles",
      "motofix-bookings",
      "motofix-saved-shops",
      "motofix-reservations",
      "motofix-notifications-read",
      "motofix-complaints-v1",
      "motofix-conversations-v1",
    ]
  }
  if (role === "shop") {
    return [
      "motofix-owner-v1",
      "motofix-complaints-v1",
      "motofix-conversations-v1",
      "motofix-business-legitimacy-v1",
    ]
  }
  return ["motofix-owner-v1", "motofix-conversations-v1"]
}

function accountScope(user: AppUser) {
  if (user.role === "rider") return "rider:" + user.id
  return "shop:" + (user.role === "shop" ? user.id : user.shopId)
}

function saveStoredKey(key: string) {
  const value = localStorage.getItem(key)
  if (value === null) return Promise.resolve()
  try {
    return saveAppState(key, JSON.parse(value)).then(() => undefined)
  } catch {
    return Promise.resolve()
  }
}

export function installRemoteStateSync() {
  if (originalSetItem) return
  originalSetItem = Storage.prototype.setItem
  const setItem = originalSetItem
  Storage.prototype.setItem = function (key: string, value: string) {
    setItem.call(this, key, value)
    if (this !== window.localStorage || !syncingEnabled || !appKeys.includes(key)) return
    const previous = timers.get(key)
    if (previous) window.clearTimeout(previous)
    pending.add(key)
    const timer = window.setTimeout(() => {
      timers.delete(key)
      pending.delete(key)
      void saveStoredKey(key).catch(() => {
        // The local copy remains available if a connection drops briefly.
      })
    }, 250)
    timers.set(key, timer)
  }
}

export async function restoreAccountState(user: AppUser, mechanicFallback?: unknown) {
  syncingEnabled = false
  const scope = accountScope(user)
  const previousScope = localStorage.getItem(scopeKey)
  const sameAccount = previousScope === scope
  if (!sameAccount) {
    for (const key of appKeys) localStorage.removeItem(key)
  }

  const keys = keysForRole(user.role)
  const remoteValues = await Promise.all(
    keys.map(async (key) => [key, await getAppState(key)] as const),
  )
  for (const [key, record] of remoteValues) {
    if (record.value !== null) {
      localStorage.setItem(key, JSON.stringify(record.value))
    } else if (!sameAccount) {
      localStorage.removeItem(key)
    }
  }

  const ownerKey = "motofix-owner-v1"
  if (
    user.role === "mechanic" &&
    mechanicFallback !== undefined &&
    remoteValues.find(([key]) => key === ownerKey)?.[1].value === null &&
    localStorage.getItem(ownerKey) === null
  ) {
    localStorage.setItem(ownerKey, JSON.stringify(mechanicFallback))
  }

  localStorage.setItem(scopeKey, scope)
  syncingEnabled = true

  for (const [key, record] of remoteValues) {
    if (record.value === null && localStorage.getItem(key) !== null) {
      void saveStoredKey(key).catch(() => {
        // A later screen update will retry the save.
      })
    }
  }
}

export async function flushRemoteState() {
  const keys = [...pending]
  for (const key of keys) {
    const timer = timers.get(key)
    if (timer) window.clearTimeout(timer)
    timers.delete(key)
    pending.delete(key)
  }
  await Promise.allSettled(keys.map(saveStoredKey))
}
