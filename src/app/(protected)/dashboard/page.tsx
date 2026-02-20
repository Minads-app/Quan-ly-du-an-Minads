"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    TrendingUp,
    Users,
    Briefcase,
    FileText,
    ArrowRight,
    Wallet,
    AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        activeProjects: 0,
        pendingQuotes: 0,
        receivableDebt: 0,
        payableDebt: 0,
    });
    const [recentProjects, setRecentProjects] = useState<any[]>([]);
    const [recentContracts, setRecentContracts] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Total Revenue (Contracts)
            const { data: contracts } = await supabase
                .from("contracts")
                .select("total_value")
                .not("total_value", "is", null);

            // Fix implicit any
            const totalRevenue = contracts?.reduce((sum: number, c: any) => sum + (c.total_value || 0), 0) || 0;

            // 2. Active Projects
            const { count: activeProjects } = await supabase
                .from("projects")
                .select("*", { count: "exact", head: true })
                .eq("status", "IN_PROGRESS");

            // 3. Pending Quotes
            const { count: pendingQuotes } = await supabase
                .from("quotes")
                .select("*", { count: "exact", head: true })
                .eq("status", "Sent"); // Or Draft? Usually Sent is pending approval.

            // 4. Debts
            const { data: debts } = await supabase
                .from("debts")
                .select("type, total_amount, paid_amount");

            let receivable = 0;
            let payable = 0;

            // Fix implicit any
            debts?.forEach((d: any) => {
                const remaining = d.total_amount - d.paid_amount;
                if (d.type === "RECEIVABLE") receivable += remaining;
                else payable += remaining;
            });

            setStats({
                totalRevenue,
                activeProjects: activeProjects || 0,
                pendingQuotes: pendingQuotes || 0,
                receivableDebt: receivable,
                payableDebt: payable,
            });

            // 5. Recent Projects
            const { data: projects } = await supabase
                .from("projects")
                .select("id, name, status, created_at")
                .order("created_at", { ascending: false })
                .limit(5);
            setRecentProjects(projects || []);

            // 6. Recent Contracts
            const { data: recentContr } = await supabase
                .from("contracts")
                .select("id, name, total_value, signed_date, client_id, client:partners!client_id(name)")
                .order("created_at", { ascending: false })
                .limit(5);

            // Fix partner array relation if necessary
            const fixedContracts = recentContr?.map((c: any) => ({
                ...c,
                client: Array.isArray(c.client) ? c.client[0] : c.client
            })) || [];

            setRecentContracts(fixedContracts);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    }

    function getStatusBadge(status: string) {
        const colors: Record<string, string> = {
            NOT_STARTED: "bg-slate-100 text-slate-700",
            IN_PROGRESS: "bg-blue-100 text-blue-700",
            COMPLETED: "bg-green-100 text-green-700",
            ON_HOLD: "bg-orange-100 text-orange-700",
            CANCELLED: "bg-red-100 text-red-700",
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || "bg-gray-100"}`}>
                {status}
            </span>
        );
    }

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>
                <p className="text-slate-500">Chào mừng trở lại! Đây là tình hình kinh doanh hôm nay.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Doanh thu */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            +12%
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Doanh thu Hợp đồng</p>
                        <h3 className="text-2xl font-bold text-slate-900 truncate" title={formatCurrency(stats.totalRevenue)}>
                            {loading ? "..." : formatCurrency(stats.totalRevenue)}
                        </h3>
                    </div>
                </div>

                {/* Dự án đang chạy */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                            <Briefcase className="w-6 h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Dự án đang chạy</p>
                        <h3 className="text-2xl font-bold text-slate-900">
                            {loading ? "..." : stats.activeProjects}
                        </h3>
                    </div>
                </div>

                {/* Nợ phải thu */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                            Cần thu
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Nợ phải thu</p>
                        <h3 className="text-2xl font-bold text-slate-900 truncate text-red-600" title={formatCurrency(stats.receivableDebt)}>
                            {loading ? "..." : formatCurrency(stats.receivableDebt)}
                        </h3>
                    </div>
                </div>

                {/* Báo giá chờ duyệt */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-pink-50 text-pink-600 rounded-xl">
                            <FileText className="w-6 h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Báo giá chờ duyệt</p>
                        <h3 className="text-2xl font-bold text-slate-900">
                            {loading ? "..." : stats.pendingQuotes}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Recent Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Projects */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-full">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-900 text-lg">Dự án gần đây</h3>
                        <Link href="/projects" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1 transition-colors">
                            Xem tất cả <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="p-0">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400">Đang tải dữ liệu...</div>
                        ) : recentProjects.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">Chưa có dự án nào</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recentProjects.map((project) => (
                                    <div key={project.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <p className="font-semibold text-slate-900 truncate group-hover:text-primary-700 transition-colors">{project.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {new Date(project.created_at).toLocaleDateString("vi-VN")}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            {getStatusBadge(project.status)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Contracts */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-full">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-900 text-lg">Hợp đồng mới ký</h3>
                        <Link href="/contracts" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1 transition-colors">
                            Xem tất cả <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="p-0">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400">Đang tải dữ liệu...</div>
                        ) : recentContracts.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">Chưa có hợp đồng nào</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recentContracts.map((contract) => (
                                    <div key={contract.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <p className="font-semibold text-slate-900 truncate group-hover:text-primary-700 transition-colors">{contract.name}</p>
                                            <p className="text-xs text-slate-500 mt-1 truncate">
                                                KH: {contract.client?.name}
                                            </p>
                                        </div>
                                        <span className="font-bold text-slate-900 whitespace-nowrap bg-slate-100 px-2 py-1 rounded text-sm">
                                            {formatCurrency(contract.total_value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
