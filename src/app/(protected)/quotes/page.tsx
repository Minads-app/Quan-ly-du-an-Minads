"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Plus,
    Search,
    Filter,
    Eye,
    Edit2,
    Trash2,
    FileText,
    Loader2,
    FileDown,
} from "lucide-react";
import Link from "next/link";
import DeleteConfirm from "@/components/ui/DeleteConfirm";

interface QuoteRow {
    id: string;
    total_amount: number;
    status: string;
    notes: string | null;
    created_at: string;
    client: { id: string; name: string } | null;
    creator: { full_name: string | null; email: string } | null;
}

type FilterStatus = "all" | "Draft" | "Sent" | "Approved";

export default function QuotesPage() {
    const supabase = createClient();
    const [quotes, setQuotes] = useState<QuoteRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [deleteQuote, setDeleteQuote] = useState<QuoteRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchQuotes = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from("quotes")
            .select(
                "id, total_amount, status, notes, created_at, client:partners!client_id(id, name), creator:profiles!created_by(full_name, email)"
            )
            .order("created_at", { ascending: false });

        if (filterStatus !== "all") {
            query = query.eq("status", filterStatus);
        }

        const { data, error } = await query;

        if (!error && data) {
            // Filter by client name on client side
            let result = data as unknown as QuoteRow[];
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                result = result.filter(
                    (quote) =>
                        quote.client?.name?.toLowerCase().includes(q) ||
                        quote.id.toLowerCase().includes(q)
                );
            }
            setQuotes(result);
        }
        setLoading(false);
    }, [filterStatus, searchQuery]);

    useEffect(() => {
        fetchQuotes();
    }, [fetchQuotes]);

    async function handleDelete() {
        if (!deleteQuote) return;
        setDeleting(true);

        // Xóa quote_items trước, rồi xóa quote
        await supabase.from("quote_items").delete().eq("quote_id", deleteQuote.id);
        await supabase.from("quotes").delete().eq("id", deleteQuote.id);

        setQuotes((prev) => prev.filter((q) => q.id !== deleteQuote.id));
        setDeleting(false);
        setDeleteQuote(null);
    }

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    }

    const statusConfig: Record<string, { label: string; badge: string }> = {
        Draft: { label: "Nháp", badge: "badge-draft" },
        Sent: { label: "Đã gửi", badge: "badge-sent" },
        Approved: { label: "Đã duyệt", badge: "badge-approved" },
    };

    const stats = {
        total: quotes.length,
        draft: quotes.filter((q) => q.status === "Draft").length,
        sent: quotes.filter((q) => q.status === "Sent").length,
        approved: quotes.filter((q) => q.status === "Approved").length,
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Báo giá</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Tạo và quản lý báo giá cho khách hàng
                    </p>
                </div>
                <Link href="/quotes/new" className="btn-primary">
                    <Plus className="w-4 h-4" />
                    Tạo báo giá
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                    { key: "all", label: "Tổng", value: stats.total, color: "bg-slate-50 text-slate-600" },
                    { key: "Draft", label: "Nháp", value: stats.draft, color: "bg-slate-50 text-slate-600" },
                    { key: "Sent", label: "Đã gửi", value: stats.sent, color: "bg-blue-50 text-blue-600" },
                    { key: "Approved", label: "Đã duyệt", value: stats.approved, color: "bg-green-50 text-green-600" },
                ].map((s) => (
                    <button
                        key={s.key}
                        onClick={() => setFilterStatus(s.key as FilterStatus)}
                        className={`stat-card cursor-pointer transition-all text-left ${filterStatus === s.key ? "ring-2 ring-primary-400" : "hover:shadow-md"
                            }`}
                    >
                        <div className="min-w-0">
                            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                            <p className="text-xs text-slate-500 truncate">{s.label}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên khách hàng..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-10"
                    />
                </div>
                <div className="relative sm:hidden">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                        className="select pl-10 w-full"
                    >
                        <option value="all">Tất cả</option>
                        <option value="Draft">Nháp</option>
                        <option value="Sent">Đã gửi</option>
                        <option value="Approved">Đã duyệt</option>
                    </select>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                </div>
            ) : quotes.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <FileText className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">Chưa có báo giá nào</p>
                        <p className="text-sm text-slate-400 mt-1">
                            Nhấn &quot;Tạo báo giá&quot; để bắt đầu
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Mobile Cards */}
                    <div className="space-y-3 lg:hidden">
                        {quotes.map((quote) => {
                            const sc = statusConfig[quote.status] || statusConfig.Draft;
                            return (
                                <div key={quote.id} className="card p-4 animate-fade-in">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-semibold text-slate-900 truncate">
                                                {quote.client?.name || "Không xác định"}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={sc.badge}>{sc.label}</span>
                                                <span className="text-xs text-slate-400">
                                                    {formatDate(quote.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-lg font-bold text-primary-600 ml-2">
                                            {formatCurrency(quote.total_amount)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 pt-2 border-t border-slate-100">
                                        <Link
                                            href={`/quotes/${quote.id}`}
                                            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                        <Link
                                            href={`/quotes/${quote.id}/edit`}
                                            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Link>
                                        <Link
                                            href={`/quotes/${quote.id}/pdf`}
                                            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-green-600 transition-colors"
                                        >
                                            <FileDown className="w-4 h-4" />
                                        </Link>
                                        <button
                                            onClick={() => setDeleteQuote(quote)}
                                            className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors ml-auto"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden lg:block table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Khách hàng</th>
                                    <th>Trạng thái</th>
                                    <th className="text-right">Tổng tiền</th>
                                    <th>Ngày tạo</th>
                                    <th>Người tạo</th>
                                    <th className="text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotes.map((quote) => {
                                    const sc = statusConfig[quote.status] || statusConfig.Draft;
                                    return (
                                        <tr key={quote.id}>
                                            <td className="font-medium text-slate-900">
                                                {quote.client?.name || "—"}
                                            </td>
                                            <td>
                                                <span className={sc.badge}>{sc.label}</span>
                                            </td>
                                            <td className="text-right font-medium text-primary-600">
                                                {formatCurrency(quote.total_amount)}
                                            </td>
                                            <td>{formatDate(quote.created_at)}</td>
                                            <td className="text-slate-500">
                                                {quote.creator?.full_name || quote.creator?.email || "—"}
                                            </td>
                                            <td>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={`/quotes/${quote.id}`}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors"
                                                        title="Xem"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <Link
                                                        href={`/quotes/${quote.id}/edit`}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors"
                                                        title="Sửa"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Link>
                                                    <Link
                                                        href={`/quotes/${quote.id}/pdf`}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-green-600 transition-colors"
                                                        title="Xuất PDF"
                                                    >
                                                        <FileDown className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => setDeleteQuote(quote)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                        title="Xóa"
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
                </>
            )}

            {deleteQuote && (
                <DeleteConfirm
                    title="Xóa báo giá"
                    message={`Bạn có chắc muốn xóa báo giá cho "${deleteQuote.client?.name}"? Tất cả hạng mục trong báo giá cũng sẽ bị xóa.`}
                    loading={deleting}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteQuote(null)}
                />
            )}
        </div>
    );
}
