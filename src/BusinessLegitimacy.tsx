import { useState } from "react"
import { Download, FileCheck2, ShieldCheck } from "lucide-react"
import {
  downloadFile,
  storeFile,
  useDemoRecord,
  type DemoFile,
} from "./demoRecords"
import WorkflowConfirm from "./WorkflowConfirm"

type Details = {
  legalName: string
  tradeName: string
  entity: string
  owner: string
  email: string
  phone: string
  address: string
  registration: string
  registeredOn: string
  tin: string
  bir: string
  permit: string
  permitIssued: string
  permitExpiry: string
  barangay: string
  fireCertificate: string
  fireExpiry: string
  sanitaryApplicable: boolean
  sanitaryPermit: string
  documents: Record<string, DemoFile>
  status: string
  submitted: string
}
const checklist = [
  [
    "registration",
    "DTI / SEC / CDA registration",
    "Match the certificate to your selected business structure.",
  ],
  [
    "bir",
    "BIR Certificate of Registration",
    "BIR Form 2303 or applicable registration certificate.",
  ],
  [
    "permit",
    "Panabo City business / mayor’s permit",
    "Current permit with the legal name and business address.",
  ],
  [
    "barangay",
    "Barangay business clearance",
    "Clearance from the barangay where the shop operates.",
  ],
  [
    "fire",
    "Fire safety inspection certificate",
    "Current FSIC for the business premises.",
  ],
  [
    "identity",
    "Authorized owner / representative ID",
    "Sample government-issued ID and authorization if applicable.",
  ],
  [
    "address",
    "Proof of business premises",
    "Lease, ownership document, or utility bill matching the shop address.",
  ],
] as const

export default function BusinessLegitimacy({
  shop,
}: {
  shop: { name: string; address: string; phone: string }
}) {
  const initial: Details = {
    legalName: "",
    tradeName: shop.name,
    entity: "Sole proprietorship (DTI)",
    owner: "",
    email: "",
    phone: shop.phone,
    address: shop.address,
    registration: "",
    registeredOn: "",
    tin: "",
    bir: "",
    permit: "",
    permitIssued: "",
    permitExpiry: "",
    barangay: "",
    fireCertificate: "",
    fireExpiry: "",
    sanitaryApplicable: false,
    sanitaryPermit: "",
    documents: {},
    status: "Draft",
    submitted: "",
  }
  const [saved, save] = useDemoRecord<Details>(
    "motofix-business-legitimacy-v1",
    initial,
  )
  const [draft, setDraft] = useState(saved)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [confirm, setConfirm] = useState(false)
  const [consent, setConsent] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const requiredDocs = [
    ...checklist,
    ...(draft.sanitaryApplicable
      ? [
          [
            "sanitary",
            "Sanitary / health permit",
            "Include when required for your business by the LGU.",
          ] as const,
        ]
      : []),
  ]
  const commit = (value: Details) => {
    try {
      save(value)
      setDraft(value)
      setEditing(false)
      setConfirm(false)
      setError("")
      setNotice(
        value.status === "Submitted for demo review"
          ? "Documents submitted for demo review. No actual business verification has taken place."
          : "Business legitimacy draft saved.",
      )
    } catch {
      setConfirm(false)
      setError("Unable to save your details. Check device storage.")
    }
  }
  const field = (
    key: keyof Details,
    label: string,
    type = "text",
    required = true,
  ) => (
    <label className="so-field">
      <span>
        {label}
        {required && <em> *</em>}
      </span>
      <input
        type={type}
        required={required}
        value={String(draft[key] || "")}
        maxLength={200}
        max={
          type === "date" && ["registeredOn", "permitIssued"].includes(key)
            ? today
            : undefined
        }
        min={
          type === "date" && ["permitExpiry", "fireExpiry"].includes(key)
            ? today
            : undefined
        }
        onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
      />
    </label>
  )
  const documentList = (documents: Record<string, DemoFile>) =>
    Object.entries(documents).map(([key, file]) => (
      <div className="mf-file-row" key={key}>
        <div>
          <small>
            {
              [...checklist, ["sanitary", "Sanitary / health permit"]].find(
                (item) => item[0] === key,
              )?.[1]
            }
          </small>
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
        </div>
      </div>
    ))
  return (
    <section className="mf-workflow">
      <div className="so-callout">
        <ShieldCheck size={20} />
        <p>
          <strong>Business legitimacy & documents</strong>Maintain your
          registration, permits, and proof of operation. This is a MotoFix demo
          checklist, not legal certification. Requirements vary by business type
          and Panabo City LGU rules.
        </p>
      </div>
      {error && (
        <p className="mf-feedback mf-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="mf-feedback" role="status">
          {notice}
        </p>
      )}
      {!editing ? (
        <>
          <div className="so-card mf-summary">
            <div className="so-card-top">
              <FileCheck2 size={20} />
              <span className="so-badge warm">{saved.status}</span>
            </div>
            <h3>
              {saved.legalName || "Complete your business legitimacy record"}
            </h3>
            <p>Business type: {saved.entity}</p>
            <p>Authorized owner: {saved.owner || "Not provided"}</p>
            <p>Registered address: {saved.address}</p>
            <p>Registration number: {saved.registration || "Not provided"}</p>
            <p>
              TIN: {saved.tin ? `••• ${saved.tin.slice(-4)}` : "Not provided"}
            </p>
            <p>Business permit: {saved.permit || "Not provided"}</p>
            <p>
              Permit expiry: {saved.permitExpiry || "Not provided"}
              {saved.permitExpiry && saved.permitExpiry < today
                ? " · Expired — renewal required"
                : ""}
            </p>
            <p>
              Fire certificate expiry: {saved.fireExpiry || "Not provided"}
              {saved.fireExpiry && saved.fireExpiry < today
                ? " · Expired — renewal required"
                : ""}
            </p>
            <p>Documents uploaded: {Object.keys(saved.documents).length}</p>
            {saved.submitted && (
              <p>
                Submitted: {new Date(saved.submitted).toLocaleString("en-PH")}
              </p>
            )}
            {documentList(saved.documents)}
          </div>
          <button
            className="so-button so-primary so-wide"
            onClick={() => {
              setDraft(saved)
              setEditing(true)
              setConsent(false)
              setNotice("")
            }}
          >
            {saved.legalName
              ? "Edit legitimacy information & documents"
              : "Add legitimacy information & documents"}
          </button>
          <p className="mf-caption">
            A submission is not a verified badge. Demo data and uploaded files
            remain in this browser. Upload sample documents only, not real IDs,
            tax records, or confidential information.
          </p>
        </>
      ) : (
        <form
          className="so-form"
          onSubmit={(event) => {
            event.preventDefault()
            const missing = requiredDocs.filter(
              ([key]) => !draft.documents[key],
            )
            if (missing.length) {
              setError(
                `Upload the required documents: ${missing.map((item) => item[1]).join(", ")}.`,
              )
              return
            }
            if (draft.permitExpiry < draft.permitIssued) {
              setError(
                "Business permit expiry must be on or after its issue date.",
              )
              return
            }
            if (!consent) {
              setError("Confirm the declaration before submitting.")
              return
            }
            setError("")
            setConfirm(true)
          }}
        >
          <h3>1. Registered business</h3>
          {field("legalName", "Registered legal business name")}
          {field("tradeName", "Shop / trade name")}
          <label className="so-field">
            <span>
              Business structure <em>*</em>
            </span>
            <select
              value={draft.entity}
              onChange={(event) =>
                setDraft({ ...draft, entity: event.target.value })
              }
            >
              {[
                "Sole proprietorship (DTI)",
                "Partnership (SEC)",
                "Corporation (SEC)",
                "Cooperative (CDA)",
              ].map((label) => (
                <option key={label}>{label}</option>
              ))}
            </select>
          </label>
          {field("owner", "Owner / authorized representative")}
          {field("email", "Business email", "email")}
          {field("phone", "Business contact number", "tel")}
          {field("address", "Registered business address")}
          <p className="mf-caption">
            Include street, barangay, and Panabo City. The registered name and
            address should match your certificates.
          </p>
          <h3>2. Registration & current permits</h3>
          {field("registration", "DTI / SEC / CDA registration number")}
          {field("registeredOn", "Registration date", "date")}
          {field("tin", "Business TIN")}
          {field("bir", "BIR registration / certificate number")}
          {field("permit", "Business / mayor’s permit number")}
          <p className="mf-caption">Issuing LGU: Panabo City</p>
          {field("permitIssued", "Business permit issue date", "date")}
          {field("permitExpiry", "Business permit expiry", "date")}
          {field("barangay", "Barangay clearance number")}
          {field(
            "fireCertificate",
            "Fire safety inspection certificate number",
          )}
          {field("fireExpiry", "Fire certificate expiry", "date")}
          <label className="mf-checkbox">
            <input
              type="checkbox"
              checked={draft.sanitaryApplicable}
              onChange={(event) =>
                setDraft({ ...draft, sanitaryApplicable: event.target.checked })
              }
            />
            <span>
              My business requires a sanitary / health permit under applicable
              LGU rules.
            </span>
          </label>
          {draft.sanitaryApplicable &&
            field("sanitaryPermit", "Sanitary / health permit number")}
          <h3>3. Supporting documents</h3>
          <p className="mf-caption">
            PDF / JPG / PNG · up to 5 MB per file. Files are stored in this
            browser only. The following is the app’s review checklist; confirm
            applicable requirements with the LGU.
          </p>
          {requiredDocs.map(([key, label, help]) => (
            <div className="mf-document" key={key}>
              <label className="so-field">
                <span>
                  {label} <em>*</em>
                </span>
                <small>{help}</small>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  disabled={!!busy}
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ""
                    if (!file) return
                    setBusy(key)
                    setError("")
                    try {
                      const stored = await storeFile(file)
                      setDraft((current) => ({
                        ...current,
                        documents: { ...current.documents, [key]: stored },
                      }))
                    } catch (failure) {
                      setError((failure as Error).message)
                    } finally {
                      setBusy("")
                    }
                  }}
                />
              </label>
              {draft.documents[key] && (
                <div className="mf-file-row">
                  <span>{draft.documents[key].name}</span>
                  <button
                    type="button"
                    className="so-button"
                    onClick={() => {
                      const documents = { ...draft.documents }
                      delete documents[key]
                      setDraft({ ...draft, documents })
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
              {busy === key && <small role="status">Saving document…</small>}
            </div>
          ))}
          <h3>4. Declaration & submission</h3>
          <label className="mf-checkbox">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              I am authorized to represent this business. The details are
              accurate, documents are current, and I understand this demo does
              not verify the business.
            </span>
          </label>
          <div className="so-actions">
            <button
              type="button"
              className="so-button"
              disabled={!!busy}
              onClick={() =>
                commit({ ...draft, status: "Draft", submitted: "" })
              }
            >
              Save draft
            </button>
            <button
              type="submit"
              className="so-button so-primary"
              disabled={!!busy}
            >
              Submit for demo review
            </button>
          </div>
          <button
            type="button"
            className="so-button"
            disabled={!!busy}
            onClick={() => setEditing(false)}
          >
            Cancel edits
          </button>
        </form>
      )}
      {confirm && (
        <WorkflowConfirm
          title="Submit legitimacy documents?"
          confirm="Submit for demo review"
          onClose={() => setConfirm(false)}
          onConfirm={() =>
            commit({
              ...draft,
              status: "Submitted for demo review",
              submitted: new Date().toISOString(),
            })
          }
        >
          <p>
            Your details and {requiredDocs.length} required documents will be
            recorded locally. No government lookup or real verification is
            performed.
          </p>
        </WorkflowConfirm>
      )}
    </section>
  )
}
