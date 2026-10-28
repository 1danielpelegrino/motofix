import { useEffect, useState } from "react"
import { downloadAppFile, uploadAppFile } from "./api"

export function readRecord<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback
  } catch {
    return fallback
  }
}

export function useDemoRecord<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readRecord(key, fallback))
  useEffect(() => {
    const refresh = () => setValue(readRecord(key, fallback))
    window.addEventListener("storage", refresh)
    window.addEventListener("motofix-records", refresh)
    return () => {
      window.removeEventListener("storage", refresh)
      window.removeEventListener("motofix-records", refresh)
    }
  }, [key])
  const save = (update: T | ((current: T) => T)) => {
    const current = readRecord(key, fallback)
    const updater = update as (current: T) => T
    const next =
      typeof update === "function"
        ? updater(current)
        : update
    localStorage.setItem(key, JSON.stringify(next))
    setValue(next)
    window.dispatchEvent(new Event("motofix-records"))
  }
  return [value, save] as const
}

export type DemoFile = { id: string; name: string; size: number; type: string }
export async function storeFile(file: File): Promise<DemoFile> {
  if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type))
    throw new Error("Choose a PDF, JPG, or PNG file.")
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Each file must be 5 MB or smaller.")
  const form = new FormData()
  form.append("file", file)
  return uploadAppFile(form)
}
export async function downloadFile(file: DemoFile) {
  const response = await downloadAppFile(file.id)
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result.error || "Unable to open this file.")
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = file.name
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 30000)
}
