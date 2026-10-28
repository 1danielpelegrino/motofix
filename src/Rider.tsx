import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useLocation, useNavigate } from "react-router"
import { changePassword, getShopDirectory, type AppUser, type ShopDirectoryEntry } from "./api"
import Communication, { mechanicContact, ownerContact, riderContact } from "./Communication"
import ComplaintCenter from "./ComplaintCenter"
import AccountBrand from "./AccountBrand"
import ExpenseTracker from "./ExpenseTracker"
import Subscription, { subscriptionPlans, subscriptionPrices, useSubscription } from "./Subscription"
import PartsMarketplace from "./PartsMarketplace"
import DemoMap, { directionsUrl } from "./DemoMap"
import { additionalShops } from "./demoShops"
import { readProfilePhoto } from "./profilePhoto"
import { readCatalog } from "./partsCommerce"
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bike,
  Camera,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  CircleCheck,
  Clock3,
  Disc3,
  Heart,
  Home,
  MapPin,
  LogOut,
  Navigation,
  Package,
  Palette,
  Phone,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Store,
  UserRound,
  Wallet,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react"

type Shop = {
  id: string
  name: string
  rating: number
  reviews: number
  distance: number
  address: string
  open: boolean
  available: boolean
  services: string[]
  phone: string
  mapPosition?: [number, number]
}
type Booking = {
  id: string
  shop: string
  bike: string
  service: string
  problem: string
  date: string
  time: string
  cost: number
  duration: string
  status: "Upcoming" | "Ongoing" | "Completed" | "Cancelled"
}
type Part = {
  id: string
  name: string
  brand: string
  category: string
  models: string
  price: number
  stock: "Available" | "Limited Stock" | "Out of Stock"
  shops: string[]
}
type Profile = {
  name: string
  phone: string
  email: string
  bike: string
  plate: string
  year: string
  photo?: string
  address?: string
  city?: string
  postalCode?: string
}
type Motorcycle = {
  id: string
  bike: string
  plate: string
  year: string
  photo?: string
}
const demoShops: Shop[] = [
  {
    id: "motohub",
    name: "MotoHub Service Center",
    rating: 4.9,
    reviews: 128,
    distance: 1.2,
    address: "124 Street, New Visayas, Panabo City",
    open: true,
    available: true,
    services: [
      "Oil Change",
      "Brake Service",
      "General Maintenance",
      "Chain Service",
    ],
    phone: "+639171234567",
  },
  {
    id: "revline",
    name: "Revline Moto Garage",
    rating: 4.8,
    reviews: 86,
    distance: 2.4,
    address: "Street 120, Santo Niño, Panabo City",
    open: true,
    available: true,
    services: [
      "Engine Repair",
      "Electrical Repair",
      "Tire Replacement",
      "Oil Change",
    ],
    phone: "+639181234567",
  },
  {
    id: "pitstop",
    name: "Pitstop Motorcycle Care",
    rating: 4.6,
    reviews: 64,
    distance: 3.8,
    address: "Street 125, New Pandan, Panabo City",
    open: false,
    available: false,
    services: ["Brake Service", "Tire Replacement", "Chain Service"],
    phone: "+639191234567",
  },
  ...additionalShops,
]
const services = [
  "Oil Change",
  "Brake Service",
  "Tire Replacement",
  "Chain Service",
  "Engine Repair",
  "Electrical Repair",
  "General Maintenance",
]
const costs: Record<string, [number, string]> = {
  "Oil Change": [650, "45 minutes"],
  "Brake Service": [1250, "1–2 hours"],
  "Tire Replacement": [1800, "1 hour"],
  "Chain Service": [850, "1 hour"],
  "Engine Repair": [3500, "1–2 days"],
  "Electrical Repair": [1500, "2–3 hours"],
  "General Maintenance": [1200, "2 hours"],
}
const parts: Part[] = [
  {
    id: "pads",
    name: "Front Brake Pads",
    brand: "Brembo",
    category: "Brakes",
    models: "Yamaha NMAX 155, Aerox 155",
    price: 850,
    stock: "Available",
    shops: ["motohub", "pitstop"],
  },
  {
    id: "oil",
    name: "10W-40 Engine Oil · 1L",
    brand: "Motul",
    category: "Engine",
    models: "All 4-stroke motorcycles",
    price: 450,
    stock: "Available",
    shops: ["motohub", "revline"],
  },
  {
    id: "tire",
    name: "City Grip 2 Rear Tire",
    brand: "Michelin",
    category: "Tires",
    models: "Yamaha NMAX 155",
    price: 2850,
    stock: "Limited Stock",
    shops: ["revline"],
  },
  {
    id: "chain",
    name: "428 Drive Chain Kit",
    brand: "DID",
    category: "Drivetrain",
    models: "Honda Wave 125, Suzuki Raider 150",
    price: 1450,
    stock: "Out of Stock",
    shops: [],
  },
]
const workshop =
  "https://images.unsplash.com/photo-1762604462368-aa69fdbb482e?auto=format&fit=crop&w=700&q=80"
const initialBookings: Booking[] = [
  {
    id: "MF-2048",
    shop: "motohub",
    bike: "Yamaha NMAX 155",
    service: "Oil Change",
    problem: "Scheduled oil change and routine check.",
    date: "2026-10-05",
    time: "09:00",
    cost: 650,
    duration: "45 minutes",
    status: "Upcoming",
  },
  {
    id: "MF-2039",
    shop: "motohub",
    bike: "Yamaha NMAX 155",
    service: "Brake Service",
    problem: "Front brakes squeak and feel less responsive.",
    date: "2026-10-02",
    time: "10:00",
    cost: 1250,
    duration: "1–2 hours",
    status: "Ongoing",
  },
  {
    id: "MF-1920",
    shop: "revline",
    bike: "Yamaha NMAX 155",
    service: "General Maintenance",
    problem: "Periodic maintenance.",
    date: "2026-09-10",
    time: "09:00",
    cost: 1200,
    duration: "2 hours",
    status: "Completed",
  },
  {
    id: "MF-1901",
    shop: "pitstop",
    bike: "Yamaha NMAX 155",
    service: "Chain Service",
    problem: "Booking made in error.",
    date: "2026-09-01",
    time: "14:00",
    cost: 850,
    duration: "1 hour",
    status: "Cancelled",
  },
]
const timeline = [
  "Booking Confirmed",
  "Motorcycle Received",
  "Inspection",
  "Diagnosis",
  "Repair in Progress",
  "Parts Replaced",
  "Testing",
  "Completed",
  "Ready for Pickup",
]
const money = (amount: number) => `₱${amount.toLocaleString("en-PH")}`
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") ?? initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }, [key, value])
  return [value, setValue] as const
}
const panel = "rounded-[20px] border border-[#31597c] bg-[#123f65] p-4"
const muted = "text-[#b4cde2]"
const inputClass =
  "w-full rounded-xl border border-[#406687] bg-[#0b3153] px-3 py-3 text-sm text-[#edf5ff] outline-none focus:border-[#ffad76] [color-scheme:dark]"
function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  type = "button",
}: {
  children: ReactNode
  onClick?: () => void
  secondary?: boolean
  disabled?: boolean
  type?: "button" | "submit"
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 ${
        secondary
          ? "border border-[#eaa16f] bg-[#123f65] text-[#ffad76]"
          : "bg-[#ff9a50] text-[#082a4a] shadow-lg shadow-orange-950/10"
      }`}
    >
      {children}
    </button>
  )
}
function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-md border border-[#5e7a8e] bg-[#224d70] px-2 py-1 text-[10px] font-semibold text-[#ffe0c7]">
      {children}
    </span>
  )
}
function Section({
  title,
  action,
  onClick,
}: {
  title: string
  action?: string
  onClick?: () => void
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-[15px] font-bold text-[#edf5ff]">{title}</h2>
      {action && (
        <button
          onClick={onClick}
          className="text-[11px] font-semibold text-[#ffad76]"
        >
          {action} <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
  )
}
function Info({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="space-y-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 text-xs">
          <dt className={`${muted} shrink-0`}>{label}</dt>
          <dd className="text-right font-medium leading-relaxed text-[#edf5ff]">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-[#406687] bg-[#123f65] px-3 py-3">
      <Search size={17} className="shrink-0 text-[#ffad76]" />
      <input
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-xs text-[#edf5ff] outline-none placeholder:text-[#b4cde2]"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear search">
          <X size={15} />
        </button>
      )}
    </label>
  )
}
function PartImage({ part, large = false }: { part: Part; large?: boolean }) {
  const Graphic =
    part.category === "Brakes" || part.category === "Tires"
      ? Disc3
      : part.category === "Engine"
        ? Package
        : Settings2
  return (
    <div
      role="img"
      aria-label={`${part.name} illustration`}
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#235f89] to-[#0c2c49] text-[#ffad76] ${
        large ? "h-40 w-full" : "h-16 w-16"
      }`}
    >
      <Graphic size={large ? 82 : 34} strokeWidth={1.2} />
    </div>
  )
}

export default function Rider({ onLogout, user }: { onLogout: () => void; user: AppUser }) {
  const navigate = useNavigate()
  const location = useLocation()
  const segments = location.pathname.split("/").filter(Boolean)
  const page = segments[1] || "home"
  const subscription = useSubscription("rider", user.id)
  const [registeredShops, setRegisteredShops] = useState<Shop[]>([])
  const shops = useMemo(() => [...demoShops, ...registeredShops], [registeredShops])
  const [subscriptionTarget, setSubscriptionTarget] = useState<string | null>(null)
  const [subscriptionPlanIndex, setSubscriptionPlanIndex] = useState(0)
  const [confirmSubscriptionCancel, setConfirmSubscriptionCancel] = useState(false)
  const identifier = segments[2]
  const scrollRef = useRef<HTMLDivElement>(null)
  const [profile, setProfile] = useStored<Profile>("motofix-profile", {
    name: user.name || "Alex Santos",
    phone: user.phone || "0917 555 0123",
    email: user.email || "alex.santos@email.com",
    bike: "Yamaha NMAX 155",
    plate: "MC 2841",
    year: "2024",
    photo: "",
  })
  useEffect(() => {
    let active = true
    void getShopDirectory()
      .then(({ shops: entries }) => {
        if (active) setRegisteredShops(entries.map((entry: ShopDirectoryEntry) => ({
          id: entry.id,
          name: entry.name,
          phone: entry.phone,
          address: entry.address,
          services: entry.services,
          open: entry.open,
          available: entry.available,
          rating: entry.rating,
          reviews: entry.reviews,
          distance: entry.distance,
          mapPosition: entry.mapPosition,
        })))
      })
      .catch(() => {
        if (active) setRegisteredShops([])
      })
    return () => { active = false }
  }, [user.id])
  const [motorcycles, setMotorcycles] = useStored<Motorcycle[]>(
    "motofix-motorcycles",
    [
      {
        id: "primary-motorcycle",
        bike: profile.bike,
        plate: profile.plate,
        year: profile.year,
      },
    ],
  )
  const [bookings, setBookings] = useStored<Booking[]>(
    "motofix-bookings",
    initialBookings,
  )
  const [saved, setSaved] = useStored<string[]>("motofix-saved-shops", [
    "motohub",
  ])
  const [reservations, setReservations] = useStored<string[]>(
    "motofix-reservations",
    [],
  )
  const [profileDraft, setProfileDraft] = useState(profile)
  const [riderPreferences, setRiderPreferences] = useStored<{
    dashboardDensity: "Comfortable" | "Compact"
  }>("motofix-rider-preferences-v1", { dashboardDensity: "Comfortable" })
  const dashboardDensity = riderPreferences?.dashboardDensity === "Compact"
    ? "Compact"
    : "Comfortable"
  const [repairTeam] = useState(() => {
    try {
      const shared = JSON.parse(localStorage.getItem("motofix-owner-v1") || "null")
      const repair = shared?.repairs?.find((item: { customer: string; motorcycle: string; status: string }) => item.status !== "Completed" && (item.customer === profile.name || item.motorcycle === profile.bike))
        || shared?.repairs?.find((item: { id: string }) => item.id === "R-0241")
      const mechanic = shared?.mechanics?.find((item: { id: string }) => item.id === repair?.mechanic)
      return {
        rider: riderContact(repair?.customer || "Miguel Santos"),
        owner: ownerContact(shared?.profile?.name, shared?.profile?.phone),
        mechanic: mechanic ? mechanicContact(mechanic) : mechanicContact({ id: "M-01", name: "Marco Reyes", phone: "+63 917 456 7890" }),
      }
    } catch {
      return { rider: riderContact("Miguel Santos"), owner: ownerContact(), mechanic: mechanicContact({ id: "M-01", name: "Marco Reyes" }) }
    }
  })
  const repairContacts = <Communication actor={{ ...repairTeam.rider, name: profile.name }} contacts={[repairTeam.mechanic, repairTeam.owner]} />
  const [motorcycleDraft, setMotorcycleDraft] = useState({
    bike: "",
    plate: "",
    year: "",
    photo: "",
  })
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All")
  const [tab, setTab] = useState<Booking["status"]>("Upcoming")
  const [selectedShop, setSelectedShop] = useState("motohub")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    distance: "All",
    rating: "All",
    service: "All",
    open: false,
    available: false,
  })
  const [notice, setNotice] = useState("")
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [navigationStarted, setNavigationStarted] = useState(false)
  const [read, setRead] = useStored<boolean>(
    "motofix-notifications-read",
    false,
  )
  const [step, setStep] = useState(0)
  const today = new Date().toISOString().slice(0, 10)
  const [draft, setDraft] = useState({
    shop: "motohub",
    bike: profile.bike,
    service: "Oil Change",
    problem: "",
    date: today,
    time: "09:00",
  })
  const [rescheduleDate, setRescheduleDate] = useState(today)
  const [rescheduleTime, setRescheduleTime] = useState("09:00")
  const [cancelPrompt, setCancelPrompt] = useState(false)
  const shop =
    shops.find((item) => item.id === identifier) ||
    shops.find((item) => item.id === selectedShop)!
  const part = parts.find((item) => item.id === identifier) || parts[0]
  const booking = bookings.find((item) => item.id === identifier) || bookings[0]
  const bookingShop = shops.find((item) => item.id === booking.shop)!
  // Seeded examples do not consume the rider's three successful free bookings.
  const bookingLimitReached = bookings.filter((item) => !initialBookings.some((sample) => sample.id === item.id)).length >= 3
  const go = (target: string) => {
    if (!subscription.active && (target === "expenses" || (target === "book" && bookingLimitReached))) {
      setSubscriptionTarget(target)
      return
    }
    navigate(`/rider/${target}`)
  }
  useEffect(() => {
    if (!subscription.active && (page === "expenses" || (page === "book" && bookingLimitReached))) {
      setSubscriptionTarget(page)
    }
  }, [page, subscription.active, bookingLimitReached])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    setQuery("")
    setNotice("")
    setCancelPrompt(false)
    setNavigationStarted(false)
  }, [location.pathname])
  useEffect(() => {
    setProfileDraft(profile)
  }, [profile, page])
  const startBooking = (shopId?: string) => {
    setDraft({
      shop: shopId || selectedShop,
      bike: profile.bike,
      service: "Oil Change",
      problem: "",
      date: today,
      time: "09:00",
    })
    setStep(0)
    go("book")
  }
  const updateBooking = (changes: Partial<Booking>) =>
    setBookings((previous) =>
      previous.map((item) =>
        item.id === booking.id ? { ...item, ...changes } : item,
      ),
    )
  const searchQuery =
    query || new URLSearchParams(location.search).get("q") || ""
  const visibleShops = shops.filter(
    (item) =>
      `${item.name} ${item.services.join(" ")}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) &&
      (filters.distance === "All" ||
        item.distance <= Number(filters.distance)) &&
      (filters.rating === "All" || item.rating >= Number(filters.rating)) &&
      (filters.service === "All" || item.services.includes(filters.service)) &&
      (!filters.open || item.open) &&
      (!filters.available || item.available),
  )
  const visibleParts = parts.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      `${item.name} ${item.brand} ${item.models}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  )
  const upcoming = bookings.find((item) => item.status === "Upcoming")
  const titles: Record<string, string> = {
    home: "",
    search: "Search results",
    shops: "Find motor shops",
    shop: "Motor shop",
    parts: "Find motorcycle parts",
    part: "Part details",
    book: "Book a repair",
    confirmation: "Booking confirmed",
    bookings: "My bookings",
    expenses: "Expense Tracker",
    booking: "Booking details",
    reschedule: "Reschedule booking",
    repair: "Active repair",
    "repair-details": "Repair details",
    cost: "Repair cost",
    updates: "Repair updates",
    navigation: "Get directions",
    history: "Service history",
    notifications: "Notifications",
    profile: "My profile",
    settings: "Settings",
    edit: "Account",
    motorcycles: "My motorcycles",
    complaints: "Send a Complaint",
    saved: "Saved motor shops",
    security: "Security",
    help: "Help & support",
    subscriptions: "Subscriptions",
    billing: "Billing",
    customization: "Customization Preference",
  }
  const activeNav = page === "expenses" ? "expenses" : ["shops", "shop", "search", "navigation", "saved"].includes(page)
    ? "shops"
    : ["book", "bookings", "booking", "confirmation", "reschedule"].includes(
          page,
        )
      ? "bookings"
      : ["repair", "repair-details", "cost", "updates", "history"].includes(
            page,
          )
        ? "repair"
        : [
              "profile",
              "settings",
              "subscriptions",
              "billing",
              "customization",
              "edit",
              "motorcycles",
              "complaints",
              "security",
              "help",
              "notifications",
            ].includes(page)
          ? "profile"
          : "home"
  const shopCard = (item: Shop) => (
    <article key={item.id} className={panel}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold">{item.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-[11px]">
            <Star size={12} className="fill-[#ffad76] text-[#ffad76]" />{" "}
            {item.rating}{" "}
            <span className={muted}>
              ({item.reviews}) · {item.distance} km away
            </span>
          </p>
        </div>
        <button
          aria-label={saved.includes(item.id) ? "Unsave shop" : "Save shop"}
          className="p-1 text-[#ffad76]"
          onClick={() =>
            setSaved((previous) =>
              previous.includes(item.id)
                ? previous.filter((id) => id !== item.id)
                : [...previous, item.id],
            )
          }
        >
          <Heart
            size={18}
            fill={saved.includes(item.id) ? "currentColor" : "none"}
          />
        </button>
      </div>
      <p className={`mb-3 text-[10px] ${muted}`}>{item.services.join(" · ")}</p>
      <div className="flex items-center justify-between">
        <Badge>
          {item.open ? "Open now" : "Closed"}
          {item.available ? " · Slots available" : " · No slots"}
        </Badge>
        <button
          className="flex items-center gap-1 text-[11px] font-bold text-[#ffad76]"
          onClick={() => {
            setSelectedShop(item.id)
            go(`shop/${item.id}`)
          }}
        >
          View Shop <ChevronRight size={14} />
        </button>
      </div>
    </article>
  )
  const bookingCard = (item: Booking) => (
    <article key={item.id} className={panel}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] text-[#ffad76]">#{item.id}</span>
        <Badge>{item.status}</Badge>
      </div>
      <h3 className="text-sm font-bold">
        {shops.find((shopItem) => shopItem.id === item.shop)?.name}
      </h3>
      <p className={`mt-1 text-xs ${muted}`}>
        {item.service} · {item.bike}
      </p>
      <p className={`mt-3 flex items-center gap-1 text-[11px] ${muted}`}>
        <CalendarDays size={13} />
        {dateLabel(item.date)} · {item.time}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <strong className="text-sm text-[#ffad76]">
          {money(item.cost)}{" "}
          <small className={`text-[10px] font-normal ${muted}`}>
            estimated
          </small>
        </strong>
        <button
          className="text-[11px] font-semibold text-[#ffad76]"
          onClick={() => go(`booking/${item.id}`)}
        >
          View Details →
        </button>
      </div>
    </article>
  )
  const repairSummary = (
    <article className="rounded-[20px] border border-[#59738b] bg-gradient-to-br from-[#205983] to-[#123f65] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#ffad76]">
          Repair in progress
        </span>
        <Badge>60%</Badge>
      </div>
      <h3 className="mt-3 text-sm font-bold">Brake service · {profile.bike}</h3>
      <p className={`mt-1 text-[11px] ${muted}`}>
        MotoHub · Mechanic: Marco Reyes
      </p>
      <progress
        value={60}
        max={100}
        aria-label="Repair progress"
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[#082a4a] [&::-webkit-progress-value]:bg-[#ffad76] [&::-moz-progress-bar]:bg-[#ffad76]"
      />
      <div className="mt-3 flex justify-between text-[11px]">
        <span className={muted}>Est. ready today, 3:30 PM</span>
        <button
          onClick={() => go("repair")}
          className="font-bold text-[#ffad76]"
        >
          Track repair →
        </button>
      </div>
    </article>
  )
  const bookingRows: [string, ReactNode][] = [
    ["Booking number", booking.id],
    ["Motor shop", bookingShop.name],
    ["Motorcycle", booking.bike],
    ["Service", booking.service],
    ["Problem", booking.problem],
    ["Date", dateLabel(booking.date)],
    ["Time", booking.time],
    ["Estimated cost", money(booking.cost)],
    ["Estimated duration", booking.duration],
    ["Status", <Badge>{booking.status}</Badge>],
  ]
  const linkRow = (label: string, target: string, Graphic: LucideIcon) => (
    <button
      key={label}
      onClick={() => go(target)}
      className="flex w-full items-center gap-3 border-b border-[#31597c] py-4 text-left text-xs last:border-0"
    >
      <Graphic size={18} className="text-[#ffad76]" />
      <span className="flex-1">{label}</span>
      <ChevronRight size={15} className={muted} />
    </button>
  )
  let content: ReactNode

  switch (page) {
    case "home":
      content = (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[.15em] text-[#ffad76]">
                Your ride. In good hands.
              </p>
              <h1 className="mt-1 text-[25px] font-extrabold">
                Hello, {profile.name.split(" ")[0]}{" "}
                <span className="text-[#ffad76]">.</span>
              </h1>
            </div>
            <button
              aria-label="Notifications"
              onClick={() => go("notifications")}
              className="relative rounded-xl border border-[#31597c] bg-[#123f65] p-3"
            >
              <Bell size={19} />
              {!read && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#ffad76]" />
              )}
            </button>
          </div>
          <button
            onClick={() => go("motorcycles")}
            className="flex w-full items-center gap-3 rounded-[20px] border border-[#3c678b] bg-gradient-to-r from-[#195683] to-[#123f65] p-4 text-left"
          >
            <div className="rounded-xl bg-[#082a4a] p-3 text-[#ffad76]">
              <Bike size={32} />
            </div>
            <div className="flex-1">
              <p className={`text-[10px] ${muted}`}>
                MY MOTORCYCLES · {motorcycles.length}
              </p>
              <h2 className="mt-1 text-sm font-bold">{profile.bike}</h2>
              <p className={`mt-1 text-[10px] ${muted}`}>
                {profile.year} · {profile.plate}
              </p>
            </div>
            <ChevronRight size={17} />
          </button>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const target = query.trim()
                ? `/rider/search?q=${encodeURIComponent(query.trim())}`
                : "/rider/shops"
              navigate(target)
            }}
          >
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search motor shops, services, or parts."
            />
          </form>
          <div className="grid grid-cols-4 gap-2">
            {[
              ["Find Motor Shop", Store, () => query.trim()
                ? navigate(`/rider/search?q=${encodeURIComponent(query.trim())}`)
                : go("shops")],
              ["Find Parts", Package, () => query.trim()
                ? navigate(`/rider/parts?q=${encodeURIComponent(query.trim())}`)
                : go("parts")],
              ["Book Repair", CalendarDays, () => startBooking()],
              ["Track Repair", Wrench, () => go("repair")],
            ].map(([label, Graphic, action]) => {
              const ActionIcon = Graphic as LucideIcon
              return (
                <button
                  key={label as string}
                  onClick={action as () => void}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#416686] bg-[#16466e] text-[#ffad76]">
                    <ActionIcon size={22} strokeWidth={1.7} />
                  </span>
                  <span className="max-w-16 text-[10px] leading-snug">
                    {label as string}
                  </span>
                </button>
              )
            })}
          </div>
          <section>
            <Section
              title="Upcoming booking"
              action="View all"
              onClick={() => go("bookings")}
            />
            {upcoming ? (
              bookingCard(upcoming)
            ) : (
              <div className={panel}>
                <p className={`mb-3 text-xs ${muted}`}>
                  Your next ride deserves a little care.
                </p>
                <Button onClick={() => startBooking()}>Book a service</Button>
              </div>
            )}
          </section>
          <section>
            <Section title="Your active repair" />
            {repairSummary}
          </section>
          <section>
            <Section
              title="Shops around you"
              action="Explore"
              onClick={() => go("shops")}
            />
            <div className="space-y-3">{shops.slice(0, 2).map(shopCard)}</div>
          </section>
        </>
      )
      break
    case "search": {
      const term = searchQuery.trim().toLowerCase()
      const shopResults = shops.filter((item) =>
        `${item.name} ${item.services.join(" ")}`.toLowerCase().includes(term),
      )
      const partResults = readCatalog().parts.filter((item) =>
        `${item.name} ${item.brand} ${item.category} ${item.compatibility}`
          .toLowerCase()
          .includes(term),
      )
      content = (
        <div className="space-y-5">
          <p className={`text-xs ${muted}`}>
            Results for <strong className="text-[#edf5ff]">“{searchQuery}”</strong>
          </p>
          <section>
            <Section title={`Motor shops & services · ${shopResults.length}`} />
            {shopResults.map((item) => {
              const matchedServices = item.services.filter((service) =>
                service.toLowerCase().includes(term),
              )
              return (
                <button
                  key={item.id}
                  onClick={() => go(`shop/${item.id}`)}
                  className={`${panel} mb-3 flex w-full items-start gap-3 border border-[#31597c] text-left`}
                >
                  <Store size={19} className="mt-0.5 shrink-0 text-[#ffad76]" />
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm">{item.name}</strong>
                    <small className={`mt-1 block text-[10px] ${muted}`}>
                      {matchedServices.length
                        ? matchedServices.join(" · ")
                        : `${item.distance} km away · ★ ${item.rating}`}
                    </small>
                  </span>
                  <ChevronRight size={16} className="mt-1 shrink-0" />
                </button>
              )
            })}
            {!shopResults.length && (
              <p className={`rounded-xl border border-[#31597c] bg-[#123f65] p-3 text-xs ${muted}`}>
                No motor shops or services match this search.
              </p>
            )}
          </section>
          <section>
            <Section title={`Motorcycle parts · ${partResults.length}`} />
            {partResults.map((item) => (
              <button
                key={item.id}
                onClick={() => go(`parts?q=${encodeURIComponent(searchQuery)}`)}
                className={`${panel} mb-3 flex w-full items-start gap-3 border border-[#31597c] text-left`}
              >
                <Package size={19} className="mt-0.5 shrink-0 text-[#ffad76]" />
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm">{item.name}</strong>
                  <small className={`mt-1 block text-[10px] ${muted}`}>
                    {item.brand} · {item.category} · {money(item.price)}
                  </small>
                </span>
                <ChevronRight size={16} className="mt-1 shrink-0" />
              </button>
            ))}
            {!partResults.length && (
              <p className={`rounded-xl border border-[#31597c] bg-[#123f65] p-3 text-xs ${muted}`}>
                No motorcycle parts match this search.
              </p>
            )}
          </section>
          {!shopResults.length && !partResults.length && (
            <Button secondary onClick={() => go("shops")}>
              Browse all motor shops
            </Button>
          )}
        </div>
      )
      break
    }
    case "shops":
      content = (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchBar
                value={
                  query || new URLSearchParams(location.search).get("q") || ""
                }
                onChange={(value) => {
                  setQuery(value)
                  if (location.search)
                    navigate("/rider/shops", { replace: true })
                }}
                placeholder="Search shops or services"
              />
            </div>
            <button
              aria-label="Filter shops"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="rounded-xl border border-[#ffad76] p-3 text-[#ffad76]"
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
          {filtersOpen && (
            <div className={`${panel} space-y-3`}>
              <Section title="Filter shops" />
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Distance", "distance", ["All", "2", "5", "10"]],
                  ["Rating", "rating", ["All", "4.8", "4.5", "4"]],
                  ["Service", "service", ["All", ...services]],
                ].map(([label, key, options]) => (
                  <label key={key as string} className={`text-[11px] ${muted}`}>
                    {label as string}
                    <select
                      className={`${inputClass} mt-1`}
                      value={
                        filters[(key as "distance" | "rating" | "service")]
                      }
                      onChange={(event) =>
                        setFilters({
                          ...filters,
                          [key as string]: event.target.value,
                        })
                      }
                    >
                      {(options as string[]).map((value) => (
                        <option key={value} value={value}>
                          {value === "All"
                            ? "Any"
                            : key === "distance"
                              ? `Within ${value} km`
                              : key === "rating"
                                ? `${value}+ stars`
                                : value}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="flex gap-4 text-xs">
                <label>
                  <input
                    type="checkbox"
                    className="mr-2 accent-[#ffad76]"
                    checked={filters.open}
                    onChange={(event) =>
                      setFilters({ ...filters, open: event.target.checked })
                    }
                  />
                  Open Now
                </label>
                <label>
                  <input
                    type="checkbox"
                    className="mr-2 accent-[#ffad76]"
                    checked={filters.available}
                    onChange={(event) =>
                      setFilters({
                        ...filters,
                        available: event.target.checked,
                      })
                    }
                  />
                  Availability
                </label>
              </div>
              <button
                className="text-xs text-[#ffad76]"
                onClick={() =>
                  setFilters({
                    distance: "All",
                    rating: "All",
                    service: "All",
                    open: false,
                    available: false,
                  })
                }
              >
                Reset filters
              </button>
            </div>
          )}
          <DemoMap explorable shops={shops} selected={selectedShop} onSelect={setSelectedShop} />
          <button
            className="flex justify-between rounded-xl bg-[#16466e] p-3 text-left text-xs"
            onClick={() => go(`shop/${selectedShop}`)}
          >
            <span>{shops.find((item) => item.id === selectedShop)?.name}</span>
            <ChevronRight size={16} />
          </button>
          <Section title={`${visibleShops.length} nearby shops`} />
          {visibleShops.map(shopCard)}
          {!visibleShops.length && (
            <p className={muted}>
              No matching shops. Try adjusting your filters.
            </p>
          )}
        </>
      )
      break
    case "shop":
      content = (
        <>
          <img
            src={workshop}
            alt="Motorcycle being serviced in a workshop; illustrative shop photo"
            className="h-40 w-full rounded-[20px] object-cover"
          />
          <div>
            <div className="flex justify-between gap-2">
              <h2 className="text-xl font-bold">{shop.name}</h2>
              <button
                aria-label="Toggle saved shop"
                onClick={() =>
                  setSaved((previous) =>
                    previous.includes(shop.id)
                      ? previous.filter((id) => id !== shop.id)
                      : [...previous, shop.id],
                  )
                }
                className="text-[#ffad76]"
              >
                <Heart
                  size={21}
                  fill={saved.includes(shop.id) ? "currentColor" : "none"}
                />
              </button>
            </div>
            <p className="mt-2 flex items-center gap-1 text-xs text-[#ffad76]">
              <Star size={14} fill="currentColor" /> {shop.rating} ·{" "}
              {shop.reviews} reviews{" "}
              <span className={muted}>· {shop.distance} km</span>
            </p>
          </div>
          <div className={panel}>
            <Info
              rows={[
                ["Address", shop.address],
                ["Opening hours", "Mon–Sat, 8:00 AM–6:00 PM"],
                ["Status", shop.open ? "Open now" : "Closed today"],
                [
                  "Contact",
                  <a href={`tel:${shop.phone}`} className="text-[#ffad76]">
                    {shop.phone}
                  </a>,
                ],
              ]}
            />
          </div>
          <section>
            <Section title="Services & estimated prices" />
            <div className={`${panel} space-y-3`}>
              {shop.services.map((service) => (
                <div key={service} className="flex justify-between text-xs">
                  <span>{service}</span>
                  <span className="text-[#ffad76]">
                    from {money(costs[service][0])}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section>
            <Section
              title="Available parts"
              action="Browse parts"
              onClick={() => go("parts")}
            />
            <div className="space-y-2">
              {parts
                .filter((item) => item.shops.includes(shop.id))
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => go(`part/${item.id}`)}
                    className="flex w-full justify-between rounded-xl bg-[#16466e] p-3 text-xs"
                  >
                    <span>{item.name}</span>
                    <span className="text-[#ffad76]">{money(item.price)}</span>
                  </button>
                ))}
              {!parts.some((item) => item.shops.includes(shop.id)) && (
                <p className={`text-xs ${muted}`}>
                  Contact the shop for current inventory.
                </p>
              )}
            </div>
          </section>
          <section>
            <Section title="About the shop" />
            <p className={`text-xs leading-relaxed ${muted}`}>
              Friendly local specialists for everyday riders. {shop.name}{" "}
              provides honest estimates, quality parts, and clear updates from
              inspection to pickup.
            </p>
          </section>
          <section>
            <Section title="Rider reviews" />
            <div className={panel}>
              <p className="text-xs text-[#ffad76]">★★★★★ · Jamie R.</p>
              <p className={`mt-2 text-xs ${muted}`}>
                Clear pricing and helpful mechanics. My motorcycle runs
                smoothly again.
              </p>
              <p className={`mt-2 text-[10px] ${muted}`}>
                Sample review · September 2026
              </p>
            </div>
          </section>
          <Button
            disabled={!shop.available}
            onClick={() => startBooking(shop.id)}
          >
            Book Repair
          </Button>
          <Button secondary onClick={() => go(`navigation/${shop.id}`)}>
            <Navigation size={16} />
            Get Directions
          </Button>
        </>
      )
      break
    case "parts":
      content = <PartsMarketplace customer={profile.name} phone={profile.phone} initialSearch={searchQuery} subscriptionActive={subscription.active} />
      break
    case "part":
      content = <PartsMarketplace customer={profile.name} phone={profile.phone} subscriptionActive={subscription.active} />
      break
    case "book": {
      const stepNames = [
        "Choose a motor shop",
        "Select your motorcycle",
        "What service do you need?",
        "Describe the problem",
        "Choose a date",
        "Choose a time",
        "Review your booking",
      ]
      const selected = shops.find((item) => item.id === draft.shop)!
      const choices =
        step === 0
          ? shops
              .filter((item) => item.available)
              .map((item) => [
                item.id,
                item.name,
                `${item.distance} km · ★ ${item.rating}`,
              ])
          : step === 1
            ? motorcycles.map((motorcycle) => [
                motorcycle.bike,
                motorcycle.bike,
                `${motorcycle.year} · ${motorcycle.plate}`,
              ])
            : step === 2
              ? selected.services.map((item) => [
                  item,
                  item,
                  `${money(costs[item][0])} · ${costs[item][1]}`,
                ])
              : []
      const field = step === 0 ? "shop" : step === 1 ? "bike" : "service"
      const valid =
        step === 3
          ? draft.problem.trim().length > 0
          : step === 4
            ? Boolean(draft.date && draft.date >= today)
            : step === 5
              ? Boolean(
                  draft.time &&
                    (draft.date !== today ||
                      draft.time > new Date().toTimeString().slice(0, 5)),
                )
              : true
      content = (
        <>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#ffad76]">STEP {step + 1} OF 7</span>
            <span className={muted}>
              {Math.round(((step + 1) / 7) * 100)}% complete
            </span>
          </div>
          <div className="flex gap-1.5">
            {stepNames.map((name, index) => (
              <span
                key={name}
                className={`h-1 flex-1 rounded-full ${
                  index <= step ? "bg-[#ffad76]" : "bg-[#31597c]"
                }`}
              />
            ))}
          </div>
          <h2 className="text-xl font-bold">{stepNames[step]}</h2>
          {choices.map(([value, title, detail]) => (
            <button
              key={value}
              onClick={() =>
                setDraft({
                  ...draft,
                  [field]: value,
                  ...(step === 0
                    ? {
                        service: shops.find((item) => item.id === value)!
                          .services[0],
                      }
                    : {}),
                })
              }
              className={`${panel} flex w-full items-center justify-between text-left ${
                draft[field] === value ? "border-[#ffad76]!" : ""
              }`}
            >
              <span>
                <span className="block text-sm font-bold">{title}</span>
                <span className={`mt-1 block text-xs ${muted}`}>{detail}</span>
              </span>
              {draft[field] === value && (
                <CircleCheck size={20} className="text-[#ffad76]" />
              )}
            </button>
          ))}
          {step === 3 && (
            <label className="space-y-2 text-xs">
              <span>Tell the mechanic what you noticed</span>
              <textarea
                required
                maxLength={1000}
                className={`${inputClass} mt-2 min-h-36`}
                placeholder="For example: My front brake squeaks when slowing down…"
                value={draft.problem}
                onChange={(event) =>
                  setDraft({ ...draft, problem: event.target.value })
                }
              />
              <span className={muted}>
                Include symptoms, when they started, and any recent repairs.
              </span>
            </label>
          )}
          {step === 4 && (
            <>
              <label className="text-xs">
                Preferred date
                <input
                  type="date"
                  className={`${inputClass} mt-2`}
                  min={today}
                  value={draft.date}
                  onChange={(event) =>
                    setDraft({ ...draft, date: event.target.value })
                  }
                />
              </label>
              <p className={`text-xs ${muted}`}>
                Select today or a future date. Demo slots are not live shop
                availability.
              </p>
            </>
          )}
          {step === 5 && (
            <>
              <p className={`text-xs ${muted}`}>
                {dateLabel(draft.date)} · Select a preferred slot
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  "09:00",
                  "10:00",
                  "11:00",
                  "13:00",
                  "14:00",
                  "15:00",
                  "16:00",
                ].map((time) => (
                  <button
                    key={time}
                    disabled={
                      draft.date === today &&
                      time <= new Date().toTimeString().slice(0, 5)
                    }
                    onClick={() => setDraft({ ...draft, time })}
                    className={`rounded-xl border p-3 text-sm disabled:opacity-30 ${
                      draft.time === time
                        ? "border-[#ffad76] bg-[#ffad76] text-[#082a4a]"
                        : "border-[#406687] bg-[#123f65]"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 6 && (
            <>
              <div className={panel}>
                <Info
                  rows={[
                    ["Motor shop", selected.name],
                    ["Motorcycle", draft.bike],
                    ["Service", draft.service],
                    ["Problem", draft.problem],
                    ["Date", dateLabel(draft.date)],
                    ["Time", draft.time],
                    ["Estimated cost", money(costs[draft.service][0])],
                    ["Duration", costs[draft.service][1]],
                  ]}
                />
              </div>
              <p className={`text-[11px] leading-relaxed ${muted}`}>
                This is a demo booking. Final pricing may change after
                inspection and your approval.
              </p>
            </>
          )}
          <div className="mt-5 flex gap-3">
            {step > 0 && (
              <Button secondary onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <Button
              disabled={!valid}
              onClick={() => {
                if (step < 6) setStep(step + 1)
                else {
                  if (!subscription.active && bookingLimitReached) {
                    setSubscriptionTarget("book")
                    return
                  }
                  const created: Booking = {
                    ...draft,
                    id: `MF-${Date.now().toString().slice(-7)}`,
                    cost: costs[draft.service][0],
                    duration: costs[draft.service][1],
                    status: "Upcoming",
                  }
                  setBookings([created, ...bookings])
                  go(`confirmation/${created.id}`)
                }
              }}
            >
              {step === 6 ? (
                "Confirm Booking"
              ) : (
                <>
                  Continue <ArrowRight size={15} />
                </>
              )}
            </Button>
          </div>
        </>
      )
      break
    }
    case "confirmation":
      content = (
        <>
          <div className="py-3 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-[#ffad76] bg-[#20537a] text-[#ffad76]">
              <CircleCheck size={43} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold">Booking Confirmed</h2>
            <p className={`mt-2 text-xs ${muted}`}>
              Your next service is on the calendar.
            </p>
          </div>
          <div className={panel}>
            <Info
              rows={bookingRows.filter(
                ([label]) =>
                  ![
                    "Problem",
                    "Motorcycle",
                    "Estimated duration",
                    "Status",
                  ].includes(label),
              )}
            />
          </div>
          <Button onClick={() => go(`booking/${booking.id}`)}>
            View Booking
          </Button>
          <Button secondary onClick={() => go(`navigation/${booking.shop}`)}>
            Get Directions
          </Button>
          <p className={`text-center text-[10px] ${muted}`}>
            Demo confirmation · No real shop request sent
          </p>
        </>
      )
      break
    case "bookings":
      content = (
        <>
          <div className="flex gap-1 rounded-xl bg-[#082a4a] p-1">
            {["Upcoming", "Ongoing", "Completed", "Cancelled"].map((status) => (
              <button
                key={status}
                onClick={() => setTab(status as Booking["status"])}
                className={`flex-1 rounded-lg px-1 py-2.5 text-[10px] ${
                  tab === status
                    ? "bg-[#ffad76] font-bold text-[#082a4a]"
                    : muted
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          {bookings.filter((item) => item.status === tab).map(bookingCard)}
          {!bookings.some((item) => item.status === tab) && (
            <div className={`${panel} py-8 text-center`}>
              <CalendarDays className="mx-auto mb-3 text-[#ffad76]" />
              <p className={`text-xs ${muted}`}>
                No {tab.toLowerCase()} bookings yet.
              </p>
            </div>
          )}
          <Button onClick={() => startBooking()}>Book a Repair</Button>
        </>
      )
      break
    case "booking":
      content = (
        <>
          <div className={panel}>
            <Info rows={bookingRows} />
          </div>
          <div className={panel}>
            <Section title="Shop information" />
            <p className={`mb-3 text-xs ${muted}`}>{bookingShop.address}</p>
            <a
              href={`tel:${bookingShop.phone}`}
              className="flex items-center gap-2 text-xs text-[#ffad76]"
            >
              <Phone size={14} />
              {bookingShop.phone}
            </a>
          </div>
          {booking.status === "Upcoming" && (
            <>
              <Button
                onClick={() => {
                  setRescheduleDate(booking.date)
                  setRescheduleTime(booking.time)
                  go(`reschedule/${booking.id}`)
                }}
              >
                Reschedule
              </Button>
              {cancelPrompt ? (
                <div className={panel}>
                  <p className="mb-3 text-xs">
                    Cancel this booking? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button secondary onClick={() => setCancelPrompt(false)}>
                      Keep booking
                    </Button>
                    <Button
                      onClick={() => {
                        updateBooking({ status: "Cancelled" })
                        setCancelPrompt(false)
                        setNotice("Booking cancelled.")
                      }}
                    >
                      Yes, cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button secondary onClick={() => setCancelPrompt(true)}>
                  Cancel Booking
                </Button>
              )}
            </>
          )}
          {booking.status === "Ongoing" && (
            <Button onClick={() => go("repair")}>Track Active Repair</Button>
          )}
          {booking.status === "Completed" && (
            <Button onClick={() => go(`repair-details/${booking.id}`)}>
              View Repair Details
            </Button>
          )}
          <Button secondary onClick={() => go(`navigation/${booking.shop}`)}>
            Get Directions
          </Button>
          <a
            className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-[#ffad76]"
            href={`tel:${bookingShop.phone}`}
          >
            <Phone size={16} />
            Contact Shop
          </a>
        </>
      )
      break
    case "reschedule":
      content = (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (booking.status !== "Upcoming") return
            updateBooking({ date: rescheduleDate, time: rescheduleTime })
            go(`booking/${booking.id}`)
          }}
        >
          <p className={`text-xs ${muted}`}>
            Choose a new date and time for #{booking.id}.
          </p>
          <label className="block text-xs">
            Preferred date
            <input
              required
              type="date"
              min={today}
              className={`${inputClass} mt-2`}
              value={rescheduleDate}
              onChange={(event) => setRescheduleDate(event.target.value)}
            />
          </label>
          <label className="block text-xs">
            Preferred time
            <select
              className={`${inputClass} mt-2`}
              value={rescheduleTime}
              onChange={(event) => setRescheduleTime(event.target.value)}
            >
              {[
                "09:00",
                "10:00",
                "11:00",
                "13:00",
                "14:00",
                "15:00",
                "16:00",
              ].map((time) => (
                <option
                  disabled={
                    rescheduleDate === today &&
                    time <= new Date().toTimeString().slice(0, 5)
                  }
                  key={time}
                >
                  {time}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="submit"
            disabled={
              rescheduleDate < today ||
              (rescheduleDate === today &&
                rescheduleTime <= new Date().toTimeString().slice(0, 5))
            }
          >
            Save new schedule
          </Button>
        </form>
      )
      break
    case "repair":
      content = (
        <>
          {repairSummary}
          {repairContacts}
          <div className={panel}>
            <Info
              rows={[
                ["Repair number", "RP-1039"],
                ["Motorcycle", profile.bike],
                ["Shop", "MotoHub Service Center"],
                ["Assigned mechanic", "Marco Reyes"],
                ["Current status", "Repair in Progress"],
                ["Progress", "60%"],
                ["Est. completion", "Today, 3:30 PM"],
              ]}
            />
          </div>
          <section>
            <Section title="Your repair journey" />
            <div className={panel}>
              {timeline.map((status, index) => (
                <div
                  key={status}
                  className="relative flex items-start gap-3 pb-5 last:pb-0"
                >
                  {index < timeline.length - 1 && (
                    <span
                      className={`absolute left-[11px] top-6 h-5 w-px ${
                        index < 4 ? "bg-[#ffad76]" : "bg-[#426887]"
                      }`}
                    />
                  )}
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      index <= 4
                        ? "border-[#ffad76] bg-[#ffad76] text-[#082a4a]"
                        : "border-[#426887] text-[#83a3bd]"
                    }`}
                  >
                    {index < 4 ? (
                      <Check size={13} />
                    ) : (
                      <span className="text-[10px]">{index + 1}</span>
                    )}
                  </span>
                  <span
                    className={`pt-1 text-xs ${
                      index === 4
                        ? "font-bold text-[#ffad76]"
                        : index > 4
                          ? muted
                          : "text-[#edf5ff]"
                    }`}
                  >
                    {status}
                    {index === 4 && (
                      <span
                        className={`mt-1 block text-[10px] font-normal ${muted}`}
                      >
                        Brake pads being replaced
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <Button onClick={() => go("repair-details")}>
            View Repair Details
          </Button>
          <Button secondary onClick={() => go("updates")}>
            View Mechanic Updates
          </Button>
          <Button secondary onClick={() => go("cost")}>
            View Repair Cost
          </Button>
        </>
      )
      break
    case "repair-details": {
      const historical = identifier
        ? bookings.find(
            (item) => item.id === identifier && item.status === "Completed",
          )
        : undefined
      content = (
        <>
          <div className={panel}>
            <Info
              rows={[
                [
                  "Repair number",
                  historical ? `RP-${historical.id.slice(3)}` : "RP-1039",
                ],
                ["Motorcycle", historical?.bike || profile.bike],
                [
                  "Shop",
                  historical
                    ? shops.find((item) => item.id === historical.shop)!.name
                    : shops[0].name,
                ],
                [
                  "Assigned mechanic",
                  historical ? "Luis Garcia" : "Marco Reyes",
                ],
                [
                  "Reported problem",
                  historical?.problem ||
                    "Front brake squeaks; reduced braking response",
                ],
                [
                  "Diagnosis",
                  historical
                    ? "Routine service; no additional faults"
                    : "Front brake pads worn below safe thickness",
                ],
                [
                  "Services performed",
                  historical?.service || "Brake inspection, caliper cleaning",
                ],
                [
                  "Parts replaced",
                  historical
                    ? "Engine oil, oil filter"
                    : "Front brake pads (in progress)",
                ],
                [
                  "Mechanic notes",
                  historical
                    ? "Road-tested and ready for riding."
                    : "Rotor in good condition. Testing to follow.",
                ],
                [
                  "Repair progress",
                  historical ? "100% · Completed" : "60% · Repair in Progress",
                ],
                ["Estimated cost", money(historical?.cost || 1250)],
                [
                  "Final cost",
                  historical ? money(historical.cost) : "Pending completion",
                ],
              ]}
            />
          </div>
          <Button
            secondary
            onClick={() => go(historical ? `cost/${historical.id}` : "cost")}
          >
            View Cost Breakdown
          </Button>
          {!historical && (
            <>
              {repairContacts}
              <Button onClick={() => go("updates")}>View Updates</Button>
            </>
          )}
        </>
      )
      break
    }
    case "cost": {
      const historical = identifier
        ? bookings.find(
            (item) => item.id === identifier && item.status === "Completed",
          )
        : undefined
      content = (
        <>
          <Badge>
            {historical ? "Final invoice" : "Estimate · Final invoice pending"}
          </Badge>
          <section>
            <Section title="Parts used" />
            <div className={panel}>
              <Info
                rows={
                  historical
                    ? [
                        ["Engine oil · Qty 1", money(450)],
                        ["Oil filter · Qty 1", money(250)],
                      ]
                    : [["Brembo brake pads · Qty 1", money(850)]]
                }
              />
            </div>
          </section>
          <section>
            <Section title="Labor" />
            <div className={panel}>
              <Info
                rows={[
                  [
                    historical
                      ? "General maintenance"
                      : "Brake service & testing",
                    money(historical ? 500 : 400),
                  ],
                ]}
              />
            </div>
          </section>
          <div className="rounded-[20px] border border-[#ffad76] bg-[#16466e] p-4">
            <Info
              rows={[
                ["Estimated Total", money(historical?.cost || 1250)],
                [
                  "Final Total",
                  historical ? money(historical.cost) : "Pending completion",
                ],
              ]}
            />
          </div>
          <p className={`text-xs leading-relaxed ${muted}`}>
            {historical
              ? "Sample completed service invoice."
              : "The final total will be available after testing. Any extra work requires your approval."}
          </p>
        </>
      )
      break
    }
    case "updates":
      content = (
        <>
          <p className={`text-xs ${muted}`}>
            RP-1039 · Updates from Marco Reyes
          </p>
          {[
            ["Brake pad replacement in progress", "Oct 2, 2026", "1:15 PM"],
            ["Brake pads need replacement", "Oct 2, 2026", "12:30 PM"],
            ["Inspection completed", "Oct 2, 2026", "11:45 AM"],
            ["Motorcycle received", "Oct 2, 2026", "10:05 AM"],
          ].map(([message, date, time], index) => (
            <article key={message} className={panel}>
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#225b86] text-[#ffad76]">
                  {index === 0 ? (
                    <Wrench size={16} />
                  ) : (
                    <CheckCheck size={16} />
                  )}
                </span>
                <div>
                  <p className="text-xs font-semibold">{message}</p>
                  <p className={`mt-2 text-[10px] ${muted}`}>
                    {date} · {time}
                  </p>
                  <p className="mt-1 text-[10px] text-[#ffad76]">
                    Marco Reyes · Mechanic
                  </p>
                </div>
              </div>
            </article>
          ))}
          <div className={`${panel} text-xs ${muted}`}>
            <p className="mb-2 font-semibold text-[#edf5ff]">Coming next</p>
            Brake pads replaced → Testing in progress → Repair completed. Future
            updates appear here when the mechanic posts them.
          </div>
        </>
      )
      break
    case "navigation":
      content = (
        <>
          <DemoMap
            explorable
            shops={shops}
            selected={shop.id}
            onSelect={(id) => { setNavigationStarted(false); go(`navigation/${id}`) }}
            route
            started={navigationStarted}
          />
          <div className={panel}>
            <div className="mb-4 flex gap-3">
              <MapPin className="shrink-0 text-[#73c6ff]" size={18} />
              <div>
                <p className="text-xs font-semibold">Your current location</p>
                <p className={`mt-1 text-[10px] ${muted}`}>
                  DNSC, New Visayas, Panabo City
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Store className="shrink-0 text-[#ffad76]" size={18} />
              <div>
                <p className="text-xs font-semibold">{shop.name}</p>
                <p className={`mt-1 text-[10px] ${muted}`}>{shop.address}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={`${panel} text-center`}>
              <p className="text-xl font-bold text-[#ffad76]">
                {shop.distance} km
              </p>
              <p className={`mt-1 text-[10px] ${muted}`}>Estimated distance</p>
            </div>
            <div className={`${panel} text-center`}>
              <p className="text-xl font-bold text-[#ffad76]">
                {Math.ceil(shop.distance * 5)} min
              </p>
              <p className={`mt-1 text-[10px] ${muted}`}>
                Estimated travel time
              </p>
            </div>
          </div>
          <Button onClick={() => setNavigationStarted(!navigationStarted)}>
            <Navigation size={17} />
            {navigationStarted ? "Stop Demo Navigation" : "Start Demo Navigation"}
          </Button>
          <a
            href={directionsUrl(shop.address)}
            target="_blank"
            rel="noreferrer"
            className="text-center text-xs font-bold text-[#ffad76]"
          >
            Open real directions in Google Maps ↗
          </a>
        </>
      )
      break
    case "history":
      content = (
        <>
          {bookings
            .filter((item) => item.status === "Completed")
            .map((item) => (
              <article key={item.id} className={panel}>
                <p className="text-[10px] text-[#ffad76]">
                  {dateLabel(item.date)}
                </p>
                <h3 className="mt-2 text-sm font-bold">{item.service}</h3>
                <p className={`mt-1 text-xs ${muted}`}>
                  {shops.find((shopItem) => shopItem.id === item.shop)?.name}
                </p>
                <p className={`mt-3 text-[11px] ${muted}`}>
                  Parts replaced: Engine oil, oil filter
                </p>
                <div className="mt-4 flex justify-between">
                  <strong className="text-sm text-[#ffad76]">
                    {money(item.cost)} total
                  </strong>
                  <button
                    className="text-xs text-[#ffad76]"
                    onClick={() => go(`repair-details/${item.id}`)}
                  >
                    View Details →
                  </button>
                </div>
              </article>
            ))}
          {!bookings.some((item) => item.status === "Completed") && (
            <p className={muted}>No completed repairs yet.</p>
          )}
        </>
      )
      break
    case "notifications":
      content = (
        <>
          <div className="flex items-center justify-between">
            <p className={`text-xs ${muted}`}>Sample activity feed</p>
            <button
              className="text-[11px] text-[#ffad76]"
              onClick={() => setRead(true)}
            >
              {read ? "All read" : "Mark all read"}
            </button>
          </div>
          {[
            [
              "Repair update",
              "Marco is replacing your front brake pads.",
              "Today · 1:15 PM",
              "updates",
            ],
            [
              "Cost updated",
              "Your brake service estimate is ₱1,250.",
              "Today · 12:35 PM",
              "cost",
            ],
            [
              "Part replacement",
              "Front brake pads approved for replacement.",
              "Today · 12:30 PM",
              "repair-details",
            ],
            [
              "Repair started",
              "Your motorcycle is being inspected.",
              "Today · 10:15 AM",
              "repair",
            ],
            [
              "Booking reminder",
              "Oil change on Oct 5 at 9:00 AM.",
              "Today · 8:00 AM",
              "booking/MF-2048",
            ],
            [
              "Booking accepted",
              "MotoHub accepted your oil change booking.",
              "Yesterday · 4:00 PM",
              "booking/MF-2048",
            ],
            [
              "Booking rejected",
              "Pitstop could not accept your requested slot.",
              "Sep 12 · 2:00 PM",
              "shops",
            ],
            [
              "Repair completed",
              "General maintenance is complete.",
              "Sep 10 · 11:00 AM",
              "repair-details/MF-1920",
            ],
            [
              "Ready for pickup",
              "Your motorcycle is ready at Revline Garage.",
              "Sep 10 · 11:15 AM",
              "navigation/revline",
            ],
          ].map(([title, message, time, target], index) => (
            <button
              key={title}
              onClick={() => go(target)}
              className={`${panel} flex w-full gap-3 text-left`}
            >
              <span className="relative h-fit rounded-xl bg-[#225b86] p-2 text-[#ffad76]">
                <Bell size={16} />
                {!read && index < 2 && (
                  <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-[#ffad76]" />
                )}
              </span>
              <span>
                <strong className="block text-xs">{title}</strong>
                <span
                  className={`mt-1 block text-[11px] leading-relaxed ${muted}`}
                >
                  {message}
                </span>
                <span className="mt-2 block text-[10px] text-[#ffad76]">
                  {time}
                </span>
              </span>
            </button>
          ))}
        </>
      )
      break
    case "expenses":
      content = subscription.active ? <ExpenseTracker motorcycles={motorcycles.map((motorcycle) => motorcycle.bike)} /> : <Button onClick={() => setSubscriptionTarget("expenses")}>Subscribe to unlock Expense Tracker</Button>
      break
    case "subscriptions":
      content = (
        <>
          <section className={`${panel} space-y-3`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">Current subscription</h2>
              <Badge>{subscription.active ? "Active" : subscription.cancelled ? "Cancelled" : subscription.plan ? "Expired" : "Not subscribed"}</Badge>
            </div>
            <p className="text-base font-bold">{subscription.active ? `${subscription.plan} rider plan` : subscription.cancelled ? "Your subscription is cancelled" : subscription.plan ? `${subscription.plan} plan expired` : "No active subscription"}</p>
            {subscription.active && <p className={`text-xs ${muted}`}>Active through {new Date(subscription.expiresAt).toLocaleDateString()}.</p>}
            <p className={`text-xs leading-relaxed ${muted}`}>Choose a plan below to unlock shop subscription benefits.</p>
            {subscription.active && (confirmSubscriptionCancel ? (
              <div className="space-y-3 rounded-xl border border-[#eaa16f] p-3">
                <p className="text-xs">Cancel this plan now? Subscription features will be locked immediately.</p>
                <Button onClick={() => {
                  if (subscription.cancel()) {
                    setConfirmSubscriptionCancel(false)
                    setNotice("Subscription cancelled. Rider plan features are now locked.")
                  } else setNotice("Unable to cancel the demo subscription. Check browser storage and try again.")
                }}>Confirm cancellation</Button>
                <Button secondary onClick={() => setConfirmSubscriptionCancel(false)}>Keep subscription</Button>
              </div>
            ) : <Button secondary onClick={() => setConfirmSubscriptionCancel(true)}>Cancel subscription</Button>)}
          </section>
          <Section title="Available subscription types" />
          <div className="so-subscription-options">
          {subscriptionPlans.map((plan, index) => (
            <article key={plan.label} className={`${panel} so-subscription-option`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold">{plan.label}</h2>
                {subscription.active && subscription.plan === plan.label && <Badge>Current plan</Badge>}
              </div>
              <p className="text-xl font-bold text-[#ffad76]">{money(subscriptionPrices.rider[index])}</p>
              <p className={`text-xs ${muted}`}>{plan.months} {plan.months === 1 ? "month" : "months"} · one-time demo payment</p>
              <ul className="space-y-2 text-xs">
                <li className="flex gap-2"><CheckCircle2 size={15} className="shrink-0 text-[#ffad76]" />Unlimited repair bookings</li>
                <li className="flex gap-2"><CheckCircle2 size={15} className="shrink-0 text-[#ffad76]" />Expense Tracker access</li>
                <li className="flex gap-2"><CheckCircle2 size={15} className="shrink-0 text-[#ffad76]" />No ₱2 MotoFix fee on motorcycle-part purchases while active</li>
              </ul>
              <Button onClick={() => {
                setSubscriptionPlanIndex(index)
                setSubscriptionTarget("subscriptions")
              }}>
                {subscription.active
                  ? subscription.plan === plan.label ? "Renew this plan" : "Switch to this plan"
                  : "Choose this plan"}
              </Button>
            </article>
          ))}
          </div>
        </>
      )
      break
    case "billing":
      content = (
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault()
          setProfile({
            ...profile,
            name: profileDraft.name.trim(),
            email: profileDraft.email.trim(),
            phone: profileDraft.phone.trim(),
            address: profileDraft.address?.trim() || "",
            city: profileDraft.city?.trim() || "",
            postalCode: profileDraft.postalCode?.trim() || "",
          })
          setNotice("Billing details saved for demo checkout.")
        }}>
          <p className={`text-xs leading-relaxed ${muted}`}>Saved billing details prefill your simulated MotoFix checkout. No payment is processed.</p>
          {([
            ["Full name", "name", "text"],
            ["Email address", "email", "email"],
            ["Mobile number", "phone", "tel"],
            ["Billing address", "address", "text"],
            ["City", "city", "text"],
            ["Postal code", "postalCode", "text"],
          ] as const).map(([label, key, type]) => (
            <label key={key} className="block text-xs">
              {label}
              <input
                required
                type={type}
                className={`${inputClass} mt-2`}
                value={profileDraft[key] || ""}
                onChange={(event) => setProfileDraft({ ...profileDraft, [key]: event.target.value })}
              />
            </label>
          ))}
          <Button type="submit">Save Billing Details</Button>
        </form>
      )
      break
    case "customization":
      content = (
        <section className={`${panel} space-y-3`}>
          <h2 className="text-sm font-bold">Dashboard spacing</h2>
          <p className={`text-xs leading-relaxed ${muted}`}>Choose how much space to show between items on your rider home screen.</p>
          {(["Comfortable", "Compact"] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              aria-pressed={dashboardDensity === choice}
              onClick={() => {
                setRiderPreferences({ dashboardDensity: choice })
                setNotice(`${choice} dashboard spacing saved.`)
              }}
              className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs ${dashboardDensity === choice ? "border-[#ffad76] bg-[#16466e]" : "border-[#406687] bg-[#0b3153]"}`}
            >
              {choice}
              {dashboardDensity === choice && <Check size={16} className="text-[#ffad76]" />}
            </button>
          ))}
        </section>
      )
      break
    case "profile":
      content = (
        <>
          <div className="py-2 text-center">
            <div
              role="img"
              aria-label={`${profile.name} profile avatar`}
              className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-[26px] border-2 border-[#ffad76] bg-[#225b86] text-2xl font-bold text-[#ffad76]"
            >
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt={`${profile.name} profile photo`}
                  className="h-full w-full object-cover"
                />
              ) : (
                profile.name
                  .split(" ")
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join("")
              )}
            </div>
            <label className="mx-auto mt-3 inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#406687] bg-[#0b3153] px-3 text-xs font-semibold text-[#edf5ff]">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Upload profile photo"
                onChange={async (event) => {
                  const file = event.currentTarget.files?.[0]
                  event.currentTarget.value = ""
                  if (!file) return
                  try {
                    const photo = await readProfilePhoto(file)
                    setProfile((current) => ({ ...current, photo }))
                    setNotice("Profile photo updated.")
                  } catch (reason) {
                    setNotice(
                      reason instanceof Error
                        ? reason.message
                        : "Unable to update your profile photo.",
                    )
                  }
                }}
              />
              <Camera size={15} />
              <span>{profile.photo ? "Change photo" : "Upload profile photo"}</span>
            </label>
            {profile.photo && (
              <button
                type="button"
                className="mt-2 text-[11px] text-[#b4cde2] underline underline-offset-2"
                onClick={() => {
                  setProfile((current) => ({ ...current, photo: "" }))
                  setNotice("Profile photo removed.")
                }}
              >
                Remove photo
              </button>
            )}
            <h2 className="mt-3 text-xl font-bold">{profile.name}</h2>
            {user.displayId && <p className={`mt-1 text-xs ${muted}`}>ID: {user.displayId}</p>}
          </div>
          <Section title="Profile" />
          <button
            onClick={() => go("motorcycles")}
            className={`${panel} flex w-full items-center gap-3 text-left`}
          >
            <Bike size={28} className="text-[#ffad76]" />
            <div className="flex-1">
              <strong className="text-sm">{profile.bike}</strong>
              <p className={`mt-1 text-[10px] ${muted}`}>
                {profile.year} · {profile.plate} · {motorcycles.length} saved
              </p>
            </div>
            <ChevronRight size={17} />
          </button>
          <div className={panel}>
            {linkRow("Account", "edit", UserRound)}
            {linkRow("Settings", "settings", Settings2)}
            {linkRow("Send a Complaint", "complaints", ShieldCheck)}
            {linkRow("Service History", "history", Clock3)}
            {linkRow("Saved Motor Shops", "saved", Heart)}
          </div>
          <div className="mt-4 border-t border-[#31597c] pt-4">
            <button
              type="button"
              onClick={onLogout}
              className={`${panel} flex w-full items-center gap-3 text-left text-sm text-[#ffad76]`}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </>
      )
      break
    case "settings":
      content = (
        <>
          <div className={panel}>
            {linkRow("Subscriptions", "subscriptions", CreditCard)}
            {linkRow("Billing", "billing", Wallet)}
            {linkRow("Customization Preference", "customization", Palette)}
            {linkRow("Notifications", "notifications", Bell)}
            {linkRow("Security", "security", ShieldCheck)}
            {linkRow("Help & Support", "help", Phone)}
          </div>
        </>
      )
      break
    case "complaints":
      content = <ComplaintCenter mode="rider" rider={{ id: "demo-rider", name: profile.name, email: profile.email, phone: profile.phone }} services={[
        { id: "RP-1039", shop: repairTeam.owner.name, shopId: "motohub", motorcycle: profile.bike, service: "Active motorcycle repair", mechanic: repairTeam.mechanic.name },
        ...bookings.map((booking) => { const shop = shops.find((item) => item.id === booking.shop); return { id: booking.id, shop: shop?.name || booking.shop, shopId: shop?.id || booking.shop, motorcycle: booking.bike, service: booking.service, mechanic: shop?.id === "motohub" ? repairTeam.mechanic.name : undefined } }),
      ]} />
      break
    case "edit":
      content = (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            setProfile({
              ...profile,
              name: profileDraft.name.trim(),
              phone: profileDraft.phone.trim(),
              email: profileDraft.email.trim(),
            })
            go("profile")
          }}
        >
          {[
            ["Full name", "name", "text"],
            ["Mobile number", "phone", "tel"],
            ["Email", "email", "email"],
          ].map(([label, key, type]) => (
            <label key={key} className="block text-xs">
              {label}
              <input
                required
                type={type}
                className={`${inputClass} mt-2`}
                value={profileDraft[(key as "name" | "phone" | "email")]}
                onChange={(event) =>
                  setProfileDraft({
                    ...profileDraft,
                    [key]: event.target.value,
                  })
                }
              />
            </label>
          ))}
          <Button type="submit" disabled={!profileDraft.name.trim()}>
            Save Profile
          </Button>
        </form>
      )
      break
    case "motorcycles":
      content = (
        <>
          <div className="flex h-32 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#225b86] to-[#123f65] text-[#ffad76]">
            <Bike size={85} strokeWidth={1.2} />
          </div>
          <section>
            <Section title={`Saved motorcycles (${motorcycles.length})`} />
            <div className="space-y-3">
              {motorcycles.map((motorcycle) => {
                const active = motorcycle.bike === profile.bike &&
                  motorcycle.plate === profile.plate
                return (
                  <article
                    key={motorcycle.id}
                    className={`${panel} flex w-full items-center gap-3 ${
                      active ? "border-[#ffad76]!" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setProfile({
                          ...profile,
                          bike: motorcycle.bike,
                          plate: motorcycle.plate,
                          year: motorcycle.year,
                        })
                        setNotice(`${motorcycle.bike} is now your active motorcycle.`)
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#082a4a] text-[#ffad76]">
                        {motorcycle.photo ? <img src={motorcycle.photo} alt="" className="h-full w-full object-cover" /> : <Bike size={23} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm">
                          {motorcycle.bike}
                        </strong>
                        <span className={`mt-1 block text-[10px] ${muted}`}>
                          {motorcycle.year} · {motorcycle.plate}
                        </span>
                      </span>
                      {active ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#ffad76]">
                          <Check size={14} /> Active
                        </span>
                      ) : (
                        <span className={`text-[10px] ${muted}`}>Set active</span>
                      )}
                    </button>
                    <label className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#406687] bg-[#0b3153] px-2 text-[10px] font-semibold text-[#ffad76]" title={`Upload photo for ${motorcycle.bike}`}>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        aria-label={`Upload photo for ${motorcycle.bike}`}
                        onChange={async (event) => {
                          const input = event.currentTarget
                          const file = input.files?.[0]
                          input.value = ""
                          if (!file) return
                          try {
                            const photo = await readProfilePhoto(file)
                            setMotorcycles((current) => current.map((item) => item.id === motorcycle.id ? { ...item, photo } : item))
                            setNotice(`${motorcycle.bike} photo updated.`)
                          } catch (reason) {
                            setNotice(reason instanceof Error ? reason.message : "Unable to update the motorcycle photo.")
                          }
                        }}
                      />
                      Add picture
                    </label>
                  </article>
                )
              })}
            </div>
          </section>
          <Section title="Add another motorcycle" />
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              const nextMotorcycle = {
                id: crypto.randomUUID(),
                bike: motorcycleDraft.bike.trim(),
                plate: motorcycleDraft.plate.trim(),
                year: motorcycleDraft.year.trim(),
                photo: motorcycleDraft.photo,
              }
              setMotorcycles((previous) => {
                const duplicate = previous.find(
                  (item) =>
                    item.plate.toLowerCase() ===
                    nextMotorcycle.plate.toLowerCase(),
                )
                return duplicate
                  ? previous.map((item) =>
                      item.id === duplicate.id
                        ? { ...nextMotorcycle, id: duplicate.id }
                        : item,
                    )
                  : [...previous, nextMotorcycle]
              })
              setProfile({
                ...profile,
                bike: nextMotorcycle.bike,
                plate: nextMotorcycle.plate,
                year: nextMotorcycle.year,
              })
              setMotorcycleDraft({ bike: "", plate: "", year: "", photo: "" })
              setNotice("Motorcycle saved and set as active.")
            }}
          >
            {[
              ["Motorcycle make & model", "bike"],
              ["Plate number", "plate"],
              ["Model year", "year"],
            ].map(([label, key]) => (
              <label className="block text-xs" key={key}>
                {label}
                <input
                  required
                  className={`${inputClass} mt-2`}
                  value={motorcycleDraft[(key as "bike" | "plate" | "year")]}
                  onChange={(event) =>
                    setMotorcycleDraft({
                      ...motorcycleDraft,
                      [key]: event.target.value,
                    })
                  }
                />
              </label>
            ))}
            <label className="block text-xs">
              Motorcycle photo (optional)
              <input
                type="file"
                accept="image/*"
                className={`${inputClass} mt-2`}
                onChange={async (event) => {
                  const input = event.currentTarget
                  const file = input.files?.[0]
                  input.value = ""
                  if (!file) return
                  try {
                    const photo = await readProfilePhoto(file)
                    setMotorcycleDraft((current) => ({ ...current, photo }))
                    setNotice("Motorcycle photo ready to save.")
                  } catch (reason) {
                    setNotice(reason instanceof Error ? reason.message : "Unable to read that motorcycle photo.")
                  }
                }}
              />
              {motorcycleDraft.photo && <img src={motorcycleDraft.photo} alt="Motorcycle photo preview" className="mt-3 h-32 w-full rounded-xl object-cover" />}
            </label>
            <Button
              type="submit"
              disabled={
                !motorcycleDraft.bike.trim() ||
                !motorcycleDraft.plate.trim() ||
                !motorcycleDraft.year.trim()
              }
            >
              Add Motorcycle
            </Button>
          </form>
          <Button secondary onClick={() => go("history")}>
            View Service History
          </Button>
        </>
      )
      break
    case "saved":
      content = (
        <>
          {shops.filter((item) => saved.includes(item.id)).map(shopCard)}
          {!saved.length && (
            <p className={`text-xs ${muted}`}>
              Tap the heart on a motor shop to save it here.
            </p>
          )}
          <Button secondary onClick={() => go("shops")}>
            Explore Shops
          </Button>
        </>
      )
      break
    case "security":
      content = (
        <>
          <div className={panel}>
            <ShieldCheck className="mb-3 text-[#ffad76]" />
            <h2 className="text-sm font-bold">Account security</h2>
            <p className={`mt-2 text-xs leading-relaxed ${muted}`}>
              Your MotoFix account uses server-side password authentication.
              Enter your current password to make a change.
            </p>
          </div>
          <form
            className="rider-security-form"
            onSubmit={(event) => {
              event.preventDefault()
              const form = event.currentTarget
              const values = new FormData(form)
              const current = String(values.get("currentPassword") || "")
              const next = String(values.get("newPassword") || "")
              const confirm = String(values.get("confirmPassword") || "")
              if (next !== confirm) {
                setNotice("New passwords do not match.")
                return
              }
              setPasswordBusy(true)
              void changePassword(current, next)
                .then(() => {
                  setNotice("Your password was updated.")
                  form.reset()
                })
                .catch((reason: unknown) =>
                  setNotice(
                    reason instanceof Error
                      ? reason.message
                      : "Unable to update your password.",
                  ),
                )
                .finally(() => setPasswordBusy(false))
            }}
          >
            <label>
              Current password
              <input
                className={inputClass}
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <label>
              New password
              <input
                className={inputClass}
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label>
              Confirm new password
              <input
                className={inputClass}
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <Button secondary type="submit" disabled={passwordBusy}>
              {passwordBusy ? "Updating…" : "Change Password"}
            </Button>
          </form>
        </>
      )
      break
    case "help":
      content = (
        <>
          <div className={panel}>
            <h2 className="text-sm font-bold">How can we help?</h2>
            <p className={`mt-2 text-xs leading-relaxed ${muted}`}>
              For booking or repair questions, contact your shop directly.
              Bookings and reservations sync with your MotoFix account.
            </p>
          </div>
          {[
            "How do I book a repair?",
            "Can I cancel or reschedule?",
            "How are repair costs calculated?",
          ].map((question, index) => (
            <details key={question} className={panel}>
              <summary className="cursor-pointer text-xs font-bold">
                {question}
              </summary>
              <p className={`mt-3 text-xs leading-relaxed ${muted}`}>
                {
                  [
                    "Tap Book Repair, select your shop and motorcycle, choose a service and time, then confirm the review.",
                    "Open My Bookings and select View Details. Upcoming bookings can be cancelled or rescheduled.",
                    "The estimate combines parts and labor. A final total is shown once work is complete; extra work requires approval.",
                  ][index]
                }
              </p>
            </details>
          ))}
          <Button onClick={() => go(`shop/${selectedShop}`)}>
            Contact My Shop
          </Button>
        </>
      )
      break
    default:
      content = (
        <>
          <p>That rider screen was not found.</p>
          <Button onClick={() => go("home")}>Return Home</Button>
        </>
      )
  }
  return (
    <div data-page={page} data-dashboard-density={dashboardDensity.toLowerCase()} className="rider-workspace h-full bg-gradient-to-b from-[#10436e] to-[#082a4a] text-[#edf5ff]">
      <div
        ref={scrollRef}
        className="rider-content h-full overflow-y-auto px-5 pb-28 pt-14 [scrollbar-width:none]"
      >
        {page !== "home" && (
          <header className="mb-5 flex items-center gap-3">
            <button
              aria-label="Go back"
              className="rounded-xl border border-[#31597c] bg-[#16466e] p-2"
              onClick={() => {
                if (page === "book" && step > 0) setStep(step - 1)
                else if (location.key !== "default") navigate(-1)
                else go("home")
              }}
            >
              <ArrowLeft size={19} />
            </button>
            <h1 className="flex-1 text-[19px] font-bold">
              {titles[page] || "MotoFix"}
            </h1>
            {page !== "notifications" && (
              <button
                aria-label="Notifications"
                onClick={() => go("notifications")}
                className="p-2 text-[#ffad76]"
              >
                <Bell size={18} />
              </button>
            )}
          </header>
        )}
        <div className="rider-page-content space-y-5">
          {page === "book" && bookingLimitReached && !subscription.active ? <Button onClick={() => setSubscriptionTarget("book")}>Subscribe for unlimited bookings</Button> : content}
          {notice && (
            <div
              role="status"
              className="rounded-xl border border-[#ffad76] bg-[#16466e] p-3 text-xs text-[#ffd0ae]"
            >
              {notice}
            </div>
          )}
        </div>
      </div>
      <nav
        aria-label="Rider navigation"
        className="absolute inset-x-0 bottom-0 z-10 flex h-20 items-start justify-around border-t border-[#31597c] bg-[#082a4a] px-2 pt-3"
      >
        <AccountBrand to="/rider/home" />
        {[
          ["Home", "home", Home],
          ["Bookings", "bookings", CalendarDays],
          ["Expense Tracker", "expenses", Wallet],
          ["Profile", "profile", UserRound],
        ].map(([label, target, Graphic]) => {
          const NavIcon = Graphic as LucideIcon
          return (
            <button
              key={target as string}
              aria-current={activeNav === target ? "page" : undefined}
              onClick={() => go(target as string)}
              className={`flex min-w-12 flex-col items-center gap-1 rounded-lg p-1 text-[9px] ${
                activeNav === target ? "text-[#ffad76]" : "text-[#9fbcd3]"
              }`}
            >
              <NavIcon
                size={20}
                strokeWidth={activeNav === target ? 2.2 : 1.6}
              />
              {label as string}
            </button>
          )
        })}
      </nav>
      {subscriptionTarget && <Subscription role="rider" billing={profile} initialPlan={subscriptionTarget === "subscriptions" ? subscriptionPlanIndex : 0} fixedPlan={subscriptionTarget === "subscriptions"} reason={subscriptionTarget === "book" ? "Your first three repair bookings are free. Subscribe to make your fourth booking and keep booking without limits." : subscriptionTarget === "subscriptions" ? "Confirm your selected rider subscription plan." : "Subscribe to unlock Expense Tracker and keep your motorcycle expenses organized."} onClose={() => {
        setSubscriptionTarget(null)
        if (page === "expenses" || (page === "book" && bookingLimitReached)) navigate("/rider/home")
      }} onPaid={(index) => {
        if (!subscription.activate(index)) return false
        const target = subscriptionTarget
        setSubscriptionTarget(null)
        navigate(`/rider/${target}`)
        setNotice(target === "subscriptions" ? "Demo subscription activated. Your rider plan is now active." : "Demo subscription activated. Your included features are now unlocked.")
        return true
      }} />}
    </div>
  )
}
