"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Search,
    Plus,
    Trash2,
    Loader2,
    TrendingUp,
    TrendingDown,
    Wallet,
    Calendar,
    FileSignature,
    Filter,
} from "lucide-react";
import DeleteConfirm from "@/components/ui/DeleteConfirm";
import TransactionModal from "@/components/modules/contracts/TransactionModal";
import type { Transaction, TransactionType } from "@/types/database";

interface TransactionRow extends Transaction {
    partner: { name: string } | null;
    contract: { name: string } | null;
}

type SourceFilter = "all" | "contract" | "general";

export default function TransactionsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<TransactionRow[]>([]);

    const [activeTab, setActiveTab] = useState<TransactionType>("RECEIPT");
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteItem, setDeleteItem] = useState<TransactionRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from("transactions")
            .select("*, partner:partners!partner_id(name), contract:contracts!contract_id(name)")
            .eq("type", activeTab)
            .order("transaction_date", { ascending: false });

        // Apply source filter
        if (sourceFilter === "contract") {
            query = query.not("contract_id", "is", null);
        } else if (sourceFilter === "general") {
            query = query.is("contract_id", null);
        }

        const { data, error } = await query;

        if (!error && data) {
            const fixedData = data.map((item: any) => ({
                ...item,
                partner: Array.isArray(item.partner) ? item.partner[0] : item.partner,
                contract: Array.isArray(item.contract) ? item.contract[0] : item.contract,
            }));

            let result = fixedData as unknown as TransactionRow[];

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                result = result.filter(
                    (t) =>
                        t.partner?.name.toLowerCase().includes(q) ||
                        t.description?.toLowerCase().includes(q) ||
                        t.contract?.name?.toLowerCase().includes(q)
                );
            }
            setTransactions(result);
        }
        setLoading(false);
    }, [supabase, activeTab, sourceFilter, searchQuery]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    async function handleDelete() {
        if (!deleteItem) return;
        setDeleting(true);

        // Revert debt paid_amount if linked
        if (deleteItem.debt_id) {
            const { data: debt } = await supabase
                .from("debts")
                .select("paid_amount")
                .eq("id", deleteItem.debt_id)
                .single();
            if (debt) {
                await supabase
                    .from("debts")
                    .update({ paid_amount: Math.max(0, debt.paid_amount - deleteItem.amount) })
                    .eq("id", deleteItem.debt_id);
            }
        }

        await supabase.from("transactions").delete().eq("id", deleteItem.id);
        setTransactions((prev) => prev.filter((t) => t.id !== deleteItem.id));
        setDeleting(false);
        setDeleteItem(null);
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

    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const contractCount = transactions.filter(t => t.contract_id).length;
    const generalCount = transactions.filter(t => !t.contract_id).length;

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">
                        Thu chi
                    </h1>
                    <p className="text-slate-500">
                        Quản lý {activeTab === "RECEIPT" ? "phiếu thu" : "phiếu chi"}
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary"
                >
                    <Plus className="w-4 h-4" />
                    {activeTab === "RECEIPT" ? "Tạo phiếu thu" : "Tạo phiếu chi"}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="stat-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${activeTab === "RECEIPT" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                            {activeTab === "RECEIPT" ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                        <span className="text-sm font-medium text-slate-500">
                            Tổng {activeTab === "RECEIPT" ? "thu" : "chi"}
                        </span>
                    </div>
                    <div className={`text-2xl font-bold ${activeTab === "RECEIPT" ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(totalAmount)}
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                            <FileSignature className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Theo HĐ</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{contractCount}</div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Thu chi khác</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{generalCount}</div>
                </div>
            </div>

            {/* Tabs & Filters */}
            <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                    {/* Type tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab("RECEIPT")}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "RECEIPT"
                                ? "bg-white text-green-700 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                                }`}
                        >
                            Phiếu thu
                        </button>
                        <button
                            onClick={() => setActiveTab("PAYMENT")}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "PAYMENT"
                                ? "bg-white text-red-700 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                                }`}
                        >
                            Phiếu chi
                        </button>
                    </div>

                    {/* Source filter */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setSourceFilter("all")}
                            className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${sourceFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                        >
                            Tất cả
                        </button>
                        <button
                            onClick={() => setSourceFilter("contract")}
                            className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${sourceFilter === "contract" ? "bg-white text-primary-700 shadow-sm" : "text-slate-500"}`}
                        >
                            Theo HĐ
                        </button>
                        <button
                            onClick={() => setSourceFilter("general")}
                            className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${sourceFilter === "general" ? "bg-white text-orange-700 shadow-sm" : "text-slate-500"}`}
                        >
                            Thu chi khác
                        </button>
                    </div>
                </div>

                <div className="relative w-full md:w-72">
                    <input
                        type="text"
                        placeholder="Tìm theo đối tác, nội dung..."
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
            ) : transactions.length === 0 ? (
                <div className="card p-12 text-center text-slate-500">
                    Chưa có {activeTab === "RECEIPT" ? "phiếu thu" : "phiếu chi"} nào
                    {sourceFilter !== "all" && (sourceFilter === "contract" ? " theo hợp đồng" : " thu chi khác")}.
                </div>
            ) : (
                <>
                    {/* Mobile Cards */}
                    <div className="space-y-3 lg:hidden">
                        {transactions.map((t) => (
                            <div key={t.id} className="card p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-semibold text-slate-900">{t.partner?.name}</p>
                                        {t.contract ? (
                                            <span className="inline-flex items-center gap-1 mt-1 text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                                                <FileSignature className="w-3 h-3" />
                                                {t.contract.name}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 mt-1 text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                                                <Wallet className="w-3 h-3" />
                                                Thu chi khác
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-lg font-bold ${activeTab === "RECEIPT" ? "text-green-600" : "text-red-600"}`}>
                                        {activeTab === "RECEIPT" ? "+" : "-"}{formatCurrency(t.amount)}
                                    </span>
                                </div>
                                {t.description && (
                                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">{t.description}</p>
                                )}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                    <div className="flex items-center text-xs text-slate-500 gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {formatDate(t.transaction_date)}
                                    </div>
                                    <button
                                        onClick={() => setDeleteItem(t)}
                                        className="p-1.5 text-slate-400 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden lg:block card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th className="w-[12%]">Ngày</th>
                                        <th className="w-[22%]">Đối tác</th>
                                        <th className="w-[20%]">Hình thức</th>
                                        <th className="w-[26%]">Nội dung</th>
                                        <th className="text-right w-[14%]">Số tiền</th>
                                        <th className="text-right w-[6%]">...</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((t) => (
                                        <tr key={t.id}>
                                            <td className="whitespace-nowrap">{formatDate(t.transaction_date)}</td>
                                            <td className="font-medium truncate" title={t.partner?.name || ""}>{t.partner?.name}</td>
                                            <td>
                                                {t.contract_id ? (
                                                    <span className="inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full font-medium" title={t.contract?.name || "HĐ"}>
                                                        <FileSignature className="w-3 h-3 shrink-0" />
                                                        <span className="truncate">{t.contract?.name || "HĐ"}</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full font-medium">
                                                        <Wallet className="w-3 h-3 shrink-0" />
                                                        Khác
                                                    </span>
                                                )}
                                            </td>
                                            <td className="truncate text-sm" title={t.description || ""}>
                                                {t.description || "—"}
                                            </td>
                                            <td className={`text-right font-bold ${activeTab === "RECEIPT" ? "text-green-600" : "text-red-600"}`}>
                                                {activeTab === "RECEIPT" ? "+" : "-"}{formatCurrency(t.amount)}
                                            </td>
                                            <td>
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => setDeleteItem(t)}
                                                        className="p-1.5 rounded text-slate-400 hover:text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <TransactionModal
                transaction={null}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaved={fetchTransactions}
                defaultType={activeTab}
            />

            {deleteItem && (
                <DeleteConfirm
                    title={`Xóa ${activeTab === "RECEIPT" ? "phiếu thu" : "phiếu chi"}`}
                    message="Bạn có chắc muốn xóa phiếu này? Số tiền đã ghi nhận vào công nợ sẽ được hoàn trả."
                    loading={deleting}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteItem(null)}
                />
            )}
        </div>
    );
}
