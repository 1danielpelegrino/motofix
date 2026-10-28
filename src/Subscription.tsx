import { useEffect, useRef, useState } from "react"
import { Check, ShieldCheck, X } from "lucide-react"
import PaymentSimulation, { type BillingDetails } from "./PaymentSimulation"
import "./subscription.css"

export type SubscriptionRole = "rider" | "owner"
export const supportedPaymentMethods = ["GCash", "Maya", "MariBank", "PayPal", "Visa"]
export const subscriptionPlans = [
  { label: "Monthly", months: 1 },
  { label: "Quarterly", months: 3 },
  { label: "Semi-annually", months: 6 },
  { label: "Annually", months: 12 },
]
export const subscriptionPrices = { rider: [49, 135, 249, 390], owner: [98, 270, 498, 790] }

type SubscriptionRecord = { expires: number; plan: string; simulated: true; cancelled?: boolean }

function readSubscription(key: string): SubscriptionRecord {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null")
    return {
      expires: Number(value?.expires) || 0,
      plan: typeof value?.plan === "string" ? value.plan : "",
      simulated: true,
      cancelled: Boolean(value?.cancelled),
    }
  } catch {
    return { expires: 0, plan: "", simulated: true }
  }
}

function scopedSubscription(role: SubscriptionRole, userId: string) {
  const key = `motofix-subscription-${role}-${encodeURIComponent(userId)}-v1`
  const current = readSubscription(key)
  if (current.plan || current.expires || current.cancelled) return { key, record: current }
  const legacyKey = `motofix-subscription-${role}-v1`
  const legacy = readSubscription(legacyKey)
  if (legacy.plan || legacy.expires || legacy.cancelled) {
    try {
      localStorage.setItem(key, JSON.stringify(legacy))
      localStorage.removeItem(legacyKey)
      return { key, record: legacy }
    } catch {
      return { key, record: legacy }
    }
  }
  return { key, record: current }
}

export function useSubscription(role: SubscriptionRole, userId = "local") {
  const [{ key, record: initialRecord }] = useState(() => scopedSubscription(role, userId))
  const [record, setRecord] = useState(initialRecord)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    setRecord(readSubscription(key))
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    const sync = () => setRecord(readSubscription(key))
    window.addEventListener("storage", sync)
    return () => { clearInterval(timer); window.removeEventListener("storage", sync) }
  }, [key])
  return {
    active: record.expires > now,
    plan: record.plan,
    expiresAt: record.expires,
    cancelled: record.cancelled === true,
    activate(index: number) {
      if (!subscriptionPlans[index]) return false
      const date = new Date(Math.max(Date.now(), record.expires))
      const day = date.getDate()
      date.setDate(1)
      date.setMonth(date.getMonth() + subscriptionPlans[index].months)
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      date.setDate(Math.min(day, lastDay))
      try {
        const next = { expires: date.getTime(), plan: subscriptionPlans[index].label, simulated: true as const, cancelled: false }
        localStorage.setItem(key, JSON.stringify(next))
        setRecord(next)
        setNow(Date.now())
        return true
      } catch { return false }
    },
    cancel() {
      try {
        const next = { ...record, expires: 0, cancelled: true }
        localStorage.setItem(key, JSON.stringify(next))
        setRecord(next)
        setNow(Date.now())
        return true
      } catch { return false }
    },
  }
}

export default function Subscription({ role, billing, reason, onClose, onPaid, initialPlan = 0, fixedPlan = false }: {
  role: SubscriptionRole; billing?: BillingDetails; reason: string; onClose: () => void; onPaid: (index: number) => boolean; initialPlan?: number; fixedPlan?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState(Math.max(0, Math.min(initialPlan, subscriptionPlans.length - 1)))
  const [method, setMethod] = useState("GCash")
  const [checkout, setCheckout] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    const previous = document.activeElement as HTMLElement
    ref.current?.showModal()
    return () => { ref.current?.close(); previous?.focus() }
  }, [])
  return <dialog ref={ref} className="so-dialog subscription-dialog" aria-labelledby={checkout ? undefined : "subscription-title"} aria-label={checkout ? "Subscription payment checkout" : undefined} onCancel={(event) => { event.preventDefault(); if (!checkout) onClose() }}>
    {checkout ? <PaymentSimulation subscription billing={billing} accountRole={role} method={method} amount={subscriptionPrices[role][selected]} shop="MotoFix subscription" item={`${role === "rider" ? "Rider" : "Motor shop"} · ${subscriptionPlans[selected].label}`} onCancel={() => { setCheckout(false); setError("Payment cancelled. Your features remain locked.") }} onPay={() => {
      if (onPaid(selected)) return true
      setCheckout(false)
      setError("Could not save your demo subscription. Check browser storage and try again.")
      return false
    }} /> : <>
      <div className="so-dialog-heading"><ShieldCheck /><h2 id="subscription-title">Unlock more Limits</h2><button className="so-button" aria-label="Close subscription" onClick={onClose}><X size={20} /></button></div>
      <p className="subscription-benefits"><Check size={18} />{reason}</p>
      {fixedPlan ? (
        <p className="subscription-selected-plan">
          Selected plan: <strong>{subscriptionPlans[selected].label}</strong> · ₱{subscriptionPrices[role][selected]}
        </p>
      ) : (
        <div className="subscription-plans" role="group" aria-label="Subscription plans">{subscriptionPlans.map((plan, index) => <button key={plan.label} className={`so-button ${selected === index ? "so-primary" : ""}`} aria-pressed={selected === index} onClick={() => setSelected(index)}><strong>₱{subscriptionPrices[role][index]}</strong><span>{plan.label}</span></button>)}</div>
      )}
      <label className="subscription-method">Payment method<select value={method} onChange={(event) => setMethod(event.target.value)}>{supportedPaymentMethods.map((name) => <option key={name}>{name}</option>)}</select></label>
      {error && <p role="alert">{error}</p>}
      <button className="so-button so-primary" onClick={() => setCheckout(true)}>Continue to payment · ₱{subscriptionPrices[role][selected]}</button>
    </>}
  </dialog>
}
