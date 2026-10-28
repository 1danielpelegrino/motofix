import { useState } from "react"
import {
  ClipboardList,
  Download,
  MessageSquareText,
  Plus,
  ShieldCheck,
} from "lucide-react"
import {
  downloadFile,
  storeFile,
  useDemoRecord,
  type DemoFile,
} from "./demoRecords"
import WorkflowConfirm from "./WorkflowConfirm"

type Service = {
  id: string
  shop: string
  shopId: string
  motorcycle: string
  service: string
  mechanic?: string
}
type Event = { time: string; author: string; text: string; internal?: boolean }
type Complaint = {
  id: string
  riderId: string
  rider: string
  email: string
  phone: string
  service: Service
  subject: string
  category: string
  against: string
  incident: string
  description: string
  request: string
  evidence: DemoFile[]
  status: string
  assigned: string
  priority: string
  resolution: string
  events: Event[]
}
const statuses = [
  "Submitted",
  "Acknowledged",
  "Investigating",
  "Awaiting Rider",
  "Resolution Proposed",
  "Resolved",
  "Withdrawn",
]
const blank = {
  service: "",
  subject: "",
  category: "Repair quality",
  against: "Service center",
  incident: "",
  description: "",
  request: "Reinspection / repair",
  consent: false,
}
export default function ComplaintCenter({
  mode,
  rider,
  services = [],
  shopId = "motohub",
  mechanics = [],
}: {
  mode: "rider" | "owner"
  rider?: { id: string; name: string; email: string; phone: string }
  services?: Service[]
  shopId?: string
  mechanics?: { id: string; name: string }[]
}) {
  const [records, save] = useDemoRecord<Complaint[]>(
    "motofix-complaints-v1",
    [],
  )
  const [selected, setSelected] = useState("")
  const [creating, setCreating] = useState(false)
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(blank)
  const [evidence, setEvidence] = useState<DemoFile[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [filter, setFilter] = useState("All")
  const [reply, setReply] = useState("")
  const [confirm, setConfirm] = useState<{
    title: string
    text: string
    label: string
    action: () => void
  } | null>(null)
  const mine = records.filter((record) =>
    mode === "owner"
      ? record.service.shopId === shopId
      : record.riderId === rider?.id,
  )
  const active = mine.find((record) => record.id === selected)
  const service = services.find((item) => item.id === draft.service)
  const persist = (action: () => void) => {
    try {
      action()
      setError("")
      setConfirm(null)
    } catch {
      setError("Unable to save. Check device storage and try again.")
      setConfirm(null)
    }
  }
  const update = (
    changes: Partial<Complaint>,
    text: string,
    internal = false,
  ) => {
    if (!active) return
    persist(() =>
      save((current) =>
        current.map((record) =>
          record.id === active.id
            ? {
                ...record,
                ...changes,
                events: [
                  ...record.events,
                  {
                    time: new Date().toISOString(),
                    author:
                      mode === "owner" ? "Shop owner" : rider?.name || "Rider",
                    text,
                    internal,
                  },
                ],
              }
            : record,
        ),
      ),
    )
  }
  const upload = async (files: FileList | null) => {
    if (!files) return
    if (evidence.length + files.length > 3) {
      setError("Attach up to 3 evidence files.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const next: DemoFile[] = []
      for (const file of Array.from(files)) next.push(await storeFile(file))
      setEvidence((current) => [...current, ...next])
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const fileButton = (file: DemoFile) => (
    <button
      type="button"
      className="so-button mf-file"
      onClick={() =>
        downloadFile(file).catch((failure) => setError(failure.message))
      }
    >
      <Download size={13} />
      {file.name}
    </button>
  )
  return (
    <div className="mf-workflow">
      <div className="so-callout">
        <ShieldCheck size={20} />
        <p>
          <strong>
            {mode === "owner"
              ? "Listen. Investigate. Make it right."
              : "A clear path to getting things resolved."}
          </strong>
          {mode === "owner"
            ? "Review evidence, coordinate with your mechanic, and keep the rider informed."
            : "Tell the service center what happened and track their response here."}{" "}
          Records and uploaded evidence sync to the MotoFix server. This is not
          an official regulatory complaint channel.
        </p>
      </div>
      {notice && (
        <p role="status" className="mf-feedback">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mf-feedback mf-error">
          {error}
        </p>
      )}
      {creating ? (
        <>
          <div className="mf-steps">
            {["Service", "Details", "Review"].map((label, index) => (
              <span key={label} className={index === step ? "current" : ""}>
                {index + 1}. {label}
              </span>
            ))}
          </div>
          <form
            className="so-form"
            onSubmit={(event) => {
              event.preventDefault()
              if (step < 2) {
                setStep(step + 1)
                return
              }
              if (!service || !rider || !draft.consent) return
              setConfirm({
                title: "Submit this complaint?",
                text: "The service center can review your complaint and attached evidence. You can follow its progress here.",
                label: "Submit complaint",
                action: () =>
                  persist(() => {
                    const id = `CMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
                    save((current) => [
                      {
                        ...draft,
                        id,
                        riderId: rider.id,
                        rider: rider.name,
                        email: rider.email,
                        phone: rider.phone,
                        service,
                        evidence,
                        status: "Submitted",
                        assigned: "",
                        priority: "Normal",
                        resolution: "",
                        events: [
                          {
                            time: new Date().toISOString(),
                            author: rider.name,
                            text: "Complaint submitted",
                          },
                        ],
                      },
                      ...current,
                    ])
                    setCreating(false)
                    setSelected(id)
                    setNotice(
                      `Complaint ${id} submitted. The service center can now review it.`,
                    )
                  }),
              })
            }}
          >
            {step === 0 && (
              <>
                <h2>1. Select the affected service</h2>
                <label className="so-field">
                  <span>
                    Booking or repair <em>*</em>
                  </span>
                  <select
                    required
                    value={draft.service}
                    onChange={(event) =>
                      setDraft({ ...draft, service: event.target.value })
                    }
                  >
                    <option value="">Choose a booking or repair</option>
                    {services.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.id} · {item.motorcycle} · {item.shop}
                      </option>
                    ))}
                  </select>
                </label>
                {service && (
                  <div className="so-card">
                    <strong>{service.shop}</strong>
                    <p>
                      {service.service} · {service.motorcycle}
                    </p>
                    <p>Mechanic: {service.mechanic || "Not specified"}</p>
                  </div>
                )}
                <label className="so-field">
                  <span>Complaint about</span>
                  <select
                    value={draft.against}
                    onChange={(event) =>
                      setDraft({ ...draft, against: event.target.value })
                    }
                  >
                    {[
                      "Service center",
                      "Assigned mechanic",
                      "Both service center and mechanic",
                    ].map((label) => (
                      <option key={label}>{label}</option>
                    ))}
                  </select>
                </label>
                <p className="mf-caption">
                  Mechanic complaints are handled by the service center owner.
                  If there is an immediate safety concern, stop riding until the
                  motorcycle is checked.
                </p>
              </>
            )}
            {step === 1 && (
              <>
                <h2>2. Tell us what happened</h2>
                <label className="so-field">
                  <span>
                    Subject <em>*</em>
                  </span>
                  <input
                    required
                    maxLength={120}
                    value={draft.subject}
                    onChange={(event) =>
                      setDraft({ ...draft, subject: event.target.value })
                    }
                    placeholder="e.g. Brake issue after servicing"
                  />
                </label>
                <label className="so-field">
                  <span>Category</span>
                  <select
                    value={draft.category}
                    onChange={(event) =>
                      setDraft({ ...draft, category: event.target.value })
                    }
                  >
                    {[
                      "Repair quality",
                      "Safety concern",
                      "Unexpected charges",
                      "Delay / missed completion",
                      "Mechanic conduct",
                      "Damaged / missing parts",
                      "Warranty / repeat issue",
                      "Other",
                    ].map((label) => (
                      <option key={label}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="so-field">
                  <span>
                    Incident date <em>*</em>
                  </span>
                  <input
                    type="date"
                    required
                    max={new Date().toLocaleDateString("en-CA")}
                    value={draft.incident}
                    onChange={(event) =>
                      setDraft({ ...draft, incident: event.target.value })
                    }
                  />
                </label>
                <label className="so-field">
                  <span>
                    What happened? <em>*</em>
                  </span>
                  <textarea
                    required
                    minLength={20}
                    maxLength={4000}
                    value={draft.description}
                    onChange={(event) =>
                      setDraft({ ...draft, description: event.target.value })
                    }
                    placeholder="Describe the problem, what was agreed, and any steps you have already taken (at least 20 characters)."
                  />
                </label>
                <label className="so-field">
                  <span>Requested outcome</span>
                  <select
                    value={draft.request}
                    onChange={(event) =>
                      setDraft({ ...draft, request: event.target.value })
                    }
                  >
                    {[
                      "Reinspection / repair",
                      "Explanation of charges",
                      "Refund discussion",
                      "Replacement of damaged parts",
                      "Apology / conduct review",
                      "Other resolution",
                    ].map((label) => (
                      <option key={label}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="so-field">
                  <span>Evidence (optional · up to 3 files)</span>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    multiple
                    disabled={busy}
                    onChange={(event) => {
                      void upload(event.target.files)
                      event.target.value = ""
                    }}
                  />
                  <small>
                    Photos, receipts, or service records. PDF / JPG / PNG, up to
                    5 MB each. Use sample files, not sensitive personal records.
                  </small>
                </label>
                {evidence.map((file) => (
                  <div className="mf-file-row" key={file.id}>
                    {fileButton(file)}
                    <button
                      type="button"
                      className="so-button"
                      onClick={() =>
                        setEvidence(
                          evidence.filter((item) => item.id !== file.id),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </>
            )}
            {step === 2 && (
              <>
                <h2>3. Review your complaint</h2>
                <div className="so-card mf-summary">
                  <strong>{draft.subject}</strong>
                  <p>
                    {service?.shop} · {service?.id}
                  </p>
                  <p>
                    {draft.against} · {draft.category}
                  </p>
                  <p>Incident: {draft.incident}</p>
                  <p>{draft.description}</p>
                  <p>Requested outcome: {draft.request}</p>
                  <p>Attachments: {evidence.length}</p>
                  <p>
                    Reply contact: {rider?.email} · {rider?.phone}
                  </p>
                </div>
                <label className="mf-checkbox">
                  <input
                    required
                    type="checkbox"
                    checked={draft.consent}
                    onChange={(event) =>
                      setDraft({ ...draft, consent: event.target.checked })
                    }
                  />
                  <span>
                    I confirm this information is accurate and agree to share
                    the complaint and evidence with the service center.
                  </span>
                </label>
              </>
            )}
            <div className="so-actions">
              <button
                type="button"
                className="so-button"
                onClick={() => (step ? setStep(step - 1) : setCreating(false))}
              >
                {step ? "Back" : "Cancel"}
              </button>
              <button
                className="so-button so-primary"
                type="submit"
                disabled={busy}
              >
                {busy
                  ? "Saving files…"
                  : step === 2
                    ? "Submit complaint"
                    : "Continue"}
              </button>
            </div>
          </form>
        </>
      ) : active ? (
        <>
          <button
            className="so-button"
            onClick={() => {
              setSelected("")
              setReply("")
            }}
          >
            ← All complaints
          </button>
          <div className="so-card mf-summary">
            <div className="so-card-top">
              <small>{active.id}</small>
              <span className="so-badge warm">{active.status}</span>
            </div>
            <h2>{active.subject}</h2>
            <p>
              {active.service.shop} · {active.service.id}
            </p>
            <p>
              {active.service.motorcycle} · {active.service.service}
            </p>
            <p>
              {active.against} · {active.category} · {active.incident}
            </p>
            <p>{active.description}</p>
            <p>
              <strong>Requested outcome:</strong> {active.request}
            </p>
            {mode === "owner" && (
              <p>
                <strong>Rider:</strong> {active.rider}
                <br />
                {active.email} · {active.phone}
              </p>
            )}
            {active.evidence.map((file) => (
              <div key={file.id}>{fileButton(file)}</div>
            ))}
            {active.resolution && (
              <p>
                <strong>Proposed resolution:</strong> {active.resolution}
              </p>
            )}
          </div>
          {mode === "owner" &&
            !["Resolved", "Withdrawn"].includes(active.status) && (
              <form
                key={active.id + active.status}
                className="so-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  const values = new FormData(event.currentTarget)
                  const status = String(values.get("status"))
                  const resolution = String(
                    values.get("resolution") || "",
                  ).trim()
                  if (status === "Resolution Proposed" && !resolution) {
                    setError(
                      "Describe the proposed resolution before offering it to the rider.",
                    )
                    return
                  }
                  const assigned = String(values.get("assigned") || "")
                  const priority = String(values.get("priority"))
                  update(
                    { status, resolution, assigned, priority },
                    `Status: ${status}. ${
                      resolution ? `Proposed resolution: ${resolution}` : ""
                    }`,
                  )
                  if (
                    assigned !== active.assigned ||
                    priority !== active.priority
                  )
                    setNotice(
                      "Complaint updated. Internal assignment and priority saved.",
                    )
                }}
              >
                <h3>Manage this complaint</h3>
                <p className="mf-caption">
                  Acknowledge → investigate with the mechanic → request details
                  if needed → propose a resolution. The rider confirms
                  resolution.
                </p>
                <label className="so-field">
                  <span>Status</span>
                  <select name="status" defaultValue={active.status}>
                    {statuses
                      .filter(
                        (status) => !["Resolved", "Withdrawn"].includes(status),
                      )
                      .map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                  </select>
                </label>
                <label className="so-field">
                  <span>Internal investigation assignment</span>
                  <select name="assigned" defaultValue={active.assigned}>
                    <option value="">Shop owner</option>
                    {mechanics.map((mechanic) => (
                      <option key={mechanic.id} value={mechanic.id}>
                        {mechanic.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="so-field">
                  <span>Priority</span>
                  <select name="priority" defaultValue={active.priority}>
                    {["Normal", "High", "Urgent / safety"].map((label) => (
                      <option key={label}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="so-field">
                  <span>Proposed resolution / next steps</span>
                  <textarea
                    name="resolution"
                    defaultValue={active.resolution}
                    maxLength={3000}
                    placeholder="Explain the remedy, cost, and expected timeframe."
                  />
                </label>
                <button className="so-button so-primary">
                  Save complaint update
                </button>
              </form>
            )}
          <h3>Conversation & timeline</h3>
          <div className="so-card mf-complaint-timeline">
            {active.events
              .filter((entry) => mode === "owner" || !entry.internal)
              .map((entry, index) => (
                <article key={index}>
                  <strong>
                    {entry.author}
                    {entry.internal ? " · Internal note" : ""}
                  </strong>
                  <time>{new Date(entry.time).toLocaleString("en-PH")}</time>
                  <p>{entry.text}</p>
                </article>
              ))}
          </div>
          {!["Resolved", "Withdrawn"].includes(active.status) && (
            <form
              className="so-form"
              onSubmit={(event) => {
                event.preventDefault()
                if (!reply.trim()) return
                const internal =
                  new FormData(event.currentTarget).get("internal") === "on"
                update({}, reply.trim(), internal)
                setReply("")
              }}
            >
              <label className="so-field">
                <span>
                  {mode === "owner"
                    ? "Response to rider / investigation note"
                    : "Add information or respond"}
                </span>
                <textarea
                  required
                  maxLength={3000}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                />
              </label>
              {mode === "owner" && (
                <label className="mf-checkbox">
                  <input name="internal" type="checkbox" />
                  <span>Internal note (visible only to the owner)</span>
                </label>
              )}
              <button className="so-button so-primary">
                <MessageSquareText size={14} />
                Send update
              </button>
            </form>
          )}
          {mode === "rider" && active.status === "Resolution Proposed" && (
            <div className="so-actions">
              <button
                className="so-button so-primary"
                onClick={() =>
                  setConfirm({
                    title: "Confirm the issue is resolved?",
                    text: "Only confirm after the agreed remedy has been completed. The complaint will be marked resolved.",
                    label: "Confirm resolved",
                    action: () =>
                      update(
                        { status: "Resolved" },
                        "Rider accepted the resolution and confirmed the issue is resolved.",
                      ),
                  })
                }
              >
                Accept & confirm resolved
              </button>
              <button
                className="so-button"
                onClick={() =>
                  update(
                    { status: "Investigating" },
                    "Rider requested further investigation of the proposed resolution.",
                  )
                }
              >
                Request further review
              </button>
            </div>
          )}
          {mode === "rider" &&
            !["Resolved", "Withdrawn"].includes(active.status) && (
              <button
                className="so-button so-danger"
                onClick={() =>
                  setConfirm({
                    title: "Withdraw this complaint?",
                    text: "The record remains in your history, but the service center will no longer need to act on it.",
                    label: "Withdraw complaint",
                    action: () =>
                      update(
                        { status: "Withdrawn" },
                        "Rider withdrew the complaint.",
                      ),
                  })
                }
              >
                Withdraw complaint
              </button>
            )}
          {mode === "rider" &&
            ["Resolved", "Withdrawn"].includes(active.status) && (
              <button
                className="so-button"
                onClick={() =>
                  update(
                    { status: "Submitted" },
                    "Rider reopened the complaint for further review.",
                  )
                }
              >
                Reopen complaint
              </button>
            )}
        </>
      ) : (
        <>
          {mode === "rider" && (
            <button
              className="so-button so-primary so-wide"
              onClick={() => {
                setCreating(true)
                setStep(0)
                setDraft(blank)
                setEvidence([])
                setError("")
                setNotice("")
              }}
              disabled={!services.length}
            >
              <Plus size={16} />
              New complaint
            </button>
          )}
          <label className="so-field">
            <span>Filter complaints</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              {["All", ...statuses].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          {mine
            .filter((record) => filter === "All" || record.status === filter)
            .map((record) => (
              <button
                className="so-card mf-complaint-card"
                key={record.id}
                onClick={() => {
                  setSelected(record.id)
                  setNotice("")
                  setReply("")
                }}
              >
                <div className="so-card-top">
                  <small>{record.id}</small>
                  <span className="so-badge warm">{record.status}</span>
                </div>
                <strong>{record.subject}</strong>
                <p>
                  {mode === "owner" ? record.rider : record.service.shop} ·{" "}
                  {record.service.id}
                </p>
                <small>
                  {record.category} ·{" "}
                  {new Date(record.events[0].time).toLocaleDateString("en-PH")}
                </small>
              </button>
            ))}
          {!mine.some(
            (record) => filter === "All" || record.status === filter,
          ) && (
            <div className="so-empty">
              <ClipboardList size={25} />
              <strong>
                No complaints {filter === "All" ? "yet" : "with this status"}
              </strong>
              <p>
                {mode === "owner"
                  ? "Customer submissions will appear here, ready for review."
                  : "Submit a complaint about a booking, repair, or mechanic to start the resolution process."}
              </p>
            </div>
          )}
        </>
      )}
      {confirm && (
        <WorkflowConfirm
          title={confirm.title}
          confirm={confirm.label}
          onClose={() => setConfirm(null)}
          onConfirm={confirm.action}
        >
          <p>{confirm.text}</p>
        </WorkflowConfirm>
      )}
    </div>
  )
}
