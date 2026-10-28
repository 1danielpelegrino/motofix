import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type FormEvent,
  type ReactNode,
} from "react"
import { useLocation, useNavigate } from "react-router"
import { changePassword, type AppUser } from "./api"
import AccountBrand from "./AccountBrand"
import { readProfilePhoto } from "./profilePhoto"
import {
  ArrowLeft,
  Bell,
  Bike,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  FileClock,
  History,
  KeyRound,
  LogOut,
  MessageSquareText,
  PackagePlus,
  Pencil,
  Plus,
  Send,
  Settings2,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react"
import Communication, { mechanicContact, ownerContact, riderContact } from "./Communication"

type MechanicRecord = {
  id: string
  name: string
  phone: string
  email: string
  username: string
  specialization: string
  experience: string
  skills: string
  employment: string
  status: string
  notes: string
  photo: string
}
type Task = {
  id: string
  name: string
  description: string
  mechanic: string
  customer: string
  motorcycle: string
  repair: string
  priority: string
  due: string
  assigned: string
  status: string
  instructions: string
  notes: string
  photos: string[]
  updates?: string[]
}
type Repair = {
  id: string
  booking: string
  customer: string
  motorcycle: string
  problem: string
  diagnosis: string
  mechanic: string
  status: string
  progress: number
  completion: string
  services: string[]
  parts: string[]
  cost: number
  notes: string
  updates: string[]
}
type Notice = {
  id: string
  title: string
  text: string
  route: string
  read: boolean
  kind: string
}
type OwnerData = {
  mechanics: MechanicRecord[]
  tasks: Task[]
  repairs: Repair[]
  profile: {
    name: string
    address: string
    phone: string
    description?: string
    hours?: string
    brands?: string
    latitude?: string
    longitude?: string
  }
  notices: Notice[]
  bookings: unknown[]
  parts: unknown[]
  services: unknown[]
}

const today = new Date().toISOString().slice(0, 10)
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10)
const nowLabel = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(new Date())
const id = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().slice(0, 7).toUpperCase()}`

const demoData: OwnerData = {
  profile: {
    name: "MotoHub Service Center",
    address: "124 Street, New Visayas, Panabo City",
    phone: "+63 917 123 4567",
    description: "Expert motorcycle care from a trusted local team.",
  },
  mechanics: [
    {
      id: "M-01",
      name: "Marco Reyes",
      phone: "+63 917 456 7890",
      email: "marco@motohub.demo",
      username: "mechanic.marco",
      specialization: "Engine specialist",
      experience: "8",
      skills: "Engine overhaul, fuel injection, diagnostics",
      employment: "Full-time",
      status: "Assigned",
      notes: "Senior mechanic and team lead.",
      photo: "",
    },
  ],
  tasks: [
    {
      id: "T-081",
      name: "Clean fuel injector",
      description: "Remove, clean, and test the fuel injector.",
      mechanic: "M-01",
      customer: "Miguel Santos",
      motorcycle: "Suzuki Raider R150",
      repair: "R-0241",
      priority: "High",
      due: `${today}T14:00`,
      assigned: today,
      status: "In Progress",
      instructions: "Run a spray pattern test after cleaning.",
      notes: "Cleaning in progress.",
      photos: [],
    },
    {
      id: "T-084",
      name: "Replace spark plug",
      description: "Install and gap a new NGK spark plug.",
      mechanic: "M-01",
      customer: "Miguel Santos",
      motorcycle: "Suzuki Raider R150",
      repair: "R-0241",
      priority: "Normal",
      due: `${today}T16:00`,
      assigned: today,
      status: "Pending",
      instructions: "Torque to manufacturer specification.",
      notes: "",
      photos: [],
    },
    {
      id: "T-090",
      name: "Final road test",
      description: "Road-test the motorcycle and confirm smooth acceleration.",
      mechanic: "M-01",
      customer: "Miguel Santos",
      motorcycle: "Suzuki Raider R150",
      repair: "R-0241",
      priority: "Normal",
      due: `${tomorrow}T10:00`,
      assigned: today,
      status: "Pending",
      instructions: "Complete the safety checklist before and after the test.",
      notes: "",
      photos: [],
    },
  ],
  repairs: [
    {
      id: "R-0241",
      booking: "B-1044",
      customer: "Miguel Santos",
      motorcycle: "Suzuki Raider R150",
      problem: "Engine loses power and stalls at low speeds.",
      diagnosis: "Worn spark plug and clogged fuel injector.",
      mechanic: "M-01",
      status: "In Progress",
      progress: 65,
      completion: "Today, 3:00 PM",
      services: ["Engine Repair"],
      parts: ["NGK Spark Plug"],
      cost: 3500,
      notes: "Compression test passed. Fuel injector cleaning underway.",
      updates: ["Diagnosis completed", "Parts approved by customer"],
    },
  ],
  notices: [],
  bookings: [],
  parts: [],
  services: [],
}

function loadData(): OwnerData {
  try {
    const value = JSON.parse(localStorage.getItem("motofix-owner-v1") || "null")
    if (value?.mechanics && value?.tasks && value?.repairs) {
      const upcomingDemoTask = demoData.tasks.find(
        (task) => task.id === "T-090",
      )!
      return {
          ...demoData,
          ...value,
          tasks: value.tasks.some((task: Task) => task.id === upcomingDemoTask.id)
            ? value.tasks
            : [...value.tasks, upcomingDemoTask],
          notices: value.notices || [],
          profile: {
            ...demoData.profile,
            ...value.profile,
            address:
              value.profile?.address === "124 P. Tuazon Blvd, Quezon City"
                ? "124 Street, New Visayas, Panabo City"
                : value.profile?.address || demoData.profile.address,
          },
        }
    }
    return demoData
  } catch {
    return demoData
  }
}

function Action({
  children,
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  return (
    <button
      type="button"
      className={`so-button so-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function Badge({ children }: { children: string }) {
  const tone = ["Completed", "Active", "Available"].includes(children)
    ? "good"
    : ["In Progress", "Assigned"].includes(children)
      ? "blue"
      : children === "High"
        ? "danger"
        : ""
  return (
    <span className={`so-badge ${tone}`}>
      <i />
      {children}
    </span>
  )
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`so-card ${className}`}>{children}</div>
}

function Info({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="so-info">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || "Not provided"}</dd>
        </div>
      ))}
    </dl>
  )
}

function Avatar({
  mechanic,
  large = false,
}: {
  mechanic: MechanicRecord
  large?: boolean
}) {
  return (
    <span className={`so-avatar ${large ? "large" : ""}`}>
      {mechanic.photo ? (
        <img src={mechanic.photo} alt={`${mechanic.name}'s profile`} />
      ) : (
        mechanic.name
          .split(" ")
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
      )}
    </span>
  )
}

export default function Mechanic({
  identity,
  onLogout,
  user,
}: {
  identity?: string
  onLogout: () => void
  user: AppUser
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const contentRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<OwnerData>(loadData)
  const [taskTab, setTaskTab] = useState("Pending")
  const [toast, setToast] = useState("")
  const [dialog, setDialog] = useState<ReactNode | null>(null)
  const path = location.pathname.replace(/^\/mechanic\/?/, "")
  const [page = "dashboard", itemId = ""] = path.split("/")
  const loginIdentity = (
    identity ||
    sessionStorage.getItem("motofix-mechanic-identity") ||
    ""
  )
    .toLowerCase()
    .trim()
  const mechanic =
    data.mechanics.find((item) =>
      [item.email, item.username, item.phone].some(
        (entry) => entry?.toLowerCase() === loginIdentity,
      ),
    ) ||
    data.mechanics.find((item) => item.status !== "Inactive") ||
    demoData.mechanics[0]
  const myTasks = data.tasks.filter((task) => task.mechanic === mechanic.id)
  const myRepairs = data.repairs.filter(
    (repair) => repair.mechanic === mechanic.id,
  )
  const activeRepairs = myRepairs.filter(
    (repair) => repair.status !== "Completed",
  )

  useEffect(() => {
    try {
      localStorage.setItem("motofix-owner-v1", JSON.stringify(data))
    } catch {
      setToast("Changes are available for this session only.")
    }
  }, [data])
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0)
    setDialog(null)
  }, [location.pathname])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(""), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const go = (route: string) => navigate(`/mechanic/${route}`)
  const notify = (message: string) => setToast(message)
  const addOwnerNotice = (
    current: OwnerData,
    title: string,
    text: string,
    route: string,
  ) => [
    {
      id: id("N"),
      title,
      text,
      route,
      read: false,
      kind: "repair",
    },
    ...current.notices,
  ]
  const updateTask = (task: Task, status: string) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((item) =>
        item.id === task.id ? { ...item, status } : item,
      ),
      notices: addOwnerNotice(
        current,
        `Task ${status.toLowerCase()}`,
        `${mechanic.name} updated ${task.name}.`,
        `tasks/${task.id}`,
      ),
    }))
    notify(`Task moved to ${status}`)
  }
  const openNote = (kind: "task" | "repair", target: Task | Repair) =>
    setDialog(
      <SimpleForm
        title={kind === "repair" ? "Add repair comment" : "Add work note"}
        submit={kind === "repair" ? "Post Comment" : "Save Note"}
        fields={[
          {
            name: "note",
            label: kind === "repair" ? "Comment" : "Note",
            type: "textarea",
          },
        ]}
        onCancel={() => setDialog(null)}
        onSubmit={(values) => {
          setData((current) => ({
            ...current,
            tasks:
              kind === "task"
                ? current.tasks.map((item) =>
                    item.id === target.id
                      ? {
                          ...item,
                          notes: [item.notes, values.note]
                            .filter(Boolean)
                            .join("\n"),
                          updates: [
                            ...(item.updates || []),
                            `Mechanic comment: ${values.note}`,
                          ],
                        }
                      : item,
                  )
                : current.tasks,
            repairs:
              kind === "repair"
                ? current.repairs.map((item) =>
                    item.id === target.id
                      ? {
                          ...item,
                          notes: [item.notes, values.note]
                            .filter(Boolean)
                            .join("\n"),
                        }
                      : item,
                  )
                : current.repairs,
          }))
          setDialog(null)
          notify(kind === "repair" ? "Comment added" : "Note saved")
        }}
      />,
    )
  const uploadPhoto = (kind: "task" | "repair", target: Task | Repair) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      if (file.size > 2 * 1024 * 1024) {
        notify("Choose a photo smaller than 2 MB.")
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const photo = String(reader.result)
        setData((current) => ({
          ...current,
          tasks:
            kind === "task"
              ? current.tasks.map((item) =>
                  item.id === target.id
                    ? { ...item, photos: [...item.photos, photo] }
                    : item,
                )
              : current.tasks,
          repairs:
            kind === "repair"
              ? current.repairs.map((item) =>
                  item.id === target.id
                    ? {
                        ...item,
                        updates: [...item.updates, "Work photo added"],
                      }
                    : item,
                )
              : current.repairs,
        }))
        notify("Photo attached")
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const titleMap: Record<string, string> = {
    dashboard: "Mechanic Dashboard",
    tasks: "Repairs",
    "task-details": "Task Details",
    repairs: "Repairs",
    "repair-details": "Repair Details",
    "update-repair": "Update Repair",
    history: "Work History",
    profile: "My Profile",
    account: "Account",
    notifications: "Notifications",
    help: "Help & Support",
  }
  let view: ReactNode

  if (page === "dashboard") {
    const pending = myTasks.filter((task) =>
      ["Pending", "Assigned"].includes(task.status),
    )
    const completed = myTasks.filter((task) => task.status === "Completed")
    const upcoming = myTasks.filter((task) => task.due.slice(0, 10) > today)
    const todayTasks = myTasks.filter(
      (task) => task.due.slice(0, 10) === today && task.status !== "Completed",
    )
    view = (
      <>
        <div className="mc-greeting">
          <span>{nowLabel.toUpperCase()}</span>
          <h1>
            Hello, <em>{mechanic.name.split(" ")[0]}</em>
          </h1>
          <p>
            <Wrench size={13} />
            {data.profile.name}
          </p>
        </div>
        <Card className="mc-focus-card">
          <div>
            <span>TODAY&apos;S ASSIGNMENTS</span>
            <strong>{todayTasks.length}</strong>
            <p>
              {todayTasks[0]?.name ||
                "You're all caught up. Check upcoming work."}
            </p>
          </div>
          <Action variant="primary" onClick={() => go("repairs")}>
            View repairs <ChevronRight size={14} />
          </Action>
        </Card>
        <div className="mc-stat-grid">
          {[
            [activeRepairs.length, "Active repairs", Bike],
            [pending.length, "Pending tasks", Clock3],
            [completed.length, "Completed", CheckCircle2],
            [upcoming.length, "Upcoming", FileClock],
          ].map(([value, label, Icon]) => {
            const StatIcon = Icon as typeof Bike
            return (
              <Card className="mc-stat" key={String(label)}>
                <StatIcon size={17} />
                <strong>{String(value)}</strong>
                <span>{String(label)}</span>
              </Card>
            )
          })}
        </div>
        <SectionTitle title="Workspace" />
        <div className="mc-access-grid">
          {[
            [
              "Repairs",
              `${activeRepairs.length} active jobs · ${pending.length} pending tasks`,
              Bike,
              "repairs",
            ],
            [
              "Repair Updates",
              "Send customer updates",
              MessageSquareText,
              activeRepairs[0]
                ? `update-repair/${activeRepairs[0].id}`
                : "repairs",
            ],
            ["Work History", "Completed work log", History, "history"],
          ].map(([label, detail, Icon, route]) => {
            const AccessIcon = Icon as typeof Bike
            return (
              <Action
                className="mc-access"
                key={String(label)}
                onClick={() => go(String(route))}
              >
                <span>
                  <AccessIcon size={19} />
                </span>
                <strong>{String(label)}</strong>
                <small>{String(detail)}</small>
              </Action>
            )
          })}
        </div>
        <SectionTitle
          title="Next up"
          action="See all"
          onAction={() => go("repairs")}
        />
        {myTasks
          .filter((task) => task.status !== "Completed")
          .slice(0, 2)
          .map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onView={() => go(`task-details/${task.id}`)}
            />
          ))}
      </>
    )
  } else if (page === "repairs" || page === "tasks") {
    const filtered = myTasks.filter((task) =>
      taskTab === "Pending"
        ? ["Pending", "Assigned"].includes(task.status)
        : task.status === taskTab,
    )
    view = (
      <>
        <SectionTitle title="Assigned repairs" />
        <p className="mc-list-count">{myRepairs.length} ASSIGNED REPAIRS</p>
        {myRepairs.length ? (
          myRepairs.map((repair) => (
            <RepairCard
              key={repair.id}
              repair={repair}
              onView={() => go(`repair-details/${repair.id}`)}
            />
          ))
        ) : (
          <Empty text="No assigned repairs" />
        )}
        <SectionTitle title="Repair tasks" />
        <div className="so-tabs" role="tablist">
          {["Pending", "In Progress", "Waiting", "Completed"].map((tab) => (
            <Action
              key={tab}
              role="tab"
              aria-selected={taskTab === tab}
              className={taskTab === tab ? "selected" : ""}
              onClick={() => setTaskTab(tab)}
            >
              {tab}
            </Action>
          ))}
        </div>
        <p className="mc-list-count">{filtered.length} TASKS</p>
        {filtered.length ? (
          filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onView={() => go(`task-details/${task.id}`)}
              actions={
                <>
                  <Action onClick={() => go(`task-details/${task.id}`)}>
                    View Task
                  </Action>
                  {["Pending", "Assigned"].includes(task.status) && (
                    <Action
                      variant="primary"
                      onClick={() => updateTask(task, "In Progress")}
                    >
                      Start Task
                    </Action>
                  )}
                  {["In Progress", "Waiting"].includes(task.status) && (
                    <Action onClick={() => go(`task-details/${task.id}`)}>
                      Update Task
                    </Action>
                  )}
                  {task.status !== "Completed" && (
                    <Action
                      variant="primary"
                      onClick={() => updateTask(task, "Completed")}
                    >
                      Mark Completed
                    </Action>
                  )}
                </>
              }
            />
          ))
        ) : (
          <Empty text={`No ${taskTab.toLowerCase()} tasks`} />
        )}
      </>
    )
  } else if (page === "task-details") {
    const task = myTasks.find((item) => item.id === itemId)
    if (!task) {
      view = <Empty text="Task not found" />
    } else {
      view = (
        <>
          <Card className="mc-detail-lead">
            <div className="so-card-top">
              <span className="mc-id">{task.id}</span>
              <Badge>{task.status}</Badge>
            </div>
            <h2>{task.name}</h2>
            <p>{task.description}</p>
          </Card>
          <Card>
            <Info
              items={[
                ["Customer", task.customer],
                ["Motorcycle", task.motorcycle],
                ["Repair number", task.repair],
                [
                  "Problem",
                  data.repairs.find((r) => r.id === task.repair)?.problem,
                ],
                ["Instructions", task.instructions],
                ["Priority", <Badge key="priority">{task.priority}</Badge>],
                ["Due date", formatDate(task.due)],
                ["Assigned by", "Shop Owner"],
                ["Current status", task.status],
                ["Mechanic notes", task.notes],
              ]}
            />
          </Card>
          {task.photos.length > 0 && (
            <>
              <SectionTitle title="Work photos" />
              <div className="mc-photo-strip">
                {task.photos.map((photo, index) => (
                  <img
                    src={photo}
                    alt={`Task evidence ${index + 1}`}
                    key={photo}
                  />
                ))}
              </div>
            </>
          )}
          <div className="mc-action-panel">
            {["Pending", "Assigned"].includes(task.status) && (
              <Action
                variant="primary"
                onClick={() => updateTask(task, "In Progress")}
              >
                <Wrench size={14} /> Start Task
              </Action>
            )}
            <Action
              onClick={() =>
                updateTask(
                  task,
                  task.status === "Waiting" ? "In Progress" : "Waiting",
                )
              }
            >
              <Settings2 size={14} /> Update Task
            </Action>
            <Action onClick={() => openNote("task", task)}>
              <MessageSquareText size={14} /> Add Note
            </Action>
            <Action onClick={() => uploadPhoto("task", task)}>
              <Camera size={14} /> Add Photo
            </Action>
            {task.status !== "Completed" && (
              <Action
                variant="primary"
                onClick={() => updateTask(task, "Completed")}
              >
                <Check size={14} /> Mark Completed
              </Action>
            )}
          </div>
        </>
      )
    }
  } else if (page === "repair-details") {
    const repair = myRepairs.find((item) => item.id === itemId)
    const assignedTasks = myTasks.filter((task) => task.repair === repair?.id)
    if (!repair) {
      view = <Empty text="Repair not found" />
    } else {
      view = (
        <>
          <Communication actor={mechanicContact(mechanic)} contacts={[riderContact(repair.customer), ownerContact(data.profile.name, data.profile.phone)]} />
          <Card className="mc-detail-lead">
            <div className="so-card-top">
              <span className="mc-id">{repair.id}</span>
              <Badge>{repair.status}</Badge>
            </div>
            <h2>{repair.motorcycle}</h2>
            <p>{repair.customer}</p>
            <Progress value={repair.progress} />
          </Card>
          <Card>
            <Info
              items={[
                ["Reported problem", repair.problem],
                ["Diagnosis", repair.diagnosis],
                ["Services", repair.services.join(", ")],
                ["Parts", repair.parts.join(", ")],
                ["Mechanic notes", repair.notes],
                ["Estimated completion", repair.completion],
              ]}
            />
          </Card>
          <SectionTitle title="Assigned tasks" />
          {assignedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onView={() => go(`task-details/${task.id}`)}
            />
          ))}
          <SectionTitle title="Repair timeline" />
          <Card className="mc-timeline">
            {repair.updates.map((update) => (
              <div key={update}>
                <Check size={12} />
                <span>{update}</span>
              </div>
            ))}
          </Card>
          <div className="mc-action-panel">
            <Action
              variant="primary"
              onClick={() => go(`update-repair/${repair.id}`)}
            >
              <Settings2 size={14} /> Update Progress
            </Action>
            <Action onClick={() => openNote("repair", repair)}>
              <MessageSquareText size={14} /> Add Comment
            </Action>
            <Action onClick={() => uploadPhoto("repair", repair)}>
              <Camera size={14} /> Add Photo
            </Action>
            <Action onClick={() => go(`update-repair/${repair.id}`)}>
              <Plus size={14} /> Add Service
            </Action>
            <Action onClick={() => go(`update-repair/${repair.id}`)}>
              <PackagePlus size={14} /> Add Part
            </Action>
            <Action
              onClick={() =>
                sendUpdate(repair, data, setData, mechanic, notify)
              }
            >
              <Send size={14} /> Send Update
            </Action>
          </div>
        </>
      )
    }
  } else if (page === "update-repair") {
    const repair = myRepairs.find((item) => item.id === itemId)
    view = repair ? (
      <RepairUpdateForm
        repair={repair}
        onCancel={() => go(`repair-details/${repair.id}`)}
        onSave={(values) => {
          const progress = Number(values.progress)
          const services = values.services
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
          const partEntry = values.part.trim()
            ? `${values.part.trim()} × ${values.quantity || "1"}`
            : ""
          setData((current) => ({
            ...current,
            repairs: current.repairs.map((item) =>
              item.id === repair.id
                ? {
                    ...item,
                    status: values.status,
                    progress,
                    diagnosis: values.diagnosis,
                    notes: values.notes,
                    completion: values.completion,
                    services,
                    parts: partEntry
                      ? [
                          ...item.parts.filter((part) => part !== partEntry),
                          partEntry,
                        ]
                      : item.parts,
                    updates: [
                      ...item.updates,
                      `${mechanic.name} updated progress to ${progress}%`,
                    ],
                  }
                : item,
            ),
            notices: addOwnerNotice(
              current,
              "Mechanic repair update",
              `${mechanic.name} updated ${repair.id} to ${progress}% progress.`,
              `repairs/${repair.id}`,
            ),
          }))
          notify("Update sent to customer and shop owner")
          go(`repair-details/${repair.id}`)
        }}
      />
    ) : (
      <Empty text="Repair not found" />
    )
  } else if (page === "history") {
    const completedTasks = myTasks.filter((task) => task.status === "Completed")
    const completedRepairs = myRepairs.filter(
      (repair) => repair.status === "Completed",
    )
    view = (
      <>
        <div className="mc-history-summary">
          <strong>{completedRepairs.length + completedTasks.length}</strong>
          <span>completed work records</span>
        </div>
        <SectionTitle title="Completed repairs" />
        {completedRepairs.length ? (
          completedRepairs.map((repair) => (
            <Card key={repair.id}>
              <div className="so-card-top">
                <span className="mc-id">{repair.id}</span>
                <Badge>Completed</Badge>
              </div>
              <h3>{repair.motorcycle}</h3>
              <Info
                items={[
                  ["Customer", repair.customer],
                  ["Service performed", repair.services.join(", ")],
                  ["Date completed", repair.completion],
                  ["Parts used", repair.parts.join(", ") || "None"],
                ]}
              />
            </Card>
          ))
        ) : (
          <Empty text="No completed repairs yet" />
        )}
        <SectionTitle title="Completed tasks" />
        {completedTasks.length ? (
          completedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onView={() => go(`task-details/${task.id}`)}
            />
          ))
        ) : (
          <Empty text="No completed tasks yet" />
        )}
      </>
    )
  } else if (page === "account") {
    view = (
      <Card>
        <Info
          items={[
            ["Full name", mechanic.name],
            ["Mobile number", mechanic.phone],
            ["Email", mechanic.email],
            ["Specialization", mechanic.specialization],
            ["Skills", mechanic.skills],
            ["Years of experience", `${mechanic.experience} years`],
            ["Shop", data.profile.name],
            ["Employment", mechanic.employment],
          ]}
        />
      </Card>
    )
  } else if (page === "profile") {
    view = (
      <>
        <div className="mc-profile-hero">
          <Avatar mechanic={mechanic} large />
          <label className="so-button mc-profile-photo-action">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Upload profile photo"
              onChange={async (event) => {
                const input = event.currentTarget
                const file = input.files?.[0]
                input.value = ""
                if (!file) return
                try {
                  const photo = await readProfilePhoto(file)
                  setData((current) => ({
                    ...current,
                    mechanics: current.mechanics.map((item) =>
                      item.id === mechanic.id ? { ...item, photo } : item,
                    ),
                  }))
                  notify("Profile photo updated.")
                } catch (reason) {
                  notify(
                    reason instanceof Error
                      ? reason.message
                      : "Unable to update your profile photo.",
                  )
                }
              }}
            />
            <Camera size={14} />
            {mechanic.photo ? "Change profile photo" : "Upload profile photo"}
          </label>
          <h2>{mechanic.name}</h2>
          {user.displayId && <p>ID: {user.displayId}</p>}
          <Badge>
            {mechanic.status === "Inactive" ? "Inactive" : "Active"}
          </Badge>
        </div>
        <section className="mc-profile-settings">
          <h3>Profile</h3>
          <div className="mc-profile-links">
            <ProfileLink
              icon={UserRound}
              label="Account"
              detail="View your personal and work information"
              onClick={() => go("account")}
            />
          </div>
        </section>
        <section className="mc-profile-settings">
          <h3>Settings</h3>
          <div className="mc-profile-links">
          <ProfileLink
            icon={KeyRound}
            label="Change Password"
            detail="Update your MotoFix account password"
            onClick={() =>
              setDialog(
                <SimpleForm
                  title="Change password"
                  submit="Update Password"
                  fields={[
                    {
                      name: "current",
                      label: "Current password",
                      type: "password",
                    },
                    {
                      name: "next",
                      label: "New password",
                      type: "password",
                      minLength: 8,
                    },
                    {
                      name: "confirm",
                      label: "Confirm new password",
                      type: "password",
                      minLength: 8,
                    },
                  ]}
                  onCancel={() => setDialog(null)}
                  onSubmit={async (values) => {
                    if (values.next !== values.confirm) {
                      throw new Error("New passwords do not match.")
                    }
                    await changePassword(values.current, values.next)
                    setDialog(null)
                    notify("Your password was updated.")
                  }}
                />,
              )
            }
          />
          <ProfileLink
            icon={Bell}
            label="Notifications"
            detail="View task alerts and repair reminders"
            onClick={() => go("notifications")}
          />
          <ProfileLink
            icon={CircleHelp}
            label="Help & Support"
            detail="Get support from your shop"
            onClick={() => go("help")}
          />
          <ProfileLink
            icon={LogOut}
            label="Logout"
            detail="Sign out of this mechanic account"
            onClick={onLogout}
          />
        </div>
        </section>
        <div className="mc-permission-note">
          <ShieldCheck size={16} />
          <p>
            Mechanic accounts are managed by the shop owner. You cannot create,
            delete, or manage other mechanic accounts.
          </p>
        </div>
      </>
    )
  } else if (page === "notifications") {
    const notifications = [
      {
        title: "New task assigned",
        text: "Final road test was added to repair R-0241.",
        time: "Just now",
        route: "tasks",
        unread: true,
      },
      {
        title: "Task due today",
        text: "Replace spark plug is due today at 4:00 PM.",
        time: "18 min ago",
        route: "task-details/T-084",
        unread: true,
      },
      {
        title: "Repair progress reminder",
        text: "R-0241 is currently at 65%. Add an update for the customer.",
        time: "1 hr ago",
        route: "update-repair/R-0241",
        unread: false,
      },
      {
        title: "Shop announcement",
        text: "Complete all end-of-day safety checks before clocking out.",
        time: "Yesterday",
        route: "dashboard",
        unread: false,
      },
    ]
    view = (
      <>
        <p className="mc-list-count">{notifications.length} RECENT UPDATES</p>
        <div className="mc-notification-list">
          {notifications.map((notification) => (
            <Action
              className={`so-notification ${
                notification.unread ? "unread" : ""
              }`}
              key={notification.title}
              onClick={() => go(notification.route)}
            >
              {notification.unread && <i className="so-unread-dot" />}
              <span>
                <strong>{notification.title}</strong>
                <p>{notification.text}</p>
                <small>{notification.time}</small>
              </span>
              <ChevronRight size={15} />
            </Action>
          ))}
        </div>
      </>
    )
  } else {
    view = (
      <>
        <Card className="mc-support-card">
          <CircleHelp size={30} />
          <h2>How can we help?</h2>
          <p>
            For account access and work assignment questions, contact your shop
            owner or MotoFix support.
          </p>
        </Card>
        <Card>
          <Info
            items={[
              ["Shop", data.profile.name],
              ["Shop contact", data.profile.phone],
              ["MotoFix support", "support@motofix.demo"],
            ]}
          />
        </Card>
      </>
    )
  }

  const rootPages = ["dashboard", "tasks", "repairs", "profile"]
  const backRoute =
    page === "task-details"
      ? "repairs"
      : ["repair-details", "update-repair"].includes(page)
        ? page === "update-repair"
          ? `repair-details/${itemId}`
          : "repairs"
        : page === "history"
          ? "dashboard"
          : "profile"
  return (
    <div className="so-app mc-app">
      <header
        className={`so-header ${page === "dashboard" ? "dashboard" : ""}`}
      >
        {!rootPages.includes(page) && (
          <Action
            variant="icon"
            aria-label="Go back"
            onClick={() => go(backRoute)}
          >
            <ArrowLeft size={17} />
          </Action>
        )}
        {page === "dashboard" ? (
          <>
            <div className="so-header-shop">
              <Avatar mechanic={mechanic} />
              <div className="so-header-owner-details">
                <strong>{mechanic.name}</strong>
              </div>
            </div>
          </>
        ) : (
          <div>
            <h1>{titleMap[page] || "Mechanic Workspace"}</h1>
            <p>{data.profile.name}</p>
          </div>
        )}
        <Action
          variant="icon"
          className="so-bell"
          aria-label="Notifications"
          onClick={() => go("notifications")}
        >
          <Bell size={17} />
          <i />
        </Action>
      </header>
      <main className="so-content" ref={contentRef}>
        {view}
      </main>
      <nav className="mc-bottom-nav" aria-label="Mechanic navigation">
        <AccountBrand to="/mechanic/dashboard" />
        {[
          ["dashboard", "Dashboard", Wrench],
          ["repairs", "Repairs", Bike],
          ["profile", "Profile", UserRound],
        ].map(([route, label, Icon]) => {
          const NavIcon = Icon as typeof Wrench
          const active =
            page === route ||
            (route === "profile" && page === "account") ||
            (route === "repairs" &&
              ["tasks", "task-details", "repair-details", "update-repair"].includes(page))
          return (
            <Action
              key={String(route)}
              className={active ? "active" : ""}
              onClick={() => go(String(route))}
            >
              <NavIcon size={18} />
              <span>{String(label)}</span>
            </Action>
          )
        })}
      </nav>
      {toast && <div className="so-toast">{toast}</div>}
      {dialog && (
        <div className="so-dialog-backdrop" onMouseDown={() => setDialog(null)}>
          <div
            className="so-dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {dialog}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="so-section-heading">
      <h2>{title}</h2>
      {action && (
        <Action variant="text" onClick={onAction}>
          {action} <ChevronRight size={12} />
        </Action>
      )}
    </div>
  )
}

function Progress({ value }: { value: number }) {
  return (
    <>
      <div className="so-progress-label">
        <span>Repair progress</span>
        <strong>{value}%</strong>
      </div>
      <progress value={value} max="100" />
    </>
  )
}

function TaskCard({
  task,
  onView,
  actions,
}: {
  task: Task
  onView: () => void
  actions?: ReactNode
}) {
  return (
    <Card className="mc-task-card">
      <div className="so-card-top">
        <span className="mc-id">{task.repair}</span>
        <Badge>{task.status}</Badge>
      </div>
      <button className="mc-card-title" type="button" onClick={onView}>
        <span>
          <strong>{task.name}</strong>
          <small>
            {task.customer} · {task.motorcycle}
          </small>
        </span>
        <ChevronRight size={16} />
      </button>
      <div className="mc-card-meta">
        <Badge>{task.priority}</Badge>
        <span>
          <Clock3 size={12} /> Due {formatDate(task.due)}
        </span>
      </div>
      {actions && <div className="so-actions">{actions}</div>}
    </Card>
  )
}

function RepairCard({ repair, onView }: { repair: Repair; onView: () => void }) {
  return (
    <Card>
      <div className="so-card-top">
        <span className="mc-id">{repair.id}</span>
        <Badge>{repair.status}</Badge>
      </div>
      <button className="mc-card-title" type="button" onClick={onView}>
        <span>
          <strong>{repair.motorcycle}</strong>
          <small>{repair.customer}</small>
        </span>
        <ChevronRight size={16} />
      </button>
      <p className="so-muted">{repair.problem}</p>
      <Info
        items={[
          ["Assigned date", "Current assignment"],
          ["Status", repair.status],
        ]}
      />
      <Progress value={repair.progress} />
      <Action className="so-wide" onClick={onView}>
        View Repair
      </Action>
    </Card>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="so-empty">
      <ClipboardCheck size={29} />
      <strong>{text}</strong>
      <p>Your assigned work will appear here.</p>
    </div>
  )
}

function ProfileLink({
  icon: Icon,
  label,
  detail,
  onClick,
}: {
  icon: typeof Pencil
  label: string
  detail: string
  onClick: () => void
}) {
  return (
    <Action className="so-link-row" onClick={onClick}>
      <span className="so-row-icon">
        <Icon size={17} />
      </span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <ChevronRight size={15} />
    </Action>
  )
}

type Field = {
  name: string
  label: string
  type?: string
  value?: string
  minLength?: number
}
function SimpleForm({
  title,
  fields,
  submit,
  onSubmit,
  onCancel,
}: {
  title: string
  fields: Field[]
  submit: string
  onSubmit: (values: Record<string, string>) => void | Promise<void>
  onCancel: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  return (
    <>
      <h2>{title}</h2>
      <form
        className="so-form"
        onSubmit={async (event) => {
          event.preventDefault()
          if (busy) return
          setBusy(true)
          setError("")
          try {
            await onSubmit(
              Object.fromEntries(
                new FormData(event.currentTarget).entries(),
              ) as Record<string, string>,
            )
          } catch (reason) {
            setError(
              reason instanceof Error ? reason.message : "Unable to save this change.",
            )
          } finally {
            setBusy(false)
          }
        }}
      >
        {fields.map((field) => (
          <label className="so-field" key={field.name}>
            <span>{field.label}</span>
            {field.type === "textarea" ? (
              <textarea
                name={field.name}
                defaultValue={field.value}
                rows={4}
                required
              />
            ) : (
              <input
                name={field.name}
                type={field.type || "text"}
                defaultValue={field.value}
                minLength={field.minLength}
                required
              />
            )}
          </label>
        ))}
        {error && <p role="alert" className="so-error">{error}</p>}
        <div className="so-actions">
          <Action onClick={onCancel} disabled={busy}>Cancel</Action>
          <Action variant="primary" type="submit" disabled={busy}>
            {submit}
          </Action>
        </div>
      </form>
    </>
  )
}

function RepairUpdateForm({
  repair,
  onSave,
  onCancel,
}: {
  repair: Repair
  onSave: (values: Record<string, string>) => void
  onCancel: () => void
}) {
  const [progressValue, setProgressValue] = useState(repair.progress)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave(
      Object.fromEntries(
        new FormData(event.currentTarget).entries(),
      ) as Record<string, string>,
    )
  }
  return (
    <form className="so-form mc-update-form" onSubmit={submit}>
      <Card className="mc-update-summary">
        <span className="mc-id">{repair.id}</span>
        <h2>{repair.motorcycle}</h2>
        <p>{repair.customer}</p>
      </Card>
      <label className="so-field">
        <span>Repair status</span>
        <select name="status" defaultValue={repair.status}>
          {[
            "Diagnosing",
            "In Progress",
            "Waiting for Parts",
            "Ready for Pickup",
            "Completed",
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label className="so-field">
        <span>Repair progress: {progressValue}% current</span>
        <input
          name="progress"
          type="range"
          min="0"
          max="100"
          value={progressValue}
          onChange={(event) => setProgressValue(Number(event.target.value))}
        />
      </label>
      <label className="so-field">
        <span>Diagnosis</span>
        <textarea
          name="diagnosis"
          rows={3}
          defaultValue={repair.diagnosis}
          required
        />
      </label>
      <label className="so-field">
        <span>Mechanic notes</span>
        <textarea name="notes" rows={3} defaultValue={repair.notes} required />
      </label>
      <label className="so-field">
        <span>Services performed (comma separated)</span>
        <input
          name="services"
          defaultValue={repair.services.join(", ")}
          required
        />
      </label>
      <div className="mc-form-pair">
        <label className="so-field">
          <span>Part used</span>
          <input name="part" placeholder="Part name" />
        </label>
        <label className="so-field">
          <span>Quantity</span>
          <input name="quantity" type="number" min="1" defaultValue="1" />
        </label>
      </div>
      <label className="so-field">
        <span>Estimated completion</span>
        <input name="completion" defaultValue={repair.completion} required />
      </label>
      <label className="so-upload-label">
        <Camera size={17} />
        <span>Add repair photos</span>
        <input type="file" accept="image/*" multiple />
      </label>
      <div className="so-actions">
        <Action onClick={onCancel}>Cancel</Action>
        <Action variant="primary" type="submit">
          <Send size={14} /> Send Update to Customer
        </Action>
      </div>
    </form>
  )
}

function sendUpdate(
  repair: Repair,
  data: OwnerData,
  setData: React.Dispatch<React.SetStateAction<OwnerData>>,
  mechanic: MechanicRecord,
  notify: (message: string) => void,
) {
  setData({
    ...data,
    repairs: data.repairs.map((item) =>
      item.id === repair.id
        ? { ...item, updates: [...item.updates, "Customer update sent"] }
        : item,
    ),
    notices: [
      {
        id: id("N"),
        title: "Customer update sent",
        text: `${mechanic.name} sent an update for ${repair.id}.`,
        route: `repairs/${repair.id}`,
        read: false,
        kind: "repair",
      },
      ...data.notices,
    ],
  })
  notify("Update sent to customer and shop owner")
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: value.includes("T") ? "numeric" : undefined,
    minute: value.includes("T") ? "2-digit" : undefined,
  }).format(date)
}
