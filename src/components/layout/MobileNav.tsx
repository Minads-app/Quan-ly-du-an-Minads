"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    FileText,
    FolderKanban,
    Wallet,
} from "lucide-react";
import type { UserRole } from "@/types/database";

interface MobileNavItem {
    label: string;
    href: string;
    icon: React.ElementType;
    roles?: UserRole[];
}

const mobileNavItems: MobileNavItem[] = [
    { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
    { label: "Đối tác", href: "/partners", icon: Users },
    { label: "Báo giá", href: "/quotes", icon: FileText },
    { label: "Dự án", href: "/projects", icon: FolderKanban },
    { label: "Công nợ", href: "/debts", icon: Wallet, roles: ["Admin", "Accountant"] },
];

interface MobileNavProps {
    userRole: UserRole;
}

export default function MobileNav({ userRole }: MobileNavProps) {
    const pathname = usePathname();

    const filteredItems = mobileNavItems.filter(
        (item) => !item.roles || item.roles.includes(userRole)
    );

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 safe-area-bottom">
            <div className="flex items-center justify-around px-2 py-1">
                {filteredItems.map((item) => {
                    const isActive =
                        pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[56px] transition-all duration-200 ${isActive
                                    ? "text-primary-600"
                                    : "text-slate-400 active:text-slate-600"
                                }`}
                        >
                            <div
                                className={`p-1 rounded-lg transition-colors ${isActive ? "bg-primary-50" : ""
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                            </div>
                            <span
                                className={`text-[10px] font-medium ${isActive ? "text-primary-700" : "text-slate-500"
                                    }`}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
