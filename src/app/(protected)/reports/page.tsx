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
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
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
    contract_id: string | null;
}

interface DebtRow {
    id: string;
    type: string;
    total_amount: number;
    paid_amount: number;
    partner: { name: string } | null;
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
    const [debts, setDebts] = useState<DebtRow[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { from, to } = getDateRange(period, refDate);
            const fromISO = from.toISOString();
            const toISO = to.toISOString();

            // 1. Contracts in period
            const fromDate = fromISO.split("T")[0];
            const toDate = toISO.split("T")[0];
            const { data: contractData } = await supabase
                .from("contracts")
                .select("id, name, total_value, vat_rate, signed_date, created_at, client:partners!client_id(name)")
                .or(`and(signed_date.gte.${fromDate},signed_date.lte.${toDate}),and(signed_date.is.null,created_at.gte.${fromISO},created_at.lte.${toISO})`)
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
                .select("type, amount, transaction_date, contract_id")
                .gte("transaction_date", fromDate)
                .lte("transaction_date", toDate);
            setTransactions(txData || []);

            // 4. Debts (all, not filtered by period)
            const { data: debtData } = await supabase
                .from("debts")
                .select("id, type, total_amount, paid_amount, partner:partners!partner_id(name)")
                .order("created_at", { ascending: false });
            if (debtData) {
                const fixed = debtData.map((d: any) => ({
                    ...d,
                    partner: Array.isArray(d.partner) ? d.partner[0] : d.partner,
                }));
                setDebts(fixed as DebtRow[]);
            }

        } catch (err) {
            console.error("Error fetching report data:", err);
        } finally {
            setLoading(false);
        }
    }, [supabase, period, refDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ---- Calculations: KẾ HOẠCH (từ HĐ) ----
    const grossRevenue = contracts.reduce((sum, c) => sum + (c.total_value || 0), 0);
    const netRevenue = contracts.reduce((sum, c) => {
        const rate = c.vat_rate || 0;
        return rate > 0 ? sum + c.total_value / (1 + rate / 100) : sum + (c.total_value || 0);
    }, 0);
    const totalVAT = grossRevenue - netRevenue;
    const projectCosts = costs.reduce((sum, c) => sum + (c.amount || 0), 0);

    // Chi khác = PAYMENT transactions không gắn HĐ
    const otherPayments = transactions
        .filter(t => t.type === "PAYMENT" && !t.contract_id)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalCostsAll = projectCosts + otherPayments;
    const plannedProfit = netRevenue - totalCostsAll;

    // ---- Calculations: THỰC TẾ (từ dòng tiền) ----
    const totalReceipts = transactions.filter(t => t.type === "RECEIPT").reduce((sum, t) => sum + (t.amount || 0), 0);
    const receiptsContract = transactions.filter(t => t.type === "RECEIPT" && t.contract_id).reduce((sum, t) => sum + (t.amount || 0), 0);
    const receiptsOther = transactions.filter(t => t.type === "RECEIPT" && !t.contract_id).reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPayments = transactions.filter(t => t.type === "PAYMENT").reduce((sum, t) => sum + (t.amount || 0), 0);
    const paymentsContract = transactions.filter(t => t.type === "PAYMENT" && t.contract_id).reduce((sum, t) => sum + (t.amount || 0), 0);
    const paymentsOther = otherPayments;
    const actualProfit = totalReceipts - totalPayments;

    // ---- Calculations: CÔNG NỢ ----
    const receivableDebts = debts.filter(d => d.type === "RECEIVABLE");
    const payableDebts = debts.filter(d => d.type === "PAYABLE");
    const totalReceivable = receivableDebts.reduce((s, d) => s + (d.total_amount - d.paid_amount), 0);
    const totalPayable = payableDebts.reduce((s, d) => s + (d.total_amount - d.paid_amount), 0);
    const netDebt = totalReceivable - totalPayable;

    // VAT contracts
    const vatContracts = contracts.filter(c => (c.vat_rate || 0) > 0);

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
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase">Chưa gồm VAT</span>
                            </div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Doanh thu thuần</p>
                            <h3 className="text-xl font-bold text-emerald-600 truncate" title={formatCurrency(netRevenue)}>{formatCurrency(netRevenue)}</h3>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl"><TrendingDown className="w-5 h-5" /></div>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase">Dự án + Khác</span>
                            </div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Tổng chi phí</p>
                            <h3 className="text-xl font-bold text-red-600 truncate" title={formatCurrency(totalCostsAll)}>{formatCurrency(totalCostsAll)}</h3>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2.5 rounded-xl ${plannedProfit >= 0 ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"}`}><Wallet className="w-5 h-5" /></div>
                                {plannedProfit >= 0 ? <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">Lãi</span> : <span className="text-[11px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Lỗ</span>}
                            </div>
                            <p className="text-sm font-medium text-slate-500 mb-1">LN Kế hoạch</p>
                            <h3 className={`text-xl font-bold truncate ${plannedProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>{formatCurrency(plannedProfit)}</h3>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2.5 rounded-xl ${actualProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}><Receipt className="w-5 h-5" /></div>
                                {actualProfit >= 0 ? <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">Dương</span> : <span className="text-[11px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Âm</span>}
                            </div>
                            <p className="text-sm font-medium text-slate-500 mb-1">LN Thực tế</p>
                            <h3 className={`text-xl font-bold truncate ${actualProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(actualProfit)}</h3>
                        </div>
                    </div>

                    {/* ======== CASH FLOW + DEBT CARDS ======== */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 rounded-2xl text-white">
                            <div className="flex items-center gap-2 mb-1"><ArrowDownRight className="w-4 h-4 text-emerald-200" /><p className="text-sm text-emerald-200">Tổng đã thu</p></div>
                            <h3 className="text-2xl font-bold">{formatCurrency(totalReceipts)}</h3>
                            <div className="flex gap-3 mt-2 text-xs text-emerald-200">
                                <span>HĐ: {formatCurrency(receiptsContract)}</span>
                                <span>Khác: {formatCurrency(receiptsOther)}</span>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-red-500 to-red-600 p-5 rounded-2xl text-white">
                            <div className="flex items-center gap-2 mb-1"><ArrowUpRight className="w-4 h-4 text-red-200" /><p className="text-sm text-red-200">Tổng đã chi</p></div>
                            <h3 className="text-2xl font-bold">{formatCurrency(totalPayments)}</h3>
                            <div className="flex gap-3 mt-2 text-xs text-red-200">
                                <span>HĐ: {formatCurrency(paymentsContract)}</span>
                                <span>Khác: {formatCurrency(paymentsOther)}</span>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl text-white">
                            <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-slate-300" /><p className="text-sm text-slate-300">Dòng tiền ròng</p></div>
                            <h3 className={`text-2xl font-bold ${actualProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(actualProfit)}</h3>
                        </div>
                    </div>

                    {/* ======== DEBT SUMMARY ======== */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-2"><div className="p-2 rounded-lg bg-blue-50 text-blue-600"><ArrowDownRight className="w-4 h-4" /></div><span className="text-sm font-medium text-slate-500">Phải thu còn lại</span></div>
                            <h3 className="text-xl font-bold text-blue-600">{formatCurrency(totalReceivable)}</h3>
                            <p className="text-xs text-slate-400 mt-1">{receivableDebts.length} khoản</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-2"><div className="p-2 rounded-lg bg-orange-50 text-orange-600"><ArrowUpRight className="w-4 h-4" /></div><span className="text-sm font-medium text-slate-500">Phải trả còn lại</span></div>
                            <h3 className="text-xl font-bold text-orange-600">{formatCurrency(totalPayable)}</h3>
                            <p className="text-xs text-slate-400 mt-1">{payableDebts.length} khoản</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-2"><div className={`p-2 rounded-lg ${netDebt >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}><AlertCircle className="w-4 h-4" /></div><span className="text-sm font-medium text-slate-500">Công nợ ròng</span></div>
                            <h3 className={`text-xl font-bold ${netDebt >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(netDebt)}</h3>
                            <p className="text-xs text-slate-400 mt-1">{netDebt >= 0 ? "Thu > Trả" : "Trả > Thu"}</p>
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

                    {/* ======== PROFIT BREAKDOWN: Plan vs Actual ======== */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 bg-blue-50/50">
                                <h3 className="font-bold text-slate-900 text-lg">📋 Lợi nhuận Kế hoạch</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Tính từ giá trị Hợp đồng &amp; chi phí dự án</p>
                            </div>
                            <div className="p-5 space-y-2">
                                <div className="flex justify-between py-2"><span className="text-sm text-slate-600">Tổng giá trị HĐ (gồm VAT)</span><span className="font-semibold text-slate-800">{formatCurrency(grossRevenue)}</span></div>
                                <div className="flex justify-between py-2 text-orange-600"><span className="text-sm">− VAT phải nộp</span><span className="font-semibold">− {formatCurrency(totalVAT)}</span></div>
                                <div className="border-t border-dashed border-slate-200 my-1" />
                                <div className="flex justify-between py-2"><span className="text-sm font-medium text-slate-700">= Doanh thu thuần</span><span className="font-bold text-emerald-600">{formatCurrency(netRevenue)}</span></div>
                                <div className="flex justify-between py-2 text-red-600"><span className="text-sm">− Chi phí dự án</span><span className="font-semibold">− {formatCurrency(projectCosts)}</span></div>
                                {otherPayments > 0 && <div className="flex justify-between py-2 text-red-500"><span className="text-sm">− Chi khác (ngoài HĐ)</span><span className="font-semibold">− {formatCurrency(otherPayments)}</span></div>}
                                <div className="border-t border-slate-200 my-1" />
                                <div className="flex justify-between py-3"><span className="text-base font-bold text-slate-900">= LỢI NHUẬN KẾ HOẠCH</span><span className={`text-xl font-bold ${plannedProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>{formatCurrency(plannedProfit)}</span></div>
                                {netRevenue > 0 && <div className="flex justify-between py-1"><span className="text-sm text-slate-500">Biên LN</span><span className={`font-semibold ${plannedProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>{((plannedProfit / netRevenue) * 100).toFixed(1)}%</span></div>}
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 bg-emerald-50/50">
                                <h3 className="font-bold text-slate-900 text-lg">💰 Lợi nhuận Thực tế</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Tính từ dòng tiền thu/chi thực tế</p>
                            </div>
                            <div className="p-5 space-y-2">
                                <div className="flex justify-between py-2"><span className="text-sm text-slate-600">Thu theo HĐ</span><span className="font-semibold text-emerald-700">{formatCurrency(receiptsContract)}</span></div>
                                {receiptsOther > 0 && <div className="flex justify-between py-2"><span className="text-sm text-slate-600">+ Thu khác</span><span className="font-semibold text-emerald-600">+ {formatCurrency(receiptsOther)}</span></div>}
                                <div className="border-t border-dashed border-slate-200 my-1" />
                                <div className="flex justify-between py-2"><span className="text-sm font-medium text-slate-700">= Tổng thu</span><span className="font-bold text-emerald-600">{formatCurrency(totalReceipts)}</span></div>
                                <div className="flex justify-between py-2 text-red-600"><span className="text-sm">− Chi theo HĐ</span><span className="font-semibold">− {formatCurrency(paymentsContract)}</span></div>
                                {paymentsOther > 0 && <div className="flex justify-between py-2 text-red-500"><span className="text-sm">− Chi khác</span><span className="font-semibold">− {formatCurrency(paymentsOther)}</span></div>}
                                <div className="border-t border-slate-200 my-1" />
                                <div className="flex justify-between py-3"><span className="text-base font-bold text-slate-900">= LỢI NHUẬN THỰC TẾ</span><span className={`text-xl font-bold ${actualProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(actualProfit)}</span></div>
                                {totalReceipts > 0 && <div className="flex justify-between py-1"><span className="text-sm text-slate-500">Biên LN</span><span className={`font-semibold ${actualProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{((actualProfit / totalReceipts) * 100).toFixed(1)}%</span></div>}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
