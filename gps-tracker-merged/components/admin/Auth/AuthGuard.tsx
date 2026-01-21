"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        // Check for token and role in localStorage
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("userRole");

        if (!token || role !== "admin") {
            // If no token or admin role, redirect to login
            router.push("/");
        } else {
            // If token exists and is admin, allow access
            setAuthorized(true);
        }
    }, [router, pathname]);

    if (!authorized) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-[#1877F2]" size={48} />
            </div>
        );
    }

    return <>{children}</>;
}
