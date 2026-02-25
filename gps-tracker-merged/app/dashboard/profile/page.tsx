"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    User,
    Mail,
    Phone,
    Building2,
    BadgeCheck,
    ArrowLeft,
    Save,
    Loader2,
    ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import { useGetMeQuery, useUpdateUserMutation } from "@/redux/api/usersApi"
import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper"
import { Header } from "@/components/dashboard/header"

// ─── Form types ───────────────────────────────────────────────────────────────
interface FormState {
    firstName: string
    lastName: string
    email: string
    mobile: string
}

interface FormErrors {
    firstName?: string
    lastName?: string
    email?: string
    mobile?: string
}

function validate(form: FormState): FormErrors {
    const errs: FormErrors = {}
    if (!form.firstName.trim()) errs.firstName = "First name is required"
    if (!form.lastName.trim()) errs.lastName = "Last name is required"
    if (!form.email.trim()) errs.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Valid email required"
    if (!form.mobile.trim()) errs.mobile = "Mobile number is required"
    return errs
}

// ─── Field Component ──────────────────────────────────────────────────────────
function Field({
    label,
    icon: Icon,
    value,
    onChange,
    onBlur,
    error,
    type = "text",
    disabled,
}: {
    label: string
    icon: React.ElementType
    value: string
    onChange: (v: string) => void
    onBlur?: () => void
    error?: string
    type?: string
    disabled?: boolean
}) {
    return (
        <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Icon className="h-3.5 w-3.5" />
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                disabled={disabled}
                className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition-all outline-none
          bg-slate-800/60 border focus:ring-2
          ${error
                        ? "border-red-500/50 focus:ring-red-500/20 text-red-100"
                        : "border-white/10 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-slate-100"
                    }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          placeholder-slate-600`}
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardProfilePage() {
    const router = useRouter()
    const [isAuthed, setIsAuthed] = useState(false)

    const { data: userData, isLoading, isError, refetch } = useGetMeQuery(undefined, {
        refetchOnMountOrArgChange: true,
    })
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation()

    const user = (userData as { data?: Record<string, string & { _id?: string; name?: string }> } | null)?.data

    const [form, setForm] = useState<FormState>({
        firstName: "",
        lastName: "",
        email: "",
        mobile: "",
    })
    const [errors, setErrors] = useState<FormErrors>({})
    const [dirty, setDirty] = useState(false)

    // Auth check
    useEffect(() => {
        const token = getSecureItem("token")
        const role = getSecureItem("userRole")
        if (!token) { router.replace("/"); return }
        if (role && ["admin", "manager", "driver"].includes(role)) {
            setIsAuthed(true)
        } else {
            router.replace("/")
        }
    }, [router])

    // Pre-fill form
    useEffect(() => {
        if (user) {
            setForm({
                firstName: (user.firstName as unknown as string) || "",
                lastName: (user.lastName as unknown as string) || "",
                email: (user.email as unknown as string) || "",
                mobile: (user.mobile as unknown as string) || "",
            })
            setDirty(false)
            setErrors({})
        }
    }, [user])

    const handleChange = (field: keyof FormState) => (value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }))
        setDirty(true)
        setErrors((prev) => ({ ...prev, [field]: undefined }))
    }

    const handleBlur = (field: keyof FormState) => () => {
        const errs = validate(form)
        setErrors((prev) => ({ ...prev, [field]: errs[field] }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const errs = validate(form)
        if (Object.keys(errs).length > 0) {
            setErrors(errs)
            toast.error("Please fix the errors before saving")
            return
        }
        try {
            await updateUser({
                id: user?._id as unknown as string,
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                mobile: form.mobile.trim(),
            }).unwrap()
            toast.success("Profile updated successfully")
            setDirty(false)
            refetch()
        } catch (err: unknown) {
            const e = err as { data?: { message?: string }; message?: string }
            toast.error(e?.data?.message || e?.message || "Update failed")
        }
    }

    if (!isAuthed) return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
            Checking session…
        </div>
    )

    const displayName = user
        ? `${(user.firstName as unknown as string) || ""} ${(user.lastName as unknown as string) || ""}`.trim() || "User"
        : "User"
    const orgName = typeof user?.organizationId === "object"
        ? (user?.organizationId as { name?: string })?.name || "My Organization"
        : null
    const orgEmail = typeof user?.organizationId === "object"
        ? (user?.organizationId as { email?: string })?.email
        : null

    return (
        <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
            <Header vehicleSummary={{ label: "Profile", speed: 0 }} />

            <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
                <div className="mx-auto max-w-4xl">
                    {/* Breadcrumb */}
                    <div className="mb-6 flex items-center gap-2">
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Dashboard
                        </button>
                        <span className="text-slate-600">/</span>
                        <span className="text-sm font-semibold text-slate-200">My Profile</span>
                    </div>

                    {/* Title */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-black text-white tracking-tight">My Profile</h1>
                        <p className="mt-1 text-sm text-slate-400">Manage your personal information and account details</p>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                        </div>
                    ) : isError ? (
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center text-red-300">
                            <p className="font-semibold">Failed to load profile</p>
                            <button onClick={() => refetch()} className="mt-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm hover:bg-red-500/30 transition-colors">
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            {/* ── Left: Identity Card ── */}
                            <div className="space-y-4 md:col-span-1">
                                {/* Avatar card */}
                                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-center">
                                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-3xl font-black text-slate-900 shadow-lg ring-4 ring-emerald-400/20">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <h2 className="text-lg font-bold text-white">{displayName}</h2>
                                    <p className="mt-1 text-xs text-slate-400">{form.email}</p>
                                    <div className="mt-3 flex justify-center gap-2">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                                            <BadgeCheck className="h-3 w-3" />
                                            {(user?.role as unknown as string) || "user"}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border
                      ${(user?.status as unknown as string) === "active"
                                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                                : "bg-slate-600/20 border-slate-600/30 text-slate-400"
                                            }`}>
                                            {(user?.status as unknown as string) || "active"}
                                        </span>
                                    </div>
                                </div>

                                {/* Account info */}
                                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Account Info
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="text-slate-500">User ID</span>
                                            <span className="font-mono text-[10px] text-slate-300 break-all text-right max-w-[140px]">
                                                {(user?._id as unknown as string) || "—"}
                                            </span>
                                        </div>
                                        {orgName && (
                                            <div className="flex items-start justify-between gap-2 pt-2 border-t border-white/5">
                                                <span className="text-slate-500 flex items-center gap-1">
                                                    <Building2 className="h-3 w-3" />Org
                                                </span>
                                                <span className="text-slate-200 font-semibold text-right">{orgName}</span>
                                            </div>
                                        )}
                                        {orgEmail && (
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-slate-500">Org Email</span>
                                                <span className="text-slate-400 text-right text-[10px]">{orgEmail}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Right: Edit Form ── */}
                            <div className="md:col-span-2">
                                <form
                                    onSubmit={handleSubmit}
                                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-5"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <User className="h-4 w-4 text-emerald-400" />
                                        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                                            Basic Details
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field
                                            label="First Name"
                                            icon={User}
                                            value={form.firstName}
                                            onChange={handleChange("firstName")}
                                            onBlur={handleBlur("firstName")}
                                            error={errors.firstName}
                                        />
                                        <Field
                                            label="Last Name"
                                            icon={User}
                                            value={form.lastName}
                                            onChange={handleChange("lastName")}
                                            onBlur={handleBlur("lastName")}
                                            error={errors.lastName}
                                        />
                                    </div>

                                    <Field
                                        label="Email Address"
                                        icon={Mail}
                                        type="email"
                                        value={form.email}
                                        onChange={handleChange("email")}
                                        onBlur={handleBlur("email")}
                                        error={errors.email}
                                    />

                                    <Field
                                        label="Mobile Number"
                                        icon={Phone}
                                        type="tel"
                                        value={form.mobile}
                                        onChange={handleChange("mobile")}
                                        onBlur={handleBlur("mobile")}
                                        error={errors.mobile}
                                    />

                                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => router.push("/dashboard")}
                                            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isUpdating || !dirty}
                                            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-slate-900 hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isUpdating ? (
                                                <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                                            ) : (
                                                <><Save className="h-4 w-4" />Save Changes</>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
