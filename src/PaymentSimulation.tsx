import { useEffect, useRef, useState } from "react"
import { ArrowLeft, CreditCard, ShieldCheck, Smartphone } from "lucide-react"
import { createPortal } from "react-dom"
import { readRecord } from "./demoRecords"
import { pesos } from "./partsCommerce"
import "./payment-simulation.css"

export type BillingDetails = { name?: string; email?: string; phone?: string; address?: string; city?: string; postalCode?: string }

type Props = { billing?: BillingDetails; accountRole?: "rider" | "owner"; method: string; amount: number; shop: string; item: string; onCancel: () => void; onPay: () => boolean; subscription?: boolean; transactionFee?: number }

export default function PaymentSimulation({ method, amount, shop, item, onCancel, onPay, subscription = false, transactionFee = 2, billing, accountRole = "rider" }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const account = billing || (accountRole === "owner"
    ? { ...readRecord<{ profile?: BillingDetails }>("motofix-owner-v1", {}).profile, ...readRecord<BillingDetails>("motofix-owner-account", {}) }
    : readRecord<BillingDetails>("motofix-profile", {}))
  useEffect(() => {
    const previous = document.activeElement as HTMLElement
    const node = dialog.current
    node?.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { node?.close(); document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  const [step, setStep] = useState("details")
  const [outcome, setOutcome] = useState("Success")
  const [error, setError] = useState("")
  const [otp, setOtp] = useState("")
  const [consent, setConsent] = useState(false)
  const pay = useRef(onPay)
  pay.current = onPay
  const card = method === "Visa"
  const appliedTransactionFee = subscription ? 0 : Math.max(0, transactionFee)
  useEffect(() => {
    if (step !== "processing") return
    const timer = setTimeout(() => {
      if (outcome === "Failed") { setStep("failed"); return }
      if (!pay.current()) setStep("order-error")
    }, 1400)
    return () => clearTimeout(timer)
  }, [step, outcome])
  return createPortal(<dialog ref={dialog} className="payment-checkout-dialog" aria-label="MotoFix checkout" onCancel={(event) => { event.preventDefault(); if (step !== "processing") onCancel() }}><section className="payment-sim" aria-label="Simulated payment checkout">
    <div className="payment-demo-banner"><ShieldCheck size={17} /> MOTOFIX DEMO · No real payment · Not a PayMongo-hosted page</div>
    <div className="payment-layout">
      <aside className="payment-order">
        <button type="button" onClick={onCancel} disabled={step === "processing"}><ArrowLeft size={16} /> Cancel & return to MotoFix</button>
        <span className="payment-kicker">MOTOFIX CHECKOUT</span><h2>{shop}</h2><p>{item}</p><strong className="payment-amount">{pesos(amount)}</strong><p>Philippine peso · One-time payment</p>
        <dl><div><dt>{subscription ? "Subscription" : "Motor parts"}</dt><dd>{pesos(subscription ? amount : amount - appliedTransactionFee)}</dd></div>{!subscription && <div><dt>MotoFix transaction fee</dt><dd>{pesos(appliedTransactionFee)}</dd></div>}<div><dt>Total</dt><dd>{pesos(amount)}</dd></div></dl>
        {!subscription && appliedTransactionFee > 0 && <p>The ₱2 fee is for the MotoFix development team. This is a simulation; no funds are transferred.</p>}
        {!subscription && appliedTransactionFee === 0 && <p>Your active rider subscription waives the MotoFix transaction fee. This is a simulation; no funds are transferred.</p>}
      </aside>
      <div className="payment-surface">
        <ol className="payment-steps" aria-label="Payment progress">{["Details", "Authorize", "Result"].map((name, index) => <li key={name} aria-current={(step === "details" ? 0 : step === "authorize" ? 1 : 2) === index ? "step" : undefined}>{index + 1}. {name}</li>)}</ol>
        {step === "details" && <form onSubmit={(event) => { event.preventDefault(); setError(""); setStep("authorize") }}>
          <span className="payment-method">{card ? <CreditCard size={23} /> : <Smartphone size={23} />}{method}</span><h2>Payment details</h2><p>Review your account details and complete any missing billing information. Use only the displayed test {card ? "Visa card" : "payment"} and verification values; no real payment is processed.</p>
          <fieldset><legend>Billing information</legend>
            <label>Full name<input required autoComplete="off" defaultValue={account.name || ""} placeholder="Full name" /></label>
            <label>Email address<input required type="email" autoComplete="off" defaultValue={account.email || ""} placeholder="Email address" /></label>
            <label>Mobile number<input required type="tel" autoComplete="off" inputMode="numeric" defaultValue={account.phone || ""} placeholder="Mobile number" /></label>
            <label>Billing address<input required autoComplete="off" defaultValue={account.address || ""} placeholder="Billing address" /></label>
            <div className="payment-fields"><label>City<input required autoComplete="off" defaultValue={account.city || ""} placeholder="City" /></label><label>Postal code<input required autoComplete="off" inputMode="numeric" defaultValue={account.postalCode || ""} placeholder="Postal code" /></label></div>
            <label>Country<select aria-label="Billing country"><option>Philippines</option></select></label>
          </fieldset>
          {card && <fieldset><legend>Test Visa details</legend><p>Only the displayed test Visa values are accepted. These are not sent to a payment provider.</p><label>Cardholder name<input required autoComplete="off" defaultValue={account.name || ""} placeholder="Full name" /></label><label>Visa number<input required inputMode="numeric" autoComplete="off" placeholder="4242 4242 4242 4242" pattern="4242 ?4242 ?4242 ?4242" title="Use 4242 4242 4242 4242 only" /></label><div className="payment-fields"><label>Expiry (MM/YY)<input required autoComplete="off" placeholder="12/30" pattern="12/30" title="Use 12/30" /></label><label>Test CVC<input required autoComplete="off" type="password" inputMode="numeric" placeholder="123" pattern="123" maxLength={3} title="Use test CVC 123 only" /></label></div></fieldset>}
          <button type="button" className="payment-secondary" onClick={(event) => {
            const form = event.currentTarget.form!
            const values = [account.name, account.email, account.phone, account.address, account.city, account.postalCode, ...(card ? [account.name, "4242 4242 4242 4242", "12/30", "123"] : [])]
            form.querySelectorAll("input").forEach((input, index) => { if (values[index]) input.value = values[index]! })
          }}>Fill payment details</button>
          <label>Simulation outcome<select value={outcome} onChange={(event) => setOutcome(event.target.value)}><option>Success</option><option>Failed</option></select></label>
          <button className="payment-submit" type="submit">Continue to {card ? "Visa verification" : method}</button><p className="payment-footnote">Payment-form values stay in this screen only and are discarded when you leave. No real OTPs, PINs, or passwords are needed.</p>
        </form>}
        {step === "authorize" && <form onSubmit={(event) => { event.preventDefault(); if (otp !== "123456") { setError("Enter the displayed test code: 123456."); return } setError(""); setStep("processing") }}>
          <span className="payment-method">{card ? <ShieldCheck size={24} /> : <Smartphone size={24} />}{card ? "Visa verification" : `${method} · Demo authorization`}</span><h2>{card ? "Verify your test payment" : `Authorize with ${method}`}</h2><p>{card ? "This simulates an issuing bank’s 3-D Secure challenge." : "This simulates the wallet authorization step after leaving the merchant checkout. No real wallet page is opened."}</p>
          <div className="payment-test-note"><strong>Test account: 0917 ••• 4567</strong><p>Use demo verification code <b>123456</b>. Never enter a real OTP, wallet PIN, or password here.</p></div>
          <label>Demo verification code<input autoFocus required inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} placeholder="123456" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} /></label>
          <button className="payment-secondary" type="button" onClick={() => { setOtp("123456"); setError("") }}>Use test code 123456</button>
          <dl><div><dt>Merchant</dt><dd>MotoFix</dd></div><div><dt>{subscription ? "Subscription total" : appliedTransactionFee ? "Total including ₱2 fee" : "Total · fee waived"}</dt><dd>{pesos(amount)}</dd></div></dl>
          <label className="payment-consent"><input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I authorize this simulated payment. No money will be charged.</label>
          {error && <p role="alert">{error}</p>}<button className="payment-submit" type="submit" disabled={!consent}>Authorize demo payment · {pesos(amount)}</button><button type="button" onClick={() => { setStep("details"); setOtp(""); setConsent(false) }}>Back to payment details</button>
        </form>}
        {step === "processing" && <div className="payment-result" role="status" aria-live="polite"><div className="payment-spinner" /><h2>Processing demo payment</h2><p>Simulating authorization and returning to MotoFix…</p><p>No actual payment request is sent.</p></div>}
        {(step === "failed" || step === "order-error") && <div className="payment-result" role="alert"><CreditCard size={40} /><h2>{step === "failed" ? "Demo payment declined" : "Order could not be completed"}</h2><p>{step === "failed" ? "The simulated provider declined this attempt. No order was placed, stock deducted, or transaction fee charged." : "Stock, price, or browser storage changed. No order was completed and no real payment occurred. Return to checkout to review the message."}</p><button className="payment-submit" onClick={() => { setStep("details"); setOtp(""); setConsent(false) }}>Try again with test details</button><button onClick={onCancel}>Return to order review</button></div>}
      </div>
    </div>
  </section></dialog>, document.body)
}
