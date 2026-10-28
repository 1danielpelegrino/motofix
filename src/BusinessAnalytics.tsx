import { useState, type ReactNode } from "react"
import { TrendingUp, Users, CalendarDays, Wrench, Download } from "lucide-react"
import "./analytics.css"
import RevenueChart from "./RevenueChart"

type AnalyticsData = {
  bookings: { id: string; customer: string; service: string; date: string; time: string; cost: number; status: string }[]
  repairs: { booking: string; cost: number; status: string }[]
  mechanics: { id: string; name: string; status: string }[]
  tasks: { mechanic: string; status: string }[]
  parts: { name: string; quantity: number; price: number }[]
}
const money = (value: number) => `₱${value.toLocaleString()}`

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="so-card analytics-panel"><h2>{title}</h2>{children}</section>
}

function Bars({ rows, currency = false }: { rows: [string, number][]; currency?: boolean }) {
  const max = Math.max(1, ...rows.map(([, value]) => value))
  return rows.length ? <div className="analytics-bars">{rows.map(([label, value]) => (
    <div key={label}>
      <div className="analytics-bar-label"><span>{label}</span><strong>{currency ? money(value) : value}</strong></div>
      <progress aria-label={label} value={value} max={max} />
    </div>
  ))}</div> : <p className="so-muted">No records for this period.</p>
}

export default function BusinessAnalytics({ data }: { data: AnalyticsData }) {
  const [period, setPeriod] = useState("all")
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - Number(period))
  const bookings = data.bookings.filter((b) => period === "all" || (b.date >= cutoff.toISOString().slice(0, 10) && b.date <= now.toISOString().slice(0, 10)))
  const completed = bookings.filter((b) => b.status === "Completed")
  // Use the repair total when linked; never count both booking and repair amounts.
  const amount = (booking: AnalyticsData["bookings"][number]) =>
    data.repairs.find((r) => r.booking === booking.id && r.status === "Completed")?.cost ?? booking.cost
  const revenue = completed.reduce((total, b) => total + amount(b), 0)
  const cancelled = bookings.filter((b) => b.status === "Cancelled").length
  const grouped = (items: typeof bookings, key: (b: typeof bookings[number]) => string, value = (_b: typeof bookings[number]) => 1): [string, number][] => {
    const result = new Map<string, number>()
    items.forEach((b) => result.set(key(b), (result.get(key(b)) || 0) + value(b)))
    return [...result]
  }
  const months = grouped(completed, (b) => b.date.slice(0, 7), amount).sort(([a], [b]) => a.localeCompare(b))
  const services = grouped(bookings.filter((b) => b.status !== "Cancelled"), (b) => b.service).sort((a, b) => b[1] - a[1])
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const patterns = weekdays.map((day, index): [string, number] => [day, bookings.filter((b) => new Date(`${b.date}T12:00:00`).getDay() === index).length])
  const customerCounts = grouped(bookings, (b) => b.customer)
  const repeatCustomers = customerCounts.filter(([, count]) => count > 1).length
  const lowStock = data.parts.filter((p) => p.quantity <= 5)
  const exportReport = () => {
    const rows = [["Metric", "Value"], ["Period", period === "all" ? "All time" : `Last ${period} days`], ["Estimated completed revenue", revenue], ["Bookings", bookings.length], ["Completed bookings", completed.length], ["Cancelled bookings", cancelled], ["Customers", customerCounts.length], ...months.map(([month, total]) => [`Revenue ${month}`, total]), ...services.map(([service, count]) => [`Service: ${service}`, count])]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n")
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "motofix-business-analytics.csv"
    link.click()
    URL.revokeObjectURL(url)
  }
  return <div className="analytics-page">
    <div className="analytics-toolbar">
      <div><span className="analytics-eyebrow">SHOP PERFORMANCE</span><h2>Turn activity into insight.</h2></div>
      <label>Reporting period<select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="all">All time</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
      <button className="so-button" onClick={exportReport}><Download size={17} />Export summary</button>
    </div>
    <p className="analytics-note">Based on locally saved demo records. Revenue is an estimate from completed bookings and linked completed repairs, not verified payments. Revenue uses booking dates; costs, profit, and payment collection are not tracked.</p>
    <div className="analytics-kpis">
      {[
        [TrendingUp, "Estimated revenue", money(revenue)],
        [CalendarDays, "Total bookings", bookings.length],
        [Wrench, "Completion rate", `${bookings.length ? Math.round(completed.length / bookings.length * 100) : 0}%`],
        [Users, "Customers", customerCounts.length],
      ].map(([Icon, label, value]) => {
        const Graphic = Icon as typeof TrendingUp
        return <div className="so-card analytics-kpi" key={String(label)}><Graphic size={23} /><span>{String(label)}</span><strong>{String(value)}</strong></div>
      })}
    </div>
    <div className="analytics-grid">
      <Panel title="Revenue Trends"><p className="so-muted">Estimated completed revenue by booking month.</p><RevenueChart rows={months} /></Panel>
      <Panel title="Popular Services"><p className="so-muted">Ranked by non-cancelled bookings in the selected period.</p><Bars rows={services} /></Panel>
      <Panel title="Booking Patterns"><p className="so-muted">Booking volume by scheduled day, including cancellations.</p><Bars rows={patterns} /></Panel>
      <Panel title="Booking Status"><Bars rows={grouped(bookings, (b) => b.status)} /><p className="so-muted">Cancellation rate: {bookings.length ? Math.round(cancelled / bookings.length * 100) : 0}% · Average completed booking: {money(completed.length ? Math.round(revenue / completed.length) : 0)}</p></Panel>
      <Panel title="Mechanic Workload Reports">
        <p className="so-muted">Current all-time workload, independent of the reporting period.</p>
        <div className="analytics-table-wrap"><table><thead><tr><th>Mechanic</th><th>Active tasks</th><th>Completed</th><th>Status</th></tr></thead><tbody>
          {data.mechanics.map((m) => <tr key={m.id}><th scope="row">{m.name}</th><td>{data.tasks.filter((t) => t.mechanic === m.id && !["Completed", "Cancelled"].includes(t.status)).length}</td><td>{data.tasks.filter((t) => t.mechanic === m.id && t.status === "Completed").length}</td><td>{m.status}</td></tr>)}
        </tbody></table></div>
        {!data.mechanics.length && <p className="so-muted">No mechanics added yet.</p>}
        <p className="so-muted">Unassigned active tasks: {data.tasks.filter((t) => !data.mechanics.some((m) => m.id === t.mechanic) && !["Completed", "Cancelled"].includes(t.status)).length}</p>
      </Panel>
      <Panel title="Customer Insights"><Bars rows={[["One-booking customers", customerCounts.length - repeatCustomers], ["Repeat customers", repeatCustomers]]} /><p className="so-muted">Repeat customers have two or more bookings in the selected period. Customers are identified by their recorded name.</p></Panel>
      <Panel title="Inventory Health"><p className="so-muted">Current stock snapshot, independent of the reporting period.</p><div className="analytics-bar-label"><span>Stock value at listed selling price</span><strong>{money(data.parts.reduce((total, p) => total + p.price * p.quantity, 0))}</strong></div><Bars rows={lowStock.map((p, i) => [`${p.name} (${i + 1})`, p.quantity])} /><p className="so-muted">{lowStock.length} parts at or below 5 units. {lowStock.length === 0 ? "No low-stock alerts." : "Review stock before accepting parts-dependent work."}</p></Panel>
      <Panel title="Business Summary"><ul className="analytics-summary">
        <li>{services.length ? `${services[0][0]} is the most booked service (${services[0][1]} bookings).` : "Service trends will appear once bookings are recorded."}</li>
        <li>{bookings.length ? `${[...patterns].sort((a, b) => b[1] - a[1])[0][0]} has the highest scheduled booking volume.` : "Add bookings to identify your busiest days."}</li>
        <li>{bookings.filter((b) => b.status === "Pending").length} pending bookings in this period.</li>
        <li>Use workload and stock reports together before assigning new work.</li>
      </ul></Panel>
    </div>
  </div>
}
