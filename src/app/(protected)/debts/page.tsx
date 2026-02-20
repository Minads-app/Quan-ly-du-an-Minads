"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    Loader2,
    TrendingUp,
    TrendingDown,
    AlertCircle,
} from "lucide-react";
import DeleteConfirm from "@/components/ui/DeleteConfirm";
import DebtModal from "@/components/modules/debts/DebtModal";
import type { Debt, DebtType } from "@/types/database";

interface DebtRow extends Debt {
    partner: { name: string; phone: string | null } | null;
}

export default function DebtsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [debts, setDebts] = useState<DebtRow[]>([]);

    // Filters
    const [activeTab, setActiveTab] = useState<DebtType>("RECEIVABLE");
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
    const [deleteDebt, setDeleteDebt] = useState<Debt | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Stats
    const totalAmount = debts.reduce((sum, d) => sum + d.total_amount, 0);
    const paidAmount = debts.reduce((sum, d) => sum + d.paid_amount, 0);
    const remainingAmount = totalAmount - paidAmount;

    const fetchDebts = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from("debts")
            .select("*, partner:partners!partner_id(name, phone)")
            .eq("type", activeTab)
            .order("created_at", { ascending: false });

        const { data, error } = await query;

        if (!error && data) {
            // Fix partner array issue if any
            const fixedData = data.map((item: any) => ({
                ...item,
                partner: Array.isArray(item.partner) ? item.partner[0] : item.partner,
            }));

            let result = fixedData as unknown as DebtRow[];

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                result = result.filter(
                    (d) =>
                        d.partner?.name.toLowerCase().includes(q) ||
                        d.notes?.toLowerCase().includes(q)
                );
            }
            setDebts(result);
        }
        setLoading(false);
    }, [supabase, activeTab, searchQuery]);

    useEffect(() => {
        fetchDebts();
    }, [fetchDebts]);

    async function handleDelete() {
        if (!deleteDebt) return;
        setDeleting(true);
        const { error } = await supabase.from("debts").delete().eq("id", deleteDebt.id);
        if (!error) {
            setDebts((prev) => prev.filter((d) => d.id !== deleteDebt.id));
            setDeleteDebt(null);
        }
        setDeleting(false);
    }

    function handleEdit(debt: DebtRow) {
        setEditingDebt(debt);
        setIsModalOpen(true);
    }

    function handleCreate() {
        setEditingDebt(null);
        setIsModalOpen(true);
    }

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    }

    function formatDate(dateStr: string | null) {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    }

    function getProgressColor(percent: number) {
        if (percent >= 100) return "bg-green-500";
        if (percent >= 50) return "bg-blue-500";
        return "bg-orange-500";
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">
                        Quản lý Công nợ
                    </h1>
                    <p className="text-slate-500">
                        Theo dõi {activeTab === "RECEIVABLE" ? "khoản phải thu" : "khoản phải trả"}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleCreate} className="btn-primary">
                        <Plus className="w-4 h-4" />
                        Ghi nhận công nợ
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="stat-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">
                            Tổng giá trị
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                        {formatCurrency(totalAmount)}
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-green-50 text-green-600">
                            <TrendingDown className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">
                            Đã thanh toán
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                        {formatCurrency(paidAmount)}
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-red-50 text-red-600">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">
                            Còn lại
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(remainingAmount)}
                    </div>
                </div>
            </div>

            {/* Tabs & Filters */}
            <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab("RECEIVABLE")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "RECEIVABLE"
                            ? "bg-white text-primary-700 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        Phải thu (Khách hàng)
                    </button>
                    <button
                        onClick={() => setActiveTab("PAYABLE")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "PAYABLE"
                            ? "bg-white text-primary-700 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        Phải trả (Nhà cung cấp)
                    </button>
                </div>

                <div className="relative w-full md:w-72">
                    <input
                        type="text"
                        placeholder="Tìm theo tên đối tác..."
                        className="input pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
            ) : debts.length === 0 ? (
                <div className="card p-12 text-center text-slate-500">
                    Chưa có khoản công nợ nào.
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Đối tác</th>
                                    <th className="text-right">Tổng tiền</th>
                                    <th className="text-right">Đã trả</th>
                                    <th className="text-right">Còn lại</th>
                                    <th>Tiến độ</th>
                                    <th>Hạn thanh toán</th>
                                    <th className="text-right w-24">...</th>
                                </tr>
                            </thead>
                            <tbody>
                                {debts.map((debt) => {
                                    const remaining = debt.total_amount - debt.paid_amount;
                                    const percent =
                                        debt.total_amount > 0
                                            ? (debt.paid_amount / debt.total_amount) * 100
                                            : 0;

                                    return (
                                        <tr key={debt.id}>
                                            <td className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {debt.partner?.name}
                                                    {(debt as any).contract_cost_id && (
                                                        <span className="badge bg-emerald-50 text-emerald-600 text-[10px]">Từ CP Hợp đồng</span>
                                                    )}
                                                    {(debt as any).contract_id && (
                                                        <span className="badge bg-blue-50 text-blue-600 text-[10px]">Từ Hợp đồng</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-right">{formatCurrency(debt.total_amount)}</td>
                                            <td className="text-right text-green-600">
                                                {formatCurrency(debt.paid_amount)}
                                            </td>
                                            <td className="text-right text-red-600 font-bold">
                                                {formatCurrency(remaining)}
                                            </td>
                                            <td className="w-32">
                                                <div className="w-full bg-slate-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${getProgressColor(percent)}`}
                                                        style={{ width: `${Math.min(percent, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-slate-500 mt-1 block text-center">
                                                    {percent.toFixed(0)}%
                                                </span>
                                            </td>
                                            <td>{formatDate(debt.due_date)}</td>
                                            <td>
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => handleEdit(debt)}
                                                        className="p-1.5 rounded text-slate-400 hover:text-primary-600"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteDebt(debt)}
                                                        className="p-1.5 rounded text-slate-400 hover:text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <DebtModal
                debt={editingDebt}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaved={fetchDebts}
            />

            {deleteDebt && (
                <DeleteConfirm
                    title="Xóa công nợ"
                    message="Bạn có chắc muốn xóa bản ghi công nợ này?"
                    loading={deleting}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteDebt(null)}
                />
            )}
        </div>
    );
}
