// Shared illustrative shops, not verified business listings.
export const additionalShops = [
  {
    id: "gearup", name: "GearUp Moto Works", rating: 4.7, reviews: 52,
    distance: 1.8, address: "New Visayas, Panabo City",
    open: true, available: true,
    services: ["Oil Change", "General Maintenance", "Chain Service"],
    phone: "",
  },
  {
    id: "twowheel", name: "TwoWheel Repair Center", rating: 4.8, reviews: 73,
    distance: 3.1, address: "New Pandan, Panabo City",
    open: true, available: true,
    services: ["Brake Service", "Tire Replacement", "General Maintenance"],
    phone: "",
  },
  {
    id: "roadready", name: "RoadReady Moto Garage", rating: 4.6, reviews: 41,
    distance: 2.7, address: "New Visayas, Panabo City",
    open: true, available: true,
    services: ["Engine Repair", "Electrical Repair", "Oil Change"],
    phone: "",
  },
  {
    id: "apex", name: "Apex Motorcycle Service", rating: 4.9, reviews: 95,
    distance: 3.5, address: "Santo Niño, Panabo City",
    open: true, available: true,
    services: ["Engine Repair", "Brake Service", "Chain Service"],
    phone: "",
  },
  {
    id: "ridecare", name: "RideCare Motor Shop", rating: 4.7, reviews: 62,
    distance: 2.2, address: "New Pandan, Panabo City",
    open: true, available: true,
    services: ["Tire Replacement", "Electrical Repair", "General Maintenance"],
    phone: "",
  },
]

export const mapShops = [
  { id: "motohub", name: "MotoHub Service Center" },
  { id: "revline", name: "Revline Moto Garage" },
  { id: "pitstop", name: "Pitstop Motorcycle Care" },
  ...additionalShops,
]
