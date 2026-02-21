"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    Receipt,
    FileText,
    Calendar,
    Filter,
    ChevronDown,
} from "lucide-react";

// ---- Types ----
interface ContractRow {
    id: string;
    name: string;
    total_value: number;
    vat_rate: number;
    signed_date: string | null;
    created_at: string;
    client: { name: string } | null;
}

interface CostRow {
    amount: number;
    created_at: string;
    contract_id: string;
}

interface TransactionRow {
    type: string;
    amount: number;
    transaction_date: string;
}

type PeriodFilter = "month" | "quarter" | "year" | "all";

// ---- Helpers ----
function formatCurrency(amount: number) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount);
}

function getDateRange(period: PeriodFilter, refDate: Date): { from: Date; to: Date } {
    const y = refDate.getFullYear();
    const m = refDate.getMonth();

    switch (period) {
        case "month":
            return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0, 23, 59, 59) };
        case "quarter": {
            const q = Math.floor(m / 3);
            return { from: new Date(y, q * 3, 1), to: new Date(y, q * 3 + 3, 0, 23, 59, 59) };
        }
        case "year":
            return { from: new Date(y, 0, 1), to: new Date(y, 11, 31, 23, 59, 59) };
        case "all":
        default:
            return { from: new Date(2000, 0, 1), to: new Date(2099, 11, 31) };
    }
}

function getPeriodLabel(period: PeriodFilter, ref: Date): string {
    const m = ref.getMonth();
    const y = ref.getFullYear();
    switch (period) {
        case "month":
            return `Tháng ${m + 1}/${y}`;
        case "quarter":
            return `Quý ${Math.floor(m / 3) + 1}/${y}`;
        case "year":
            return `Năm ${y}`;
        case "all":
            return "Toàn bộ";
    }
}

// ============================================================
export default function ReportsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<PeriodFilter>("month");
    const [refDate, setRefDate] = useState(new Date());

    // Data
    const [contracts, setContracts] = useState<ContractRow[]>([]);
    const [costs, setCosts] = useState<CostRow[]>([]);
    const [transactions, setTransactions] = useState<TransactionRow[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { from, to } = getDateRange(period, refDate);
            const fromISO = from.toISOString();
            const toISO = to.toISOString();

            // 1. Contracts in period (by signed_date or created_at)
            const { data: contractData } = await supabase
                .from("contracts")
                .select("id, name, total_value, vat_rate, signed_date, created_at, client:partners!client_id(name)")
                .or(`signed_date.gte.${fromISO.split("T")[0]},and(signed_date.is.null,created_at.gte.${fromISO})`)
                .or(`signed_date.lte.${toISO.split("T")[0]},and(signed_date.is.null,created_at.lte.${toISO})`)
                .order("signed_date", { ascending: false });

            const fixedContracts: ContractRow[] = (contractData || []).map((c: any) => ({
                ...c,
                client: Array.isArray(c.client) ? c.client[0] : c.client,
            }));
            setContracts(fixedContracts);

            // 2. Costs (contract_costs + project_costs)
            const { data: contractCosts } = await supabase
                .from("contract_costs")
                .select("amount, created_at, contract_id")
                .gte("created_at", fromISO)
                .lte("created_at", toISO);
            const { data: projectCosts } = await supabase
                .from("project_costs")
                .select("amount, created_at, project_id")
                .gte("created_at", fromISO)
                .lte("created_at", toISO);

            setCosts([
                ...(contractCosts || []).map((c: any) => ({ amount: c.amount, created_at: c.created_at, contract_id: c.contract_id })),
                ...(projectCosts || []).map((c: any) => ({ amount: c.amount, created_at: c.created_at, contract_id: c.project_id })),
            ]);

            // 3. Transactions in period
            const { data: txData } = await supabase
                .from("transactions")
                .select("type, amount, transaction_date")
                .gte("transaction_date", fromISO.split("T")[0])
                .lte("transaction_date", toISO.split("T")[0]);
            setTransactions(txData || []);

        } catch (err) {
            console.error("Error fetching report data:", err);
        } finally {
            setLoading(false);
        }
    }, [supabase, period, refDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ---- Calculations ----
    // Gross Revenue (total_value of all contracts, includes VAT)
    const grossRevenue = contracts.reduce((sum, c) => sum + (c.total_value || 0), 0);

    // Net Revenue (exclude VAT from each contract)
    const netRevenue = contracts.reduce((sum, c) => {
        const rate = c.vat_rate || 0;
        if (rate > 0) {
            return sum + c.total_value / (1 + rate / 100);
        }
        return sum + (c.total_value || 0);
    }, 0);

    // Total VAT
    const totalVAT = grossRevenue - netRevenue;

    // Total Costs
    const totalCosts = costs.reduce((sum, c) => sum + (c.amount || 0), 0);

    // Estimated Profit (net revenue - costs)
    const estimatedProfit = netRevenue - totalCosts;

    // Actual cash flow from transactions
    const totalReceipts = transactions
        .filter(t => t.type === "RECEIPT")
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPayments = transactions
        .filter(t => t.type === "PAYMENT")
        .reduce((sum, t) => sum + (t.amount || 0), 0);

    // VAT contracts
    const vatContracts = contracts.filter(c => (c.vat_rate || 0) > 0);
    const nonVatContracts = contracts.filter(c => !c.vat_rate || c.vat_rate === 0);

    // ---- Period Navigation ----
    function navigate(direction: number) {
        const d = new Date(refDate);
        switch (period) {
            case "month":
                d.setMonth(d.getMonth() + direction);
                break;
            case "quarter":
                d.setMonth(d.getMonth() + 3 * direction);
                break;
            case "year":
                d.setFullYear(d.getFullYear() + direction);
                break;
        }
        setRefDate(d);
    }

    // ---- Render ----
    return (
        <div className="animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Báo cáo Tài chính</h1>
                    <p className="text-slate-500 text-sm mt-1">Tổng hợp doanh thu, chi phí và thuế VAT</p>
                </div>

                {/* Period Filter */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden">
                        {(["month", "quarter", "year", "all"] as PeriodFilter[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-2 text-sm font-medium transition-colors ${period === p
                                    ? "bg-primary-600 text-white"
                                    : "text-slate-600 hover:bg-slate-50"
                                    }`}
                            >
                                {p === "month" ? "Tháng" : p === "quarter" ? "Quý" : p === "year" ? "Năm" : "Tất cả"}
                            </button>
                        ))}
                    </div>
                    {period !== "all" && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                            >
                                ←
                            </button>
                            <span className="text-sm font-semibold text-slate-700 min-w-[100px] text-center">
                                {getPeriodLabel(period, refDate)}
                            </span>
                            <button
                                onClick={() => navigate(1)}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                            >
                                →
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* ======== SUMMARY CARDS ======== */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {/* Doanh thu thuần */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase">Chưa gồm VAT</span>
                            </div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Doanh thu thuần</p>
                            <h3 className="text-xl font-bold text-emerald-600 truncate" title={formatCurrency(netRevenue)}>
                                {formatCurrency(netRevenue)}
                            </h3>
                        </div>

                        {/* Tổng VAT phải nộp */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <span className="text-[11px] font-semibold text-orange-500 uppercase">Thuế phải nộp</span>
                            </div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Tổng VAT</p>
                            <h3 className="text-xl font-bold text-orange-600 truncate" title={formatCurrency(totalVAT)}>
                                {formatCurrency(totalVAT)}
                            </h3>
                        </div>

                        {/* Tổng chi phí */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                                    <TrendingDown className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Tổng chi phí</p>
                            <h3 className="text-xl font-bold text-red-600 truncate" title={formatCurrency(totalCosts)}>
                                {formatCurrency(totalCosts)}
                            </h3>
                        </div>

                        {/* Lợi nhuận ước tính */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2.5 rounded-xl ${estimatedProfit >= 0 ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"}`}>
                                    <Wallet className="w-5 h-5" />
                                </div>
                                {estimatedProfit >= 0 ? (
                                    <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">Lãi</span>
                                ) : (
                                    <span className="text-[11px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Lỗ</span>
                                )}
                            </div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Lợi nhuận ước tính</p>
                            <h3 className={`text-xl font-bold truncate ${estimatedProfit >= 0 ? "text-blue-600" : "text-red-600"}`} title={formatCurrency(estimatedProfit)}>
                                {formatCurrency(estimatedProfit)}
                            </h3>
                        </div>
                    </div>

                    {/* ======== CASH FLOW SUMMARY ======== */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl text-white">
                            <p className="text-sm text-slate-300 mb-1">Tổng giá trị HĐ (gồm VAT)</p>
                            <h3 className="text-2xl font-bold">{formatCurrency(grossRevenue)}</h3>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 rounded-2xl text-white">
                            <p className="text-sm text-emerald-200 mb-1">Đã thu (Phiếu thu)</p>
                            <h3 className="text-2xl font-bold">{formatCurrency(totalReceipts)}</h3>
                        </div>
                        <div className="bg-gradient-to-br from-red-500 to-red-600 p-5 rounded-2xl text-white">
                            <p className="text-sm text-red-200 mb-1">Đã chi (Phiếu chi)</p>
                            <h3 className="text-2xl font-bold">{formatCurrency(totalPayments)}</h3>
                        </div>
                    </div>

                    {/* ======== VAT DETAIL TABLE ======== */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">Chi tiết VAT theo Hợp đồng</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{vatContracts.length} hợp đồng có VAT / {contracts.length} tổng</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Receipt className="w-4 h-4 text-orange-500" />
                                <span className="font-semibold text-orange-600">VAT phải nộp: {formatCurrency(totalVAT)}</span>
                            </div>
                        </div>

                        {vatContracts.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <Receipt className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                                <p>Không có hợp đồng nào có VAT trong kỳ này</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500 font-semibold">
                                            <th className="px-5 py-3">#</th>
                                            <th className="px-5 py-3">Hợp đồng</th>
                                            <th className="px-5 py-3">Khách hàng</th>
                                            <th className="px-5 py-3 text-right">Giá trị HĐ</th>
                                            <th className="px-5 py-3 text-center">VAT %</th>
                                            <th className="px-5 py-3 text-right">Tiền VAT</th>
                                            <th className="px-5 py-3 text-right">Doanh thu thuần</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {vatContracts.map((c, idx) => {
                                            const net = c.total_value / (1 + (c.vat_rate || 0) / 100);
                                            const vatAmt = c.total_value - net;
                                            return (
                                                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-5 py-3 text-sm text-slate-400">{idx + 1}</td>
                                                    <td className="px-5 py-3">
                                                        <p className="text-sm font-semibold text-slate-800 truncate max-w-[250px]">{c.name}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">
                                                            {c.signed_date
                                                                ? new Date(c.signed_date).toLocaleDateString("vi-VN")
                                                                : new Date(c.created_at).toLocaleDateString("vi-VN")}
                                                        </p>
                                                    </td>
                                                    <td className="px-5 py-3 text-sm text-slate-600">{c.client?.name || "—"}</td>
                                                    <td className="px-5 py-3 text-sm text-right font-medium text-slate-800">{formatCurrency(c.total_value)}</td>
                                                    <td className="px-5 py-3 text-center">
                                                        <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
                                                            {c.vat_rate}%
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-sm text-right font-semibold text-orange-600">{formatCurrency(vatAmt)}</td>
                                                    <td className="px-5 py-3 text-sm text-right font-semibold text-emerald-600">{formatCurrency(net)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-50 font-bold text-sm">
                                            <td colSpan={3} className="px-5 py-3 text-slate-600">Tổng cộng ({vatContracts.length} HĐ có VAT)</td>
                                            <td className="px-5 py-3 text-right text-slate-800">
                                                {formatCurrency(vatContracts.reduce((s, c) => s + c.total_value, 0))}
                                            </td>
                                            <td></td>
                                            <td className="px-5 py-3 text-right text-orange-600">{formatCurrency(totalVAT)}</td>
                                            <td className="px-5 py-3 text-right text-emerald-600">
                                                {formatCurrency(vatContracts.reduce((s, c) => s + c.total_value / (1 + (c.vat_rate || 0) / 100), 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ======== NON-VAT CONTRACTS TABLE ======== */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-900 text-lg">Hợp đồng không có VAT</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{nonVatContracts.length} hợp đồng</p>
                        </div>

                        {nonVatContracts.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                                <p>Không có hợp đồng nào không gồm VAT trong kỳ</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500 font-semibold">
                                            <th className="px-5 py-3">#</th>
                                            <th className="px-5 py-3">Hợp đồng</th>
                                            <th className="px-5 py-3">Khách hàng</th>
                                            <th className="px-5 py-3 text-right">Giá trị HĐ (= Doanh thu)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {nonVatContracts.map((c, idx) => (
                                            <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-3 text-sm text-slate-400">{idx + 1}</td>
                                                <td className="px-5 py-3">
                                                    <p className="text-sm font-semibold text-slate-800 truncate max-w-[300px]">{c.name}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {c.signed_date
                                                            ? new Date(c.signed_date).toLocaleDateString("vi-VN")
                                                            : new Date(c.created_at).toLocaleDateString("vi-VN")}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-slate-600">{c.client?.name || "—"}</td>
                                                <td className="px-5 py-3 text-sm text-right font-semibold text-slate-800">{formatCurrency(c.total_value)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-50 font-bold text-sm">
                                            <td colSpan={3} className="px-5 py-3 text-slate-600">Tổng cộng</td>
                                            <td className="px-5 py-3 text-right text-slate-800">
                                                {formatCurrency(nonVatContracts.reduce((s, c) => s + c.total_value, 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ======== PROFIT BREAKDOWN ======== */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-900 text-lg">Tổng kết Lợi nhuận</h3>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-slate-600">Tổng giá trị Hợp đồng (gồm VAT)</span>
                                <span className="font-semibold text-slate-800">{formatCurrency(grossRevenue)}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 text-orange-600">
                                <span className="text-sm">− Thuế VAT phải nộp</span>
                                <span className="font-semibold">− {formatCurrency(totalVAT)}</span>
                            </div>
                            <div className="border-t border-dashed border-slate-200 my-1" />
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm font-medium text-slate-700">= Doanh thu thuần (sau VAT)</span>
                                <span className="font-bold text-emerald-600">{formatCurrency(netRevenue)}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 text-red-600">
                                <span className="text-sm">− Tổng chi phí (Vật tư, Nhân công, ...)</span>
                                <span className="font-semibold">− {formatCurrency(totalCosts)}</span>
                            </div>
                            <div className="border-t border-slate-200 my-1" />
                            <div className="flex items-center justify-between py-3">
                                <span className="text-base font-bold text-slate-900">= LỢI NHUẬN ƯỚC TÍNH</span>
                                <span className={`text-xl font-bold ${estimatedProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                    {formatCurrency(estimatedProfit)}
                                </span>
                            </div>
                            {netRevenue > 0 && (
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-slate-500">Biên lợi nhuận</span>
                                    <span className={`font-semibold ${estimatedProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                        {((estimatedProfit / netRevenue) * 100).toFixed(1)}%
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
