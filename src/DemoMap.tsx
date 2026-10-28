import { useEffect, useRef, useState } from "react"
import { LocateFixed, Minus, Plus, Store } from "lucide-react"
import { mapShops } from "./demoShops"

type MapShop = { id: string; name: string; mapPosition?: [number, number] }
const positions: Record<string, [number, number]> = {
  motohub: [48, 28],
  revline: [75, 44],
  pitstop: [83, 78],
  gearup: [25, 27],
  twowheel: [65, 78],
  roadready: [12, 90],
  apex: [90, 36],
  ridecare: [40, 65],
}
const landmarks = [
  [12, 15, "NEW VISAYAS"], [62, 15, "SANTO NIÑO"],
  [18, 43, "City park"], [35, 82, "DNSC"],
  [57, 68, "Public market"], [87, 18, "Health center"],
  [15, 71, "Sports grounds"], [68, 91, "NEW PANDAN"],
  [39, 51, "City hall"], [90, 61, "Bus terminal"],
] as const

// Illustrative landmarks use the same coordinates as the connected road network.
const nearbyPlaces = [
  [335, 180, "Bakery"], [565, 185, "Grocery"],
  [850, 185, "Clinic"], [145, 290, "Police station"],
  [355, 430, "Campus library"], [700, 355, "ATM"],
  [700, 100, "Coffee shop"], [145, 430, "Food court"],
] as const
const surroundingPlaces = [
  [-835, -320, "Westside school"], [-430, -320, "Barangay hall"],
  [-160, -120, "Garden café"], [-835, 180, "Westside grocery"],
  [-430, 180, "Community clinic"], [-160, 430, "Basketball court"],
  [-835, 600, "Farmers market"], [-430, 680, "Picnic grounds"],
  [-160, 870, "Water station"], [160, -320, "Northside bakery"],
  [565, -220, "Fire station"], [850, -320, "Chapel"],
  [335, -70, "Convenience store"], [160, 600, "Student café"],
  [565, 680, "Southside pharmacy"], [850, 600, "Tricycle terminal"],
  [335, 870, "Covered court"], [1160, -320, "Eastside school"],
  [1565, -120, "Community library"], [1850, -320, "Produce stalls"],
  [1160, 180, "Riverside café"], [1565, 180, "Eastside grocery"],
  [1850, 430, "Fuel stop"], [1160, 600, "Neighborhood clinic"],
  [1565, 680, "Food market"], [1850, 870, "Riverside promenade"],
] as const

function MapPlaces({ places }: { places: readonly (readonly [number, number, string])[] }) {
  return <g className="mf-map-extra-places">
    {places.map(([x, y, label]) => (
      <g key={label} transform={`translate(${x} ${y})`}>
        <rect className="mf-map-place-building" x="-28" y="-14" width="56" height="24" rx="5" />
        <text textAnchor="middle" y="25">{label}</text>
      </g>
    ))}
  </g>
}

export function directionsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`
}

export default function DemoMap({
  selected,
  onSelect,
  shops,
  route = false,
  started = false,
  explorable = false,
  showHelpText = true,
}: {
  selected: string
  onSelect?: (id: string) => void
  shops: MapShop[]
  route?: boolean
  started?: boolean
  explorable?: boolean
  showHelpText?: boolean
}) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const viewport = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ id: number; x: number; y: number; pan: typeof pan; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  function resetMap() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }
  useEffect(() => { resetMap() }, [selected, route])
  function moveMap(next: typeof pan) {
    const bounds = viewport.current?.getBoundingClientRect()
    if (!bounds) return
    const limitX = bounds.width * (3 * zoom - 1) / 2
    const limitY = bounds.height * (3 * zoom - 1) / 2
    setPan({ x: Math.max(-limitX, Math.min(limitX, next.x)), y: Math.max(-limitY, Math.min(limitY, next.y)) })
  }
  useEffect(() => {
    if (explorable) moveMap(pan)
  }, [zoom, explorable])
  const selectedShop = shops.find((shop) => shop.id === selected)
  const [x, y] = selectedShop?.mapPosition || positions[selected] || positions.motohub
  const visibleShops: MapShop[] = [
    ...mapShops.map((shop) => shops.find((item) => item.id === shop.id) || shop),
    ...shops.filter((shop) => !mapShops.some((item) => item.id === shop.id)),
  ]
  const destination = visibleShops.find((shop) => shop.id === selected)
  return (
    <div className="mf-map">
      <div ref={viewport} className={`mf-map-viewport${explorable ? " is-explorable" : ""}${dragging ? " is-dragging" : ""}`}
        tabIndex={explorable ? 0 : undefined}
        role={explorable ? "region" : undefined}
        aria-label="Illustrative Panabo City motor shop map"
        aria-describedby={explorable && showHelpText ? "rider-map-help" : undefined}
        onKeyDown={(event) => {
          if (!explorable || event.target !== event.currentTarget) return
          const steps: Record<string, [number, number]> = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] }
          const step = steps[event.key]
          if (step) { event.preventDefault(); moveMap({ x: pan.x + step[0], y: pan.y + step[1] }) }
          if (event.key === "Home") { event.preventDefault(); resetMap() }
        }}
        onPointerDown={(event) => {
          if (!explorable || event.button !== 0 || (event.target as HTMLElement).closest(".mf-map-controls")) return
          if (gesture.current) return
          suppressClick.current = false
          gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, pan, moved: false }
        }}
        onPointerMove={(event) => {
          const active = gesture.current
          if (!active || active.id !== event.pointerId) return
          const dx = event.clientX - active.x, dy = event.clientY - active.y
          if (!active.moved && Math.hypot(dx, dy) < 6) return
          active.moved = true
          event.currentTarget.setPointerCapture(event.pointerId)
          suppressClick.current = true
          setDragging(true)
          moveMap({ x: active.pan.x + dx, y: active.pan.y + dy })
        }}
        onPointerUp={() => { gesture.current = null; setDragging(false) }}
        onPointerCancel={() => { gesture.current = null; setDragging(false) }}
        onLostPointerCapture={() => { gesture.current = null; setDragging(false) }}
        onContextMenu={(event) => { if (explorable) event.preventDefault() }}
        onClickCapture={(event) => {
          if (suppressClick.current) { event.stopPropagation(); event.preventDefault(); suppressClick.current = false }
        }}>
        <div className={`mf-map-world${explorable ? " mf-map-expanded" : ""}`} style={{
          transform: explorable ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` : `scale(${zoom})`,
          transformOrigin: explorable ? "center" : route ? `${(35 + x) / 2}% ${(78 + y) / 2}%` : `${x}% ${y}%`,
        }}>
          {explorable && <svg className="mf-map-roads" viewBox="-1000 -500 3000 1500" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <pattern id="rider-neighborhood" width="1000" height="500" patternUnits="userSpaceOnUse">
                <rect width="1000" height="500" fill="#123b56" />
                <path d="M0 65H1000M0 140H1000M0 220H1000M0 310H1000M0 390H1000M0 465H1000M80 0V500M250 0V500M480 0V500M650 0V500M750 0V500M920 0V500" stroke="#28546f" strokeWidth="22" />
                <path d="M0 65H1000M0 140H1000M0 220H1000M0 310H1000M0 390H1000M0 465H1000M80 0V500M250 0V500M480 0V500M650 0V500M750 0V500M920 0V500" stroke="#446b83" strokeDasharray="5 7" fill="none" />
                <path d="M80 180H250M530 140V220M750 350H920" stroke="#28546f" strokeWidth="12" />
                <g fill="#214a65" stroke="#31597c" strokeWidth="2">
                  <rect x="290" y="85" width="80" height="30" rx="5" />
                  <rect x="530" y="250" width="65" height="35" rx="5" />
                  <rect x="790" y="325" width="80" height="35" rx="5" />
                </g>
                <rect x="120" y="330" width="85" height="45" rx="8" fill="#1d605e" />
              </pattern>
            </defs>
            <rect x="-1000" y="-500" width="3000" height="1500" fill="url(#rider-neighborhood)" />
            <path d="M-1000 947 2000 -452" stroke="#3a657e" strokeWidth="27" />
            <path d="M-1000 947 2000 -452" stroke="#6f8a9b" strokeDasharray="7 8" />
            {[
              [-650, 100, "Western neighborhood"], [-450, 360, "Community gardens"],
              [350, -330, "Northern neighborhood"], [720, -120, "Community school"],
              [1280, 100, "Eastern neighborhood"], [1510, 360, "Riverside park"],
              [290, 640, "Southern neighborhood"], [650, 850, "Transport depot"],
              [-600, -260, "Residential area"], [1400, -260, "Local market"],
              [-590, 760, "Recreation grounds"], [1450, 760, "Community center"],
            ].map(([px, py, label]) => <text key={label} x={px} y={py} fill="#9fbcd3" fontSize="13" textAnchor="middle">{label}</text>)}
            <MapPlaces places={surroundingPlaces} />
          </svg>}
          <div className={explorable ? "mf-map-core" : "mf-map-original"}>
          <svg className="mf-map-roads" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
            <rect width="1000" height="500" fill="#123b56" />
            <path d="M0 65H1000M0 140H1000M0 220H1000M0 310H1000M0 390H1000M0 465H1000M80 0V500M250 0V500M480 0V500M650 0V500M750 0V500M920 0V500" stroke="#28546f" strokeWidth="22" />
            <path d="M0 65H1000M0 140H1000M0 220H1000M0 310H1000M0 390H1000M0 465H1000M80 0V500M250 0V500M480 0V500M650 0V500M750 0V500M920 0V500" stroke="#446b83" strokeDasharray="5 7" fill="none" />
            <path d="M-20 490 1020 5" stroke="#3a657e" strokeWidth="27" />
            <path d="M-20 490 1020 5" stroke="#6f8a9b" strokeDasharray="7 8" fill="none" />
            <path d="M990 500Q850 340 985 255T970 0" fill="none" stroke="#205878" strokeWidth="30" />
            <g fill="#1d605e">
              <rect x="120" y="172" width="110" height="90" rx="12" />
              <rect x="105" y="330" width="110" height="60" rx="10" />
              <rect x="310" y="405" width="115" height="45" rx="8" />
            </g>
            <g fill="#214a65" stroke="#31597c" strokeWidth="2">
              <rect x="305" y="80" width="75" height="38" rx="5" />
              <rect x="520" y="240" width="75" height="40" rx="5" />
              <rect x="790" y="80" width="95" height="38" rx="5" />
              <rect x="280" y="255" width="70" height="35" rx="5" />
              <rect x="790" y="320" width="65" height="40" rx="5" />
            </g>
            {explorable && <g>
              <path d="M80 180H250M530 140V220M750 350H920M380 65V140M250 350H480" stroke="#28546f" strokeWidth="12" fill="none" />
              <g fill="#214a65" stroke="#31597c" strokeWidth="2">
                <rect x="110" y="85" width="80" height="30" rx="5" />
                <rect x="520" y="85" width="75" height="30" rx="5" />
                <rect x="680" y="245" width="40" height="40" rx="5" />
                <rect x="520" y="410" width="75" height="35" rx="5" />
                <rect x="790" y="410" width="85" height="35" rx="5" />
              </g>
              <g fill="#9fbcd3" fontSize="11" textAnchor="middle">
                <text x="150" y="105">Pharmacy</text>
                <text x="555" y="105">School</text>
                <text x="555" y="432">Shops</text>
                <text x="835" y="432">Fuel station</text>
                <text x="355" y="344">Community road</text>
              </g>
            </g>}
            {explorable && <MapPlaces places={nearbyPlaces} />}
            {route && <path
              d={`M350 390H480V${y * 5}H${x * 10}`}
              stroke="#ffad76" strokeWidth="5" fill="none"
              strokeLinecap="round" strokeLinejoin="round"
            />}
          </svg>
          {landmarks.map(([left, top, label]) => (
            <span key={label} className="mf-map-place" style={{ left: `${left}%`, top: `${top}%` }}>{label}</span>
          ))}
          <span className="mf-map-road-name">Panabo main road</span>
          <span className="mf-map-you" role="img" aria-label="Sample rider location at DNSC" />
          {visibleShops.map((shop) => {
            const [left, top] = shop.mapPosition || positions[shop.id] || positions.motohub
            return (
              <button key={shop.id} type="button"
                className={`mf-map-shop ${selected === shop.id ? "is-selected" : ""}`}
                style={{ left: `${left}%`, top: `${top}%` }}
                aria-label={`${shop.name}${selected === shop.id ? ", selected" : ""}`}
                aria-pressed={selected === shop.id}
                onClick={() => onSelect?.(shop.id)}>
                <span className="mf-map-shop-icon"><Store size={20} /></span>
                <span className="mf-map-shop-name">{shop.name}</span>
              </button>
            )
          })}
          </div>
        </div>
        <div className="mf-map-heading"><strong>Panabo City</strong><span>Nearby places & motor shops</span></div>
        <div className="mf-map-controls">
          <button type="button" aria-label="Zoom in" disabled={zoom >= 1.8} onClick={() => setZoom((v) => Math.min(1.8, v + .2))}><Plus size={18} /></button>
          <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom((v) => Math.max(1, v - .2))}><Minus size={18} /></button>
          <button type="button" aria-label="Reset map to show all locations" onClick={resetMap}><LocateFixed size={18} /></button>
        </div>
      </div>
      <div className="mf-map-caption" role="status">
        <span>{started ? `Demo navigation active · Orange route to ${destination?.name || "shop"}` : route ? `Demo route to ${destination?.name || "shop"}` : "Demo map · Panabo City"}</span>
        <span><Store size={14} /> Motor shop <i /> Sample rider location</span>
        {showHelpText && <small id={explorable ? "rider-map-help" : undefined}>{explorable ? "Press and hold anywhere, then drag to explore · Arrow keys to move · Reset to return · " : ""}Illustrative places and routes · Not live navigation</small>}
      </div>
    </div>
  )
}
