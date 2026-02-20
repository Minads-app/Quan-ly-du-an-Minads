"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    ArrowLeft,
    Edit2,
    FileDown,
    Loader2,
    CheckCircle2,
    FileText,
} from "lucide-react";
import Link from "next/link";

interface QuoteData {
    id: string;
    total_amount: number;
    vat_rate: number;
    status: string;
    notes: string | null;
    created_at: string;
    client: { name: string; phone: string | null; address: string | null } | null;
    creator: { full_name: string | null; email: string } | null;
}

interface QuoteItemData {
    id: string;
    quantity: number;
    unit_price: number;
    discount: number;
    line_total: number;
    description: string | null;
    custom_name: string | null;
    custom_unit: string | null;
    service: { name: string; unit: string } | null;
}

export default function QuoteDetail({ quoteId }: { quoteId: string }) {
    const supabase = createClient();
    const [quote, setQuote] = useState<QuoteData | null>(null);
    const [items, setItems] = useState<QuoteItemData[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        async function load() {
            const { data: q } = await supabase
                .from("quotes")
                .select(
                    "id, total_amount, vat_rate, status, notes, created_at, client:partners!client_id(name, phone, address), creator:profiles!created_by(full_name, email)"
                )
                .eq("id", quoteId)
                .single();

            if (q) setQuote(q as unknown as QuoteData);

            const { data: qi } = await supabase
                .from("quote_items")
                .select(
                    "id, quantity, unit_price, discount, line_total, description, custom_name, custom_unit, service:services!service_id(name, unit)"
                )
                .eq("quote_id", quoteId)
                .order("created_at");

            if (qi) setItems(qi as unknown as QuoteItemData[]);
            setLoading(false);
        }
        load();
    }, [quoteId]);

    async function markApproved() {
        setUpdating(true);
        await supabase
            .from("quotes")
            .update({ status: "Approved" })
            .eq("id", quoteId);
        setQuote((prev) => (prev ? { ...prev, status: "Approved" } : prev));
        setUpdating(false);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
        );
    }

    if (!quote) {
        return (
            <div className="text-center py-16 text-slate-500">
                Không tìm thấy báo giá
            </div>
        );
    }

    const sc = statusConfig[quote.status] || statusConfig.Draft;

    return (
        <div className="animate-fade-in max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/quotes"
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">
                            Báo giá — {quote.client?.name}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={sc.badge}>{sc.label}</span>
                            <span className="text-xs text-slate-400">
                                {formatDate(quote.created_at)}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {quote.status !== "Approved" && (
                        <button
                            onClick={markApproved}
                            disabled={updating}
                            className="btn-sm btn bg-green-600 text-white hover:bg-green-700"
                        >
                            {updating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            Duyệt
                        </button>
                    )}
                    {quote.status === "Approved" && (
                        <Link
                            href={`/contracts?quoteId=${quoteId}`}
                            className="btn-sm btn bg-blue-600 text-white hover:bg-blue-700"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Tạo HĐ
                        </Link>
                    )}
                    <Link
                        href={`/quotes/${quoteId}/edit`}
                        className="btn-sm btn-secondary"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                        Sửa
                    </Link>
                    <Link
                        href={`/quotes/${quoteId}/pdf`}
                        className="btn-sm btn-primary"
                    >
                        <FileDown className="w-3.5 h-3.5" />
                        PDF
                    </Link>
                </div>
            </div>

            {/* Client Info */}
            <div className="card p-4 sm:p-6 mb-4">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Thông tin khách hàng
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                        <p className="text-slate-400">Tên</p>
                        <p className="font-medium text-slate-900">
                            {quote.client?.name || "—"}
                        </p>
                    </div>
                    <div>
                        <p className="text-slate-400">SĐT</p>
                        <p className="font-medium text-slate-900">
                            {quote.client?.phone || "—"}
                        </p>
                    </div>
                    <div>
                        <p className="text-slate-400">Địa chỉ</p>
                        <p className="font-medium text-slate-900">
                            {quote.client?.address || "—"}
                        </p>
                    </div>
                </div>
                {quote.notes && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-slate-400 text-sm">Ghi chú</p>
                        <p className="text-sm text-slate-700">{quote.notes}</p>
                    </div>
                )}
            </div>

            {/* Items Table */}
            <div className="card mb-4">
                <div className="p-4 border-b border-slate-200">
                    <h2 className="font-semibold text-slate-900">
                        Hạng mục ({items.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th className="w-8">#</th>
                                <th>Dịch vụ</th>
                                <th className="text-right">SL</th>
                                <th className="text-right">Đơn giá</th>
                                <th className="text-right">CK (%)</th>
                                <th className="text-right">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={item.id}>
                                    <td className="text-slate-400">{idx + 1}</td>
                                    <td className="font-medium text-slate-900">
                                        {item.service?.name || item.custom_name || "—"}
                                        <span className="text-xs text-slate-400 ml-1">
                                            ({item.service?.unit || item.custom_unit || "—"})
                                        </span>
                                        {item.description && (
                                            <p className="text-xs text-slate-500 mt-0.5 font-normal">{item.description}</p>
                                        )}
                                    </td>
                                    <td className="text-right">{item.quantity}</td>
                                    <td className="text-right">
                                        {formatCurrency(item.unit_price)}
                                    </td>
                                    <td className="text-right">
                                        {item.discount > 0 ? `${item.discount}%` : "—"}
                                    </td>
                                    <td className="text-right font-medium text-primary-600">
                                        {formatCurrency(item.line_total)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-xl space-y-1">
                    {(quote.vat_rate || 0) > 0 && (() => {
                        const subtotal = quote.total_amount / (1 + (quote.vat_rate || 0) / 100);
                        const vatAmt = quote.total_amount - subtotal;
                        return (
                            <>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Tạm tính</span>
                                    <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">VAT ({quote.vat_rate}%)</span>
                                    <span className="font-medium text-slate-800">{formatCurrency(vatAmt)}</span>
                                </div>
                            </>
                        );
                    })()}
                    <div className="flex items-center justify-between pt-1">
                        <span className="font-semibold text-slate-700">Tổng cộng</span>
                        <span className="text-xl font-bold text-primary-600">
                            {formatCurrency(quote.total_amount)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Meta */}
            <div className="text-xs text-slate-400 text-right">
                Tạo bởi: {quote.creator?.full_name || quote.creator?.email || "—"} • {formatDate(quote.created_at)}
            </div>
        </div>
    );
}
