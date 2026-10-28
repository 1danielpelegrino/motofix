import { useState } from "react"
import { CheckCheck, Package, Store } from "lucide-react"
import { pesos, readCatalog, readOrders, useCommerce, writeOrders, type PartsOrder, type SalePart } from "./partsCommerce"
import "./commerce.css"
import PaymentSimulation from "./PaymentSimulation"
import { supportedPaymentMethods } from "./Subscription"

export default function PartsMarketplace({ customer, phone, initialSearch = "", subscriptionActive = false }: { customer: string; phone: string; initialSearch?: string; subscriptionActive?: boolean }) {
  const orders = useCommerce()
  const catalog = readCatalog()
  const [tab, setTab] = useState("Shop parts")
  const [search, setSearch] = useState(initialSearch)
  const [category, setCategory] = useState("All")
  const [selected, setSelected] = useState<SalePart | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [payment, setPayment] = useState("GCash")
  const [confirmed, setConfirmed] = useState(false)
  const [receipt, setReceipt] = useState<PartsOrder | null>(null)
  const [error, setError] = useState("")
  const [paymentOpen, setPaymentOpen] = useState(false)
  const mine = orders.filter((order) => order.customer === customer)
  const onlinePayment = payment !== "Pay at shop"
  const fee = payment === "Pay at shop" || subscriptionActive ? 0 : 2
  function purchase() {
    setError("")
    const current = readCatalog().parts.find((part) => part.id === selected?.id)
    if (!current || !Number.isInteger(quantity) || quantity < 1 || quantity > current.quantity) { setError("Stock has changed. Choose an available quantity."); return false }
    if (current.price !== selected?.price) { setError("The shop updated this price. Return to parts and review the new price before checkout."); return false }
    const subtotal = Math.round(current.price * quantity * 100) / 100
    const order: PartsOrder = { id: `MP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, partId: current.id, name: current.name, quantity, unitPrice: current.price, subtotal, fee, total: subtotal + fee, customer, phone, shop: catalog.shop, payment, status: "New", created: new Date().toISOString() }
    try { writeOrders([order, ...readOrders()]); setReceipt(order); setSelected(null); setPaymentOpen(false); return true }
    catch { setError("Browser storage is unavailable. Your order was not saved. Please try again."); return false }
  }
  if (paymentOpen && selected) return <div className="commerce"><PaymentSimulation method={payment} amount={Math.round(selected.price * quantity * 100) / 100 + fee} transactionFee={fee} shop={catalog.shop} item={`${quantity} × ${selected.name}`} onCancel={() => { setPaymentOpen(false); setError("Payment was cancelled or left incomplete. No order or fee was created.") }} onPay={purchase} /></div>
  return <div className="commerce">
    <div className="commerce-tabs">{["Shop parts", "My purchases"].map((name) => <button key={name} aria-pressed={tab === name} onClick={() => { setTab(name); setSelected(null); setReceipt(null) }}>{name}{name === "My purchases" ? ` (${mine.length})` : ""}</button>)}</div>
    {receipt && <section className="commerce-card commerce-receipt" role="status"><CheckCheck size={32} /><h3>Demo order placed</h3><p>{receipt.id} · {receipt.payment === "Pay at shop" ? "Payment due at pickup" : "Simulated payment successful"}</p><p>{receipt.quantity} × {receipt.name}</p><dl><div><dt>Shop earnings</dt><dd>{pesos(receipt.subtotal)}</dd></div><div><dt>MotoFix development-team fee</dt><dd>{pesos(receipt.fee)}</dd></div><div><dt>{receipt.fee ? "Demo total paid" : "Due at shop"}</dt><dd>{pesos(receipt.total)}</dd></div></dl><p>Pickup at {receipt.shop}. Wait until the shop marks your order ready.</p><button onClick={() => { setTab("My purchases"); setReceipt(null) }}>View my purchases</button></section>}
    {tab === "Shop parts" && !selected && <><div className="commerce-filters"><label>Find motor parts<input type="search" placeholder="Search part, brand, or motorcycle" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{["All", ...new Set(catalog.parts.map((part) => part.category))].map((name) => <option key={name}>{name}</option>)}</select></label></div>
      <p className="commerce-shop"><Store size={17} /> {catalog.shop} · Pickup only</p>
      <div className="commerce-products">
        {catalog.parts
          .filter(
            (part) =>
              (category === "All" || category === part.category) &&
              `${part.name} ${part.brand} ${part.compatibility}`
                .toLowerCase()
                .includes(search.toLowerCase()),
          )
          .map((part) => (
            <article className="commerce-card" key={part.id}>
              <div className="commerce-product-art">
                {part.photo ? (
                  <img src={part.photo} alt={part.name} />
                ) : (
                  <Package size={48} strokeWidth={1.3} />
                )}
              </div>
              <div className="commerce-product-details">
                <span className="commerce-eyebrow">
                  {part.brand} · {part.category}
                </span>
                <h3>{part.name}</h3>
                <p>{part.compatibility}</p>
                <p>{part.description}</p>
                <div className="commerce-row">
                  <strong>{pesos(part.price)}</strong>
                  <small>
                    {part.quantity
                      ? `${part.quantity} available`
                      : "Out of stock"}
                  </small>
                </div>
              </div>
              <button
                className="commerce-primary"
                disabled={part.quantity < 1 || part.price <= 0}
                onClick={() => {
                  setSelected(part)
                  setQuantity(1)
                  setConfirmed(false)
                  setError("")
                  setReceipt(null)
                }}
              >
                Buy motor part
              </button>
            </article>
          ))}
      </div>
      {!catalog.parts.some((part) => (category === "All" || category === part.category) && `${part.name} ${part.brand} ${part.compatibility}`.toLowerCase().includes(search.toLowerCase())) && <div className="commerce-card"><h3>No matching parts</h3><p>Try a different search or category.</p></div>}
    </>}
    {selected && <section className="commerce-card"><div className="commerce-row"><h3>Review & checkout</h3><button onClick={() => setSelected(null)}>Back to parts</button></div><p>{selected.name} · {pesos(selected.price)} each</p><div className="commerce-checkout"><div><label>Quantity<input type="number" min="1" max={selected.quantity} step="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label><label>Payment method<select value={payment} onChange={(event) => { setPayment(event.target.value); setConfirmed(false) }}>{[...supportedPaymentMethods, "Pay at shop"].map((name) => <option key={name}>{name}</option>)}</select></label><h3>Pickup details</h3><p>{customer} · {phone}</p><p>{catalog.shop}<br />{catalog.address}</p></div><div className="commerce-summary"><h3>Order summary</h3><dl><div><dt>Parts subtotal</dt><dd>{pesos(selected.price * quantity || 0)}</dd></div><div><dt>MotoFix transaction fee{subscriptionActive && fee === 0 ? " · waived by subscription" : ""}</dt><dd>{pesos(fee)}</dd></div><div><dt>Total{payment === "Pay at shop" ? " due at pickup" : " to pay"}</dt><dd>{pesos(selected.price * quantity + fee || 0)}</dd></div></dl><p>{payment === "Pay at shop" ? "No MotoFix online transaction fee for pay-at-shop orders." : subscriptionActive ? "Your active rider subscription waives the ₱2 MotoFix transaction fee on motorcycle-part purchases." : "₱2 per successful online order goes to the MotoFix development team. The shop receives the parts subtotal; no fee is deducted from it."}</p><label className="commerce-consent"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I reviewed the item compatibility, pickup details, total, and fee.</label><button className="commerce-primary" disabled={!confirmed || !Number.isInteger(quantity) || quantity < 1 || quantity > selected.quantity} onClick={() => { if (onlinePayment) { setError(""); setPaymentOpen(true) } else purchase() }}>{onlinePayment ? `Continue to payment · ${pesos(selected.price * quantity + fee || 0)}` : "Place demo pickup order"}</button>{error && <p role="alert">{error}</p>}</div></div></section>}
    {tab === "My purchases" && <><h3>Your parts orders</h3>{!mine.length && <div className="commerce-card"><Package size={32} /><h3>No purchases yet</h3><p>Your receipts and pickup updates will appear here.</p></div>}{mine.map((order) => <article className="commerce-card" key={order.id}><div className="commerce-row"><h3>{order.name}</h3><span className="commerce-badge">{order.status}</span></div><p>{order.id} · {new Date(order.created).toLocaleString()} · {order.shop}</p><p>{order.quantity} × {pesos(order.unitPrice)} · {order.payment} · {order.payment === "Pay at shop" && order.status !== "Collected" ? "Due at pickup" : "Demo paid"}</p><dl><div><dt>Parts subtotal</dt><dd>{pesos(order.subtotal)}</dd></div><div><dt>MotoFix fee</dt><dd>{pesos(order.fee)}</dd></div><div><dt>Total</dt><dd>{pesos(order.total)}</dd></div></dl><p>{order.status === "Ready for pickup" ? "Your shop has marked this order ready. Bring your order reference to pickup." : order.status === "Collected" ? "Pickup completed. Thank you for riding with MotoFix." : "Awaiting shop preparation. Check back for pickup updates."}</p></article>)}</>}
  </div>
}
