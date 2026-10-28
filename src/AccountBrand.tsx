import { Link } from "react-router"
import logo from "./assets/motofix-logo.jpg"

export default function AccountBrand({ to }: { to: string }) {
  return (
    <Link className="account-brand" to={to} aria-label="MotoFix — return to home">
      <img src={logo} alt="" />
      <span>MotoFix</span>
    </Link>
  )
}