import { FormEvent, ReactNode, useEffect, useState } from "react"

import logo from "./assets/motofix-logo.jpg"

import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
  useNavigate,
} from "react-router"

import Rider from "./Rider"

import ShopOwner, { getInitialShopData } from "./ShopOwner"

import Mechanic from "./Mechanic"

import {
  requestPasswordReset,
  completePasswordReset,
  getSession,
  signIn,
  signOut,
  signUp,
  completePendingGoogleSignup,
  getPendingGoogleSignup,
  saveAppState,
  updateShopRegistration,
  updateAccountPhone,
  type BusinessLegitimacyInput,
  type AppUser,
  type SignUpInput,
} from "./api"

import { flushRemoteState, restoreAccountState } from "./stateSync"

type Screen = "login" | "create-account" | "rider-signup" | "shop-signup" | "forgot-password" | "reset-password" | "rider-home" | "shop-dashboard" | "mechanic-dashboard"
type GoogleSignUpDetails = Omit<SignUpInput, "password">

type IconName = "arrow" | "bike" | "briefcase" | "check" | "eye" | "eye-off" | "mail" | "phone" | "shield" | "store" | "tool" | "user"

interface IconProps {
  name: IconName

  size?: number
}

function Icon({ name, size = 20 }: IconProps) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="m15 18-6-6 6-6" />,

    bike: (
      <>
        <circle cx="6" cy="17" r="3" />
        <circle cx="18" cy="17" r="3" />
        <path d="M8.5 17h5l-3-7h4l3.5 7M5 14l3-5h3M9 7h3" />
      </>
    ),

    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="12" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </>
    ),

    check: <path d="m5 12 4 4L19 6" />,

    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),

    "eye-off": (
      <>
        <path d="m3 3 18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-2.1 2.8M6.4 6.4C3.6 8.2 2 12 2 12s3.5 6 10 6c1.4 0 2.6-.3 3.6-.7" />
      </>
    ),

    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),

    phone: (
      <path d="M7 3H5a2 2 0 0 0-2 2c0 8.8 7.2 16 16 16a2 2 0 0 0 2-2v-2l-4-1-1 2c-3.8-1.6-6.4-4.2-8-8l2-1-1-4Z" />
    ),

    shield: (
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Zm-3-10 2 2 4-5" />
    ),

    store: (
      <>
        <path d="M4 10v10h16V10M3 4h18l-2 6H5L3 4Z" />
        <path d="M9 20v-6h6v6" />
      </>
    ),

    tool: (
      <path d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 8.4 7.2 6.1 5a4 4 0 0 0 5 5L19 18a2 2 0 1 0 3-3l-7.3-7.3Z" />
    ),

    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function StatusBar() {
  return (
    <div className="status-bar">
      <span>9:41</span>
      <div className="status-icons" aria-hidden="true">
        <span className="signal">▮▮▮</span>
        <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
          <path
            d="M1 4.5a9 9 0 0 1 13 0M3.5 7a5.6 5.6 0 0 1 8 0M6.2 9.5a1.8 1.8 0 0 1 2.6 0"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <span className="battery">
          <i />
        </span>
      </div>
    </div>
  )
}

function Logo({
  compact = false,

  inset = false,
}: {
  compact?: boolean

  inset?: boolean
}) {
  return (
    <div className={compact ? "logo-wrap compact" : "logo-wrap"}>
      <img
        className={inset ? "object-contain! p-2" : undefined}
        src={logo}
        alt="MotoFix motorcycle helmet and wrench logo"
      />
    </div>
  )
}

function Header({
  title,

  subtitle,

  onBack,
}: {
  title: string

  subtitle?: string

  onBack?: () => void
}) {
  return (
    <header className="screen-header">
      {onBack && (
        <button className="icon-button" onClick={onBack} aria-label="Go back">
          <Icon name="arrow" />
        </button>
      )}
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </header>
  )
}

function Field({
  label,

  icon,

  type = "text",

  placeholder,

  value,

  onChange,

  name,

  required,

  minLength,

  autoComplete,

  readOnly,
}: {
  label: string

  icon: IconName

  type?: string

  placeholder: string

  value?: string

  onChange?: (value: string) => void

  name?: string

  required?: boolean

  minLength?: number

  autoComplete?: string

  readOnly?: boolean
}) {
  const [visible, setVisible] = useState(false)

  const password = type === "password"

  return (
    <label className="field">
      <span>{label}</span>
      <div className="field-control">
        <Icon name={icon} />
        <input
          type={password && visible ? "text" : type}
          name={name}
          placeholder={placeholder}
          value={value}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          readOnly={readOnly}
          onChange={(event) => onChange?.(event.target.value)}
        />
        {password && (
          <button
            type="button"
            className="field-action"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? "Hide password" : "Show password"}
          >
            <Icon name={visible ? "eye-off" : "eye"} size={19} />
          </button>
        )}
      </div>
    </label>
  )
}

function Login({
  goTo,

  onLogin,

  onGoogle,

  error: sharedError,
}: {
  goTo: (screen: Screen) => void

  onLogin: (identity: string, password: string) => Promise<void>

  onGoogle: () => void

  error?: string
}) {
  const [identity, setIdentity] = useState("")

  const [password, setPassword] = useState("")

  const [error, setError] = useState("")

  const [busy, setBusy] = useState(false)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    setBusy(true)

    setError("")

    void onLogin(identity, password)

      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : "Unable to sign in.",
        ),
      )

      .finally(() => setBusy(false))
  }

  return (
    <main className="screen login-screen">
      <div className="login-brand">
        <Logo inset />
        <h1>Welcome back</h1>
        <p>Sign in to keep your journey moving.</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        {(error || sharedError) && (
          <p className="auth-error" role="alert">
            {error || sharedError}
          </p>
        )}
        <Field
          label="Email or Mobile Number"
          icon="user"
          placeholder="Enter email or mobile number"
          name="identity"
          autoComplete="username"
          required
          value={identity}
          onChange={setIdentity}
        />
        <Field
          label="Password"
          icon="shield"
          type="password"
          placeholder="Enter your password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={setPassword}
        />
        <button
          type="button"
          className="text-button forgot"
          onClick={() => goTo("forgot-password")}
        >
          Forgot Password?
        </button>
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Login"}
        </button>
        <button type="button" className="google-button" onClick={onGoogle}>
          <GoogleIcon /> Continue with Google
        </button>
        <div className="divider">
          <span>New to MotoFix?</span>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => goTo("create-account")}
        >
          Create Account
        </button>
      </form>

      <p className="role-note">
        One secure login for Riders, Motor Shops, and Mechanics
      </p>
      <div className="demo-logins" aria-label="Demo accounts">
        {[
          ["Rider", "rider@motofix.local"],

          ["Shop", "owner@motofix.local"],

          ["Mechanic", "mechanic@motofix.local"],
        ].map(([label, email]) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              setIdentity(email)

              setPassword("MotoFix123!")

              setError("")
            }}
          >
            {label} demo
          </button>
        ))}
      </div>
    </main>
  )
}

const accountStepNames = [
  "Account type",
  "Personal details",
  "Profile details",
  "Security",
]

function AccountProgress({
  step,
  onStep,
}: {
  step: number
  onStep?: (step: number) => void
}) {
  return (
    <nav className="account-progress" aria-label="Account creation progress">
      <div className="account-progress-heading">
        <span>STEP {step + 1} OF {accountStepNames.length}</span>
        <span>{Math.round(((step + 1) / accountStepNames.length) * 100)}% complete</span>
      </div>
      <div className="account-progress-bars" aria-hidden="true">
        {accountStepNames.map((name, index) => (
          <span key={name} className={index <= step ? "complete" : ""} />
        ))}
      </div>
      <ol>
        {accountStepNames.map((name, index) => (
          <li key={name}>
            <button
              type="button"
              aria-current={index === step ? "step" : undefined}
              disabled={!onStep || index >= step}
              onClick={() => onStep?.(index)}
            >
              {name}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function CreateAccount({ goTo }: { goTo: (screen: Screen) => void }) {
  const [role, setRole] = useState<"rider" | "shop" | null>(null)

  return (
    <main className="screen">
      <Header
        title="Create your account"
        subtitle="How will you use MotoFix?"
        onBack={() => goTo("login")}
      />
      <AccountProgress step={0} />
      <div className="role-list">
        <button
          className={`role-card ${role === "rider" ? "selected" : ""}`}
          onClick={() => setRole("rider")}
        >
          <span className="role-icon blue">
            <Icon name="bike" size={28} />
          </span>
          <span className="role-copy">
            <strong>Motorcycle Rider</strong>
            <small>
              Find trusted shops and manage your motorcycle service.
            </small>
          </span>
          <span className="radio">{role === "rider" && <i />}</span>
        </button>
        <button
          className={`role-card ${role === "shop" ? "selected" : ""}`}
          onClick={() => setRole("shop")}
        >
          <span className="role-icon orange">
            <Icon name="store" size={27} />
          </span>
          <span className="role-copy">
            <strong>Motor Shop Owner</strong>
            <small>Manage bookings, services, and your mechanic team.</small>
          </span>
          <span className="radio">{role === "shop" && <i />}</span>
        </button>
      </div>
      <div className="info-card">
        <Icon name="shield" />
        <p>
          <strong>Are you a mechanic?</strong> Your shop owner will create your
          staff account. You can then log in from the main screen.
        </p>
      </div>
      <div className="bottom-actions">
        <button
          className="primary-button"
          disabled={!role}
          onClick={() => goTo(role === "shop" ? "shop-signup" : "rider-signup")}
        >
          Continue
        </button>
        <p>
          Already have an account?{" "}
          <button className="inline-link" onClick={() => goTo("login")}>
            Log in
          </button>
        </p>
      </div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h6a5.2 5.2 0 0 1-2.2 3.3v2.8h3.6c2.1-2 3.2-4.8 3.2-8.2Z"
      />
      <path
        fill="#34A853"
        d="M12 23c3 0 5.5-1 7.4-2.6l-3.6-2.8c-1 .7-2.3 1-3.8 1a6.5 6.5 0 0 1-6.1-4.4H2.2V17A11.2 11.2 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.9 14.2A6.7 6.7 0 0 1 5.5 12c0-.8.1-1.5.4-2.2V7H2.2A11 11 0 0 0 1 12c0 1.8.4 3.5 1.2 5l3.7-2.8Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.4c1.6 0 3.1.5 4.3 1.7l3.2-3.2A10.8 10.8 0 0 0 2.2 7l3.7 2.8A6.5 6.5 0 0 1 12 5.4Z"
      />
    </svg>
  )
}

function startGoogleAuth(role: "rider" | "shop" | "login", registration?: GoogleSignUpDetails) {
  try {
    if (registration) sessionStorage.setItem("motofix-pending-google-signup", JSON.stringify(registration))
    else sessionStorage.removeItem("motofix-pending-google-signup")
    if (role === "login") sessionStorage.removeItem("motofix-pending-google-login-token")
  } catch {
    // OAuth can still proceed if session storage is unavailable.
  }
  const googleStartUrl = new URL(
    "/api/auth/google/start",
    window.location.origin,
  )
  googleStartUrl.searchParams.set("role", role)
  googleStartUrl.searchParams.set("origin", window.location.origin)
  window.location.assign(googleStartUrl.toString())
}

function SignUp({
  role,

  goTo,

  onRegister,

  onGoogleSignUp,
  pendingGoogle,
  onGoogleComplete,
}: {
  role: "rider" | "shop"

  goTo: (screen: Screen) => void

  onRegister: (input: SignUpInput) => Promise<void>

  onGoogleSignUp: (input: GoogleSignUpDetails) => void
  pendingGoogle?: { token: string; name: string; email: string } | null
  onGoogleComplete: (token: string, input: GoogleSignUpDetails) => Promise<void>
}) {
  const shop = role === "shop"
  const [step, setStep] = useState(0)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [details, setDetails] = useState({
    name: pendingGoogle?.name || "", email: pendingGoogle?.email || "", phone: "", shopName: "", shopAddress: "",
    legalName: "", tradeName: "", entity: "Sole proprietorship (DTI)", registration: "", registeredOn: "", tin: "", bir: "", permit: "", permitIssued: "", permitExpiry: "", barangay: "", fireCertificate: "", fireExpiry: "", sanitaryPermit: "",
    motorcycle: "", plate: "", year: "", password: "", confirmPassword: "", agreed: false,
  })
  useEffect(() => {
    if (pendingGoogle) {
      setDetails((current) => ({ ...current, name: pendingGoogle.name, email: pendingGoogle.email }))
    }
  }, [pendingGoogle?.name, pendingGoogle?.email])
  const setDetail = (key: keyof typeof details, value: string | boolean) =>
    setDetails((current) => ({ ...current, [key]: value }))
  const registrationDetails: GoogleSignUpDetails = {
    role,
    name: details.name.trim(),
    email: details.email.trim(),
    phone: details.phone.trim(),
    ...(shop
      ? {
          shopName: details.shopName.trim(),
          shopAddress: details.shopAddress.trim(),
          businessLegitimacy: {
            legalName: details.legalName.trim() || details.shopName.trim(),
            tradeName: details.tradeName.trim() || details.shopName.trim(),
            entity: details.entity.trim(),
            registration: details.registration.trim(),
            registeredOn: details.registeredOn.trim(),
            tin: details.tin.trim(),
            bir: details.bir.trim(),
            permit: details.permit.trim(),
            permitIssued: details.permitIssued.trim(),
            permitExpiry: details.permitExpiry.trim(),
            barangay: details.barangay.trim(),
            fireCertificate: details.fireCertificate.trim(),
            fireExpiry: details.fireExpiry.trim(),
            sanitaryPermit: details.sanitaryPermit.trim(),
          } satisfies BusinessLegitimacyInput,
        }
      : { motorcycle: details.motorcycle.trim(), plate: details.plate.trim(), year: details.year.trim() }),
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    if (step < 2) {
      setStep((current) => current + 1)
      return
    }
    if (pendingGoogle) {
      if (!details.agreed) {
        setError("Agree to the Terms of Service and Privacy Policy to continue.")
        return
      }
      setBusy(true)
      void onGoogleComplete(pendingGoogle.token, registrationDetails)
        .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to complete your account."))
        .finally(() => setBusy(false))
      return
    }
    if (details.password !== details.confirmPassword) {
      setError("Your passwords do not match.")
      return
    }
    setBusy(true)
    void onRegister({ ...registrationDetails, password: details.password })

      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to create your account.",
        ),
      )

      .finally(() => setBusy(false))
  }

  const beginGoogleSignup = () => {
    setError("")
    if (!details.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim()) || !details.phone.trim()) {
      setError("Complete your personal details before continuing with Google.")
      setStep(0)
      return
    }
    if (shop ? !details.shopName.trim() || !details.shopAddress.trim() : !details.motorcycle.trim() || !details.plate.trim() || !details.year.trim()) {
      setError(shop ? "Complete your shop details before continuing with Google." : "Complete your motorcycle details before continuing with Google.")
      setStep(1)
      return
    }
    if (shop && (!details.legalName.trim() || !details.entity.trim() || !details.registration.trim())) {
      setError("Add the legal business name, business type, and registration number to the legitimacy record.")
      setStep(1)
      return
    }
    if (shop && (!details.name.trim() || !details.email.trim() || !details.phone.trim())) {
      setError("Complete the owner's name, email, and mobile number before continuing with Google.")
      setStep(0)
      return
    }
    if (!details.agreed) {
      setError("Agree to the Terms of Service and Privacy Policy to continue.")
      return
    }
    onGoogleSignUp(registrationDetails)
  }

  return (
    <main className="screen signup-screen">
      <Header
        title={step === 0 ? "Your personal details" : step === 1 ? (shop ? "Shop & business details" : "Motorcycle details") : "Secure your account"}
        subtitle={shop ? "Tell us about you and your business." : "Your smoother ride starts here."}
        onBack={() => step > 0 ? setStep((current) => current - 1) : goTo("create-account")}
      />
      <AccountProgress step={step + 1} onStep={(target) => {
        if (target === 0) goTo("create-account")
        else setStep(target - 1)
      }} />
      <form className="auth-form signup-form" onSubmit={submit}>
        {step === 0 && <>
          <Field label={shop ? "Owner's Full Name" : "Full Name"} icon="user" placeholder="Enter your full name" name="name" autoComplete="name" required readOnly={Boolean(pendingGoogle)} value={details.name} onChange={(value) => setDetail("name", value)} />
          <Field label="Email Address" icon="mail" type="email" placeholder="name@email.com" name="email" autoComplete="email" required readOnly={Boolean(pendingGoogle)} value={details.email} onChange={(value) => setDetail("email", value)} />
          <Field label="Mobile Number" icon="phone" type="tel" placeholder="+63 9XX XXX XXXX" name="phone" autoComplete="tel" required value={details.phone} onChange={(value) => setDetail("phone", value)} />
        </>}
        {step === 1 && (shop ? <>
          <Field label="Motor Shop Name" icon="store" placeholder="Enter your shop name" name="shopName" required value={details.shopName} onChange={(value) => setDetail("shopName", value)} />
          <Field label="Shop Address" icon="store" placeholder="Street, barangay, city" name="shopAddress" required value={details.shopAddress} onChange={(value) => setDetail("shopAddress", value)} />
          <p className="text-xs font-semibold text-[#b9d5ed]">Business legitimacy record · text fields only</p>
          <Field label="Legal business name" icon="briefcase" placeholder="Registered legal name" required value={details.legalName} onChange={(value) => setDetail("legalName", value)} />
          <Field label="Trade name (if different)" icon="briefcase" placeholder="Shop's registered trade name" value={details.tradeName} onChange={(value) => setDetail("tradeName", value)} />
          <Field label="Business type / entity" icon="briefcase" placeholder="e.g. Sole proprietorship (DTI)" required value={details.entity} onChange={(value) => setDetail("entity", value)} />
          <Field label="DTI / SEC / CDA registration number" icon="briefcase" placeholder="Registration number" required value={details.registration} onChange={(value) => setDetail("registration", value)} />
          <Field label="Business registration date" icon="briefcase" placeholder="YYYY-MM-DD or date on record" value={details.registeredOn} onChange={(value) => setDetail("registeredOn", value)} />
          <Field label="TIN" icon="briefcase" placeholder="Tax identification number" value={details.tin} onChange={(value) => setDetail("tin", value)} />
          <Field label="BIR Certificate of Registration" icon="briefcase" placeholder="BIR Form 2303 reference" value={details.bir} onChange={(value) => setDetail("bir", value)} />
          <Field label="Business / mayor's permit number" icon="briefcase" placeholder="Permit number" value={details.permit} onChange={(value) => setDetail("permit", value)} />
          <Field label="Business permit issue date" icon="briefcase" placeholder="YYYY-MM-DD" value={details.permitIssued} onChange={(value) => setDetail("permitIssued", value)} />
          <Field label="Business permit expiry date" icon="briefcase" placeholder="YYYY-MM-DD" value={details.permitExpiry} onChange={(value) => setDetail("permitExpiry", value)} />
          <Field label="Barangay business clearance" icon="briefcase" placeholder="Clearance reference" value={details.barangay} onChange={(value) => setDetail("barangay", value)} />
          <Field label="Fire safety inspection certificate" icon="briefcase" placeholder="Certificate reference" value={details.fireCertificate} onChange={(value) => setDetail("fireCertificate", value)} />
          <Field label="Fire certificate expiry date" icon="briefcase" placeholder="YYYY-MM-DD" value={details.fireExpiry} onChange={(value) => setDetail("fireExpiry", value)} />
          <Field label="Sanitary / health permit (if applicable)" icon="briefcase" placeholder="Permit reference or Not applicable" value={details.sanitaryPermit} onChange={(value) => setDetail("sanitaryPermit", value)} />
        </> : <>
          <Field label="Motorcycle Make & Model" icon="bike" placeholder="e.g. Yamaha NMAX 155" name="motorcycle" required value={details.motorcycle} onChange={(value) => setDetail("motorcycle", value)} />
          <Field label="Plate Number" icon="bike" placeholder="Enter plate number" name="plate" required value={details.plate} onChange={(value) => setDetail("plate", value)} />
          <Field label="Model Year" icon="bike" type="number" placeholder="e.g. 2024" name="year" required value={details.year} onChange={(value) => setDetail("year", value)} />
        </>)}
        {step === 2 && <>
          {pendingGoogle ? <p className="info-card">Your Google account is verified. It will secure your MotoFix sign-in.</p> : <>
            <Field label="Create Password" icon="shield" type="password" placeholder="At least 8 characters" name="password" autoComplete="new-password" minLength={8} required value={details.password} onChange={(value) => setDetail("password", value)} />
            <Field label="Confirm Password" icon="shield" type="password" placeholder="Enter your password again" name="confirmPassword" autoComplete="new-password" minLength={8} required value={details.confirmPassword} onChange={(value) => setDetail("confirmPassword", value)} />
          </>}
          <label className="terms">
            <input type="checkbox" required checked={details.agreed} onChange={(event) => setDetail("agreed", event.target.checked)} />
            <span>I agree to the <button type="button">Terms of Service</button> and <button type="button">Privacy Policy</button>.</span>
          </label>
        </>}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Creating account…" : step === 2 ? pendingGoogle ? "Complete account" : "Create Account" : "Continue"}
        </button>
        {step === 2 && !pendingGoogle && <>
          <div className="divider"><span>or create your account with</span></div>
          <button type="button" className="google-button" onClick={beginGoogleSignup}>
            <GoogleIcon /> Sign up with Google
          </button>
        </>}
      </form>
    </main>
  )
}

function ForgotPassword({
  goTo,

  onSubmit,
}: {
  goTo: (screen: Screen) => void

  onSubmit: (identity: string) => Promise<string>
}) {
  const [sent, setSent] = useState(false)

  const [identity, setIdentity] = useState("")

  const [message, setMessage] = useState("")

  const [error, setError] = useState("")

  const [busy, setBusy] = useState(false)

  return (
    <main className="screen">
      <Header title="Reset password" onBack={() => goTo("login")} />
      <div className="reset-illustration">
        <Icon name={sent ? "check" : "mail"} size={34} />
      </div>
      {sent ? (
        <div className="center-copy">
          <h2>Check your inbox</h2>
          <p>{message}</p>
          <button className="primary-button" onClick={() => goTo("login")}>
            Back to Login
          </button>
        </div>
      ) : (
        <form
          className="auth-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()

            setBusy(true)

            setError("")

            void onSubmit(identity)

              .then((result) => {
                setMessage(result)

                setSent(true)
              })

              .catch((reason: unknown) =>
                setError(
                  reason instanceof Error
                    ? reason.message
                    : "Unable to send the request.",
                ),
              )

              .finally(() => setBusy(false))
          }}
        >
          <div className="center-copy left">
            <h2>Forgot your password?</h2>
            <p>
              No worries. Enter the email address linked to your account and we
              will send a secure reset link if it matches.
            </p>
          </div>
          <Field
            label="Email Address"
            icon="user"
            type="email"
            placeholder="Enter your account email"
            name="identity"
            autoComplete="email"
            required
            value={identity}
            onChange={setIdentity}
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send Reset Link"}
          </button>
        </form>
      )}
    </main>
  )
}

function ResetPassword({
  token,

  goTo,

  onSubmit,
}: {
  token: string

  goTo: (screen: Screen) => void

  onSubmit: (token: string, newPassword: string) => Promise<void>
}) {
  const [newPassword, setNewPassword] = useState("")

  const [confirmation, setConfirmation] = useState("")

  const [error, setError] = useState("")

  const [busy, setBusy] = useState(false)

  const [complete, setComplete] = useState(false)

  return (
    <main className="screen">
      <Header
        title="Choose a new password"
        onBack={() => goTo("forgot-password")}
      />
      {complete ? (
        <div className="center-copy">
          <div className="reset-illustration">
            <Icon name="check" size={34} />
          </div>
          <h2>Password updated</h2>
          <p>You can now sign in with your new password.</p>
          <button className="primary-button" onClick={() => goTo("login")}>
            Back to Login
          </button>
        </div>
      ) : (
        <form
          className="auth-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()

            setError("")

            if (newPassword !== confirmation) {
              setError("The passwords do not match.")

              return
            }

            setBusy(true)

            void onSubmit(token, newPassword)

              .then(() => setComplete(true))

              .catch((reason: unknown) =>
                setError(
                  reason instanceof Error
                    ? reason.message
                    : "Unable to reset the password.",
                ),
              )

              .finally(() => setBusy(false))
          }}
        >
          <div className="center-copy left">
            <p>Choose a password with at least 8 characters.</p>
          </div>
          <Field
            label="New Password"
            icon="shield"
            type="password"
            placeholder="Enter a new password"
            name="newPassword"
            autoComplete="new-password"
            minLength={8}
            required
            value={newPassword}
            onChange={setNewPassword}
          />
          <Field
            label="Confirm New Password"
            icon="shield"
            type="password"
            placeholder="Enter the new password again"
            name="confirmPassword"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirmation}
            onChange={setConfirmation}
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary-button"
            type="submit"
            disabled={busy || !token}
          >
            {busy ? "Updating…" : "Reset Password"}
          </button>
          {!token && (
            <p className="auth-error" role="alert">
              This reset link is missing its token. Request a new link.
            </p>
          )}
        </form>
      )}
    </main>
  )
}

function Dashboard({
  role,

  goTo,
}: {
  role: "rider" | "shop" | "mechanic"

  goTo: (screen: Screen) => void
}) {
  const content = {
    rider: {
      eyebrow: "Rider Home",

      title: "Good morning, Alex",

      description: "Your motorcycle is ready for the road.",

      icon: "bike" as IconName,

      action: "Find a Motor Shop",

      cards: ["My Motorcycle", "Service History", "Nearby Shops"],
    },

    shop: {
      eyebrow: "Shop Dashboard",

      title: "Welcome, MotoHub",

      description: "You have 4 service requests today.",

      icon: "store" as IconName,

      action: "View Service Requests",

      cards: ["Today's Jobs", "Mechanic Team", "Shop Services"],
    },

    mechanic: {
      eyebrow: "Mechanic Dashboard",

      title: "Let's get to work",

      description: "You have 3 assigned jobs today.",

      icon: "tool" as IconName,

      action: "View Assigned Jobs",

      cards: ["Current Job", "Job Queue", "Completed"],
    },
  }[role]

  return (
    <main className="screen dashboard">
      <div className="dash-top">
        <div>
          <span>{content.eyebrow}</span>
          <h1>{content.title}</h1>
        </div>
        <button
          className="avatar"
          onClick={() => goTo("login")}
          aria-label="Log out"
        >
          <Icon name="user" />
        </button>
      </div>
      <section className="dash-hero">
        <span className="hero-icon">
          <Icon name={content.icon} size={32} />
        </span>
        <p>{content.description}</p>
        <button>
          {content.action} <span>→</span>
        </button>
      </section>
      <section className="quick-section">
        <div className="section-title">
          <h2>Quick access</h2>
          <button>View all</button>
        </div>
        <div className="quick-grid">
          {content.cards.map((card, index) => (
            <button className="quick-card" key={card}>
              <span>
                <Icon name={index === 1 ? "briefcase" : content.icon} />
              </span>
              <strong>{card}</strong>
              <small>Open details</small>
            </button>
          ))}
        </div>
      </section>
      <div className="demo-banner">
        <Icon name="shield" />
        <p>
          Role-based login routed you to the <strong>{content.eyebrow}</strong>.
        </p>
      </div>
      <nav className="bottom-nav">
        <button className="active">
          <Icon name={content.icon} />
          <span>Home</span>
        </button>
        <button>
          <Icon name="briefcase" />
          <span>Activity</span>
        </button>
        <button>
          <Icon name="user" />
          <span>Profile</span>
        </button>
      </nav>
    </main>
  )
}

function screenForRole(role: AppUser["role"]): Screen {
  if (role === "shop") return "shop-dashboard"

  if (role === "mechanic") return "mechanic-dashboard"

  return "rider-home"
}

function pathForScreen(screen: Screen) {
  if (screen === "reset-password") return "/"

  if (screen === "rider-home") return "/rider/home"

  if (screen === "shop-dashboard") return "/shop/dashboard"

  if (screen === "mechanic-dashboard") return "/mechanic/dashboard"

  return "/"
}

function googleErrorMessage(value: string | null) {
  const messages: Record<string, string> = {
    bad_google_role:
      "Choose Motorcycle Rider or Motor Shop before signing up with Google.",

    google_not_configured:
      "Google sign-up needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.",

    google_origin_invalid:
      "Google sign-up needs a secure HTTPS website address. Open MotoFix through its HTTPS link, or keep localhost for laptop testing.",

    google_origin_mismatch:
      "Google sign-up has no callback configured for this website address. Use localhost on your laptop or the configured HTTPS link on your phone.",

    google_callback_mismatch:
      "Google sign-up callback is not configured for this website address. Check GOOGLE_CALLBACK_URL and GOOGLE_CALLBACK_URLS in .env, then restart MotoFix.",

    google_state_expired:
      "The Google sign-in session expired. Please try again.",

    google_cancelled: "Google sign-up was cancelled.",

    google_role_conflict:
      "That Google email is already registered with a different MotoFix account type.",

    google_account_not_found:
      "No MotoFix account is linked to this Google account yet. Create an account first, then try again.",

    google_account_conflict:
      "This Google account conflicts with an existing MotoFix account. Contact support to link the accounts.",

    google_account_inactive:
      "This MotoFix account is inactive. Contact the motor shop owner.",

    google_credentials_rejected:
      "Google rejected the OAuth credentials. Check that the Client ID and Client Secret are from the same Web client in Google Cloud, then restart MotoFix.",

    google_token_exchange_failed:
      "Google could not finish the sign-in code exchange. Retry once; if it happens again, check the OAuth Client Secret and the exact callback URL in Google Cloud.",

    google_profile_failed:
      "Google did not return a verified account profile. Retry with a Google account that has a verified email address.",

    google_account_save_failed:
      "MotoFix could not save this account. Check that MySQL is running in XAMPP, then try again.",

    google_failed: "Google could not complete sign-up. Please try again.",
  }

  return value
    ? messages[value] || "Google sign-up could not be completed."
    : ""
}

function saveRegistrationProfile(user: AppUser, registration: GoogleSignUpDetails) {
  const contact = {
    name: user.name.trim() || registration.name.trim(),
    email: user.email.trim() || registration.email.trim(),
    phone: registration.phone.trim() || user.phone.trim(),
  }
  try {
    if (registration.role === "shop") {
      localStorage.setItem("motofix-owner-account", JSON.stringify(contact))
      let shopData = getInitialShopData()
      try {
        const stored = JSON.parse(localStorage.getItem("motofix-owner-v1") || "null")
        if (stored?.profile && stored?.mechanics && stored?.notices) {
          shopData = { ...shopData, ...stored, profile: { ...shopData.profile, ...stored.profile } }
        }
      } catch {
        // Use the initialized shop profile for a new account.
      }
      shopData.profile = {
        ...shopData.profile,
        name: registration.shopName?.trim() || user.shopName || shopData.profile.name,
        address: registration.shopAddress?.trim() || shopData.profile.address,
        phone: contact.phone || shopData.profile.phone,
      }
      localStorage.setItem("motofix-owner-v1", JSON.stringify(shopData))
      const record = registration.businessLegitimacy
      localStorage.setItem("motofix-business-legitimacy-v1", JSON.stringify({
        legalName: record?.legalName || registration.shopName?.trim() || user.shopName,
        tradeName: record?.tradeName || registration.shopName?.trim() || user.shopName,
        entity: record?.entity || "Sole proprietorship (DTI)",
        owner: contact.name,
        email: contact.email,
        phone: contact.phone,
        address: registration.shopAddress?.trim() || "",
        registration: record?.registration || "",
        registeredOn: record?.registeredOn || "",
        tin: record?.tin || "",
        bir: record?.bir || "",
        permit: record?.permit || "",
        permitIssued: record?.permitIssued || "",
        permitExpiry: record?.permitExpiry || "",
        barangay: record?.barangay || "",
        fireCertificate: record?.fireCertificate || "",
        fireExpiry: record?.fireExpiry || "",
        sanitaryApplicable: Boolean(record?.sanitaryPermit),
        sanitaryPermit: record?.sanitaryPermit || "",
        documents: {},
        status: "Draft",
        submitted: "",
      }))
      return
    }

    let existing: Record<string, unknown> = {}
    try {
      existing = JSON.parse(localStorage.getItem("motofix-profile") || "{}")
    } catch {
      // Use the new rider's submitted motorcycle details.
    }
    const motorcycle = registration.motorcycle?.trim() || String(existing.bike || "Yamaha NMAX 155")
    const plate = registration.plate?.trim() || String(existing.plate || "MC 2841")
    const year = registration.year?.trim() || String(existing.year || "2024")
    localStorage.setItem("motofix-profile", JSON.stringify({
      ...existing,
      ...contact,
      bike: motorcycle,
      plate,
      year,
    }))
    localStorage.setItem("motofix-motorcycles", JSON.stringify([
      { id: "primary-motorcycle", bike: motorcycle, plate, year },
    ]))
  } catch {
    // The account remains usable if this browser cannot save onboarding details.
  }
}

function MotoFixApp() {
  const navigate = useNavigate()

  const location = useLocation()

  const [authScreen, setScreen] = useState<Screen>("login")

  const [resetToken, setResetToken] = useState(
    () => new URLSearchParams(window.location.search).get("reset_token") || "",
  )

  const [authUser, setAuthUser] = useState<AppUser | null>(null)

  const [authReady, setAuthReady] = useState(false)

  const [authError, setAuthError] = useState("")

  const [pendingGoogleSignup, setPendingGoogleSignup] = useState<{
    token: string
    name: string
    email: string
  } | null>(null)

  const [mechanicIdentity, setMechanicIdentity] = useState("")

  const [logoutRequested, setLogoutRequested] = useState(false)

  const screen = resetToken
    ? "reset-password"
    : authUser
      ? screenForRole(authUser.role)
      : authScreen

  const goTo = (next: Screen) => {
    setResetToken("")

    setScreen(next)

    navigate(pathForScreen(next))
  }

  const activateAccount = async (user: AppUser, registration?: GoogleSignUpDetails) => {
    await restoreAccountState(
      user,

      user.role === "mechanic" ? getInitialShopData() : undefined,
    )

    if (registration) saveRegistrationProfile(user, registration)

    setAuthUser(user)

    setAuthReady(true)

    setAuthError("")

    if (user.role === "mechanic") {
      const identity = user.email || user.username

      setMechanicIdentity(identity)

      sessionStorage.setItem("motofix-mechanic-identity", identity)
    } else {
      setMechanicIdentity("")

      sessionStorage.removeItem("motofix-mechanic-identity")
    }

    goTo(screenForRole(user.role))
  }

  const handleLogin = async (identity: string, password: string) => {
    const result = await signIn(identity, password)

    await activateAccount(result.user)
  }

  const handleRegister = async (input: SignUpInput) => {
    const result = await signUp(input)

    await activateAccount(result.user, input)
  }

  const handleCompleteGoogleSignup = async (
    token: string,
    input: GoogleSignUpDetails,
  ) => {
    const result = await completePendingGoogleSignup(token, input)
    sessionStorage.removeItem("motofix-pending-google-login-token")
    setPendingGoogleSignup(null)
    await activateAccount(result.user, input)
  }

  const handlePasswordReset = async (identity: string) => {
    const result = await requestPasswordReset(identity)

    return result.message
  }

  const handleCompletePasswordReset = async (
    token: string,
    newPassword: string,
  ) => {
    await completePasswordReset(token, newPassword)
  }

  const confirmLogout = async () => {
    await flushRemoteState()

    await signOut().catch(() => undefined)

    sessionStorage.removeItem("motofix-mechanic-identity")

    setMechanicIdentity("")

    setAuthUser(null)

    setAuthError("")

    setLogoutRequested(false)

    goTo("login")
  }

  useEffect(() => {
    let active = true

    const init = async () => {
      const search = new URLSearchParams(window.location.search)
      const callbackToken = search.get("google_signup_pending")
      let storedToken = ""
      try {
        storedToken = sessionStorage.getItem("motofix-pending-google-login-token") || ""
      } catch {
        // The callback URL still carries the one-time token for this visit.
      }
      const pendingToken = callbackToken || storedToken
      if (pendingToken) {
        try {
          sessionStorage.setItem("motofix-pending-google-login-token", pendingToken)
        } catch {
          // Keep using the callback URL token for this page load.
        }
        if (callbackToken) navigate("/", { replace: true })
        try {
          const identity = await getPendingGoogleSignup(pendingToken)
          if (!active) return
          setPendingGoogleSignup({ token: pendingToken, ...identity })
          setScreen("create-account")
          setAuthError("")
          setAuthReady(true)
          return
        } catch (error) {
          if (!active) return
          sessionStorage.removeItem("motofix-pending-google-login-token")
          setPendingGoogleSignup(null)
          setAuthError(error instanceof Error ? error.message : "Google account setup expired. Start again with Continue with Google.")
          setScreen("login")
        }
      }
      const oauthErrorCode = search.get("auth_error")
      const oauthError = googleErrorMessage(oauthErrorCode)

      if (oauthErrorCode === "google_account_not_found") {
        setScreen("create-account")
        setAuthError("")
        sessionStorage.removeItem("motofix-pending-google-signup")
        navigate("/", { replace: true })
      } else if (oauthError) {
        setAuthError(oauthError)
        sessionStorage.removeItem("motofix-pending-google-signup")
      }

      try {
        const result = await getSession()

        if (!active) return

        if (result.user && !resetToken) {
          await restoreAccountState(
            result.user,

            result.user.role === "mechanic" ? getInitialShopData() : undefined,
          )

          if (!active) return

          let sessionUser = result.user
          const search = new URLSearchParams(window.location.search)
          if (search.get("oauth_created") === "1") {
            try {
              const pending = JSON.parse(sessionStorage.getItem("motofix-pending-google-signup") || "null") as GoogleSignUpDetails | null
              if (pending && pending.role === sessionUser.role && (pending.role === "rider" || pending.role === "shop")) {
                saveRegistrationProfile(sessionUser, pending)
                if (pending.phone.trim()) {
                  try {
                    sessionUser = (await updateAccountPhone(pending.phone.trim())).user
                  } catch {
                    // Keep the onboarding phone locally if the profile update is temporarily unavailable.
                  }
                }
                if (pending.role === "shop") {
                  try {
                    sessionUser = (await updateShopRegistration({
                      shopName: pending.shopName?.trim() || sessionUser.shopName,
                      shopAddress: pending.shopAddress?.trim() || "",
                    })).user
                    const legitimacy = JSON.parse(localStorage.getItem("motofix-business-legitimacy-v1") || "null")
                    if (legitimacy) await saveAppState("motofix-business-legitimacy-v1", legitimacy)
                  } catch {
                    // The account still opens; the locally saved shop setup can be retried later.
                  }
                }
              }
            } catch {
              // A malformed or unavailable pending form should not prevent Google login.
            }
          }
          sessionStorage.removeItem("motofix-pending-google-signup")

          setAuthUser(sessionUser)

          if (sessionUser.role === "mechanic") {
            const identity = sessionUser.email || sessionUser.username

            setMechanicIdentity(identity)

            sessionStorage.setItem("motofix-mechanic-identity", identity)
          }

          const prefix =
            sessionUser.role === "rider"
              ? "/rider/"
              : sessionUser.role === "shop"
                ? "/shop/"
                : "/mechanic/"

          if (!location.pathname.startsWith(prefix)) {
            navigate(pathForScreen(screenForRole(sessionUser.role)), {
              replace: true,
            })
          }
        } else if (
          location.pathname.startsWith("/rider/") ||
          location.pathname.startsWith("/shop/") ||
          location.pathname.startsWith("/mechanic/")
        ) {
          navigate("/", { replace: true })
        }
      } catch (error) {
        if (active) {
          setAuthError(
            error instanceof Error
              ? error.message
              : "MotoFix could not reach its server.",
          )
        }
      } finally {
        if (active) setAuthReady(true)
      }
    }

    void init()

    return () => {
      active = false
    }
  }, [])

  if (!authReady && !authUser) {
    return (
      <div className="app-stage">
        <div className="auth-loading">Opening MotoFix…</div>
      </div>
    )
  }

  return (
    <div className="app-stage">
      <div className="phone-shell">
        <div className="phone-speaker" aria-hidden="true" />
        <div className="phone-screen">
          <StatusBar />
          {screen === "login" && (
            <Login
              goTo={goTo}
              onLogin={handleLogin}
              onGoogle={() => startGoogleAuth("login")}
              error={authError}
            />
          )}
          {screen === "create-account" && <CreateAccount goTo={goTo} />}
          {(screen === "rider-signup" || screen === "shop-signup") && (
            <SignUp
              role={screen === "shop-signup" ? "shop" : "rider"}
              goTo={goTo}
              onRegister={handleRegister}
              onGoogleSignUp={(details) => startGoogleAuth(details.role, details)}
              pendingGoogle={pendingGoogleSignup}
              onGoogleComplete={handleCompleteGoogleSignup}
            />
          )}
          {screen === "forgot-password" && (
            <ForgotPassword goTo={goTo} onSubmit={handlePasswordReset} />
          )}
          {screen === "reset-password" && (
            <ResetPassword
              token={resetToken}
              goTo={goTo}
              onSubmit={handleCompletePasswordReset}
            />
          )}
          {screen === "rider-home" && (
            <Rider user={authUser!} onLogout={() => setLogoutRequested(true)} />
          )}
          {screen === "shop-dashboard" && (
            <ShopOwner
              user={authUser!}
              onUserUpdated={setAuthUser}
              onLogout={() => setLogoutRequested(true)}
            />
          )}
          {screen === "mechanic-dashboard" && (
            <Mechanic
              identity={mechanicIdentity}
              user={authUser!}
              onLogout={() => setLogoutRequested(true)}
            />
          )}
          {logoutRequested && (
            <div
              className="logout-modal-backdrop"
              role="presentation"
              onMouseDown={() => setLogoutRequested(false)}
            >
              <div
                className="logout-modal"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="logout-title"
                aria-describedby="logout-description"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <span className="logout-modal-icon">
                  <Icon name="shield" size={25} />
                </span>
                <h2 id="logout-title">Log out of MotoFix?</h2>
                <p id="logout-description">
                  Your account data is saved on the MotoFix server. You can sign
                  in again at any time.
                </p>
                <div>
                  <button
                    className="logout-cancel"
                    type="button"
                    onClick={() => setLogoutRequested(false)}
                  >
                    Stay Logged In
                  </button>
                  <button
                    className="logout-confirm"
                    type="button"
                    onClick={() => void confirmLogout()}
                  >
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="home-indicator" aria-hidden="true" />
        </div>
      </div>
      <p className="stage-caption">
        <span /> MotoFix mobile preview
      </p>
    </div>
  )
}

const router = createBrowserRouter([{ path: "*", Component: MotoFixApp }])

export default function App() {
  return <RouterProvider router={router} />
}
