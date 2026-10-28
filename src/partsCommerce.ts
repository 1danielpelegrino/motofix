import { useEffect, useState } from "react"

export type SalePart = { id: string; name: string; brand: string; category: string; compatibility: string; quantity: number; price: number; description: string; photo: string; status: string }
export type PartsOrder = { id: string; partId: string; name: string; quantity: number; unitPrice: number; subtotal: number; fee: number; total: number; customer: string; phone: string; shop: string; payment: string; status: "New" | "Ready for pickup" | "Collected"; created: string }
const key = "motofix-parts-orders-v1"
export const seedParts: SalePart[] = [
  { id: "P-01", name: "Motul 10W-40 Oil", brand: "Motul", category: "Engine oil", compatibility: "All 4-stroke motorcycles", quantity: 18, price: 450, description: "Premium 4-stroke engine oil, 1 liter.", photo: "", status: "In Stock" },
  { id: "P-02", name: "Front Brake Pads", brand: "Bendix", category: "Brakes", compatibility: "Honda Click 125i, Yamaha NMAX", quantity: 3, price: 650, description: "High-performance ceramic brake pads.", photo: "", status: "Low Stock" },
  { id: "P-03", name: "NGK Spark Plug", brand: "NGK", category: "Engine", compatibility: "Suzuki Raider R150, Honda Click", quantity: 4, price: 280, description: "Reliable ignition and smoother performance.", photo: "", status: "Low Stock" },
  { id: "P-04", name: "Michelin City Grip Tire", brand: "Michelin", category: "Tires", compatibility: "Yamaha NMAX 155", quantity: 8, price: 2200, description: "All-weather scooter tire.", photo: "", status: "In Stock" },
]
export function readOrders(): PartsOrder[] {
  try { return JSON.parse(localStorage.getItem(key) || "[]") } catch { return [] }
}
export function writeOrders(orders: PartsOrder[]) {
  localStorage.setItem(key, JSON.stringify(orders))
  window.dispatchEvent(new Event("motofix-commerce"))
}
export function readCatalog() {
  let owner: { parts?: SalePart[]; profile?: { name: string; address: string }; commerceApplied?: string[] } = {}
  try { owner = JSON.parse(localStorage.getItem("motofix-owner-v1") || "{}") } catch {}
  const pending = readOrders().filter((order) => !owner.commerceApplied?.includes(order.id))
  return {
    shop: owner.profile?.name || "MotoHub Service Center",
    address: owner.profile?.address || "124 Street, New Visayas, Panabo City",
    parts: (owner.parts || seedParts).map((part) => ({ ...part, quantity: Math.max(0, part.quantity - pending.filter((order) => order.partId === part.id).reduce((sum, order) => sum + order.quantity, 0)) })),
  }
}
export function useCommerce() {
  const [, refresh] = useState(0)
  useEffect(() => {
    const update = () => refresh((value) => value + 1)
    window.addEventListener("storage", update)
    window.addEventListener("motofix-commerce", update)
    window.addEventListener("motofix-catalog", update)
    return () => { window.removeEventListener("storage", update); window.removeEventListener("motofix-commerce", update); window.removeEventListener("motofix-catalog", update) }
  }, [])
  return readOrders()
}
export const pesos = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value)
