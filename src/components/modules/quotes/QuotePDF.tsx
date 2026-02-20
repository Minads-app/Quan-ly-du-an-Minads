"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import Link from "next/link";
import { getSettings } from "@/lib/actions/settings"; // Or just fetch via supabase client

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

interface OrganizationSettings {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    tax_id: string;
    bank_info: string;
    logo_url: string;
}

export default function QuotePDF({ quoteId }: { quoteId: string }) {
    const supabase = createClient();
    const printRef = useRef<HTMLDivElement>(null);
    const [quote, setQuote] = useState<QuoteData | null>(null);
    const [items, setItems] = useState<QuoteItemData[]>([]);
    const [settings, setSettings] = useState<OrganizationSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                // Load Quote
                const { data: q } = await supabase
                    .from("quotes")
                    .select(
                        "id, total_amount, status, notes, created_at, client:partners!client_id(name, phone, address, tax_code)"
                    )
                    .eq("id", quoteId)
                    .single();

                if (q) setQuote(q as unknown as QuoteData);

                // Load items
                const { data: qi } = await supabase
                    .from("quote_items")
                    .select(
                        "id, quantity, unit_price, discount, line_total, service:services!service_id(name, unit)"
                    )
                    .eq("quote_id", quoteId)
                    .order("created_at");

                if (qi) setItems(qi as unknown as QuoteItemData[]);

                // Load Settings
                const { data: s } = await supabase
                    .from("organization_settings")
                    .select("*")
                    .eq("id", 1)
                    .single();

                if (s) setSettings(s);

            } catch (error) {
                console.error("Error loading quote data:", error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [quoteId, supabase]);

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
        return <div className="text-center py-16 text-slate-500">Không tìm thấy báo giá</div>;
    }

    return (
        <div>
            {/* Toolbar - hidden on print */}
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
                className="bg-white max-w-[210mm] mx-auto p-8 print:p-0 print:max-w-none print:shadow-none shadow-lg rounded-lg min-h-[297mm] flex flex-col"
                style={{ fontFamily: "'Inter', sans-serif" }}
            >
                {/* Header with Company Info */}
                <div className="flex justify-between items-start mb-12 border-b border-slate-200 pb-6">
                    <div className="max-w-[60%]">
                        {settings?.logo_url ? (
                            <img
                                src={settings.logo_url}
                                alt="Company Logo"
                                className="h-16 w-auto object-contain mb-3"
                            />
                        ) : (
                            <div className="h-16 w-16 bg-slate-100 flex items-center justify-center rounded-lg mb-3">
                                <span className="font-bold text-slate-400">LOGO</span>
                            </div>
                        )}
                        <h3 className="font-bold text-lg uppercase text-slate-800">
                            {settings?.name || "CÔNG TY TNHH MINADS"}
                        </h3>
                        <div className="text-xs text-slate-600 space-y-1 mt-1">
                            {settings?.address && <p>{settings.address}</p>}
                            <p>
                                {settings?.tax_id && `MST: ${settings.tax_id}`}
                                {settings?.tax_id && settings?.phone && " - "}
                                {settings?.phone && `Hotline: ${settings.phone}`}
                            </p>
                            <p>
                                {settings?.email && `Email: ${settings.email}`}
                                {settings?.email && settings?.website && " - "}
                                {settings?.website && `Web: ${settings.website}`}
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <h1 className="text-2xl font-bold text-primary-700 uppercase tracking-wider mb-2">
                            BÁO GIÁ
                        </h1>
                        <p className="text-sm text-slate-500">
                            Số: #{quote.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-sm text-slate-500">
                            Ngày: {formatDate(quote.created_at)}
                        </p>
                    </div>
                </div>

                {/* Client info */}
                <div className="mb-8">
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                        <h2 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wide">
                            Thông tin khách hàng
                        </h2>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-sm">
                            <div className="flex">
                                <span className="text-slate-500 w-24 flex-shrink-0">Khách hàng:</span>
                                <span className="font-semibold text-slate-900">{quote.client?.name || "—"}</span>
                            </div>
                            <div className="flex">
                                <span className="text-slate-500 w-20 flex-shrink-0">Điện thoại:</span>
                                <span className="text-slate-900">{quote.client?.phone || "—"}</span>
                            </div>
                            <div className="col-span-2 flex">
                                <span className="text-slate-500 w-24 flex-shrink-0">Địa chỉ:</span>
                                <span className="text-slate-900">{quote.client?.address || "—"}</span>
                            </div>
                            {quote.client?.tax_code && (
                                <div className="col-span-2 flex">
                                    <span className="text-slate-500 w-24 flex-shrink-0">Mã số thuế:</span>
                                    <span className="text-slate-900">{quote.client.tax_code}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Items table */}
                <table className="w-full text-sm border-collapse mb-8 flex-1">
                    <thead>
                        <tr className="bg-primary-50 text-primary-900">
                            <th className="border-b-2 border-primary-100 px-3 py-3 text-center w-12 font-semibold">STT</th>
                            <th className="border-b-2 border-primary-100 px-3 py-3 text-left font-semibold">Hạng mục & Mô tả</th>
                            <th className="border-b-2 border-primary-100 px-3 py-3 text-center w-20 font-semibold">ĐVT</th>
                            <th className="border-b-2 border-primary-100 px-3 py-3 text-right w-20 font-semibold">SL</th>
                            <th className="border-b-2 border-primary-100 px-3 py-3 text-right w-32 font-semibold">Đơn giá</th>
                            <th className="border-b-2 border-primary-100 px-3 py-3 text-right w-32 font-semibold">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map((item, idx) => (
                            <tr key={item.id} className="items-start">
                                <td className="px-3 py-3 text-center text-slate-500 align-top">{idx + 1}</td>
                                <td className="px-3 py-3 align-top">
                                    <p className="font-medium text-slate-800">{item.service?.name || "—"}</p>
                                    {/* Optional description if added later */}
                                </td>
                                <td className="px-3 py-3 text-center text-slate-600 align-top">{item.service?.unit || "—"}</td>
                                <td className="px-3 py-3 text-right text-slate-800 align-top">{item.quantity}</td>
                                <td className="px-3 py-3 text-right text-slate-800 align-top">{formatCurrency(item.unit_price)}</td>
                                <td className="px-3 py-3 text-right font-medium text-slate-900 align-top">
                                    {formatCurrency(item.line_total)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-slate-100">
                            <td colSpan={5} className="px-3 py-4 text-right font-bold text-slate-700">TỔNG CỘNG</td>
                            <td className="px-3 py-4 text-right font-bold text-lg text-primary-600">
                                {formatCurrency(quote.total_amount)} đ
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {/* Footer Section (Bank Info & Signatures) */}
                <div className="mt-auto">
                    {/* Notes & Bank Info */}
                    <div className="grid grid-cols-2 gap-8 mb-12">
                        <div className="text-sm">
                            <h4 className="font-semibold text-slate-700 mb-2">Ghi chú:</h4>
                            <p className="text-slate-600 whitespace-pre-line">{quote.notes || "Báo giá có giá trị trong vòng 15 ngày."}</p>
                        </div>
                        {settings?.bank_info && (
                            <div className="text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <h4 className="font-semibold text-slate-700 mb-2">Thông tin thanh toán:</h4>
                                <p className="text-slate-600 whitespace-pre-line">{settings.bank_info}</p>
                            </div>
                        )}
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-12 text-center text-sm mb-8">
                        <div>
                            <p className="font-bold text-slate-800 uppercase">ĐẠI DIỆN KHÁCH HÀNG</p>
                            <p className="text-xs text-slate-400 mt-1 italic">(Ký, ghi rõ họ tên)</p>
                            <div className="h-24"></div>
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 uppercase">ĐẠI DIỆN {settings?.name ? settings.name.toUpperCase() : "CÔNG TY"}</p>
                            <p className="text-xs text-slate-400 mt-1 italic">(Ký, đóng dấu)</p>
                            <div className="h-24"></div>
                        </div>
                    </div>

                    <div className="text-center text-xs text-slate-400 border-t border-slate-100 pt-4">
                        Cảm ơn quý khách đã tin tưởng và hợp tác!
                    </div>
                </div>
            </div>
        </div>
    );
}
