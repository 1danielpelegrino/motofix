import { pesos, readOrders, useCommerce, writeOrders, type PartsOrder } from "./partsCommerce"
import { useState } from "react"
import "./commerce.css"

export default function PartsSales() {
  const orders = useCommerce()
  const [filter, setFilter] = useState("All")
  const [error, setError] = useState("")
  function advance(order: PartsOrder) {
    try { writeOrders(readOrders().map((item) => item.id === order.id ? { ...item, status: order.status === "New" ? "Ready for pickup" : "Collected" } : item)); setError("") }
    catch { setError("Could not save the order update. Please retry.") }
  }
  return <section className="commerce commerce-sales">
    {orders.length > 0 && <div className="commerce-row"><h3>Customer parts orders</h3><label>Order status<select value={filter} onChange={(event) => setFilter(event.target.value)}>{["All", "New", "Ready for pickup", "Collected"].map((name) => <option key={name}>{name}</option>)}</select></label></div>}
    {error && <p role="alert">{error}</p>}
    {orders.filter((order) => filter === "All" || order.status === filter).map((order) => <article className="commerce-card" key={order.id}><div className="commerce-row"><h3>{order.quantity} × {order.name}</h3><span className="commerce-badge">{order.status}</span></div><p>{order.id} · {new Date(order.created).toLocaleString()}</p><p>{order.customer} · {order.phone}</p><dl><div><dt>Shop proceeds</dt><dd>{pesos(order.subtotal)}</dd></div><div><dt>MotoFix fee (not shop revenue)</dt><dd>{pesos(order.fee)}</dd></div><div><dt>Customer total</dt><dd>{pesos(order.total)}</dd></div></dl><p>{order.payment} · {order.payment === "Pay at shop" && order.status !== "Collected" ? "Collect payment at pickup" : "Demo payment recorded"} · Stock reserved at order placement</p>{order.status !== "Collected" && <button className="commerce-primary" onClick={() => advance(order)}>{order.status === "New" ? "Mark ready for pickup" : order.payment === "Pay at shop" ? "Confirm cash received & collected" : "Confirm collected"}</button>}</article>)}
  </section>
}
