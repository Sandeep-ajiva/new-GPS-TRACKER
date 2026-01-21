import DashboardLayout from "@/components/dashboard/layout-wrapper"
import { Bell } from "lucide-react"

export default function AlertsPage() {
    return (
        <DashboardLayout>
            <div className="flex h-full flex-col items-center justify-center text-slate-500 gap-4">
                <Bell className="h-16 w-16 text-slate-300" />
                <h1 className="text-2xl font-bold text-slate-700">System Alerts</h1>
                <p>This feature is currently under development.</p>
            </div>
        </DashboardLayout>
    )
}
