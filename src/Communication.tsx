import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { MessageSquareText, Phone, Send, X } from "lucide-react"

export type Contact = { id: string; name: string; role: string; phone?: string }
type Entry = { id: string; thread: string; sender: string; text: string; time: string }
const storageKey = "motofix-conversations-v1"
export const riderContact = (name: string): Contact => ({ id: `rider:${name}`, name, role: "Motorcycle rider" })
export const ownerContact = (name = "MotoHub Service Center", phone?: string): Contact => ({ id: "owner:motohub", name, role: "Shop owner", phone })
export const mechanicContact = (mechanic: { id: string; name: string; phone?: string }): Contact => ({ ...mechanic, id: `mechanic:${mechanic.id}`, role: "Mechanic" })
function readEntries(): Entry[] {
  try { const value = JSON.parse(localStorage.getItem(storageKey) || "[]"); return Array.isArray(value) ? value : [] } catch { return [] }
}

export default function Communication({ actor, contacts }: { actor: Contact; contacts: Contact[] }) {
  const [entries, setEntries] = useState<Entry[]>(readEntries)
  const [selected, setSelected] = useState<Contact | null>(null)
  const [mode, setMode] = useState<"message" | "call">("message")
  const [draft, setDraft] = useState("")
  const [error, setError] = useState("")
  const anchor = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const end = useRef<HTMLDivElement>(null)
  const thread = selected ? [actor.id, selected.id].sort().join("|") : ""
  const messages = entries.filter((entry) => entry.thread === thread)
  useEffect(() => {
    const refresh = () => setEntries(readEntries())
    window.addEventListener("storage", refresh)
    window.addEventListener("motofix-conversations", refresh)
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("motofix-conversations", refresh) }
  }, [])
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }) }, [selected, entries, mode])
  useEffect(() => { if (selected) { if (mode === "message") input.current?.focus(); else closeButton.current?.focus() } }, [selected, mode])
  const save = (text: string) => {
    try {
      const updated = [...readEntries(), { id: crypto.randomUUID(), thread, sender: actor.id, text, time: new Date().toISOString() }]
      localStorage.setItem(storageKey, JSON.stringify(updated))
      setEntries(updated)
      window.dispatchEvent(new Event("motofix-conversations"))
      setError("")
      return true
    } catch { setError("Unable to save. Device storage may be full."); return false }
  }
  const open = (contact: Contact, next: "message" | "call") => { opener.current = document.activeElement as HTMLElement; setSelected(contact); setMode(next); setDraft(""); setError("") }
  const close = () => { setSelected(null); opener.current?.focus() }
  const host = anchor.current?.closest(".phone-screen")
  const overlay = selected && (
    <div className="mf-contact-overlay" onKeyDown={(event) => {
      if (event.key === "Escape") close()
      if (event.key === "Tab") {
        const focusable = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }}>
      <section className="mf-conversation" role="dialog" aria-modal="true" aria-label={`${mode === "call" ? "Call" : "Conversation with"} ${selected.name}`}>
        <header><div><small>{selected.role}</small><h2>{selected.name}</h2></div><button ref={closeButton} onClick={close} aria-label="Close conversation"><X size={19} /></button></header>
        {mode === "message" ? <>
          <p className="mf-demo-label">Messages sync with your repair team.</p>
          <div className="mf-message-list" aria-live="polite">
            {!messages.length && <p className="mf-message-empty">Ask about the repair, parts, or pickup time. Messages appear in the other account when they open this conversation.</p>}
            {messages.map((entry) => <div className={`mf-message ${entry.sender === actor.id ? "outgoing" : "incoming"}`} key={entry.id}><p>{entry.text}</p><time>{new Date(entry.time).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></div>)}
            <div ref={end} />
          </div>
          <form onSubmit={(event) => { event.preventDefault(); if (draft.trim() && save(draft.trim())) setDraft("") }}><input ref={input} aria-label="Message" placeholder="Write a message…" value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} /><button type="submit" disabled={!draft.trim()} aria-label="Send message"><Send size={18} /></button></form>
          <button className="mf-switch-call" onClick={() => setMode("call")}><Phone size={14} /> Call {selected.name}</button>
        </> : <div className="mf-call-body"><span className="mf-call-icon"><Phone size={30} /></span><h3>Call {selected.name}</h3>{selected.phone ? <><p>{selected.phone}</p><a className="mf-call-action" href={"tel:" + selected.phone}><Phone size={17} /> Open phone dialer</a></> : <p>No phone number is available for this contact.</p>}<p>Your phone handles the call. MotoFix voice calls are not enabled.</p></div>}
        {error && <p role="alert" className="mf-demo-label">{error}</p>}
      </section>
    </div>
  )
  return <div className="mf-contacts" ref={anchor}>
    <h3>Stay connected</h3><p className="mf-contact-caption">Your repair team, one conversation away.</p>
    {contacts.filter((contact, index, all) => contact.id !== actor.id && all.findIndex((item) => item.id === contact.id) === index).map((contact) => <div className="mf-contact-row" key={contact.id}><div><small>{contact.role}</small><strong>{contact.name}</strong></div><button onClick={() => open(contact, "message")} aria-label={`Message ${contact.name}`}><MessageSquareText size={17} /><span>Message</span></button><button onClick={() => open(contact, "call")} aria-label={`Call ${contact.name}`}><Phone size={17} /><span>Call</span></button></div>)}
    {overlay && (host ? createPortal(overlay, host) : overlay)}
  </div>
}
