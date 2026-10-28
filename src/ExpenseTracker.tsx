import { useEffect, useState, type FormEvent } from "react"
import { Download, Pencil, Plus, Trash2, Wallet, X } from "lucide-react"
import "./expenses.css"

type Expense = { id: string; title: string; amount: number; date: string; category: string; motorcycle: string; payment: string; notes: string }
type Ledger = { expenses: Expense[]; budget: number }
const categories = ["Fuel", "Maintenance", "Repairs", "Parts & accessories", "Registration & insurance", "Parking & tolls", "Other"]
const money = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value)
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
const today = () => `${dateKey(new Date())}-${String(new Date().getDate()).padStart(2, "0")}`
const empty = (): Omit<Expense, "id"> => ({ title: "", amount: 0, date: today(), category: "Fuel", motorcycle: "", payment: "Cash", notes: "" })

export default function ExpenseTracker({ motorcycles }: { motorcycles: string[] }) {
  const [ledger, setLedger] = useState<Ledger>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("motofix-rider-expenses-v1") || "null")
      return saved && Array.isArray(saved.expenses) && typeof saved.budget === "number" ? saved : { expenses: [], budget: 0 }
    } catch { return { expenses: [], budget: 0 } }
  })
  const [storageError, setStorageError] = useState(false)
  useEffect(() => {
    try { localStorage.setItem("motofix-rider-expenses-v1", JSON.stringify(ledger)); setStorageError(false) }
    catch { setStorageError(true) }
  }, [ledger])
  const [month, setMonth] = useState(dateKey(new Date()))
  const [category, setCategory] = useState("All")
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState(empty)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const monthly = ledger.expenses.filter((item) => item.date.startsWith(month))
  const total = monthly.reduce((sum, item) => sum + item.amount, 0)
  const previous = new Date(`${month}-01T12:00:00`)
  previous.setMonth(previous.getMonth() - 1)
  const previousTotal = ledger.expenses.filter((item) => item.date.startsWith(dateKey(previous))).reduce((sum, item) => sum + item.amount, 0)
  const visible = monthly.filter((item) => (category === "All" || category === item.category) && `${item.title} ${item.motorcycle} ${item.notes}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date))
  const trend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(`${month}-01T12:00:00`)
    date.setMonth(date.getMonth() - 5 + index)
    const key = dateKey(date)
    return { key, label: date.toLocaleDateString("en-PH", { month: "short" }), total: ledger.expenses.filter((item) => item.date.startsWith(key)).reduce((sum, item) => sum + item.amount, 0) }
  })
  const max = Math.max(1, ...trend.map((item) => item.total))
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!Number.isFinite(draft.amount) || draft.amount <= 0) return
    const expense = { ...draft, title: draft.title.trim(), amount: Math.round(draft.amount * 100) / 100, id: editing || crypto.randomUUID() }
    if (!expense.title) return
    setLedger((current) => ({ ...current, expenses: editing ? current.expenses.map((item) => item.id === editing ? expense : item) : [expense, ...current.expenses] }))
    setFormOpen(false)
    setMessage(editing ? "Expense updated." : "Expense added.")
  }
  function exportCsv() {
    const rows = [["Date", "Description", "Category", "Motorcycle", "Amount (PHP)", "Payment", "Notes"], ...visible.map((item) => [item.date, item.title, item.category, item.motorcycle, String(item.amount), item.payment, item.notes])]
    const csv = rows.map((row) => row.map((value) => `"${value.replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`).join(",")).join("\r\n")
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }))
    const link = document.createElement("a"); link.href = url; link.download = `MotoFix-expenses-${month}.csv`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage("Filtered expenses exported.")
  }
  return <section className="expense-tracker">
    <div className="expense-heading"><div><span className="expense-eyebrow">KNOW YOUR RUNNING COSTS</span><h2>Your ride, by the numbers.</h2><p>Track what you spend and plan the road ahead.</p></div><button className="expense-primary" onClick={() => { setDraft({ ...empty(), motorcycle: motorcycles[0] || "" }); setEditing(null); setFormOpen(true) }}><Plus size={18} /> Add expense</button></div>
    <p className="expense-local"><Wallet size={16} /> Personal records saved in this browser only. Bookings are not automatically charged or imported.</p>
    {storageError && <p role="alert">Browser storage is unavailable. Your changes will not survive a reload.</p>}
    <div className="expense-toolbar"><label>Viewing month<input aria-label="Viewing month" type="month" value={month} required onChange={(event) => { if (/^\d{4}-\d{2}$/.test(event.target.value)) setMonth(event.target.value) }} /></label><button disabled={!visible.length} onClick={exportCsv}><Download size={16} /> Export CSV</button></div>
    <div className="expense-stats">
      <article className="expense-card"><span>Monthly expenses</span><strong>{money(total)}</strong><small>{monthly.length} recorded transaction{monthly.length === 1 ? "" : "s"}</small></article>
      <article className="expense-card"><span>Compared with last month</span><strong>{previousTotal ? `${total > previousTotal ? "+" : ""}${((total - previousTotal) / previousTotal * 100).toFixed(1)}%` : "—"}</strong><small>Previous month: {money(previousTotal)}</small></article>
      <article className="expense-card"><span>{ledger.budget && total > ledger.budget ? "Over monthly budget" : "Budget remaining"}</span><strong>{ledger.budget ? money(Math.abs(ledger.budget - total)) : "Not set"}</strong><small>{ledger.budget ? `Monthly limit: ${money(ledger.budget)}` : "Set a monthly spending goal below"}</small></article>
    </div>
    <div className="expense-charts">
      <article className="expense-card"><h3>Expense trend</h3><p>Six months ending in the selected month · PHP</p><div className="expense-chart" role="img" aria-label={trend.map((item) => `${item.key}: ${money(item.total)}`).join("; ")}>
        {trend.map((item) => <div className="expense-bar-column" key={item.key}><small>{money(item.total)}</small><div className="expense-bar-track"><div className="expense-bar" style={{ height: `${item.total / max * 100}%` }} /></div><span>{item.label}</span></div>)}
      </div>{!trend.some((item) => item.total) && <p>Add your first expense to start building your chart.</p>}</article>
      <article className="expense-card"><h3>Spending breakdown</h3><p>By category · selected month</p><div className="expense-breakdown">{categories.map((name) => {
        const amount = monthly.filter((item) => item.category === name).reduce((sum, item) => sum + item.amount, 0)
        return <div key={name}><div><span>{name}</span><b>{money(amount)}</b></div><progress aria-label={`${name} share of spending`} max={total || 1} value={amount} /></div>
      })}</div></article>
    </div>
    <article className="expense-card"><div className="expense-heading"><div><h3>Monthly budget</h3><p>One recurring monthly goal. Change it anytime; enter 0 to remove it.</p></div><form className="expense-budget" onSubmit={(event) => {
      event.preventDefault()
      const value = Number(new FormData(event.currentTarget).get("budget"))
      if (Number.isFinite(value) && value >= 0) { setLedger((current) => ({ ...current, budget: value })); setMessage("Monthly budget updated.") }
    }}><label>Budget (PHP)<input key={ledger.budget} name="budget" type="number" min="0" max="100000000" step="0.01" defaultValue={ledger.budget} required /></label><button type="submit">Save budget</button></form></div>{ledger.budget > 0 && <progress aria-label="Monthly budget used" max={ledger.budget} value={total} />}</article>
    {formOpen && <article className="expense-card expense-form-card"><div className="expense-heading"><h3>{editing ? "Edit expense" : "New expense"}</h3><button aria-label="Close expense form" onClick={() => setFormOpen(false)}><X size={18} /></button></div><form onSubmit={save} className="expense-form">
      <label>Description<input autoFocus required maxLength={100} value={draft.title} placeholder="e.g. Fuel refill" onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label>Amount (PHP)<input type="number" min="0.01" max="100000000" step="0.01" required value={draft.amount || ""} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} /></label>
      <label>Date<input type="date" required max={today()} value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
      <label>Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{categories.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>Motorcycle<select value={draft.motorcycle} onChange={(event) => setDraft({ ...draft, motorcycle: event.target.value })}><option value="">General / other motorcycle</option>{Array.from(new Set([...motorcycles, draft.motorcycle].filter(Boolean))).map((bike) => <option key={bike}>{bike}</option>)}</select></label>
      <label>Payment method<select value={draft.payment} onChange={(event) => setDraft({ ...draft, payment: event.target.value })}>{["Cash", "GCash", "Maya", "MariBank", "PayPal", "Visa", "Bank transfer", "Other"].map((method) => <option key={method}>{method}</option>)}</select></label>
      <label className="expense-full">Notes (optional)<textarea maxLength={500} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Shop, receipt reference, or other details" /></label>
      <div className="expense-actions expense-full"><button type="submit" className="expense-primary">Save expense</button><button type="button" onClick={() => setFormOpen(false)}>Cancel</button></div>
    </form></article>}
    <article className="expense-card"><div className="expense-heading"><div><h3>Expense history</h3><p>{visible.length} results · {money(visible.reduce((sum, item) => sum + item.amount, 0))}</p></div><div className="expense-filters"><label>Search<input type="search" placeholder="Description or motorcycle" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>All</option>{categories.map((name) => <option key={name}>{name}</option>)}</select></label></div></div>
      {!visible.length ? <div className="expense-empty"><Wallet size={32} /><h3>No expenses found</h3><p>{monthly.length ? "Try a different search or category." : "Add an expense or select another month to see your spending."}</p></div> : <ul className="expense-list">{visible.map((item) => <li key={item.id}><div className="expense-entry"><strong>{item.title}</strong><span>{new Date(`${item.date}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} · {item.category} · {item.payment}</span>{item.motorcycle && <small>{item.motorcycle}</small>}{item.notes && <p>{item.notes}</p>}</div><b>{money(item.amount)}</b><div className="expense-actions"><button aria-label={`Edit ${item.title}`} onClick={() => { setDraft(item); setEditing(item.id); setFormOpen(true) }}><Pencil size={16} /></button><button aria-label={`Delete ${item.title}`} onClick={() => setDeleting(item.id)}><Trash2 size={16} /></button></div>{deleting === item.id && <div className="expense-delete"><span>Delete this expense permanently?</span><button onClick={() => { setLedger((current) => ({ ...current, expenses: current.expenses.filter((expense) => expense.id !== item.id) })); setDeleting(null); setMessage("Expense deleted.") }}>Delete expense</button><button onClick={() => setDeleting(null)}>Keep expense</button></div>}</li>)}</ul>}
    </article>
    <p role="status" className="expense-status">{message}</p>
  </section>
}
