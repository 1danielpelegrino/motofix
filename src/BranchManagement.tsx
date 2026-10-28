import { useEffect, useState } from "react"
import { Building2, MapPin, Plus, Pencil, Archive, ArrowRightLeft } from "lucide-react"
import "./branches.css"
import DemoMap from "./DemoMap"

type Branch = { id: string; name: string; address: string; phone: string; manager: string; hours: string; status: string; services: string; notes: string }
type BranchState = { branches: Branch[]; assignments: Record<string, string>; transfers: { id: string; part: string; from: string; to: string; quantity: number; date: string }[] }
type ShopData = {
  profile: { name: string; address: string; phone: string; hours: string }
  mechanics: { id: string; name: string; status: string }[]
  parts: { id: string; name: string; quantity: number; price: number }[]
  bookings: { status: string; cost: number }[]
  services: { name: string }[]
}
const storageKey = "motofix-branches-demo-v1"
export default function BranchManagement({ data }: { data: ShopData }) {
  const [state, setState] = useState<BranchState>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null")
      if (saved && Array.isArray(saved.branches) && saved.assignments && Array.isArray(saved.transfers)) return saved
    } catch { /* Start with the existing shop when storage cannot be read. */ }
    return { branches: [{ id: "main", ...data.profile, manager: "", status: "Active", services: data.services.map((s) => s.name).join(", "), notes: "Original shop. Existing bookings and financial records belong to this location." }], assignments: {}, transfers: [] }
  })
  const [selected, setSelected] = useState("main")
  const [editing, setEditing] = useState<Branch | "new" | null>(null)
  const [query, setQuery] = useState("")
  const [notice, setNotice] = useState("")
  const [tab, setTab] = useState("Overview")
  const [mapSelection, setMapSelection] = useState("motohub")
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)) }
    catch { setNotice("Storage is unavailable. Branch changes are kept for this session only.") }
  }, [state])
  const branch = state.branches.find((b) => b.id === selected) ?? state.branches[0]
  const branchName = (id: string) => state.branches.find((b) => b.id === id)?.name || id
  const staff = (id: string) => data.mechanics.filter((m) => (state.assignments[m.id] || "main") === id)
  const stock = (branchId: string, partId: string) => {
    const original = branchId === "main" ? data.parts.find((p) => p.id === partId)?.quantity || 0 : 0
    return state.transfers.filter((t) => t.part === partId).reduce((total, t) => total + (t.to === branchId ? t.quantity : 0) - (t.from === branchId ? t.quantity : 0), original)
  }
  const active = state.branches.filter((b) => b.status === "Active")
  return <div className="branch-page">
    <div className="branch-heading"><div><span className="branch-eyebrow">YOUR SHOP NETWORK</span><h2>One business. Every location.</h2><p className="so-muted">Keep branch information, staffing, and stock organized.</p></div><button className="so-button so-primary" onClick={() => setEditing("new")}><Plus size={18} />Add Branch</button></div>
    {notice && <p role="status" className="branch-notice">{notice}</p>}
    <div className="branch-stats">{[["Total branches", state.branches.length], ["Active branches", active.length], ["Mechanics", data.mechanics.length], ["Stock transfers", state.transfers.length]].map(([label, value]) => <div className="so-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    {editing !== null && <section className="so-card branch-editor"><h2>{editing === "new" ? "Add a branch" : "Edit branch"}</h2><form key={editing === "new" ? "new" : editing.id} onSubmit={(event) => {
      event.preventDefault()
      const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>
      if (!values.name.trim() || !values.address.trim()) { setNotice("Enter a branch name and address."); return }
      if (state.branches.some((b) => b.name.trim().toLowerCase() === values.name.trim().toLowerCase() && (editing === "new" || b.id !== editing.id))) { setNotice("A branch with this name already exists."); return }
      const record: Branch = { id: editing === "new" ? crypto.randomUUID() : editing.id, name: values.name.trim(), address: values.address.trim(), phone: values.phone, manager: values.manager, hours: values.hours, status: values.status, services: values.services, notes: values.notes }
      setState((s) => ({ ...s, branches: editing === "new" ? [...s.branches, record] : s.branches.map((b) => b.id === record.id ? record : b) }))
      setSelected(record.id); setEditing(null); setNotice("Branch saved.")
    }}>
      {([["name", "Branch name"], ["address", "Address"], ["phone", "Contact number"], ["manager", "Branch manager"], ["hours", "Operating hours"], ["services", "Services offered"], ["notes", "Branch notes"]] as const).map(([key, label]) => <label key={key}>{label}<input name={key} required={key === "name" || key === "address"} type={key === "phone" ? "tel" : "text"} defaultValue={editing === "new" ? "" : editing[key]} /></label>)}
      <label>Operating status<select name="status" defaultValue={editing === "new" ? "Active" : editing.status}><option>Active</option><option>Temporarily Closed</option><option>Archived</option></select></label>
      <div className="branch-actions"><button className="so-button so-primary" type="submit">Save Branch</button><button className="so-button" type="button" onClick={() => setEditing(null)}>Cancel</button></div>
    </form></section>}
    <label className="branch-search">Find a branch<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or address" /></label>
    <div className="branch-cards">{state.branches.filter((b) => `${b.name} ${b.address}`.toLowerCase().includes(query.toLowerCase())).map((b) => <button key={b.id} className={`so-card branch-location ${branch.id === b.id ? "selected" : ""}`} onClick={() => { setSelected(b.id); setTab("Overview") }} aria-pressed={branch.id === b.id}><Building2 size={24} /><strong>{b.name}</strong><span className="branch-status">{b.status}</span><span><MapPin size={14} />{b.address}</span><small>{staff(b.id).length} mechanics · {b.manager || "Manager not set"}</small></button>)}</div>
    {!state.branches.some((b) => `${b.name} ${b.address}`.toLowerCase().includes(query.toLowerCase())) && <p className="so-muted">No branches match your search.</p>}
    <section aria-labelledby="branch-map-title">
      <h2 id="branch-map-title">Demo Location Map</h2>
      <DemoMap
        explorable
        showHelpText={false}
        selected={mapSelection}
        onSelect={setMapSelection}
        shops={[{ id: "motohub", name: state.branches.find((b) => b.id === "main")?.name || data.profile.name }]}
      />
    </section>
    <section className="so-card branch-detail">
      <div className="branch-heading"><div><h2>{branch.name}</h2><p className="so-muted">{branch.status} · Branch workspace</p></div><div className="branch-actions"><button className="so-button" onClick={() => setEditing(branch)}><Pencil size={16} />Edit</button>{branch.id !== "main" && branch.status !== "Archived" && <button className="so-button" onClick={() => {
        if (staff(branch.id).length || data.parts.some((p) => stock(branch.id, p.id) > 0)) { setNotice("Reassign staff and transfer remaining stock before archiving this branch."); return }
        if (window.confirm(`Archive ${branch.name}? Its records will be retained.`)) { setState((s) => ({ ...s, branches: s.branches.map((b) => b.id === branch.id ? { ...b, status: "Archived" } : b) })); setNotice("Branch archived.") }
      }}><Archive size={16} />Archive</button>}</div></div>
      <div className="branch-tabs" role="group" aria-label="Branch sections">{["Overview", "Staff", "Inventory", "Performance"].map((item) => <button className="so-button" key={item} aria-pressed={tab === item} onClick={() => setTab(item)}>{item}</button>)}</div>
      {tab === "Overview" && <dl className="branch-info">{[["Address", branch.address], ["Contact", branch.phone], ["Manager", branch.manager], ["Operating hours", branch.hours], ["Services", branch.services], ["Notes", branch.notes]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not set"}</dd></div>)}</dl>}
      {tab === "Staff" && <><p className="so-muted">Allocate mechanics to a branch. Existing tasks and account permissions are not changed.</p><div className="branch-table"><table><thead><tr><th>Mechanic</th><th>Status</th><th>Branch allocation</th></tr></thead><tbody>{data.mechanics.map((m) => <tr key={m.id}><th scope="row">{m.name}</th><td>{m.status}</td><td><select aria-label={`Branch for ${m.name}`} value={state.assignments[m.id] || "main"} onChange={(e) => { setState((s) => ({ ...s, assignments: { ...s.assignments, [m.id]: e.target.value } })); setNotice("Staff allocation updated.") }}>{state.branches.filter((b) => b.status !== "Archived" || b.id === state.assignments[m.id]).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></td></tr>)}</tbody></table></div>{!data.mechanics.length && <p>No mechanics added yet.</p>}</>}
      {tab === "Inventory" && <><p className="so-muted">Branch stock is a planning allocation of the current Motor Parts quantities. Transfers below are recorded locally.</p><div className="branch-table"><table><thead><tr><th>Part</th><th>Allocated units</th><th>Stock status</th></tr></thead><tbody>{data.parts.map((p) => <tr key={p.id}><th scope="row">{p.name}</th><td>{stock(branch.id, p.id)}</td><td>{stock(branch.id, p.id) <= 0 ? "Out of stock" : stock(branch.id, p.id) <= 5 ? "Low stock" : "In stock"}</td></tr>)}</tbody></table></div>
        <h3 className="branch-subheading"><ArrowRightLeft size={18} />Record a stock transfer</h3>
        {active.length < 2 ? <p className="so-muted">Add at least two active branches to transfer stock.</p> : <form className="branch-transfer" onSubmit={(e) => {
          e.preventDefault()
          const v = Object.fromEntries(new FormData(e.currentTarget))
          const quantity = Number(v.quantity)
          if (v.from === v.to || !Number.isInteger(quantity) || quantity < 1 || quantity > stock(String(v.from), String(v.part))) { setNotice("Choose different branches and a quantity within the available source stock."); return }
          setState((s) => ({ ...s, transfers: [{ id: crypto.randomUUID(), part: String(v.part), from: String(v.from), to: String(v.to), quantity, date: new Date().toISOString() }, ...s.transfers] })); setNotice("Stock transfer recorded.")
        }}><label>Part<select name="part" required>{data.parts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>From<select name="from">{active.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>To<select name="to" defaultValue={active[1].id}>{active.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>Quantity<input name="quantity" type="number" min="1" step="1" required /></label><button className="so-button so-primary" disabled={!data.parts.length}>Record Transfer</button></form>}
        <h3 className="branch-subheading">Transfer history</h3>{state.transfers.filter((t) => t.from === branch.id || t.to === branch.id).map((t) => <div className="branch-history" key={t.id}><strong>{data.parts.find((p) => p.id === t.part)?.name || "Removed part"} · {t.quantity} units</strong><span>{branchName(t.from)} → {branchName(t.to)}</span><small>{new Date(t.date).toLocaleString()}</small></div>)}{!state.transfers.some((t) => t.from === branch.id || t.to === branch.id) && <p className="so-muted">No transfers recorded for this branch.</p>}
      </>}
      {tab === "Performance" && <><p className="so-muted">Existing booking records belong to the original shop. New branches do not yet have branch-linked bookings or revenue.</p><div className="branch-stats">{[["Bookings", branch.id === "main" ? data.bookings.length : 0], ["Completed bookings", branch.id === "main" ? data.bookings.filter((b) => b.status === "Completed").length : 0], ["Allocated mechanics", staff(branch.id).length], ["Allocated stock units", data.parts.reduce((sum, p) => sum + stock(branch.id, p.id), 0)]].map(([label, value]) => <div className="so-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><p className="so-muted">Financial trends remain available in Dashboard → Access Business Analytics. Branch-level profit and payment tracking are not simulated.</p></>}
    </section>
  </div>
}
