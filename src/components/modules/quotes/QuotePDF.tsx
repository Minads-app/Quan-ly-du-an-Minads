"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import Link from "next/link";

interface QuoteData {
    id: string;
    total_amount: number;
    status: string;
    notes: string | null;
    created_at: string;
    client: { name: string; phone: string | null; address: string | null; tax_code: string | null } | null;
}

interface QuoteItemData {
    id: string;
    quantity: number;
    unit_price: number;
    discount: number;
    line_total: number;
    service: { name: string; unit: string } | null;
}

export default function QuotePDF({ quoteId }: { quoteId: string }) {
    const supabase = createClient();
    const printRef = useRef<HTMLDivElement>(null);
    const [quote, setQuote] = useState<QuoteData | null>(null);
    const [items, setItems] = useState<QuoteItemData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const { data: q } = await supabase
                .from("quotes")
                .select(
                    "id, total_amount, status, notes, created_at, client:partners!client_id(name, phone, address, tax_code)"
                )
                .eq("id", quoteId)
                .single();

            if (q) setQuote(q as unknown as QuoteData);

            const { data: qi } = await supabase
                .from("quote_items")
                .select(
                    "id, quantity, unit_price, discount, line_total, service:services!service_id(name, unit)"
                )
                .eq("quote_id", quoteId)
                .order("created_at");

            if (qi) setItems(qi as unknown as QuoteItemData[]);
            setLoading(false);
        }
        load();
    }, [quoteId]);

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat("vi-VN").format(amount);
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    }

    function handlePrint() {
        window.print();
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
        );
    }

    if (!quote) {
        return <div className="text-center py-16 text-slate-500">Không tìm thấy</div>;
    }

    return (
        <div>
            {/* Toolbar - ẩn khi in */}
            <div className="print:hidden flex items-center justify-between mb-4">
                <Link
                    href={`/quotes/${quoteId}`}
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors flex items-center gap-2"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm">Quay lại</span>
                </Link>
                <div className="flex items-center gap-2">
                    <button onClick={handlePrint} className="btn-primary">
                        <Printer className="w-4 h-4" />
                        In / Xuất PDF
                    </button>
                </div>
            </div>

            {/* Print content */}
            <div
                ref={printRef}
                className="bg-white max-w-[210mm] mx-auto p-8 print:p-0 print:max-w-none print:shadow-none shadow-lg rounded-lg"
                style={{ fontFamily: "'Inter', sans-serif" }}
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">
                        BÁO GIÁ
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Ngày: {formatDate(quote.created_at)}
                    </p>
                </div>

                {/* Client info */}
                <div className="mb-6 border border-slate-200 rounded-lg p-4">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2">
                        Thông tin khách hàng
                    </h2>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span className="text-slate-400">Tên: </span>
                            <span className="font-medium">{quote.client?.name || "—"}</span>
                        </div>
                        <div>
                            <span className="text-slate-400">SĐT: </span>
                            <span className="font-medium">{quote.client?.phone || "—"}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-slate-400">Địa chỉ: </span>
                            <span className="font-medium">{quote.client?.address || "—"}</span>
                        </div>
                        {quote.client?.tax_code && (
                            <div>
                                <span className="text-slate-400">MST: </span>
                                <span className="font-medium">{quote.client.tax_code}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Items table */}
                <table className="w-full text-sm border-collapse mb-6">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="border border-slate-300 px-3 py-2 text-left w-10">
                                STT
                            </th>
                            <th className="border border-slate-300 px-3 py-2 text-left">
                                Hạng mục
                            </th>
                            <th className="border border-slate-300 px-3 py-2 text-center w-16">
                                ĐVT
                            </th>
                            <th className="border border-slate-300 px-3 py-2 text-right w-16">
                                SL
                            </th>
                            <th className="border border-slate-300 px-3 py-2 text-right w-28">
                                Đơn giá
                            </th>
                            <th className="border border-slate-300 px-3 py-2 text-right w-16">
                                CK (%)
                            </th>
                            <th className="border border-slate-300 px-3 py-2 text-right w-32">
                                Thành tiền
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={item.id}>
                                <td className="border border-slate-300 px-3 py-2 text-center">
                                    {idx + 1}
                                </td>
                                <td className="border border-slate-300 px-3 py-2">
                                    {item.service?.name || "—"}
                                </td>
                                <td className="border border-slate-300 px-3 py-2 text-center">
                                    {item.service?.unit || "—"}
                                </td>
                                <td className="border border-slate-300 px-3 py-2 text-right">
                                    {item.quantity}
                                </td>
                                <td className="border border-slate-300 px-3 py-2 text-right">
                                    {formatCurrency(item.unit_price)}
                                </td>
                                <td className="border border-slate-300 px-3 py-2 text-right">
                                    {item.discount > 0 ? `${item.discount}%` : ""}
                                </td>
                                <td className="border border-slate-300 px-3 py-2 text-right font-medium">
                                    {formatCurrency(item.line_total)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-50 font-bold">
                            <td
                                colSpan={6}
                                className="border border-slate-300 px-3 py-2 text-right"
                            >
                                TỔNG CỘNG
                            </td>
                            <td className="border border-slate-300 px-3 py-2 text-right text-lg text-primary-600">
                                {formatCurrency(quote.total_amount)} đ
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {/* Notes */}
                {quote.notes && (
                    <div className="mb-6">
                        <p className="text-sm text-slate-500 font-medium mb-1">Ghi chú:</p>
                        <p className="text-sm text-slate-700">{quote.notes}</p>
                    </div>
                )}

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 mt-12 text-center text-sm">
                    <div>
                        <p className="font-semibold text-slate-700">KHÁCH HÀNG</p>
                        <p className="text-xs text-slate-400 mt-1">
                            (Ký, ghi rõ họ tên)
                        </p>
                        <div className="h-20" />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-700">ĐƠN VỊ BÁO GIÁ</p>
                        <p className="text-xs text-slate-400 mt-1">
                            (Ký, ghi rõ họ tên)
                        </p>
                        <div className="h-20" />
                    </div>
                </div>
            </div>
        </div>
    );
}
