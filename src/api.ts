export type AccountRole = "rider" | "shop" | "mechanic"

export type AppUser = {
  id: string
  name: string
  email: string
  phone: string
  role: AccountRole
  username: string
  shopName: string
  shopId: string
  homeShopId: string
  mechanicId?: string
  specialization?: string
  experience?: string
  skills?: string
  employment?: string
  accountStatus: string
  createdAt: string
  displayId?: string
}

export type SignUpInput = {
  role: "rider" | "shop"
  name: string
  email: string
  phone: string
  password: string
  shopName?: string
  motorcycle?: string
  plate?: string
  year?: string
  shopAddress?: string
  businessLegitimacy?: BusinessLegitimacyInput
}

export type BusinessLegitimacyInput = {
  legalName: string
  tradeName: string
  entity: string
  registration: string
  registeredOn: string
  tin: string
  bir: string
  permit: string
  permitIssued: string
  permitExpiry: string
  barangay: string
  fireCertificate: string
  fireExpiry: string
  sanitaryPermit: string
}

export type ShopDirectoryEntry = {
  id: string
  name: string
  phone: string
  address: string
  services: string[]
  open: boolean
  available: boolean
  rating: number
  reviews: number
  distance: number
  mapPosition: [number, number]
}

export type MechanicAccountInput = {
  name: string
  email: string
  phone: string
  username: string
  password: string
  specialization: string
  experience: string
  skills: string
  employment: string
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch("/api" + path, {
      credentials: "same-origin",
      ...init,
      headers: {
        ...(init.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...init.headers,
      },
    })
  } catch {
    throw new Error(
      "MotoFix could not reach its server. Start the app with pnpm dev and try again.",
    )
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || "MotoFix could not complete that request.")
  }
  return payload as T
}

export async function getSession() {
  return request<{ user: AppUser | null }>("/auth/session")
}

export async function signIn(identity: string, password: string) {
  return request<{ user: AppUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identity, password }),
  })
}

export async function signUp(input: SignUpInput) {
  return request<{ user: AppUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function getPendingGoogleSignup(token: string) {
  return request<{ name: string; email: string }>(
    "/auth/google/pending-signup?token=" + encodeURIComponent(token),
  )
}

export async function completePendingGoogleSignup(
  token: string,
  input: Omit<SignUpInput, "password">,
) {
  return request<{ user: AppUser }>("/auth/google/complete-signup", {
    method: "POST",
    body: JSON.stringify({ ...input, token }),
  })
}

export async function getShopDirectory() {
  return request<{ shops: ShopDirectoryEntry[] }>("/shops/directory")
}

export async function signOut() {
  return request<{ ok: boolean }>("/auth/logout", { method: "POST" })
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  return request<{ ok: boolean }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function updateAccountName(name: string) {
  return request<{ user: AppUser }>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  })
}

export async function updateAccountPhone(phone: string) {
  return request<{ user: AppUser }>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify({ phone }),
  })
}

export async function updateShopRegistration(input: {
  shopName: string
  shopAddress: string
}) {
  return request<{ user: AppUser }>("/auth/shop-registration", {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export async function requestPasswordReset(identity: string) {
  return request<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ identity }),
  })
}

export async function completePasswordReset(
  token: string,
  newPassword: string,
) {
  return request<{ ok: boolean }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  })
}

export async function sendSupportRequest(subject: string, message: string) {
  return request<{ id: string; status: string }>("/support/tickets", {
    method: "POST",
    body: JSON.stringify({ subject, message }),
  })
}

export async function createMechanicAccount(input: MechanicAccountInput) {
  return request<{ mechanicId: string; user: AppUser }>("/mechanics", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updateMechanicAccount(
  mechanicId: string,
  input: Omit<MechanicAccountInput, "password"> & { password?: string },
) {
  return request<{ user: AppUser }>(
    "/mechanics/" + encodeURIComponent(mechanicId),
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  )
}

export async function resetMechanicPassword(mechanicId: string) {
  return request<{ password: string }>(
    "/mechanics/" + encodeURIComponent(mechanicId) + "/reset-password",
    { method: "POST" },
  )
}

export async function getAppState(key: string) {
  return request<{ value: unknown | null; updatedAt: string | null }>(
    "/state/" + encodeURIComponent(key),
  )
}

export async function saveAppState(key: string, value: unknown) {
  return request<{ updatedAt: string }>("/state/" + encodeURIComponent(key), {
    method: "PUT",
    body: JSON.stringify({ value }),
  })
}

export async function uploadAppFile(form: FormData) {
  return request<{
    id: string
    name: string
    size: number
    type: string
  }>(
    "/files",
    {
      method: "POST",
      body: form,
    },
  )
}

export async function downloadAppFile(id: string) {
  return fetch("/api/files/" + encodeURIComponent(id), {
    credentials: "same-origin",
  })
}
