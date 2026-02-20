"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Wrench,
    FileText,
    FileSignature,
    FolderKanban,
    Wallet,
    Receipt,
    ChevronLeft,
    ChevronRight,
    Settings,
} from "lucide-react";
import { useState } from "react";
import type { UserRole } from "@/types/database";

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
    roles?: UserRole[];
}

const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Đối tác", href: "/partners", icon: Users },
    { label: "Dịch vụ", href: "/services", icon: Wrench },
    { label: "Báo giá", href: "/quotes", icon: FileText },
    { label: "Hợp đồng", href: "/contracts", icon: FileSignature },
    { label: "Dự án", href: "/projects", icon: FolderKanban },
    {
        label: "Công nợ",
        href: "/debts",
        icon: Wallet,
        roles: ["Admin", "Accountant"],
    },
    {
        label: "Thu chi",
        href: "/transactions",
        icon: Receipt,
        roles: ["Admin", "Accountant"],
    },
    {
        label: "Nhân viên",
        href: "/admin/users",
        icon: Users,
        roles: ["Admin"],
    },
    {
        label: "Cài đặt",
        href: "/settings",
        icon: Settings,
        roles: ["Admin"],
    },
];

interface SidebarProps {
    userRole: UserRole;
}

export default function Sidebar({ userRole }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const filteredItems = navItems.filter(
        (item) => !item.roles || item.roles.includes(userRole)
    );

    return (
        <aside
            className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-slate-900 border-r border-slate-800 z-30 transition-all duration-300 ${collapsed ? "w-[72px]" : "w-64"
                }`}
        >
            {/* Logo */}
            <div className={`h-16 flex items-center px-4 border-b border-white/10 ${collapsed ? "justify-center" : ""}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex-shrink-0 h-9 relative">
                        {/* Try to load logo.png, fallback to icon */}
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="h-full w-auto object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                        <div className="hidden w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-primary-500/30">
                            M
                        </div>
                    </div>
                    {!collapsed && (
                        <div className="min-w-0">
                            <h1 className="text-base font-bold text-white truncate tracking-tight">
                                Minads
                            </h1>
                            <p className="text-[10px] uppercase font-semibold text-slate-400 truncate tracking-wider">
                                Project Manager
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                {filteredItems.map((item) => {
                    const isActive =
                        pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                                ? "bg-primary-600 text-white shadow-lg shadow-primary-900/20"
                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                                } ${collapsed ? "justify-center" : ""}`}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon
                                className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive
                                    ? "text-white"
                                    : "text-slate-500 group-hover:text-slate-300"
                                    }`}
                            />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse button */}
            <div className="p-3 border-t border-white/5">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors text-sm"
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <>
                            <ChevronLeft className="w-4 h-4" />
                            <span>Thu gọn</span>
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
}
