"use client";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import type { Profile } from "@/types/database";

interface ProtectedLayoutClientProps {
    children: React.ReactNode;
    profile: Profile;
}

export default function ProtectedLayoutClient({
    children,
    profile,
}: ProtectedLayoutClientProps) {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Desktop Sidebar */}
            <Sidebar userRole={profile.role} />

            {/* Main content area */}
            <div className="lg:ml-64 min-h-screen flex flex-col transition-all duration-300">
                {/* Header */}
                <Header profile={profile} />

                {/* Page content */}
                <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <MobileNav userRole={profile.role} />
        </div>
    );
}
