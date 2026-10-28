import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"

export default function WorkflowConfirm({
  title,
  children,
  confirm,
  onConfirm,
  onClose,
}: {
  title: string
  children: ReactNode
  confirm: string
  onConfirm: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement
    button.current?.focus()
    return () => previous?.focus()
  }, [])
  const host = document.querySelector(".phone-screen")
  const overlay = (
    <div
      ref={ref}
      className="mf-contact-overlay mf-workflow"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose()
        if (event.key === "Tab") {
          const buttons = event.currentTarget.querySelectorAll("button")
          if (event.shiftKey && document.activeElement === buttons[0]) {
            event.preventDefault()
            buttons[buttons.length - 1]?.focus()
          } else if (
            !event.shiftKey &&
            document.activeElement === buttons[buttons.length - 1]
          ) {
            event.preventDefault()
            buttons[0]?.focus()
          }
        }
      }}
    >
      <section
        className="mf-conversation mf-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-confirm-title"
      >
        <h2 id="workflow-confirm-title">{title}</h2>
        {children}
        <div className="so-actions">
          <button ref={button} className="so-button" onClick={onClose}>
            Go back
          </button>
          <button className="so-button so-primary" onClick={onConfirm}>
            {confirm}
          </button>
        </div>
      </section>
    </div>
  )
  return host ? createPortal(overlay, host) : overlay
}
