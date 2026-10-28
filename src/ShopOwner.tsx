import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react"
import { useLocation, useNavigate } from "react-router"
import {
  changePassword,
  createMechanicAccount,
  resetMechanicPassword,
  sendSupportRequest,
  updateAccountName,
  updateMechanicAccount,
  type AppUser,
} from "./api"
import Communication, { mechanicContact, ownerContact, riderContact } from "./Communication"
import ComplaintCenter from "./ComplaintCenter"
import BusinessLegitimacy from "./BusinessLegitimacy"
import BusinessAnalytics from "./BusinessAnalytics"
import BranchManagement from "./BranchManagement"
import Subscription, { subscriptionPlans, subscriptionPrices, useSubscription } from "./Subscription"
import type { BillingDetails } from "./PaymentSimulation"
import PartsSales from "./PartsSales"
import { readOrders, useCommerce } from "./partsCommerce"
import { useDemoRecord } from "./demoRecords"
import AccountBrand from "./AccountBrand"
import DemoMap, { directionsUrl } from "./DemoMap"
import { readProfilePhoto } from "./profilePhoto"
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Bell,
  Bike,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  Clock3,
  Copy,
  CreditCard,
  Gauge,
  HelpCircle,
  MapPin,
  MessageSquareText,
  Package,
  Palette,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  BadgeCheck,
  Star,
  Store,
  Users,
  UserRound,
  Wrench,
  X,
  LogOut,
  type LucideIcon,
} from "lucide-react"
import workshop from "./assets/motofix-workshop.jpg"

type Mechanic = {
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
type Booking = {
  id: string
  customer: string
  motorcycle: string
  service: string
  problem: string
  date: string
  time: string
  cost: number
  mechanic: string
  status: string
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
  booking?: string
}
type Part = {
  id: string
  name: string
  brand: string
  category: string
  compatibility: string
  quantity: number
  price: number
  description: string
  photo: string
  status: string
}
type Service = {
  id: string
  name: string
  description: string
  price: number
  duration: string
}
type ShopProfile = {
  name: string
  description: string
  address: string
  phone: string
  hours: string
  brands: string
  latitude: string
  longitude: string
  photo?: string
}
type Notice = {
  id: string
  title: string
  text: string
  route: string
  read: boolean
  kind: string
}
type Data = {
  commerceApplied?: string[]
  demoVersion: number
  mechanics: Mechanic[]
  bookings: Booking[]
  repairs: Repair[]
  tasks: Task[]
  parts: Part[]
  services: Service[]
  profile: ShopProfile
  notices: Notice[]
}
type FieldSpec = {
  name: string
  label: string
  type?: string
  options?: string[]
  required?: boolean
  value?: string | number
  min?: number
  hint?: string
}
const today = new Date().toISOString().slice(0, 10)
const money = (n: number) => `₱${n.toLocaleString()}`
const uid = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
const mechanicStatuses = ["Available", "Assigned", "On Leave", "Inactive"]
const taskStatuses = [
  "Pending",
  "Assigned",
  "In Progress",
  "Waiting",
  "Completed",
  "Cancelled",
]
const initial: Data = {
  demoVersion: 2,
  profile: {
    name: "MotoHub Service Center",
    description:
      "Expert hands. Better rides. Your neighborhood motorcycle service specialists.",
    address: "124 Street, New Visayas, Panabo City",
    phone: "+63 917 123 4567",
    hours: "Monday–Saturday · 8:00 AM–6:00 PM",
    brands: "Honda, Yamaha, Suzuki, Kawasaki",
    latitude: "14.6205",
    longitude: "121.0584",
    photo: "",
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
    {
      id: "M-02",
      name: "Jay Santos",
      phone: "+63 918 234 5678",
      email: "jay@motohub.demo",
      username: "mechanic.jay",
      specialization: "General maintenance",
      experience: "5",
      skills: "Oil change, brakes, tire replacement",
      employment: "Full-time",
      status: "Available",
      notes: "",
      photo: "",
    },
    {
      id: "M-03",
      name: "Luis Garcia",
      phone: "+63 919 345 6789",
      email: "luis@motohub.demo",
      username: "mechanic.luis",
      specialization: "Electrical specialist",
      experience: "6",
      skills: "Wiring, battery systems, ECU diagnostics",
      employment: "Full-time",
      status: "Assigned",
      notes: "",
      photo: "",
    },
    {
      id: "M-04",
      name: "Nico Cruz",
      phone: "+63 920 456 7890",
      email: "nico@motohub.demo",
      username: "mechanic.nico",
      specialization: "Brakes & suspension",
      experience: "3",
      skills: "Brake service, suspension, alignment",
      employment: "Part-time",
      status: "On Leave",
      notes: "Returns next week.",
      photo: "",
    },
    {
      id: "M-05",
      name: "Paolo Ramos",
      phone: "+63 921 567 8901",
      email: "paolo@motohub.demo",
      username: "mechanic.paolo",
      specialization: "Preventive maintenance",
      experience: "4",
      skills: "Tune-ups, fluid service, safety inspections",
      employment: "Full-time",
      status: "Available",
      notes: "",
      photo: "",
    },
  ],
  bookings: [
    {
      id: "B-1042",
      customer: "Alex Mendoza",
      motorcycle: "Yamaha NMAX 155",
      service: "Oil Change",
      problem: "Scheduled oil change and general check-up.",
      date: today,
      time: "09:00",
      cost: 650,
      mechanic: "M-02",
      status: "Confirmed",
    },
    {
      id: "B-1043",
      customer: "Daniel Cruz",
      motorcycle: "Honda Click 125i",
      service: "Brake Service",
      problem:
        "Squeaking noise when braking. Please check the front brake pads.",
      date: today,
      time: "10:30",
      cost: 1200,
      mechanic: "",
      status: "Pending",
    },
    {
      id: "B-1044",
      customer: "Miguel Santos",
      motorcycle: "Suzuki Raider R150",
      service: "Engine Repair",
      problem: "Engine loses power and stalls at low speeds.",
      date: today,
      time: "11:00",
      cost: 3500,
      mechanic: "M-01",
      status: "Ongoing",
    },
    {
      id: "B-1045",
      customer: "Carlo Villanueva",
      motorcycle: "Honda PCX 160",
      service: "Electrical Repair",
      problem: "Battery drains overnight and headlight flickers.",
      date: today,
      time: "13:00",
      cost: 1800,
      mechanic: "M-03",
      status: "Ongoing",
    },
    {
      id: "B-1046",
      customer: "Andrea Lim",
      motorcycle: "Yamaha Aerox 155",
      service: "Tire Replacement",
      problem: "Rear tire replacement.",
      date: today,
      time: "14:30",
      cost: 2200,
      mechanic: "",
      status: "Pending",
    },
    {
      id: "B-1047",
      customer: "Rica Flores",
      motorcycle: "Honda ADV 160",
      service: "General Maintenance",
      problem: "Routine tune-up and pre-ride safety inspection.",
      date: today,
      time: "16:00",
      cost: 950,
      mechanic: "",
      status: "Pending",
    },
    {
      id: "B-1038",
      customer: "Alex Mendoza",
      motorcycle: "Yamaha NMAX 155",
      service: "General Maintenance",
      problem: "Routine maintenance.",
      date: "2026-07-25",
      time: "09:00",
      cost: 950,
      mechanic: "M-02",
      status: "Completed",
    },
    {
      id: "B-1037",
      customer: "Lara Gomez",
      motorcycle: "Kawasaki Barako II",
      service: "General Maintenance",
      problem: "Hard starting and uneven idle.",
      date: "2026-07-28",
      time: "11:30",
      cost: 1230,
      mechanic: "M-02",
      status: "Completed",
    },
    {
      id: "B-1039",
      customer: "Daniel Cruz",
      motorcycle: "Honda Click 125i",
      service: "Chain Service",
      problem: "Chain adjustment.",
      date: "2026-07-26",
      time: "10:00",
      cost: 350,
      mechanic: "",
      status: "Cancelled",
    },
  ],
  repairs: [
    {
      id: "R-0241",
      booking: "B-1044",
      customer: "Miguel Santos",
      motorcycle: "Suzuki Raider R150",
      problem: "Engine loses power at low speeds.",
      diagnosis:
        "Worn spark plug and clogged fuel injector. Clean fuel system and replace spark plug.",
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
    {
      id: "R-0242",
      booking: "B-1045",
      customer: "Carlo Villanueva",
      motorcycle: "Honda PCX 160",
      problem: "Battery drain and flickering headlight.",
      diagnosis:
        "Loose ground connection. Check regulator and charging circuit.",
      mechanic: "M-03",
      status: "In Progress",
      progress: 35,
      completion: "Today, 4:30 PM",
      services: ["Electrical Repair"],
      parts: [],
      cost: 1800,
      notes: "Battery voltage is within spec.",
      updates: ["Motorcycle received", "Electrical diagnosis started"],
    },
    {
      id: "R-0230",
      booking: "B-1038",
      customer: "Alex Mendoza",
      motorcycle: "Yamaha NMAX 155",
      problem: "Routine maintenance.",
      diagnosis: "Routine oil change and safety checks.",
      mechanic: "M-02",
      status: "Completed",
      progress: 100,
      completion: "July 25",
      services: ["General Maintenance"],
      parts: ["Motul 10W-40 Oil"],
      cost: 950,
      notes: "All checks passed.",
      updates: ["Repair completed"],
    },
    {
      id: "R-0231",
      booking: "B-1037",
      customer: "Lara Gomez",
      motorcycle: "Kawasaki Barako II",
      problem: "Hard starting and uneven idle.",
      diagnosis: "Spark plug gap corrected and carburetor cleaned.",
      mechanic: "M-02",
      status: "Completed",
      progress: 100,
      completion: "July 28",
      services: ["General Maintenance"],
      parts: ["NGK Spark Plug"],
      cost: 1230,
      notes: "Road test completed successfully.",
      updates: ["Diagnosis completed", "Repair completed"],
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
      id: "T-082",
      name: "Inspect charging circuit",
      description: "Test regulator, wiring, and ground connections.",
      mechanic: "M-03",
      customer: "Carlo Villanueva",
      motorcycle: "Honda PCX 160",
      repair: "R-0242",
      priority: "Normal",
      due: `${today}T15:30`,
      assigned: today,
      status: "Assigned",
      instructions: "Document voltage readings.",
      notes: "",
      photos: [],
    },
    {
      id: "T-083",
      name: "Perform final safety inspection",
      description: "Check lights, brakes, tire pressure, and fluid levels.",
      mechanic: "M-01",
      customer: "Miguel Santos",
      motorcycle: "Suzuki Raider R150",
      repair: "R-0241",
      priority: "Normal",
      due: `${today}T16:30`,
      assigned: today,
      status: "Assigned",
      instructions: "Record the final checklist before road testing.",
      notes: "",
      photos: [],
    },
    {
      id: "T-079",
      name: "Oil change & safety check",
      description: "Replace engine oil and perform safety inspection.",
      mechanic: "M-02",
      customer: "Alex Mendoza",
      motorcycle: "Yamaha NMAX 155",
      repair: "R-0230",
      priority: "Normal",
      due: "2026-07-25T12:00",
      assigned: "2026-07-25",
      status: "Completed",
      instructions: "Use manufacturer recommended oil.",
      notes: "Completed and quality checked.",
      photos: [],
    },
  ],
  parts: [
    {
      id: "P-01",
      name: "Motul 10W-40 Oil",
      brand: "Motul",
      category: "Engine oil",
      compatibility: "All 4-stroke motorcycles",
      quantity: 18,
      price: 450,
      description: "Premium 4-stroke engine oil, 1 liter.",
      photo: "",
      status: "In Stock",
    },
    {
      id: "P-02",
      name: "Front Brake Pads",
      brand: "Bendix",
      category: "Brakes",
      compatibility: "Honda Click 125i, Yamaha NMAX",
      quantity: 3,
      price: 650,
      description: "High-performance ceramic brake pads.",
      photo: "",
      status: "Low Stock",
    },
    {
      id: "P-03",
      name: "NGK Spark Plug",
      brand: "NGK",
      category: "Engine",
      compatibility: "Suzuki Raider R150, Honda Click",
      quantity: 4,
      price: 280,
      description: "Reliable ignition and smoother performance.",
      photo: "",
      status: "Low Stock",
    },
    {
      id: "P-04",
      name: "Michelin City Grip Tire",
      brand: "Michelin",
      category: "Tires",
      compatibility: "Yamaha NMAX 155",
      quantity: 8,
      price: 2200,
      description: "All-weather scooter tire.",
      photo: "",
      status: "In Stock",
    },
    {
      id: "P-05",
      name: "Yuasa Maintenance-Free Battery",
      brand: "Yuasa",
      category: "Electrical",
      compatibility: "Honda Click 125i, Yamaha Mio, Suzuki Burgman",
      quantity: 7,
      price: 1850,
      description: "Sealed motorcycle battery with reliable starting power.",
      photo: "",
      status: "In Stock",
    },
    {
      id: "P-06",
      name: "DID 428 Drive Chain",
      brand: "DID",
      category: "Drivetrain",
      compatibility: "Suzuki Raider R150, Honda Wave 125",
      quantity: 9,
      price: 1450,
      description: "Durable replacement chain for daily and performance use.",
      photo: "",
      status: "In Stock",
    },
    {
      id: "P-07",
      name: "K&N Air Filter",
      brand: "K&N",
      category: "Engine",
      compatibility: "Yamaha NMAX 155, Aerox 155",
      quantity: 6,
      price: 1200,
      description: "Washable high-flow air filter for improved airflow.",
      photo: "",
      status: "In Stock",
    },
    {
      id: "P-08",
      name: "Rear Brake Shoe Set",
      brand: "Bendix",
      category: "Brakes",
      compatibility: "Honda Wave 125, Yamaha Sight",
      quantity: 2,
      price: 520,
      description: "Low-noise rear brake shoes with dependable stopping power.",
      photo: "",
      status: "Low Stock",
    },
    {
      id: "P-09",
      name: "LED Headlight Bulb",
      brand: "Osram",
      category: "Electrical",
      compatibility: "Universal H4 motorcycle fitment",
      quantity: 12,
      price: 780,
      description: "Bright, energy-efficient headlight replacement bulb.",
      photo: "",
      status: "In Stock",
    },
    {
      id: "P-10",
      name: "IRC Scooter Front Tire",
      brand: "IRC",
      category: "Tires",
      compatibility: "Honda Click 125i, Yamaha Mio i125",
      quantity: 10,
      price: 1650,
      description: "City-focused front tire with stable wet-road grip.",
      photo: "",
      status: "In Stock",
    },
    {
      id: "P-11",
      name: "Oil Filter Cartridge",
      brand: "Hiflofiltro",
      category: "Engine",
      compatibility: "Yamaha NMAX 155, Aerox 155",
      quantity: 15,
      price: 320,
      description: "High-efficiency filter for routine oil service.",
      photo: "",
      status: "In Stock",
    },
    {
      id: "P-12",
      name: "Fork Oil 10W",
      brand: "Motul",
      category: "Engine oil",
      compatibility: "Most street and scooter front forks",
      quantity: 8,
      price: 690,
      description: "Suspension fluid for smooth damping and fork response.",
      photo: "",
      status: "In Stock",
    },
  ],
  services: [
    {
      id: "S-01",
      name: "Oil Change",
      description: "Engine oil replacement and fluid check.",
      price: 650,
      duration: "30 minutes",
    },
    {
      id: "S-02",
      name: "Brake Service",
      description: "Brake inspection, adjustment, and pad replacement.",
      price: 1200,
      duration: "1 hour",
    },
    {
      id: "S-03",
      name: "Tire Replacement",
      description: "Tire fitting, balancing, and pressure check.",
      price: 2200,
      duration: "45 minutes",
    },
    {
      id: "S-04",
      name: "Chain Service",
      description: "Chain cleaning, lubrication, and tension adjustment.",
      price: 350,
      duration: "30 minutes",
    },
    {
      id: "S-05",
      name: "Engine Repair",
      description: "Engine diagnostics, tune-up, and component repairs.",
      price: 3500,
      duration: "3–5 hours",
    },
    {
      id: "S-06",
      name: "Electrical Repair",
      description: "Battery, wiring, and charging system diagnostics.",
      price: 1800,
      duration: "2 hours",
    },
    {
      id: "S-07",
      name: "General Maintenance",
      description: "Complete safety inspection and routine servicing.",
      price: 950,
      duration: "1 hour",
    },
  ],
  notices: [
    {
      id: "N1",
      title: "New booking request",
      text: "Daniel Cruz requested Brake Service at 10:30 AM.",
      route: "bookings/B-1043",
      read: false,
      kind: "booking",
    },
    {
      id: "N2",
      title: "Low stock alert",
      text: "Front Brake Pads have only 3 units left.",
      route: "parts",
      read: false,
      kind: "stock",
    },
    {
      id: "N3",
      title: "Mechanic task update",
      text: "Marco started cleaning the fuel injector.",
      route: "tasks/T-081",
      read: false,
      kind: "task",
    },
    {
      id: "N4",
      title: "Task completed",
      text: "Jay completed an oil change and safety check.",
      route: "tasks/T-079",
      read: true,
      kind: "task",
    },
    {
      id: "N5",
      title: "Upcoming booking",
      text: "Alex Mendoza is scheduled for an oil change today.",
      route: "bookings/B-1042",
      read: true,
      kind: "booking",
    },
    {
      id: "N6",
      title: "Booking cancelled",
      text: "Daniel cancelled the previous chain service booking.",
      route: "bookings/B-1039",
      read: true,
      kind: "booking",
    },
    {
      id: "N7",
      title: "Customer message",
      text: "Miguel: Please let me know when my motorcycle is ready.",
      route: "customers/Miguel%20Santos",
      read: true,
      kind: "message",
    },
    {
      id: "N8",
      title: "Customer request",
      text: "Carlo requested an update on the electrical diagnosis.",
      route: "repairs/R-0242",
      read: false,
      kind: "message",
    },
    {
      id: "N9",
      title: "Repair update",
      text: "Fuel system diagnosis is complete for R-0241.",
      route: "repairs/R-0241",
      read: true,
      kind: "repair",
    },
  ],
}
export function getInitialShopData(): Data {
  return JSON.parse(JSON.stringify(initial)) as Data
}
function loadData(user?: AppUser): Data {
  try {
    const value = JSON.parse(localStorage.getItem("motofix-owner-v1") || "null")
    return value?.profile && value?.mechanics && value?.notices
      ? {
          ...value,
          demoVersion: 2,
          mechanics:
            value.demoVersion >= 2
              ? value.mechanics
              : [
                  ...value.mechanics,
                  ...initial.mechanics.filter(
                    (item) =>
                      item.id === "M-05" &&
                      !value.mechanics.some(
                        (existing: Mechanic) => existing.id === item.id,
                      ),
                  ),
                ],
          bookings:
            value.demoVersion >= 2
              ? value.bookings
              : [
                  ...value.bookings,
                  ...initial.bookings.filter(
                    (item) =>
                      ["B-1037", "B-1047"].includes(item.id) &&
                      !value.bookings.some(
                        (existing: Booking) => existing.id === item.id,
                      ),
                  ),
                ],
          repairs:
            value.demoVersion >= 2
              ? value.repairs
              : [
                  ...value.repairs,
                  ...initial.repairs.filter(
                    (item) =>
                      item.id === "R-0231" &&
                      !value.repairs.some(
                        (existing: Repair) => existing.id === item.id,
                      ),
                  ),
                ],
          tasks:
            value.demoVersion >= 2
              ? value.tasks
              : [
                  ...value.tasks,
                  ...initial.tasks.filter(
                    (item) =>
                      item.id === "T-083" &&
                      !value.tasks.some(
                        (existing: Task) => existing.id === item.id,
                      ),
                  ),
                ],
          parts:
            value.demoVersion >= 2
              ? value.parts
              : [
                  ...value.parts,
                  ...initial.parts.filter(
                    (item) =>
                      Number(item.id.slice(2)) >= 5 &&
                      !value.parts.some(
                        (existing: Part) => existing.id === item.id,
                      ),
                  ),
                ],
          profile: {
            ...value.profile,
            address:
              value.profile.address === "124 P. Tuazon Blvd, Quezon City"
                ? "124 Street, New Visayas, Panabo City"
                : value.profile.address,
          },
        }
      : {
          ...initial,
          profile: {
            ...initial.profile,
            name: user?.shopName || user?.name || initial.profile.name,
            phone: user?.phone || initial.profile.phone,
          },
        }
  } catch {
    return {
      ...initial,
      profile: {
        ...initial.profile,
        name: user?.shopName || user?.name || initial.profile.name,
        phone: user?.phone || initial.profile.phone,
      },
    }
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
  const tone = [
    "Available",
    "Confirmed",
    "Completed",
    "In Stock",
    "Active",
  ].includes(children)
    ? "good"
    : ["Cancelled", "Inactive", "Urgent", "Out of Stock"].includes(children)
      ? "danger"
      : ["In Progress", "Assigned", "Ongoing"].includes(children)
        ? "blue"
        : "warm"
  return (
    <span className={`so-badge ${tone}`}>
      <i />
      {children}
    </span>
  )
}
function Avatar({
  name,
  photo,
  large = false,
}: {
  name: string
  photo?: string
  large?: boolean
}) {
  return (
    <span className={`so-avatar ${large ? "large" : ""}`}>
      {photo ? (
        <img src={photo} alt={`${name}'s profile`} />
      ) : (
        name
          .split(" ")
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
      )}
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
function Section({
  title,
  action,
  onAction,
  children,
}: {
  title: string
  action?: string
  onAction?: () => void
  children: ReactNode
}) {
  return (
    <section className="so-section">
      <div className="so-section-heading">
        <h2>{title}</h2>
        {action && (
          <Action variant="text" onClick={onAction}>
            {action}
            <ChevronRight size={13} />
          </Action>
        )}
      </div>
      {children}
    </section>
  )
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
function Empty({
  text = "Nothing here yet",
  detail = "Your shop activity will appear here.",
}: {
  text?: string
  detail?: string
}) {
  return (
    <div className="so-empty">
      <ClipboardList size={30} />
      <strong>{text}</strong>
      <p>{detail}</p>
    </div>
  )
}
function FieldsForm({
  fields,
  submit,
  onSubmit,
  initialValues = {},
}: {
  fields: FieldSpec[]
  submit: string
  onSubmit: (values: Record<string, string>) => void | Promise<void>
  initialValues?: Record<string, string | number>
}) {
  const [files, setFiles] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="so-form"
      onSubmit={async (e) => {
        e.preventDefault()
        if (busy) return
        const values = Object.fromEntries(
          new FormData(e.currentTarget).entries(),
        ) as Record<string, string>
        setError("")
        setBusy(true)
        try {
          await onSubmit({ ...values, ...files })
        } catch (reason) {
          setError(
            reason instanceof Error ? reason.message : "Unable to save these changes.",
          )
        } finally {
          setBusy(false)
        }
      }}
    >
      {fields.map((field) => (
        <label className="so-field" key={field.name}>
          <span>
            {field.label}
            {field.required !== false && field.type !== "file" && <em> *</em>}
          </span>
          {field.options ? (
            <select
              name={field.name}
              defaultValue={
                initialValues[field.name] ?? field.value ?? field.options[0]
              }
              required={field.required !== false}
            >
              {field.options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          ) : field.type === "textarea" ? (
            <textarea
              name={field.name}
              rows={3}
              defaultValue={initialValues[field.name] ?? field.value}
              required={field.required !== false}
            />
          ) : field.type === "file" ? (
            <input
              name={field.name}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const input = e.currentTarget
                const file = input.files?.[0]
                input.value = ""
                if (!file) return
                setError("")
                setBusy(true)
                void readProfilePhoto(file)
                  .then((photo) => {
                    setFiles((v) => ({
                      ...v,
                      [field.name]: photo,
                    }))
                  })
                  .catch((reason: unknown) => {
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : "Unable to read image.",
                    )
                  })
                  .finally(() => {
                    setBusy(false)
                  })
              }}
            />
          ) : (
            <input
              name={field.name}
              type={field.type || "text"}
              min={field.min ?? (field.type === "number" ? 0 : undefined)}
              step={field.type === "number" ? "any" : undefined}
              minLength={field.type === "password" ? 8 : undefined}
              defaultValue={initialValues[field.name] ?? field.value}
              required={field.required !== false}
            />
          )}
          {field.hint && <small>{field.hint}</small>}
          {files[field.name] && (
            <img
              className="so-upload-preview"
              src={files[field.name]}
              alt="Selected upload preview"
            />
          )}
        </label>
      ))}
      {error && (
        <p role="alert" className="so-error">
          {error}
        </p>
      )}
      <Action variant="primary" type="submit" disabled={busy}>
        <Check size={17} />
        {busy ? "Saving…" : submit}
      </Action>
    </form>
  )
}
const field = (
  name: string,
  label: string,
  type?: string,
  required = true,
): FieldSpec => ({ name, label, type, required })
const select = (name: string, label: string, options: string[]): FieldSpec => ({
  name,
  label,
  options,
})

export default function ShopOwner({
  onLogout,
  onUserUpdated,
  user,
}: {
  onLogout: () => void
  onUserUpdated: (user: AppUser) => void
  user: AppUser
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const subscription = useSubscription("owner", user.id)
  const [subscriptionTarget, setSubscriptionTarget] = useState<string | null>(null)
  const [subscriptionPlanIndex, setSubscriptionPlanIndex] = useState(0)
  const [confirmSubscriptionCancel, setConfirmSubscriptionCancel] = useState(false)
  const [data, setData] = useState<Data>(() => loadData(user))
  const [complaintRecords] = useDemoRecord<
    { service?: { shopId?: string } }[]
  >("motofix-complaints-v1", [])
  const [billingDetails, setBillingDetails] = useDemoRecord<BillingDetails>(
    "motofix-owner-account",
    { name: user.name, email: user.email, phone: user.phone },
  )
  const [preferences, setPreferences] = useDemoRecord<{
    dashboardDensity: "Comfortable" | "Compact"
  }>("motofix-owner-preferences-v1", { dashboardDensity: "Comfortable" })
  const dashboardDensity = preferences?.dashboardDensity === "Compact"
    ? "Compact"
    : "Comfortable"
  const commerceOrders = useCommerce()
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState("Pending")
  const [taskTab, setTaskTab] = useState("All")
  const [repairTab, setRepairTab] = useState("Active")
  const [mechanicTab, setMechanicTab] = useState("All")
  const [partTab, setPartTab] = useState("All")
  const [toast, setToast] = useState("")
  const [dialog, setDialog] = useState<{
    title: string
    body: ReactNode
  } | null>(null)
  const [credentials, setCredentials] = useState<{
    id: string
    password: string
  } | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [page = "dashboard", id = "", extra = ""] = location.pathname
    .replace(/^\/shop\/?/, "")
    .split("/")
  const addedMechanicCount = data.mechanics.filter(
    (mechanic) => !initial.mechanics.some((sample) => sample.id === mechanic.id),
  ).length
  const complaintCount = complaintRecords.filter(
    (complaint) => complaint.service?.shopId === "motohub",
  ).length
  const go = (route: string) => {
    if (!subscription.active && ["analytics", "branches"].includes(route.split("/")[0])) {
      setSubscriptionTarget(route)
      return
    }
    if (
      route === "mechanics/new" &&
      !subscription.active &&
      addedMechanicCount >= 3
    ) {
      setSubscriptionTarget(route)
      return
    }
    navigate(`/shop/${route}`)
  }
  useEffect(() => {
    if (!subscription.active && ["analytics", "branches"].includes(page)) setSubscriptionTarget(page)
    if (
      !subscription.active &&
      page === "mechanics" &&
      id === "new" &&
      addedMechanicCount >= 3
    ) {
      setSubscriptionTarget("mechanics/new")
      navigate("/shop/mechanics", { replace: true })
    }
  }, [page, id, subscription.active, addedMechanicCount, navigate])
  const notify = (text: string) => setToast(text)
  useEffect(() => {
    try {
      localStorage.setItem("motofix-owner-v1", JSON.stringify(data))
      window.dispatchEvent(new Event("motofix-catalog"))
    } catch {
      setToast(
        "Storage is full or unavailable. Changes are kept for this session only.",
      )
    }
  }, [data])
  useEffect(() => {
    const pending = readOrders().filter((order) => !data.commerceApplied?.includes(order.id))
    if (!pending.length) return
    setData((current) => {
      const unapplied = pending.filter((order) => !current.commerceApplied?.includes(order.id))
      if (!unapplied.length) return current
      return {
        ...current,
        commerceApplied: [...(current.commerceApplied || []), ...unapplied.map((order) => order.id)],
        parts: current.parts.map((part) => {
          const quantity = Math.max(0, part.quantity - unapplied.filter((order) => order.partId === part.id).reduce((sum, order) => sum + order.quantity, 0))
          return { ...part, quantity, status: quantity === 0 ? "Out of Stock" : quantity <= 5 ? "Low Stock" : "In Stock" }
        }),
        notices: [...unapplied.map((order) => ({
          id: `sale-${order.id}`, title: "New motor parts order",
          text: `${order.customer} ordered ${order.quantity} × ${order.name}. ${order.payment === "Pay at shop" ? "Payment due at pickup." : "Demo online payment successful."}`,
          route: "parts", read: false, kind: "stock",
        })), ...current.notices],
      }
    })
  }, [commerceOrders, data.commerceApplied])
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0)
    setQuery("")
    setDialog(null)
  }, [location.pathname])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(""), 4200)
    return () => clearTimeout(timer)
  }, [toast])
  const addNotice = (title: string, text: string, route: string) => ({
    id: uid("N"),
    title,
    text,
    route,
    kind: "task",
    read: false,
  })
  const mechanicName = (mechanicId: string) =>
    data.mechanics.find((m) => m.id === mechanicId)?.name || "Not assigned"
  const activeTasks = (mechanicId: string) =>
    data.tasks.filter(
      (t) =>
        t.mechanic === mechanicId &&
        !["Completed", "Cancelled"].includes(t.status),
    )
  const currentRepairs = (mechanicId: string) =>
    data.repairs.filter(
      (r) => r.mechanic === mechanicId && r.status !== "Completed",
    )
  const availableMechanics = data.mechanics.filter((m) =>
    ["Available", "Assigned"].includes(m.status),
  )
  const mechanicOptions = [
    "Not assigned",
    ...availableMechanics.map((m) => m.name),
  ]
  const findMechanic = (name: string) =>
    data.mechanics.find((m) => m.name === name)?.id || ""
  const filtered = (text: string) =>
    text.toLowerCase().includes(query.toLowerCase())
  const pending = data.bookings.filter((b) => b.status === "Pending")
  const activeRepairs = data.repairs.filter((r) => r.status !== "Completed")
  const lowStock = data.parts.filter((p) => p.quantity <= 5)
  const customers = [...new Set(data.bookings.map((b) => b.customer))]
  const titleMap: Record<string, string> = {
    dashboard: "Shop Dashboard",
    analytics: "Business Analytics",
    branches: "Multi-Branch Management",
    mechanics: "Mechanic Management",
    bookings: "Shop Bookings",
    repairs: "Active Repairs",
    tasks: "Task Management",
    parts: "Motor Parts",
    services: "Shop Services",
    customers: "Customers",
    profile: "Profile",
    settings: "Settings",
    subscriptions: "Subscriptions",
    billing: "Billing",
    customization: "Customization Preference",
    complaints: "Manage Complaints",
    "shop-profile": "Shop Profile",
    location: "Shop Location",
    notifications: "Notifications",
    security: "Security",
    help: "Help & Support",
  }
  let title = titleMap[page] || "Shop Dashboard"
  let subtitle = "Everything your shop needs, in one place."
  let view: ReactNode
  const search = (placeholder: string) => (
    <label className="so-search">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query && (
        <Action
          variant="icon"
          aria-label="Clear search"
          onClick={() => setQuery("")}
        >
          <X size={15} />
        </Action>
      )}
    </label>
  )
  const tabs = (
    values: string[],
    value: string,
    setValue: (v: string) => void,
  ) => (
    <div className="so-tabs" role="tablist">
      {values.map((v) => (
        <Action
          key={v}
          role="tab"
          aria-selected={value === v}
          className={value === v ? "selected" : ""}
          onClick={() => setValue(v)}
        >
          {v}
        </Action>
      ))}
    </div>
  )
  const rowLink = (
    label: string,
    detail: string,
    route: string,
    Icon: LucideIcon = ChevronRight,
  ) => (
    <Action className="so-link-row" key={label} onClick={() => go(route)}>
      <span className="so-row-icon">
        <Icon size={18} />
      </span>
      <span>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <ChevronRight size={16} />
    </Action>
  )
  const confirmDelete = (
    title: string,
    callback: () => void,
    text = "This action cannot be undone.",
  ) =>
    setDialog({
      title,
      body: (
        <>
          <p>{text}</p>
          <div className="so-actions">
            <Action onClick={() => setDialog(null)}>Keep it</Action>
            <Action
              variant="danger"
              onClick={() => {
                callback()
                setDialog(null)
              }}
            >
              Confirm
            </Action>
          </div>
        </>
      ),
    })
  const formDialog = (
    title: string,
    fields: FieldSpec[],
    submit: string,
    callback: (v: Record<string, string>) => void | Promise<void>,
    values?: Record<string, string | number>,
  ) =>
    setDialog({
      title,
      body: (
        <FieldsForm
          fields={fields}
          submit={submit}
          initialValues={values}
          onSubmit={async (v) => {
            await callback(v)
            setDialog(null)
          }}
        />
      ),
    })
  const updateBooking = (booking: Booking, status: string) => {
    setData((d) => ({
      ...d,
      bookings: d.bookings.map((b) =>
        b.id === booking.id ? { ...b, status } : b,
      ),
      notices: [
        addNotice(
          `Booking ${status.toLowerCase()}`,
          `${booking.customer} · ${booking.service}`,
          `bookings/${booking.id}`,
        ),
        ...d.notices,
      ],
    }))
    notify(`Booking ${status.toLowerCase()}`)
  }
  const assign = (
    kind: "booking" | "repair" | "task",
    targetId: string,
    current: string,
  ) => {
    if (!availableMechanics.length) {
      notify("Add or activate an available mechanic first.")
      return
    }
    formDialog(
      "Assign mechanic",
      [
        select(
          "mechanic",
          "Mechanic",
          availableMechanics.map((m) => m.name),
        ),
      ],
      "Save Assignment",
      (v) => {
        const mechanic = findMechanic(v.mechanic)
        setData((d) => ({
          ...d,
          bookings: d.bookings.map((b) =>
            kind === "booking" && b.id === targetId ? { ...b, mechanic } : b,
          ),
          repairs: d.repairs.map((r) =>
            kind === "repair" && r.id === targetId ? { ...r, mechanic } : r,
          ),
          tasks: d.tasks.map((t) =>
            kind === "task" && t.id === targetId
              ? { ...t, mechanic, status: "Assigned" }
              : t,
          ),
          mechanics: d.mechanics.map((m) =>
            m.id === mechanic ? { ...m, status: "Assigned" } : m,
          ),
        }))
        notify("Mechanic assigned")
      },
      { mechanic: mechanicName(current) },
    )
  }
  const deactivate = (m: Mechanic) => {
    if (activeTasks(m.id).length || currentRepairs(m.id).length) {
      notify(
        "Reassign this mechanic’s active tasks and repairs before deactivating.",
      )
      return
    }
    confirmDelete(
      "Deactivate mechanic?",
      () => {
        setData((d) => ({
          ...d,
          mechanics: d.mechanics.map((x) =>
            x.id === m.id ? { ...x, status: "Inactive" } : x,
          ),
        }))
        notify("Mechanic account deactivated")
      },
      "The mechanic will no longer be able to log in. Their work history will be retained.",
    )
  }
  const updateMechanicStatus = (m: Mechanic, status: string) => {
    if (
      ["Inactive", "On Leave"].includes(status) &&
      (activeTasks(m.id).length || currentRepairs(m.id).length)
    ) {
      notify(
        "Reassign active tasks and repairs before changing this status.",
      )
      return
    }
    setData((d) => ({
      ...d,
      mechanics: d.mechanics.map((item) =>
        item.id === m.id ? { ...item, status } : item,
      ),
    }))
    notify(`Account status changed to ${status.toLowerCase()}`)
  }
  const completeTask = (t: Task) => {
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((x) =>
        x.id === t.id ? { ...x, status: "Completed" } : x,
      ),
      notices: [
        addNotice(
          "Task completed",
          `${mechanicName(t.mechanic)} completed ${t.name}.`,
          `tasks/${t.id}`,
        ),
        ...d.notices,
      ],
    }))
    notify("Task marked completed")
  }
  const bookingCard = (b: Booking, compact = false) => (
    <Card key={b.id}>
      <div className="so-card-top">
        <div className="so-person">
          <Avatar name={b.customer} />
          <div>
            <strong>{b.customer}</strong>
            <small>{b.motorcycle}</small>
          </div>
        </div>
        <Badge>{b.status}</Badge>
      </div>
      <div className="so-booking-service">
        <Wrench size={14} />
        <strong>{b.service}</strong>
        <span>{money(b.cost)}</span>
      </div>
      <div className="so-meta">
        <CalendarDays size={13} />
        {b.date === today ? "Today" : b.date}
        <Clock3 size={13} />
        {b.time}
      </div>
      {!compact && (
        <>
          <p className="so-muted">{b.problem}</p>
          <p className="so-meta">
            <Users size={13} />
            {mechanicName(b.mechanic)}
          </p>
        </>
      )}
      <div className="so-actions">
        <Action onClick={() => go(`bookings/${b.id}`)}>
          View Details
          <ChevronRight size={13} />
        </Action>
        {b.status === "Pending" && (
          <>
            <Action
              variant="primary"
              onClick={() => updateBooking(b, "Confirmed")}
            >
              <Check size={13} />
              Accept
            </Action>
            {!compact && (
              <Action
                variant="danger"
                onClick={() =>
                  confirmDelete("Reject booking?", () =>
                    updateBooking(b, "Cancelled"),
                  )
                }
              >
                Reject
              </Action>
            )}
          </>
        )}
        {!compact && ["Pending", "Confirmed"].includes(b.status) && (
          <>
            <Action onClick={() => reschedule(b)}>Reschedule</Action>
            <Action onClick={() => assign("booking", b.id, b.mechanic)}>
              Assign Mechanic
            </Action>
          </>
        )}
      </div>
    </Card>
  )
  const reschedule = (b: Booking) =>
    formDialog(
      "Reschedule booking",
      [
        field("date", "Appointment date", "date"),
        field("time", "Appointment time", "time"),
      ],
      "Save Schedule",
      (v) => {
        setData((d) => ({
          ...d,
          bookings: d.bookings.map((x) =>
            x.id === b.id ? { ...x, date: v.date, time: v.time } : x,
          ),
        }))
        notify("Appointment rescheduled")
      },
      { date: b.date, time: b.time },
    )
  const repairCard = (r: Repair) => (
    <Action
      className="so-card so-repair-card"
      key={r.id}
      onClick={() => go(`repairs/${r.id}`)}
    >
      <div className="so-card-top">
        <span className="so-meta">{r.id}</span>
        <Badge>{r.status}</Badge>
      </div>
      <div className="so-person">
        <span className="so-bike-icon">
          <Bike size={24} />
        </span>
        <div>
          <strong>{r.motorcycle}</strong>
          <small>{r.customer}</small>
        </div>
        <ChevronRight size={16} />
      </div>
      <div className="so-progress-label">
        <span>{mechanicName(r.mechanic)}</span>
        <strong>{r.progress}%</strong>
      </div>
      <progress
        value={r.progress}
        max={100}
        aria-label={`${r.motorcycle} repair progress`}
      />
      <span className="so-meta">
        <Clock3 size={13} />
        Est. completion: {r.completion}
      </span>
    </Action>
  )
  const mechanicCard = (m: Mechanic) => (
    <Card key={m.id}>
      <div className="so-card-top">
        <div className="so-person">
          <Avatar name={m.name} photo={m.photo} />
          <div>
            <strong>{m.name}</strong>
            <small>{m.specialization}</small>
          </div>
        </div>
        <Badge>{m.status}</Badge>
      </div>
      <p className="so-meta">{m.phone}</p>
      <Info
        items={[
          [
            "Current repair",
            currentRepairs(m.id)
              .map((r) => r.id)
              .join(", ") || "No active repair",
          ],
          ["Current task", activeTasks(m.id)[0]?.name || "No active task"],
          ["Active tasks", activeTasks(m.id).length],
        ]}
      />
      <div className="so-actions">
        <Action onClick={() => go(`mechanics/${m.id}`)}>View Details</Action>
        <Action onClick={() => go(`mechanics/${m.id}/edit`)}>Edit</Action>
        <Action
          variant="primary"
          disabled={["Inactive", "On Leave"].includes(m.status)}
          onClick={() => go(`tasks/new?mechanic=${m.id}`)}
        >
          Assign Task
        </Action>
        <Action
          variant="danger"
          disabled={m.status === "Inactive"}
          onClick={() => deactivate(m)}
        >
          Deactivate
        </Action>
      </div>
    </Card>
  )
  const taskCard = (t: Task) => (
    <Card key={t.id}>
      <div className="so-card-top">
        <span className="so-meta">
          {t.id} · {t.repair}
        </span>
        <Badge>{t.status}</Badge>
      </div>
      <h3>{t.name}</h3>
      <div className="so-meta">
        <Users size={13} />
        {mechanicName(t.mechanic)}
        <Badge>{t.priority}</Badge>
      </div>
      <p className="so-muted">
        {t.customer} · {t.motorcycle}
      </p>
      <div className="so-meta">
        <Clock3 size={13} />
        Due: {t.due.replace("T", " · ")}
      </div>
      <div className="so-actions">
        <Action onClick={() => go(`tasks/${t.id}`)}>View Details</Action>
        <Action onClick={() => go(`tasks/${t.id}/edit`)}>Edit Task</Action>
        {!["Completed", "Cancelled"].includes(t.status) && (
          <>
            <Action onClick={() => assign("task", t.id, t.mechanic)}>
              Reassign
            </Action>
            <Action variant="primary" onClick={() => completeTask(t)}>
              <Check size={13} />
              Mark Completed
            </Action>
          </>
        )}
      </div>
    </Card>
  )

  if (page === "dashboard") {
    const stats: [string, number, LucideIcon, string][] = [
      ["Pending bookings", pending.length, Clock3, "bookings"],
      ["Active repairs", activeRepairs.length, Wrench, "repairs"],
      ["Low-stock parts", lowStock.length, Package, "parts"],
      ["Total mechanics", data.mechanics.length, Users, "mechanics"],
      [
        "Available mechanics",
        data.mechanics.filter((m) => m.status === "Available").length,
        ShieldCheck,
        "mechanics",
      ],
      [
        "Assigned tasks",
        data.tasks.filter((t) => !["Completed", "Cancelled"].includes(t.status))
          .length,
        ClipboardList,
        "tasks",
      ],
      ["Customers", customers.length, Users, "customers"],
      ["Manage Complaints", complaintCount, MessageSquareText, "complaints"],
    ]
    view = (
      <>
        <div className="so-dashboard-hero">
          <img
            src={workshop}
            alt="Mechanic servicing a motorcycle in the workshop"
          />
          <div>
            <Badge>Shop is open</Badge>
            <h2>Good Day, {user.name.trim().split(/\s+/)[0] || "Owner"}</h2>
            <p className="so-dashboard-date">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}{" "}
              <i /> Shop overview
            </p>
            <Action
              variant="primary"
              className="so-analytics-access"
              onClick={() => go("analytics")}
            >
              Access Business Analytics
              <ArrowUpRight size={15} />
            </Action>
          </div>
        </div>
        <div className="so-stat-grid">
          {stats.map(([label, count, Icon, route]) => (
            <Action
              className="so-stat"
              key={label}
              onClick={() => {
                if (label === "Active repairs") setRepairTab("Active")
                if (label === "Available mechanics") setMechanicTab("Available")
                if (label === "Low-stock parts") setPartTab("Low Stock")
                go(route)
              }}
            >
              <span className="so-stat-icon">
                <Icon size={17} />
              </span>
              <strong>{String(count).padStart(2, "0")}</strong>
              <small>{label}</small>
            </Action>
          ))}
        </div>
        <div className="so-quick-actions">
          {([
            ["Mechanics", Users, "mechanics"],
            ["Tasks", ClipboardList, "tasks"],
            ["Services", Wrench, "services"],
            ["Customers", Bike, "customers"],
          ] as [string, LucideIcon, string][]).map(([label, Icon, route]) => (
            <Action key={label} onClick={() => go(route)}>
              <span>
                <Icon size={19} />
              </span>
              {label}
            </Action>
          ))}
        </div>
        <Section
          title="Today's Schedule"
          action="View all"
          onAction={() => {
            setTab("Confirmed")
            go("bookings")
          }}
        >
          <Card className="so-schedule">
            {data.bookings
              .filter(
                (b) =>
                  b.date === today &&
                  ["Confirmed", "Ongoing"].includes(b.status),
              )
              .slice(0, 3)
              .map((b) => (
                <Action key={b.id} onClick={() => go(`bookings/${b.id}`)}>
                  <span className="so-time">
                    {b.time}
                    <small>
                      {Number(b.time.slice(0, 2)) >= 12 ? "PM" : "AM"}
                    </small>
                  </span>
                  <span className="so-schedule-dot" />
                  <span>
                    <strong>{b.service}</strong>
                    <small>
                      {b.customer} · {b.motorcycle}
                    </small>
                  </span>
                  <ChevronRight size={15} />
                </Action>
              ))}
          </Card>
        </Section>
        <Section
          title="Pending Requests"
          action={`${pending.length} new`}
          onAction={() => {
            setTab("Pending")
            go("bookings")
          }}
        >
          {pending.length ? (
            pending.slice(0, 2).map((b) => bookingCard(b, true))
          ) : (
            <Empty text="All caught up" detail="No pending booking requests." />
          )}
        </Section>
        <Section
          title="Active Repairs"
          action="View all"
          onAction={() => go("repairs")}
        >
          {activeRepairs.length ? (
            activeRepairs.slice(0, 2).map(repairCard)
          ) : (
            <Empty text="No active repairs" />
          )}
        </Section>
        <Section
          title="Mechanics"
          action="Manage team"
          onAction={() => go("mechanics")}
        >
          <Card>
            {data.mechanics.slice(0, 3).map((m) => (
              <Action
                className="so-team-row"
                key={m.id}
                onClick={() => go(`mechanics/${m.id}`)}
              >
                <Avatar name={m.name} photo={m.photo} />
                <span>
                  <strong>{m.name}</strong>
                  <small>
                    {activeTasks(m.id).length} active tasks · {m.specialization}
                  </small>
                </span>
                <Badge>{m.status}</Badge>
              </Action>
            ))}
          </Card>
        </Section>
        <Section
          title="Recent Customers"
          action="View all"
          onAction={() => go("customers")}
        >
          <Card>
            {customers.slice(0, 3).map((name) => (
              <Action
                className="so-team-row"
                key={name}
                onClick={() => go(`customers/${encodeURIComponent(name)}`)}
              >
                <Avatar name={name} />
                <span>
                  <strong>{name}</strong>
                  <small>
                    {data.bookings.find((b) => b.customer === name)?.motorcycle}
                  </small>
                </span>
                <ChevronRight size={16} />
              </Action>
            ))}
          </Card>
        </Section>
      </>
    )
  } else if (page === "branches") {
    subtitle = "Manage your locations, people, and stock in one place."
    view = subscription.active ? (
      <BranchManagement data={data} />
    ) : (
      <Action onClick={() => setSubscriptionTarget("branches")}>
        Subscribe to unlock Branches
      </Action>
    )
  } else if (page === "analytics") {
    subtitle = "A clearer view of your shop’s performance."
    view = subscription.active ? (
      <BusinessAnalytics data={data} />
    ) : (
      <Action onClick={() => setSubscriptionTarget("analytics")}>
        Subscribe to unlock Business Analytics
      </Action>
    )
  } else if (page === "mechanics") {
    const m = data.mechanics.find((m) => m.id === id)
    if (id === "new" || extra === "edit") {
      title = id === "new" ? "Add Mechanic" : "Edit Mechanic"
      const mechanicFields = [
        field("name", "Full Name"),
        field("phone", "Mobile Number", "tel"),
        field("email", "Email", "email"),
        field("photo", "Profile Photo", "file", false),
        field("specialization", "Specialization"),
        field("experience", "Years of Experience", "number"),
        field("skills", "Skills", "textarea"),
        select("employment", "Employment Status", [
          "Full-time",
          "Part-time",
          "Contract",
        ]),
        field("username", "Username"),
        ...(id === "new"
          ? [
              {
                ...field("password", "Password", "password"),
                hint: "At least 8 characters. Share this password privately with the mechanic.",
              },
            ]
          : []),
      ]
      view = (
        <>
          <div className="so-callout">
            <ShieldCheck size={22} />
            <p>
              <strong>Created by the shop owner</strong>Mechanics do not use the
              public Create Account screen. Share their credentials so they can
              use the normal MotoFix Login with the credentials you provide.
            </p>
          </div>
          <FieldsForm
            fields={mechanicFields}
            initialValues={m}
            submit={id === "new" ? "Create Mechanic Account" : "Save Mechanic"}
            onSubmit={async (v) => {
              if (!m && !subscription.active && addedMechanicCount >= 3) {
                setSubscriptionTarget("mechanics/new")
                return
              }
              if (
                data.mechanics.some(
                  (x) =>
                    x.id !== m?.id &&
                    (x.email.toLowerCase() === v.email.toLowerCase() ||
                      x.username.toLowerCase() === v.username.toLowerCase()),
                )
              ) {
                notify("A mechanic already uses that email or username.")
                return
              }
              let mechanicId = m?.id
              if (!m) {
                const created = await createMechanicAccount({
                  name: v.name,
                  phone: v.phone,
                  email: v.email,
                  username: v.username,
                  password: v.password,
                  specialization: v.specialization,
                  experience: v.experience,
                  skills: v.skills,
                  employment: v.employment,
                })
                mechanicId = created.mechanicId
              } else {
                await updateMechanicAccount(m.id, {
                  name: v.name,
                  phone: v.phone,
                  email: v.email,
                  username: v.username,
                  specialization: v.specialization,
                  experience: v.experience,
                  skills: v.skills,
                  employment: v.employment,
                  ...(v.password ? { password: v.password } : {}),
                })
              }
              const mechanic: Mechanic = {
                id: mechanicId || uid("M"),
                name: v.name,
                phone: v.phone,
                email: v.email,
                username: v.username,
                specialization: v.specialization,
                experience: v.experience,
                skills: v.skills,
                employment: v.employment,
                status: m?.status || "Available",
                notes: m?.notes || "",
                photo:
                  typeof v.photo === "string" && v.photo.startsWith("data:")
                    ? v.photo
                    : m?.photo || "",
              }
              setData((d) => ({
                ...d,
                mechanics: m
                  ? d.mechanics.map((x) => (x.id === m.id ? mechanic : x))
                  : [...d.mechanics, mechanic],
              }))
              if (!m) {
                setCredentials({ id: mechanic.id, password: v.password })
                go(`mechanics/${mechanic.id}/credentials`)
              } else {
                go(`mechanics/${m.id}`)
                notify("Mechanic updated")
              }
            }}
          />
        </>
      )
    } else if (m && extra === "credentials") {
      title = "Account Credentials"
      view = (
        <>
          <div className="so-success">
            <ShieldCheck size={32} />
            <h2>Mechanic account ready</h2>
            <p>Share these details privately with {m.name.split(" ")[0]}.</p>
          </div>
          <Card>
            <Info
              items={[
                ["Mechanic", m.name],
                ["Account email", m.email],
                ["Username", m.username],
                [
                  "Password",
                  credentials?.id === m.id ? (
                    <code>{credentials.password}</code>
                  ) : (
                    "Only shown when it is first created. Reset to issue a new password."
                  ),
                ],
                ["Account status", <Badge>{m.status}</Badge>],
              ]}
            />
          </Card>
          <div className="so-callout">
            <ShieldCheck size={20} />
            <p>
              Use the normal MotoFix Login screen. Passwords are stored as
              secure hashes and shown only when created or reset.
            </p>
          </div>
          <div className="so-stack">
            <Action
              variant="primary"
              disabled={credentials?.id !== m.id}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `MotoFix Login\nName: ${m.name}\nEmail: ${m.email}\nUsername: ${m.username}\nPassword: ${credentials?.password}`,
                  )
                  notify("Login credentials copied")
                } catch {
                  notify(
                    "Clipboard unavailable. Select and copy the credentials above.",
                  )
                }
              }}
            >
              <Copy size={16} />
              Copy Login Credentials
            </Action>
            <Action
              onClick={async () => {
                try {
                  const result = await resetMechanicPassword(m.id)
                  setCredentials({ id: m.id, password: result.password })
                  notify("New mechanic password generated.")
                } catch (reason) {
                  notify(
                    reason instanceof Error
                      ? reason.message
                      : "Unable to reset this password.",
                  )
                }
              }}
            >
              Reset Password
            </Action>
            <Action
              variant="danger"
              disabled={m.status === "Inactive"}
              onClick={() => deactivate(m)}
            >
              Deactivate Account
            </Action>
            <Action onClick={() => go(`mechanics/${m.id}`)}>
              View Mechanic Details
            </Action>
          </div>
        </>
      )
    } else if (m) {
      title = extra === "history" ? "Work History" : "Mechanic Details"
      view = (
        <>
          <Communication actor={ownerContact(data.profile.name, data.profile.phone)} contacts={[mechanicContact(m)]} />
          <Card className="so-profile-card">
            <Avatar name={m.name} photo={m.photo} large />
            <h2>{m.name}</h2>
            <p>{m.specialization}</p>
            <Badge>{m.status}</Badge>
          </Card>
          {extra !== "history" && (
            <>
              <Section title="Mechanic Information">
                <Card>
                  <Info
                    items={[
                      ["Mobile number", m.phone],
                      ["Email", m.email],
                      ["Specialization", m.specialization],
                      ["Skills", m.skills],
                      ["Experience", `${m.experience} years`],
                      ["Employment status", m.employment],
                      [
                        "Account status",
                        <select
                          aria-label={`Account status for ${m.name}`}
                          className="so-inline-select"
                          value={m.status}
                          onChange={(event) =>
                            updateMechanicStatus(m, event.target.value)
                          }
                        >
                          {mechanicStatuses.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>,
                      ],
                      [
                        "Current repair",
                        currentRepairs(m.id)
                          .map((r) => r.id)
                          .join(", ") || "No active repair",
                      ],
                      ["Active tasks", activeTasks(m.id).length],
                      [
                        "Completed tasks",
                        data.tasks.filter(
                          (t) =>
                            t.mechanic === m.id && t.status === "Completed",
                        ).length,
                      ],
                      ["Notes", m.notes || "No additional notes"],
                    ]}
                  />
                </Card>
              </Section>
              <div className="so-actions">
                <Action onClick={() => go(`mechanics/${m.id}/edit`)}>
                  Edit Mechanic
                </Action>
                <Action
                  variant="primary"
                  disabled={["Inactive", "On Leave"].includes(m.status)}
                  onClick={() => go(`tasks/new?mechanic=${m.id}`)}
                >
                  Assign Task
                </Action>
                <Action onClick={() => go(`mechanics/${m.id}/history`)}>
                  View Work History
                </Action>
                <Action onClick={() => go(`mechanics/${m.id}/credentials`)}>
                  Login Credentials
                </Action>
                <Action
                  variant="danger"
                  disabled={m.status === "Inactive"}
                  onClick={() => deactivate(m)}
                >
                  Deactivate Account
                </Action>
              </div>
              <Section title="Current Tasks">
                {activeTasks(m.id).length ? (
                  activeTasks(m.id).map(taskCard)
                ) : (
                  <Empty text="No active tasks" />
                )}
              </Section>
            </>
          )}
          <Section title="Completed Tasks & Work History">
            {data.tasks.filter(
              (t) => t.mechanic === m.id && t.status === "Completed",
            ).length ? (
              data.tasks
                .filter((t) => t.mechanic === m.id && t.status === "Completed")
                .map(taskCard)
            ) : (
              <Empty text="No completed tasks yet" />
            )}
            {data.repairs
              .filter((r) => r.mechanic === m.id && r.status === "Completed")
              .map(repairCard)}
          </Section>
        </>
      )
    } else if (id) {
      view = <Empty text="Mechanic not found" />
    } else {
      subtitle = `${data.mechanics.length} mechanics · ${data.mechanics.filter((m) => m.status === "Available").length} available`
      view = (
        <>
          {search("Search your mechanics")}
          <Action
            variant="primary"
            className="so-wide"
            onClick={() => go("mechanics/new")}
          >
            <Plus size={16} />
            Add Mechanic
          </Action>
          {tabs(["All", ...mechanicStatuses], mechanicTab, setMechanicTab)}
          {data.mechanics
            .filter(
              (m) =>
                filtered(`${m.name} ${m.specialization}`) &&
                (mechanicTab === "All" || m.status === mechanicTab),
            )
            .map(mechanicCard)}
          {!data.mechanics.some(
            (m) =>
              filtered(`${m.name} ${m.specialization}`) &&
              (mechanicTab === "All" || m.status === mechanicTab),
          ) && <Empty text="No mechanics found" />}
        </>
      )
    }
  } else if (page === "bookings") {
    const b = data.bookings.find((b) => b.id === id)
    if (b) {
      title = "Booking Details"
      const relatedRepair = data.repairs.find((r) => r.booking === b.id)
      view = (
        <>
          <Card>
            <div className="so-card-top">
              <span className="so-meta">{b.id}</span>
              <Badge>{b.status}</Badge>
            </div>
            <div className="so-person">
              <Avatar name={b.customer} />
              <div>
                <h2>{b.customer}</h2>
                <p>{b.motorcycle}</p>
              </div>
            </div>
            <Info
              items={[
                ["Customer contact", "+63 917 555 0123 · Demo contact"],
                ["Motorcycle", b.motorcycle],
                ["Requested service", b.service],
                ["Problem description", b.problem],
                ["Appointment", `${b.date} · ${b.time}`],
                ["Estimated cost", money(b.cost)],
                ["Assigned mechanic", mechanicName(b.mechanic)],
              ]}
            />
          </Card>
          <div className="so-actions">
            {b.status === "Pending" && (
              <>
                <Action
                  variant="primary"
                  onClick={() => updateBooking(b, "Confirmed")}
                >
                  Accept Booking
                </Action>
                <Action
                  variant="danger"
                  onClick={() =>
                    confirmDelete("Reject booking?", () =>
                      updateBooking(b, "Cancelled"),
                    )
                  }
                >
                  Reject Booking
                </Action>
              </>
            )}
            {["Pending", "Confirmed"].includes(b.status) && (
              <Action onClick={() => reschedule(b)}>Reschedule</Action>
            )}
            {!["Completed", "Cancelled"].includes(b.status) && (
              <>
                <Action onClick={() => assign("booking", b.id, b.mechanic)}>
                  Assign Mechanic
                </Action>
                <Action onClick={() => go(`tasks/new?booking=${b.id}`)}>
                  Create Task
                </Action>
              </>
            )}
            {b.status === "Confirmed" && (
              <Action
                variant="primary"
                onClick={() => {
                  if (!b.mechanic) {
                    notify("Assign a mechanic before starting the repair.")
                    return
                  }
                  const repair: Repair = {
                    id: uid("R"),
                    booking: b.id,
                    customer: b.customer,
                    motorcycle: b.motorcycle,
                    problem: b.problem,
                    diagnosis: "Awaiting initial diagnosis.",
                    mechanic: b.mechanic,
                    status: "In Progress",
                    progress: 0,
                    completion: "To be confirmed",
                    services: [b.service],
                    parts: [],
                    cost: b.cost,
                    notes: "",
                    updates: ["Repair started"],
                  }
                  setData((d) => ({
                    ...d,
                    bookings: d.bookings.map((x) =>
                      x.id === b.id ? { ...x, status: "Ongoing" } : x,
                    ),
                    repairs: [...d.repairs, repair],
                    tasks: d.tasks.map((t) =>
                      t.booking === b.id ? { ...t, repair: repair.id } : t,
                    ),
                    mechanics: d.mechanics.map((m) =>
                      m.id === b.mechanic ? { ...m, status: "Assigned" } : m,
                    ),
                  }))
                  go(`repairs/${repair.id}`)
                  notify("Repair started")
                }}
              >
                Start Repair
              </Action>
            )}
            {relatedRepair && (
              <Action onClick={() => go(`repairs/${relatedRepair.id}`)}>
                View Repair
              </Action>
            )}
          </div>
          <Section title="Assigned Tasks">
            {data.tasks
              .filter((t) =>
                relatedRepair
                  ? t.repair === relatedRepair.id
                  : t.booking === b.id,
              )
              .map(taskCard)}
            {!data.tasks.some((t) =>
              relatedRepair
                ? t.repair === relatedRepair.id
                : t.booking === b.id,
            ) && <Empty text="No tasks assigned yet" />}
          </Section>
        </>
      )
    } else if (id) {
      view = <Empty text="Booking not found" />
    } else {
      subtitle = "Manage appointments from request to completion."
      const list = data.bookings.filter(
        (b) =>
          b.status === tab &&
          filtered(`${b.customer} ${b.motorcycle} ${b.service}`),
      )
      view = (
        <>
          {search("Search bookings")}
          {tabs(
            ["Pending", "Confirmed", "Ongoing", "Completed", "Cancelled"],
            tab,
            setTab,
          )}
          <div className="so-list-label">
            {tab} bookings<span>{list.length}</span>
          </div>
          {list.length ? (
            list.map((b) => bookingCard(b))
          ) : (
            <Empty text={`No ${tab.toLowerCase()} bookings`} />
          )}
        </>
      )
    }
  } else if (page === "repairs") {
    const r = data.repairs.find((r) => r.id === id)
    if (r) {
      title = "Repair Management"
      const patch = (changes: Partial<Repair>, message: string) => {
        setData((d) => ({
          ...d,
          repairs: d.repairs.map((x) =>
            x.id === r.id ? { ...x, ...changes } : x,
          ),
        }))
        notify(message)
      }
      view = (
        <>
          <div className="so-card-top">
            <span className="so-meta">{r.id}</span>
            <Badge>{r.status}</Badge>
          </div>
          {repairCard(r)}
          <Communication actor={ownerContact(data.profile.name, data.profile.phone)} contacts={[riderContact(r.customer), ...data.mechanics.filter((mechanic) => mechanic.id === r.mechanic).map(mechanicContact)]} />
          <Section title="Repair Information">
            <Card>
              <Info
                items={[
                  ["Customer", r.customer],
                  ["Motorcycle", r.motorcycle],
                  ["Problem", r.problem],
                  ["Diagnosis", r.diagnosis],
                  ["Assigned mechanic", mechanicName(r.mechanic)],
                  ["Services", r.services.join(", ")],
                  ["Motor parts", r.parts.join(", ") || "No parts added"],
                  ["Total cost", money(r.cost)],
                  ["Mechanic notes", r.notes || "No notes yet"],
                  ["Repair status", r.status],
                ]}
              />
            </Card>
          </Section>
          {r.status !== "Completed" && (
            <div className="so-action-grid">
              <Action onClick={() => assign("repair", r.id, r.mechanic)}>
                Assign Mechanic
              </Action>
              <Action onClick={() => go(`tasks/new?repair=${r.id}`)}>
                Create Task
              </Action>
              <Action
                onClick={() =>
                  formDialog(
                    "Update repair progress",
                    [
                      {
                        ...field("progress", "Progress (%)", "number"),
                        hint: "Enter a value from 0 to 100.",
                      },
                      select("status", "Repair Status", [
                        "In Progress",
                        "Waiting for Parts",
                        "Quality Check",
                      ]),
                      field("completion", "Estimated Completion"),
                      field("diagnosis", "Diagnosis", "textarea"),
                      field("notes", "Mechanic Notes", "textarea", false),
                    ],
                    "Update Progress",
                    (v) =>
                      patch(
                        {
                          progress: Math.min(
                            100,
                            Math.max(0, Number(v.progress)),
                          ),
                          status: v.status,
                          completion: v.completion,
                          diagnosis: v.diagnosis,
                          notes: v.notes,
                        },
                        "Repair progress updated",
                      ),
                    {
                      progress: r.progress,
                      status: r.status,
                      completion: r.completion,
                      diagnosis: r.diagnosis,
                      notes: r.notes,
                    },
                  )
                }
              >
                Update Progress
              </Action>
              <Action
                onClick={() =>
                  formDialog(
                    "Add service to repair",
                    [
                      select(
                        "service",
                        "Service",
                        data.services.map((s) => s.name),
                      ),
                    ],
                    "Add Service",
                    (v) => {
                      const s = data.services.find((s) => s.name === v.service)
                      if (r.services.includes(v.service)) {
                        notify("This service is already on the repair.")
                        return
                      }
                      patch(
                        {
                          services: [...r.services, v.service],
                          cost: r.cost + (s?.price || 0),
                        },
                        "Service and estimated cost added",
                      )
                    },
                  )
                }
              >
                Add Service
              </Action>
              <Action
                onClick={() => {
                  const stocked = data.parts.filter((p) => p.quantity > 0)
                  if (!stocked.length) {
                    notify("No parts in stock. Update your inventory first.")
                    return
                  }
                  formDialog(
                    "Add motor part",
                    [
                      select(
                        "part",
                        "Motor Part",
                        stocked.map((p) => p.name),
                      ),
                    ],
                    "Add Motor Part",
                    (v) => {
                      const p = data.parts.find((p) => p.name === v.part)
                      if (!p) return
                      setData((d) => ({
                        ...d,
                        parts: d.parts.map((x) =>
                          x.id === p.id
                            ? {
                                ...x,
                                quantity: x.quantity - 1,
                                status:
                                  x.quantity - 1 === 0
                                    ? "Out of Stock"
                                    : x.quantity - 1 <= 5
                                      ? "Low Stock"
                                      : "In Stock",
                              }
                            : x,
                        ),
                        repairs: d.repairs.map((x) =>
                          x.id === r.id
                            ? {
                                ...x,
                                parts: [...x.parts, p.name],
                                cost: x.cost + p.price,
                              }
                            : x,
                        ),
                      }))
                      notify("Part added, stock and cost updated")
                    },
                  )
                }}
              >
                Add Motor Part
              </Action>
              <Action
                onClick={() =>
                  formDialog(
                    "Update repair cost",
                    [field("cost", "Total Cost (₱)", "number")],
                    "Update Cost",
                    (v) =>
                      patch({ cost: Number(v.cost) }, "Repair cost updated"),
                    { cost: r.cost },
                  )
                }
              >
                Update Cost
              </Action>
              <Action
                onClick={() =>
                  formDialog(
                    "Send customer update",
                    [field("message", "Update Message", "textarea")],
                    "Send Update",
                    (v) => {
                      setData((d) => ({
                        ...d,
                        repairs: d.repairs.map((x) =>
                          x.id === r.id
                            ? { ...x, updates: [...x.updates, v.message] }
                            : x,
                        ),
                        notices: [
                          addNotice(
                            "Repair update sent",
                            `${r.customer}: ${v.message}`,
                            `repairs/${r.id}`,
                          ),
                          ...d.notices,
                        ],
                      }))
                      notify("Customer update saved.")
                    },
                  )
                }
              >
                Send Update
              </Action>
              <Action
                variant="primary"
                onClick={() => {
                  if (
                    data.tasks.some(
                      (t) =>
                        t.repair === r.id &&
                        !["Completed", "Cancelled"].includes(t.status),
                    )
                  ) {
                    notify("Complete or cancel the assigned tasks first.")
                    return
                  }
                  confirmDelete(
                    "Mark repair as completed?",
                    () => {
                      setData((d) => ({
                        ...d,
                        repairs: d.repairs.map((x) =>
                          x.id === r.id
                            ? {
                                ...x,
                                status: "Completed",
                                progress: 100,
                                updates: [...x.updates, "Repair completed"],
                              }
                            : x,
                        ),
                        bookings: d.bookings.map((b) =>
                          b.id === r.booking
                            ? { ...b, status: "Completed" }
                            : b,
                        ),
                        notices: [
                          addNotice(
                            "Repair completed",
                            `${r.motorcycle} is ready for pickup.`,
                            `repairs/${r.id}`,
                          ),
                          ...d.notices,
                        ],
                      }))
                      notify("Repair completed")
                    },
                    "The booking will be completed and the motorcycle marked ready for pickup.",
                  )
                }}
              >
                Mark as Completed
              </Action>
            </div>
          )}
          <Section
            title="Assigned Tasks"
            action="Add task"
            onAction={() => go(`tasks/new?repair=${r.id}`)}
          >
            {data.tasks.filter((t) => t.repair === r.id).length ? (
              data.tasks.filter((t) => t.repair === r.id).map(taskCard)
            ) : (
              <Empty text="No assigned tasks" />
            )}
          </Section>
          <Section title="Repair Updates">
            <Card>
              {r.updates.map((update, i) => (
                <div className="so-update" key={`${update}-${i}`}>
                  <span>
                    <Check size={13} />
                  </span>
                  <p>{update}</p>
                </div>
              ))}
            </Card>
          </Section>
        </>
      )
    } else if (id) {
      view = <Empty text="Repair not found" />
    } else {
      subtitle = "Keep every motorcycle moving toward the road."
      const list = data.repairs.filter(
        (r) =>
          (repairTab === "Active"
            ? r.status !== "Completed"
            : r.status === "Completed") &&
          filtered(`${r.customer} ${r.motorcycle} ${r.id}`),
      )
      view = (
        <>
          {search("Search repairs")}
          {tabs(["Active", "Completed"], repairTab, setRepairTab)}
          <div className="so-list-label">
            {repairTab} repairs<span>{list.length}</span>
          </div>
          {list.length ? (
            list.map(repairCard)
          ) : (
            <Empty text="No repairs found" />
          )}
          <Action className="so-wide" onClick={() => go("tasks")}>
            <ClipboardList size={17} />
            Open Task Management
            <ChevronRight size={15} />
          </Action>
        </>
      )
    }
  } else if (page === "tasks") {
    const t = data.tasks.find((t) => t.id === id)
    if (id === "new" || extra === "edit") {
      title = id === "new" ? "Add Task" : "Edit Task"
      const params = new URLSearchParams(location.search)
      const related = data.repairs.find((r) => r.id === params.get("repair"))
      const booking = data.bookings.find((b) => b.id === params.get("booking"))
      const defaultMechanic =
        params.get("mechanic") || related?.mechanic || booking?.mechanic || ""
      const fields = [
        field("name", "Task Name"),
        field("description", "Task Description", "textarea"),
        select("mechanic", "Mechanic", mechanicOptions),
        select("customer", "Customer", customers),
        select("motorcycle", "Motorcycle", [
          ...new Set(data.bookings.map((b) => b.motorcycle)),
        ]),
        select("repair", "Related Repair", [
          "Not linked",
          ...data.repairs
            .filter((r) => r.status !== "Completed" || r.id === t?.repair)
            .map((r) => r.id),
        ]),
        select("priority", "Priority", ["Low", "Normal", "High", "Urgent"]),
        field("due", "Due Date", "datetime-local"),
        ...(t ? [select("status", "Task Status", taskStatuses)] : []),
        field("instructions", "Instructions", "textarea"),
        field("notes", "Notes", "textarea", false),
      ]
      const defaults: Record<string, string | number> = t
        ? {
            name: t.name,
            description: t.description,
            customer: t.customer,
            motorcycle: t.motorcycle,
            priority: t.priority,
            due: t.due,
            status: t.status,
            instructions: t.instructions,
            notes: t.notes,
            mechanic: mechanicName(t.mechanic),
            repair: t.repair || "Not linked",
          }
        : {
            mechanic: mechanicName(defaultMechanic),
            customer: related?.customer || booking?.customer || customers[0],
            motorcycle:
              related?.motorcycle ||
              booking?.motorcycle ||
              data.bookings[0]?.motorcycle,
            repair: related?.id || "Not linked",
            priority: "Normal",
            due: `${today}T17:00`,
          }
      view = (
        <>
          <div className="so-callout">
            <ClipboardList size={21} />
            <p>
              <strong>A clear task is a better repair.</strong>Choose a
              mechanic, link a repair, and include the instructions they need.
            </p>
          </div>
          <FieldsForm
            fields={fields}
            initialValues={defaults}
            submit={t ? "Save Task" : "Assign Task"}
            onSubmit={(v) => {
              const repair = data.repairs.find((r) => r.id === v.repair)
              if (
                repair &&
                (repair.customer !== v.customer ||
                  repair.motorcycle !== v.motorcycle)
              ) {
                notify("Customer and motorcycle must match the related repair.")
                return
              }
              if (
                !data.bookings.some(
                  (b) =>
                    b.customer === v.customer && b.motorcycle === v.motorcycle,
                )
              ) {
                notify(
                  "Choose a motorcycle belonging to the selected customer.",
                )
                return
              }
              const mechanic = findMechanic(v.mechanic)
              const task: Task = {
                id: t?.id || uid("T"),
                name: v.name,
                description: v.description,
                mechanic,
                customer: v.customer,
                motorcycle: v.motorcycle,
                repair: repair?.id || "",
                priority: v.priority,
                due: v.due,
                assigned: t?.assigned || today,
                status: v.status || (mechanic ? "Assigned" : "Pending"),
                instructions: v.instructions,
                notes: v.notes,
                photos: t?.photos || [],
                booking: t?.booking || booking?.id,
              }
              setData((d) => ({
                ...d,
                tasks: t
                  ? d.tasks.map((x) => (x.id === t.id ? task : x))
                  : [...d.tasks, task],
                mechanics: d.mechanics.map((m) =>
                  m.id === mechanic ? { ...m, status: "Assigned" } : m,
                ),
                notices: [
                  addNotice(
                    t ? "Task updated" : "Task assigned",
                    `${task.name} · ${mechanicName(mechanic)}`,
                    `tasks/${task.id}`,
                  ),
                  ...d.notices,
                ],
              }))
              go(`tasks/${task.id}`)
              notify(t ? "Task updated" : "Task created")
            }}
          />
        </>
      )
    } else if (t) {
      title = "Task Details"
      view = (
        <>
          <Card>
            <div className="so-card-top">
              <span className="so-meta">{t.id}</span>
              <Badge>{t.status}</Badge>
            </div>
            <h2>{t.name}</h2>
            <Info
              items={[
                ["Assigned mechanic", mechanicName(t.mechanic)],
                ["Customer", t.customer],
                ["Motorcycle", t.motorcycle],
                ["Repair number", t.repair || "Not linked"],
                ["Task description", t.description],
                ["Instructions", t.instructions],
                ["Priority", <Badge>{t.priority}</Badge>],
                ["Assigned date", t.assigned],
                ["Due date", t.due.replace("T", " · ")],
                ["Task status", t.status],
                ["Mechanic notes", t.notes || "No notes yet"],
              ]}
            />
          </Card>
          <div className="so-actions">
            <Action onClick={() => go(`tasks/${t.id}/edit`)}>Edit Task</Action>
            <Action onClick={() => assign("task", t.id, t.mechanic)}>
              Reassign Mechanic
            </Action>
            {t.repair && (
              <Action onClick={() => go(`repairs/${t.repair}`)}>
                View Repair
              </Action>
            )}
            {!["Completed", "Cancelled"].includes(t.status) && (
              <Action variant="primary" onClick={() => completeTask(t)}>
                Mark Completed
              </Action>
            )}
          </div>
          <Section
            title="Task Photos"
            action="Add photo"
            onAction={() =>
              formDialog(
                "Add task photo",
                [field("photo", "Task Photo", "file", false)],
                "Save Photo",
                (v) => {
                  if (!v.photo?.startsWith("data:")) {
                    notify("Choose an image first.")
                    return
                  }
                  setData((d) => ({
                    ...d,
                    tasks: d.tasks.map((x) =>
                      x.id === t.id
                        ? { ...x, photos: [...x.photos, v.photo] }
                        : x,
                    ),
                  }))
                  notify("Photo added")
                },
              )
            }
          >
            {t.photos.length ? (
              <div className="so-photo-grid">
                {t.photos.map((photo, i) => (
                  <img
                    key={i}
                    src={photo}
                    alt={`Task documentation ${i + 1}`}
                  />
                ))}
              </div>
            ) : (
              <Empty
                text="No task photos yet"
                detail="Upload repair photos to keep a visual work record."
              />
            )}
          </Section>
        </>
      )
    } else if (id) {
      view = <Empty text="Task not found" />
    } else {
      subtitle = "The right work, in the right hands."
      const list = data.tasks.filter(
        (t) =>
          (taskTab === "All" || t.status === taskTab) &&
          filtered(`${t.name} ${t.customer} ${mechanicName(t.mechanic)}`),
      )
      view = (
        <>
          {search("Search tasks")}
          <Action
            variant="primary"
            className="so-wide"
            onClick={() => go("tasks/new")}
          >
            <Plus size={16} />
            Add Task
          </Action>
          {tabs(
            ["All", ...taskStatuses.filter((status) => status !== "Waiting")],
            taskTab,
            setTaskTab,
          )}
          {list.length ? list.map(taskCard) : <Empty text="No tasks found" />}
        </>
      )
    }
  } else if (page === "parts") {
    const p = data.parts.find((p) => p.id === id)
    if (id === "new" || extra === "edit") {
      title = p ? "Edit Motor Part" : "Add Motor Part"
      view = (
        <FieldsForm
          fields={[
            field("name", "Motor Part Name"),
            field("brand", "Brand"),
            select("category", "Category", [
              "Engine oil",
              "Engine",
              "Brakes",
              "Tires",
              "Electrical",
              "Drivetrain",
              "Other",
            ]),
            field("compatibility", "Compatible Motorcycle"),
            field("quantity", "Quantity", "number"),
            field("price", "Price (₱)", "number"),
            field("description", "Description", "textarea"),
            field("photo", "Motor Part Image", "file", false),
            ...(p
              ? [
                  select("status", "Stock Status", [
                    "In Stock",
                    "Low Stock",
                    "Out of Stock",
                  ]),
                ]
              : []),
          ]}
          initialValues={p}
          submit={p ? "Save Motor Part" : "Add Motor Part"}
          onSubmit={(v) => {
            const quantity = Number(v.quantity)
            if (!Number.isInteger(quantity)) {
              notify("Quantity must be a whole number.")
              return
            }
            const part: Part = {
              id: p?.id || uid("P"),
              name: v.name,
              brand: v.brand,
              category: v.category,
              compatibility: v.compatibility,
              quantity,
              price: Number(v.price),
              description: v.description,
              photo:
                typeof v.photo === "string" && v.photo.startsWith("data:")
                  ? v.photo
                  : p?.photo || "",
              status:
                quantity === 0
                  ? "Out of Stock"
                  : quantity <= 5
                    ? "Low Stock"
                    : v.status && v.status !== "Out of Stock"
                      ? v.status
                      : "In Stock",
            }
            setData((d) => ({
              ...d,
              parts: p
                ? d.parts.map((x) => (x.id === p.id ? part : x))
                : [...d.parts, part],
            }))
            go("parts")
            notify(p ? "Motor part updated" : "Motor part added")
          }}
        />
      )
    } else {
      subtitle = `${data.parts.length} parts · ${lowStock.length} need restocking`
      const list = data.parts.filter(
        (p) =>
          filtered(`${p.name} ${p.brand} ${p.compatibility}`) &&
          (partTab === "All" || p.status === partTab),
      )
      view = (
        <>
          {search("Search parts or motorcycle")}
          <PartsSales />
          <Action
            variant="primary"
            className="so-wide"
            onClick={() => go("parts/new")}
          >
            <Plus size={16} />
            Add Motor Part
          </Action>
          {tabs(
            ["All", "In Stock", "Low Stock", "Out of Stock"],
            partTab,
            setPartTab,
          )}
          {list.length ? (
            list.map((p) => (
              <Card key={p.id}>
                <div className="so-card-top">
                  <div className="so-person">
                    <span className="so-part-icon">
                      {p.photo ? (
                        <img src={p.photo} alt={p.name} />
                      ) : (
                        <Package size={25} />
                      )}
                    </span>
                    <div>
                      <strong>{p.name}</strong>
                      <small>
                        {p.brand} · {p.category}
                      </small>
                    </div>
                  </div>
                  <Badge>{p.status}</Badge>
                </div>
                <p className="so-muted">{p.compatibility}</p>
                <div className="so-price-row">
                  <strong>{money(p.price)}</strong>
                  <span>{p.quantity} units in stock</span>
                </div>
                <p className="so-muted">{p.description}</p>
                <div className="so-actions">
                  <Action onClick={() => go(`parts/${p.id}/edit`)}>Edit</Action>
                  <Action
                    variant="primary"
                    onClick={() =>
                      formDialog(
                        "Update stock",
                        [field("quantity", "New Quantity", "number")],
                        "Update Stock",
                        (v) => {
                          const quantity = Number(v.quantity)
                          if (!Number.isInteger(quantity)) {
                            notify("Quantity must be a whole number.")
                            return
                          }
                          setData((d) => ({
                            ...d,
                            parts: d.parts.map((x) =>
                              x.id === p.id
                                ? {
                                    ...x,
                                    quantity,
                                    status:
                                      quantity === 0
                                        ? "Out of Stock"
                                        : quantity <= 5
                                          ? "Low Stock"
                                          : "In Stock",
                                  }
                                : x,
                            ),
                          }))
                          notify("Stock updated")
                        },
                        { quantity: p.quantity },
                      )
                    }
                  >
                    Update Stock
                  </Action>
                  <Action
                    variant="danger"
                    onClick={() =>
                      confirmDelete("Delete motor part?", () => {
                        setData((d) => ({
                          ...d,
                          parts: d.parts.filter((x) => x.id !== p.id),
                        }))
                        notify("Motor part deleted")
                      })
                    }
                  >
                    Delete
                  </Action>
                </div>
              </Card>
            ))
          ) : (
            <Empty text="No motor parts found" />
          )}
        </>
      )
    }
  } else if (page === "services") {
    const s = data.services.find((s) => s.id === id)
    if (id === "new" || extra === "edit") {
      title = s ? "Edit Service" : "Add Service"
      view = (
        <FieldsForm
          fields={[
            field("name", "Service Name"),
            field("description", "Description", "textarea"),
            field("price", "Estimated Price (₱)", "number"),
            field("duration", "Estimated Duration"),
          ]}
          initialValues={s}
          submit={s ? "Save Service" : "Add Service"}
          onSubmit={(v) => {
            const service: Service = {
              id: s?.id || uid("S"),
              name: v.name,
              description: v.description,
              price: Number(v.price),
              duration: v.duration,
            }
            setData((d) => ({
              ...d,
              services: s
                ? d.services.map((x) => (x.id === s.id ? service : x))
                : [...d.services, service],
            }))
            go("services")
            notify(s ? "Service updated" : "Service added")
          }}
        />
      )
    } else {
      subtitle = "What your shop does best."
      view = (
        <>
          {search("Search shop services")}
          <Action
            variant="primary"
            className="so-wide"
            onClick={() => go("services/new")}
          >
            <Plus size={16} />
            Add Service
          </Action>
          {data.services
            .filter((s) => filtered(s.name))
            .map((s) => (
              <Card key={s.id}>
                <div className="so-person">
                  <span className="so-bike-icon">
                    <Wrench size={20} />
                  </span>
                  <div>
                    <h3>{s.name}</h3>
                    <small>{s.duration}</small>
                  </div>
                  <strong className="so-accent">{money(s.price)}</strong>
                </div>
                <p className="so-muted">{s.description}</p>
                <div className="so-actions">
                  <Action onClick={() => go(`services/${s.id}/edit`)}>
                    Edit Service
                  </Action>
                  <Action
                    variant="danger"
                    onClick={() =>
                      confirmDelete("Delete service?", () => {
                        setData((d) => ({
                          ...d,
                          services: d.services.filter((x) => x.id !== s.id),
                        }))
                        notify("Service deleted")
                      })
                    }
                  >
                    Delete Service
                  </Action>
                </div>
              </Card>
            ))}
          {!data.services.some((s) => filtered(s.name)) && (
            <Empty text="No services found" />
          )}
        </>
      )
    }
  } else if (page === "customers") {
    const name = decodeURIComponent(id)
    if (name && customers.includes(name)) {
      title = "Customer Details"
      const bookings = data.bookings.filter((b) => b.customer === name)
      const repairs = data.repairs.filter((r) => r.customer === name)
      view = (
        <>
          <Card className="so-profile-card">
            <Avatar name={name} large />
            <h2>{name}</h2>
            <p>Motorcycle rider · MotoHub customer</p>
          </Card>
          <Section title="Customer Information">
            <Card>
              <Info
                items={[
                  ["Name", name],
                  ["Contact number", "+63 917 555 0123 · Demo contact"],
                  [
                    "Email",
                    `${name.toLowerCase().replace(/ /g, ".")}@example.com`,
                  ],
                  [
                    "Motorcycles",
                    [...new Set(bookings.map((b) => b.motorcycle))].join(", "),
                  ],
                  [
                    "Current repair",
                    repairs
                      .filter((r) => r.status !== "Completed")
                      .map((r) => r.id)
                      .join(", ") || "No current repair",
                  ],
                  [
                    "Previous repairs",
                    repairs.filter((r) => r.status === "Completed").length,
                  ],
                ]}
              />
            </Card>
          </Section>
          <Section title="Current Repair">
            {repairs.filter((r) => r.status !== "Completed").length ? (
              repairs.filter((r) => r.status !== "Completed").map(repairCard)
            ) : (
              <Empty text="No current repair" />
            )}
          </Section>
          <Section title="Repair History">
            {repairs.filter((r) => r.status === "Completed").length ? (
              repairs.filter((r) => r.status === "Completed").map(repairCard)
            ) : (
              <Empty text="No previous repairs" />
            )}
          </Section>
          <Section title="Previous Services & Parts">
            <Card>
              <Info
                items={[
                  [
                    "Services",
                    repairs
                      .filter((r) => r.status === "Completed")
                      .flatMap((r) => r.services)
                      .join(", ") || "None yet",
                  ],
                  [
                    "Motor parts replaced",
                    repairs
                      .filter((r) => r.status === "Completed")
                      .flatMap((r) => r.parts)
                      .join(", ") || "None yet",
                  ],
                ]}
              />
            </Card>
          </Section>
          <Section title="Bookings">
            {bookings.map((b) => bookingCard(b, true))}
          </Section>
        </>
      )
    } else {
      subtitle = "Know the riders who trust your shop."
      view = (
        <>
          {search("Search customers")}
          {customers.filter(filtered).map((name) => {
            const bookings = data.bookings.filter((b) => b.customer === name)
            const repairs = data.repairs.filter((r) => r.customer === name)
            return (
              <Card key={name}>
                <div className="so-person">
                  <Avatar name={name} />
                  <div>
                    <h3>{name}</h3>
                    <small>{bookings[0].motorcycle}</small>
                  </div>
                </div>
                <Info
                  items={[
                    [
                      "Current repair",
                      repairs.find((r) => r.status !== "Completed")?.id ||
                        "None",
                    ],
                    [
                      "Previous repairs",
                      repairs.filter((r) => r.status === "Completed").length,
                    ],
                    ["Contact", "+63 917 555 0123 · Demo contact"],
                  ]}
                />
                <Action
                  className="so-wide"
                  onClick={() => go(`customers/${encodeURIComponent(name)}`)}
                >
                  View Customer Details
                  <ChevronRight size={14} />
                </Action>
              </Card>
            )
          })}
          {!customers.some(filtered) && <Empty text="No customers found" />}
        </>
      )
    }
  } else if (page === "complaints") {
    subtitle = "Review, respond, and resolve customer concerns."
    view = <ComplaintCenter mode="owner" mechanics={data.mechanics} />
  } else if (page === "subscriptions") {
    subtitle = "Review your shop plan and available options."
    view = (
      <>
        <Card>
          <div className="so-card-top">
            <span className="so-meta">CURRENT SHOP SUBSCRIPTION</span>
            <Badge>{subscription.active ? "Active" : subscription.cancelled ? "Cancelled" : subscription.plan ? "Expired" : "Not subscribed"}</Badge>
          </div>
          <h2>{subscription.active ? subscription.plan : subscription.cancelled ? "Your subscription is cancelled" : subscription.plan ? `${subscription.plan} plan expired` : "No active subscription"}</h2>
          <p className="so-muted">
            {subscription.active
              ? `Your ${subscription.plan} plan is active through ${new Date(subscription.expiresAt).toLocaleDateString()}.`
              : "Choose a plan below to unlock shop subscription benefits."}
          </p>
          {subscription.active && (confirmSubscriptionCancel ? (
            <div className="so-cancel-subscription" role="group" aria-label="Confirm subscription cancellation">
              <p>Cancel the active plan now? Subscription features will be locked immediately.</p>
              <Action variant="danger" onClick={() => {
                if (subscription.cancel()) {
                  setConfirmSubscriptionCancel(false)
                  notify("Subscription cancelled. Shop plan features are now locked.")
                } else notify("Unable to cancel the demo subscription. Check browser storage and try again.")
              }}>Confirm cancellation</Action>
              <Action onClick={() => setConfirmSubscriptionCancel(false)}>Keep subscription</Action>
            </div>
          ) : (
            <Action onClick={() => setConfirmSubscriptionCancel(true)}>Cancel subscription</Action>
          ))}
        </Card>
        <Section title="Available subscription types">
          <div className="so-subscription-options">
            {subscriptionPlans.map((plan, index) => (
              <Card key={plan.label} className="so-subscription-option">
              <div className="so-card-top">
                <h2>{plan.label}</h2>
                {subscription.active && subscription.plan === plan.label && <Badge>Current plan</Badge>}
              </div>
              <strong className="so-subscription-price">₱{subscriptionPrices.owner[index]}</strong>
              <p className="so-muted">{plan.months} {plan.months === 1 ? "month" : "months"} · one-time demo payment</p>
              <ul>
                <li><CheckCircle2 size={15} />Business Analytics access</li>
                <li><CheckCircle2 size={15} />Multi-branch management</li>
                <li><CheckCircle2 size={15} />Allows to add more than 3 mechanic accounts</li>
              </ul>
              <Action variant="primary" onClick={() => {
                setSubscriptionPlanIndex(index)
                setSubscriptionTarget("settings-subscription")
              }} className="so-subscription-plan-action">
                {subscription.active
                  ? subscription.plan === plan.label ? "Renew this plan" : "Switch to this plan"
                  : "Choose this plan"}
              </Action>
              </Card>
            ))}
          </div>
        </Section>
      </>
    )
  } else if (page === "billing") {
    subtitle = "Save the details used for subscription checkout."
    view = (
      <>
        <p className="so-muted">
          These details are saved on this device and will prefill MotoFix’s demo
          checkout. No payment is processed here.
        </p>
        <FieldsForm
          fields={[
            field("name", "Full Name"),
            field("email", "Email Address", "email"),
            field("phone", "Mobile Number", "tel"),
            field("address", "Billing Address"),
            field("city", "City"),
            field("postalCode", "Postal Code"),
          ]}
          initialValues={{
            name: billingDetails.name || user.name || "",
            email: billingDetails.email || user.email || "",
            phone: billingDetails.phone || user.phone || "",
            address: billingDetails.address || "",
            city: billingDetails.city || "",
            postalCode: billingDetails.postalCode || "",
          }}
          submit="Save Billing Details"
          onSubmit={(values) => {
            setBillingDetails({
              name: values.name.trim(),
              email: values.email.trim(),
              phone: values.phone.trim(),
              address: values.address.trim(),
              city: values.city.trim(),
              postalCode: values.postalCode.trim(),
            })
            notify("Billing details saved for future checkouts.")
          }}
        />
      </>
    )
  } else if (page === "customization") {
    subtitle = "Adjust how the shop dashboard is spaced."
    view = (
      <>
        <Card>
          <h2>Dashboard spacing</h2>
          <p className="so-muted">
            Choose a comfortable layout or a compact layout with tighter
            dashboard spacing.
          </p>
        </Card>
        <FieldsForm
          fields={[
            select("dashboardDensity", "Dashboard spacing", [
              "Comfortable",
              "Compact",
            ]),
          ]}
          initialValues={{ dashboardDensity }}
          submit="Save Preference"
          onSubmit={(values) => {
            const dashboardDensity = values.dashboardDensity === "Compact"
              ? "Compact"
              : "Comfortable"
            setPreferences({ dashboardDensity })
            notify("Dashboard preference saved.")
          }}
        />
      </>
    )
  } else if (page === "settings") {
    subtitle = "Manage your account preferences."
    view = (
      <Section title="Settings">
        <Card className="so-menu">
          {rowLink(
            "Subscriptions",
            subscription.active
              ? "View plan status and subscription options"
              : "Choose a plan and manage shop features",
            "subscriptions",
            BadgeCheck,
          )}
          {rowLink(
            "Billing",
            "Update details used at checkout",
            "billing",
            CreditCard,
          )}
          {rowLink(
            "Customization Preference",
            "Choose dashboard spacing",
            "customization",
            Palette,
          )}
          {rowLink(
            "Notifications",
            `${data.notices.filter((n) => !n.read).length} unread updates`,
            "notifications",
            Bell,
          )}
          {rowLink(
            "Security",
            "Password & demo authentication",
            "security",
            ShieldCheck,
          )}
          {rowLink(
            "Help & Support",
            "We’re here to help",
            "help",
            HelpCircle,
          )}
        </Card>
      </Section>
    )
  } else if (page === "profile") {
    subtitle = "Your business, your way."
    view = (
      <>
        <Card className="so-shop-identity">
          <Avatar
            name={user.name || data.profile.name}
            photo={data.profile.photo}
          />
          <div>
            <h2>{data.profile.name}</h2>
            {user.displayId && <p>ID: {user.displayId}</p>}
            <p>Motor Shop Owner</p>
            <span>
              <Star size={12} fill="currentColor" />
              4.9 <small>· 128 reviews · Demo rating</small>
            </span>
            <Action
              variant="text"
              className="so-edit-profile-photo"
              onClick={() => go("shop-profile/edit")}
            >
              Edit profile photo
            </Action>
          </div>
        </Card>
        <Section title="Profile">
          <Card className="so-menu">
            {rowLink(
              "Account",
              "Owner account information",
              "security/account",
              UserRound,
            )}
            {rowLink(
              "Settings",
              "Subscriptions, billing, notifications & more",
              "settings",
              Settings2,
            )}
          </Card>
        </Section>
        <Section title="Your Shop">
          <Card className="so-menu">
            {rowLink(
              "Shop Information",
              "Profile, photos & contact details",
              "shop-profile",
              Store,
            )}
            {rowLink(
              "Business Hours",
              data.profile.hours,
              "shop-profile/hours",
              Clock3,
            )}
            {rowLink("Shop Location", data.profile.address, "location", MapPin)}
            {rowLink(
              "Services",
              `${data.services.length} services offered`,
              "services",
              Wrench,
            )}
            {rowLink(
              "Motor Parts",
              `${data.parts.length} inventory items`,
              "parts",
              Package,
            )}
            {rowLink(
              "Mechanics",
              `${data.mechanics.length} team members`,
              "mechanics",
              Users,
            )}
            {rowLink(
              "Task Management",
              "Assignments & work progress",
              "tasks",
              ClipboardList,
            )}
            {rowLink(
              "Customers",
              "Customer records & repair history",
              "customers",
              Bike,
            )}
          </Card>
        </Section>
        <div className="mt-5 border-t border-[#31597c] pt-4">
          <Action variant="danger" className="so-wide" onClick={onLogout}>
            <LogOut size={16} />
            Logout
          </Action>
        </div>
        <p className="so-footer-note">MotoFix for Business · Prototype v1.0</p>
      </>
    )
  } else if (page === "shop-profile") {
    if (["edit", "hours"].includes(id)) {
      title = id === "hours" ? "Edit Business Hours" : "Edit Shop Profile"
      const fields =
        id === "hours"
          ? [field("hours", "Opening Hours", "textarea")]
          : [
              field("name", "Shop Name"),
              field("description", "Description", "textarea"),
              field("address", "Address"),
              field("phone", "Contact Number", "tel"),
              field("brands", "Motorcycle Brands"),
              field("photo", "Owner Profile Picture", "file", false),
            ]
      view = (
        <FieldsForm
          fields={fields}
          initialValues={data.profile}
          submit="Save Changes"
          onSubmit={(v) => {
            setData((d) => ({ ...d, profile: { ...d.profile, ...v } }))
            go("shop-profile")
            notify("Shop profile updated")
          }}
        />
      )
    } else {
      view = (
        <>
          <div className="so-shop-cover">
            <img src={workshop} alt="MotoHub workshop" />
            <span>Photo by Angry._.Kat / Unsplash</span>
          </div>
          <Card className="so-profile-card">
            <Avatar
              name={user.name || data.profile.name}
              photo={data.profile.photo}
              large
            />
            <p className="so-owner-photo-label">Owner profile picture</p>
            <h2>{data.profile.name}</h2>
            <p>{data.profile.description}</p>
            <span className="so-rating">
              <Star size={15} fill="currentColor" />
              4.9 · 128 reviews (demo)
            </span>
          </Card>
          <Card>
            <Info
              items={[
                ["Address", data.profile.address],
                [
                  "Map location",
                  `${data.profile.latitude}, ${data.profile.longitude}`,
                ],
                ["Opening hours", data.profile.hours],
                ["Services", data.services.map((s) => s.name).join(", ")],
                ["Motorcycle brands", data.profile.brands],
                ["Contact number", data.profile.phone],
              ]}
            />
          </Card>
          <div className="so-action-grid">
            <Action onClick={() => go("shop-profile/edit")}>
              Edit Profile
            </Action>
            <Action onClick={() => go("location")}>Edit Location</Action>
            <Action onClick={() => go("shop-profile/hours")}>
              Edit Business Hours
            </Action>
            <Action onClick={() => go("services")}>Edit Services</Action>
          </div>
          <Section title="Shop Location">
            <DemoMap
              explorable
              selected="motohub"
              shops={[{ id: "motohub", name: data.profile.name }]}
            />
            <div className="so-actions">
              <Action onClick={() => go("location")}>Edit Location</Action>
              <a
                className="so-button"
                href={directionsUrl(data.profile.address)}
                target="_blank"
                rel="noreferrer"
              >
                Get Directions
              </a>
            </div>
          </Section>
          <BusinessLegitimacy shop={data.profile} />
          <Section title="Shop Photos">
            <img
              className="so-workshop-photo"
              src={workshop}
              alt="Motorcycle being serviced inside the workshop"
            />
          </Section>
        </>
      )
    }
  } else if (page === "location") {
    subtitle = "Help riders find their way to you."
    view = (
      <>
        <DemoMap
          explorable
          selected="motohub"
          shops={[{ id: "motohub", name: data.profile.name }]}
        />
        <a
          className="so-button so-wide"
          href={directionsUrl(data.profile.address)}
          target="_blank"
          rel="noreferrer"
        >
          <MapPin size={16} /> Open directions in Google Maps
        </a>
        <Card>
          <Info
            items={[
              ["Shop address", data.profile.address],
              ["Coordinates", `${data.profile.latitude}, ${data.profile.longitude}`],
            ]}
          />
        </Card>
        <Action
          className="so-wide"
          onClick={() =>
            contentRef.current
              ?.querySelector("form")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <MapPin size={16} />
          Update Location
        </Action>
        <FieldsForm
          fields={[
            field("address", "Address"),
            field("latitude", "Latitude", "number"),
            field("longitude", "Longitude", "number"),
          ]}
          initialValues={data.profile}
          submit="Save Location"
          onSubmit={(values) => {
            const latitude = Number(values.latitude)
            const longitude = Number(values.longitude)
            if (
              !Number.isFinite(latitude) ||
              !Number.isFinite(longitude) ||
              Math.abs(latitude) > 90 ||
              Math.abs(longitude) > 180
            ) {
              notify("Enter valid latitude (−90 to 90) and longitude (−180 to 180).")
              return
            }
            setData((current) => ({
              ...current,
              profile: {
                ...current.profile,
                address: values.address,
                latitude: values.latitude,
                longitude: values.longitude,
              },
            }))
            notify("Shop location saved")
          }}
        />
      </>
    )
  } else if (page === "notifications") {
    subtitle = "Bookings, repairs, and your team—all up to date."
    view = (
      <>
        <div className="so-list-label">
          {data.notices.filter((n) => !n.read).length} unread
          <Action
            variant="text"
            onClick={() => {
              setData((d) => ({
                ...d,
                notices: d.notices.map((n) => ({ ...n, read: true })),
              }))
              notify("All notifications marked read")
            }}
          >
            <CheckCheck size={15} />
            Mark all read
          </Action>
        </div>
        {data.notices.map((n) => (
          <Action
            key={n.id}
            className={`so-card so-notification ${!n.read ? "unread" : ""}`}
            onClick={() => {
              setData((d) => ({
                ...d,
                notices: d.notices.map((x) =>
                  x.id === n.id ? { ...x, read: true } : x,
                ),
              }))
              go(n.route)
            }}
          >
            <span className="so-row-icon">
              {n.kind === "stock" ? (
                <Package size={19} />
              ) : n.kind === "task" ? (
                <ClipboardList size={19} />
              ) : (
                <Bell size={19} />
              )}
            </span>
            <span>
              <strong>{n.title}</strong>
              <p>{n.text}</p>
              <small>Shop activity</small>
            </span>
            {!n.read && <i className="so-unread-dot" />}
          </Action>
        ))}
      </>
    )
  } else if (page === "security") {
    title = id === "account" ? "Owner Account" : "Security"
    view = (
      <>
        <div className="so-callout">
          <ShieldCheck size={22} />
          <p>
            <strong>Account security</strong>Login credentials are checked by
            the MotoFix server. Passwords are stored as secure hashes.
          </p>
        </div>
        <Card>
          <Info
            items={[
              ["Owner name", user.name],
              ["Account role", "Motor Shop Owner"],
              ["Shop", data.profile.name],
              ["Contact", data.profile.phone],
              [
                "Staff account access",
                "Created and managed by shop owner only",
              ],
            ]}
          />
        </Card>
        <Action
          className="so-wide"
          onClick={() =>
            formDialog(
              "Update owner name",
              [field("name", "Owner Name")],
              "Save Name",
              async (values) => {
                const result = await updateAccountName(values.name)
                onUserUpdated(result.user)
                notify("Owner name updated.")
              },
              { name: user.name },
            )
          }
        >
          Update Owner Name
        </Action>
        <Action
          variant="primary"
          className="so-wide"
          onClick={() =>
            formDialog(
              "Change password",
              [
                field("current", "Current Password", "password"),
                field("password", "New Password", "password"),
                field("confirm", "Confirm New Password", "password"),
              ],
              "Update Password",
              async (v) => {
                if (v.password !== v.confirm) {
                  throw new Error("New passwords do not match.")
                }
                await changePassword(v.current, v.password)
                notify("Your password was updated.")
              },
            )
          }
        >
          Change Password
        </Action>
        <Action className="so-wide" onClick={() => go("mechanics")}>
          Manage Mechanic Access
        </Action>
      </>
    )
  } else if (page === "help") {
    view = (
      <>
        <Card>
          <h2>We’re here for your shop.</h2>
          <p className="so-muted">
            Manage appointments, keep repairs on track, and give your mechanics
            a clear plan.
          </p>
        </Card>
        <Section title="Quick Guide">
          <Card>
            <Info
              items={[
                [
                  "Create a mechanic",
                  "Mechanics → Add Mechanic. Share the generated credentials privately.",
                ],
                [
                  "Start a repair",
                  "Accept a booking, assign a mechanic, then tap Start Repair.",
                ],
                [
                  "Assign work",
                  "Tasks → Add Task. Choose the mechanic, customer, motorcycle, and related repair.",
                ],
                [
                  "Inventory",
                  "Adding parts to a repair reduces stock and updates the estimated cost.",
                ],
                [
                  "Demo data",
                  "Shop, rider, mechanic, complaint, and message data sync with the MotoFix server.",
                ],
              ]}
            />
          </Card>
        </Section>
        <Action
          className="so-wide"
          onClick={() =>
            formDialog(
              "Contact support",
              [
                field("subject", "Subject"),
                field("message", "Message", "textarea"),
              ],
              "Send Message",
              async (v) => {
                await sendSupportRequest(v.subject, v.message)
                notify("Support request sent.")
              },
            )
          }
        >
          Contact Support
        </Action>
      </>
    )
  } else {
    view = <Empty text="Screen not found" />
  }

  const navItems: [string, string, LucideIcon][] = [
    ["Dashboard", "dashboard", Gauge],
    ["Motor Parts", "parts", Package],
    ["Branches", "branches", Building2],
    ["Profile", "profile", UserRound],
  ]
  const activeNav = page === "complaints"
    ? "dashboard"
    : ["tasks"].includes(page)
      ? "repairs"
    : [
          "mechanics",
          "services",
          "customers",
          "shop-profile",
          "settings",
          "location",
          "subscriptions",
          "billing",
          "customization",
          "security",
          "help",
          "notifications",
        ].includes(page)
      ? "profile"
      : page
  return (
    <div
      className="so-app"
      data-page={page}
      data-dashboard-density={dashboardDensity.toLowerCase()}
    >
      <header
        className={`so-header ${page === "dashboard" ? "dashboard" : ""}`}
      >
        {page === "dashboard" ? (
          <>
            <div className="so-header-shop">
              <Avatar
                name={user.name || data.profile.name}
                photo={data.profile.photo}
              />
              <div className="so-header-owner-details">
                <span>SHOP OWNER</span>
                <strong>{data.profile.name}</strong>
                <small>
                  <MapPin size={10} />
                  Panabo City
                </small>
              </div>
            </div>
          </>
        ) : (
          <>
            <Action
              variant="icon"
              aria-label="Back to previous shop screen"
              onClick={() =>
                go(
                  page === "complaints"
                    ? "dashboard"
                    : [
                          "subscriptions",
                          "billing",
                          "customization",
                          "settings",
                          "security",
                          "notifications",
                          "help",
                        ].includes(page)
                      ? "profile"
                      : id
                        ? page
                        : "dashboard",
                )
              }
            >
              <ArrowLeft size={21} />
            </Action>
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </>
        )}
        <Action
          variant="icon"
          className="so-bell"
          aria-label="Shop notifications"
          onClick={() => go("notifications")}
        >
          <Bell size={20} />
          {data.notices.some((n) => !n.read) && <i />}
        </Action>
      </header>
      <div
        className="so-content"
        ref={contentRef}
        key={location.pathname + location.search}
      >
        {view}
        <div className="so-end-mark">
          MotoFix <span>FOR BUSINESS</span>
        </div>
      </div>
      <nav className="so-bottom-nav" aria-label="Shop navigation">
        <AccountBrand to="/shop/dashboard" />
        {navItems.map(([label, route, Icon]) => (
          <Action
            key={route}
            aria-current={activeNav === route ? "page" : undefined}
            className={activeNav === route ? "active" : ""}
            onClick={() => go(route)}
          >
            <Icon size={21} />
            <span>{label}</span>
            {activeNav === route && <i />}
          </Action>
        ))}
      </nav>
      {toast && (
        <div className="so-toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <Action
            variant="icon"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </Action>
        </div>
      )}
      {dialog && (
        <OwnerDialog title={dialog.title} onClose={() => setDialog(null)}>
          {dialog.body}
        </OwnerDialog>
      )}
      {subscriptionTarget && (
        <Subscription
          role="owner"
          initialPlan={subscriptionTarget === "settings-subscription" ? subscriptionPlanIndex : 0}
          fixedPlan={subscriptionTarget === "settings-subscription"}
          reason={subscriptionTarget === "mechanics/new"
            ? "Your first three mechanic accounts are included. Subscribe to add a fourth mechanic and continue growing your team."
            : subscriptionTarget === "settings-subscription"
              ? "Review the available shop plans. A simulated payment can activate or extend your shop subscription."
              : "Subscribe to access your business performance insights and manage multiple branches."}
          onClose={() => {
            setSubscriptionTarget(null)
            if (["analytics", "branches"].includes(page)) navigate("/shop/dashboard")
          }}
          onPaid={(index) => {
            if (!subscription.activate(index)) return false
            const target = subscriptionTarget
            setSubscriptionTarget(null)
            navigate(`/shop/${target === "settings-subscription" ? "subscriptions" : target}`)
            notify(target === "mechanics/new"
              ? "Demo subscription activated. Add another mechanic to your shop."
              : target === "settings-subscription"
                ? "Demo shop subscription activated."
                : "Demo subscription activated. Business Analytics and Branches are now unlocked.")
            return true
          }}
        />
      )}
    </div>
  )
}
function OwnerDialog({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
    return () => ref.current?.close()
  }, [])
  return (
    <dialog
      className="so-dialog"
      ref={ref}
      onCancel={onClose}
      aria-labelledby="so-dialog-title"
    >
      <div className="so-dialog-heading">
        <h2 id="so-dialog-title">{title}</h2>
        <Action variant="icon" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </Action>
      </div>
      {children}
    </dialog>
  )
}
