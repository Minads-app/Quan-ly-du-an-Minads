"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
    LogOut,
    Menu,
    ChevronDown,
    User,
    Wrench,
    FileSignature,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/types/database";
import { getInitials } from "@/lib/utils";

// Map pathname to page title
function getPageTitle(pathname: string): string {
    const titles: Record<string, string> = {
        "/dashboard": "Dashboard",
        "/partners": "Đối tác",
        "/services": "Dịch vụ & Vật tư",
        "/quotes": "Báo giá",
        "/contracts": "Hợp đồng",
        "/projects": "Dự án",
        "/debts": "Công nợ",
    };

    for (const [path, title] of Object.entries(titles)) {
        if (pathname === path || pathname.startsWith(path + "/")) {
            return title;
        }
    }
    return "Minads";
}

interface HeaderProps {
    profile: Profile;
}

export default function Header({ profile }: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    }

    const roleLabels: Record<string, string> = {
        Admin: "Quản trị viên",
        Accountant: "Kế toán",
        Employee: "Nhân viên",
    };

    // Extra mobile nav items not in bottom nav
    const mobileExtraItems = [
        { label: "Dịch vụ & Vật tư", href: "/services", icon: Wrench },
        { label: "Hợp đồng", href: "/contracts", icon: FileSignature },
    ];

    return (
        <>
            <header className="sticky top-0 z-40 h-16 bg-white/95 backdrop-blur-lg border-b border-slate-200 flex items-center justify-between px-4 sm:px-6">
                {/* Left side - Mobile menu + Title */}
                <div className="flex items-center gap-3">
                    {/* Mobile menu toggle */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <h1 className="text-lg font-semibold text-slate-900">
                        {getPageTitle(pathname)}
                    </h1>
                </div>

                {/* Right side - User dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">
                                {getInitials(profile.full_name || profile.email)}
                            </span>
                        </div>
                        <div className="hidden sm:block text-left min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate max-w-[120px]">
                                {profile.full_name || profile.email}
                            </p>
                            <p className="text-[10px] text-slate-400">
                                {roleLabels[profile.role] || profile.role}
                            </p>
                        </div>
                        <ChevronDown
                            className={`w-4 h-4 text-slate-400 hidden sm:block transition-transform ${dropdownOpen ? "rotate-180" : ""
                                }`}
                        />
                    </button>

                    {/* Dropdown menu */}
                    {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg shadow-black/10 border border-slate-200 py-1 animate-fade-in">
                            <div className="px-4 py-3 border-b border-slate-100">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                    {profile.full_name || profile.email}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                    {profile.email}
                                </p>
                                <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                                    {roleLabels[profile.role] || profile.role}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Đăng xuất
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Mobile extra menu (Services, Contracts) */}
            {mobileMenuOpen && (
                <div className="lg:hidden bg-white border-b border-slate-200 animate-fade-in">
                    <div className="px-4 py-2 space-y-1">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-3 py-1">
                            Thêm
                        </p>
                        {mobileExtraItems.map((item) => {
                            const isActive =
                                pathname === item.href ||
                                pathname.startsWith(item.href + "/");
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? "bg-primary-50 text-primary-700"
                                        : "text-slate-600 hover:bg-slate-50"
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
}
