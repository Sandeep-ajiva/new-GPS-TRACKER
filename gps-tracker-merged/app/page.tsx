"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Mail, Loader2 } from "lucide-react"

// Dummy accounts for testing
const DUMMY_ACCOUNTS = [
  { email: "admin1@gmail.com", password: "Admin@123", role: "admin", name: "Admin User" },
  {
    email: "rahul.sharma@gmail.com",
    password: "Manager@123",
    role: "manager",
    name: "Manager User",
    organizationId: "org_ajiva_tracker",
    organizationName: "Ajiva Tracker",
  },
  { email: "driver@test.com", password: "driver123", role: "driver", name: "Driver User" },
  { email: "superadmin@gmail.com", password: "admin@123", role: "superadmin", name: "Super Admin" },
]

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (res.ok && data?.token) {
        const role = data?.user?.role || "admin"
        localStorage.setItem("token", data.token)
        localStorage.setItem("userRole", role)
        localStorage.setItem("userId", data?.user?._id || "")
        localStorage.setItem("userEmail", email)
        localStorage.setItem("userName", data?.user?.firstName || "")
        if (data?.user?.organizationId) {
          localStorage.setItem("organizationId", data.user.organizationId)
        }

        if (role === "superadmin") {
          router.push("/superadmin")
        } else if (role === "admin") {
          router.push("/admin")
        } else {
          router.push("/dashboard")
        }
        return
      }

      // Fallback to dummy accounts when API is unavailable
      const account = DUMMY_ACCOUNTS.find(
        acc => acc.email.toLowerCase() === email.toLowerCase() && acc.password === password
      )

      if (!account) {
        setError(data?.message || "Invalid email or password. Check dummy accounts below.")
        setIsSubmitting(false)
        return
      }

      const dummyToken = `dummy_token_${Date.now()}_${Math.random().toString(36).substring(7)}`

      localStorage.setItem("token", dummyToken)
      localStorage.setItem("userRole", account.role)
      localStorage.setItem("userId", `user_${account.email}`)
      localStorage.setItem("userEmail", account.email)
      localStorage.setItem("userName", account.name)
      if ("organizationId" in account && account.organizationId) {
        localStorage.setItem("organizationId", account.organizationId)
      }
      if ("organizationName" in account && account.organizationName) {
        localStorage.setItem("organizationName", account.organizationName)
      }

      if (account.role === "superadmin") {
        router.push("/superadmin")
      } else if (account.role === "admin") {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.25),_transparent_55%)]" />
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-5xl gap-10 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-center gap-6">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-emerald-200">
            GPS Tracker
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Command your fleet with confidence
          </h1>
          <p className="max-w-xl text-base text-slate-200/80">
            Log in to review live positions, alerts, and health metrics for every vehicle. Stay focused
            with a unified dashboard for all roles.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Live tracking</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Smart alerts</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Reports</span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-white">Sign in</h2>
            <p className="text-sm text-slate-300">
              Use test credentials to access the dashboard.
            </p>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-300">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className="h-12 w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 pl-10 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                  placeholder="admin@test.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  className="h-12 w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 pl-10 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                  placeholder="admin123"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 text-sm font-semibold uppercase tracking-[0.3em] text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-400/60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-xs text-slate-300">
            <p className="font-semibold text-white">📝 Test Accounts:</p>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span><span className="text-emerald-300">Admin:</span> admin1@gmail.com / Admin@123</span>
              </div>
              <div className="flex items-center justify-between">
                <span><span className="text-blue-300">Manager:</span> rahul.sharma@gmail.com / Manager@123</span>
              </div>
              <div className="flex items-center justify-between">
                <span><span className="text-purple-300">Driver:</span> driver@test.com / driver123</span>
              </div>
              <div className="flex items-center justify-between">
                <span><span className="text-orange-300">Super Admin:</span> superadmin@gmail.com / admin@123</span>
              </div>
            </div>
            <p className="mt-3 border-t border-white/10 pt-3 text-slate-400">
              ℹ️ Admin & Super Admin → /admin | Manager & Driver → /dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
