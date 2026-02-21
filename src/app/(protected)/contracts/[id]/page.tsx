"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
    ArrowLeft,
    Calendar,
    Plus,
    Edit2,
    Trash2,
    Loader2,
    FileText,
    LinkIcon,
    Receipt,
    TrendingUp,
} from "lucide-react";
import Link from "next/link";
import DeleteConfirm from "@/components/ui/DeleteConfirm";
import ContractCostModal from "@/components/modules/contracts/ContractCostModal";
import TransactionModal from "@/components/modules/contracts/TransactionModal";
import type { Contract, ContractCost, Transaction } from "@/types/database";

interface CostDebtInfo {
    id: string;
    total_amount: number;
    paid_amount: number;
}

interface ContractCostRow extends ContractCost {
    supplier: { name: string } | null;
    debt: CostDebtInfo | null;
}

interface TransactionRow extends Transaction {
    partner: { name: string } | null;
}

interface QuoteItemRow {
    id: string;
    quote_id: string;
    service_id: string | null;
    custom_name: string | null;
    custom_unit: string | null;
    description: string | null;
    quantity: number;
    unit_price: number;
    discount: number;
    line_total: number;
    created_at: string;
    service: { name: string; unit: string } | null;
}

interface ExtendedContract extends Contract {
    client: { name: string } | null;
}

export default function ContractDetail() {
    const params = useParams();
    const router = useRouter();
    const contractId = params.id as string;
    const supabase = createClient();

    const [contract, setContract] = useState<ExtendedContract | null>(null);
    const [loadingContract, setLoadingContract] = useState(true);

    const [activeTab, setActiveTab] = useState("overview");

    // Cost state
    const [costs, setCosts] = useState<ContractCostRow[]>([]);
    const [loadingCosts, setLoadingCosts] = useState(true);
    const [isCostModalOpen, setIsCostModalOpen] = useState(false);
    const [editingCost, setEditingCost] = useState<ContractCost | null>(null);
    const [deleteCost, setDeleteCost] = useState<ContractCost | null>(null);
    const [deletingCost, setDeletingCost] = useState(false);

    // Payments state
    const [payments, setPayments] = useState<TransactionRow[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [deletePayment, setDeletePayment] = useState<TransactionRow | null>(null);
    const [deletingPayment, setDeletingPayment] = useState(false);

    // Quote Details state
    const [baseQuoteItems, setBaseQuoteItems] = useState<QuoteItemRow[]>([]);
    const [addonQuotes, setAddonQuotes] = useState<{ id: string, total_amount: number, vat_rate: number, items: QuoteItemRow[] }[]>([]);
    const [loadingQuoteDetails, setLoadingQuoteDetails] = useState(false);
    const [quoteVatRate, setQuoteVatRate] = useState<number>(0);
    const [quoteSubtotal, setQuoteSubtotal] = useState<number>(0);

    // Helper function to load costs data
    const loadCostsData = useCallback(async (supabaseClient: ReturnType<typeof createClient>, cId: string) => {
        const { data } = await supabaseClient
            .from("contract_costs")
            .select("*, supplier:partners!supplier_id(name)")
            .eq("contract_id", cId)
            .order("created_at", { ascending: false });

        if (data) {
            const costIds = data.map((c: any) => c.id);
            let debtMap = new Map<string, CostDebtInfo>();
            if (costIds.length > 0) {
                const { data: debts } = await supabaseClient
                    .from("debts")
                    .select("id, total_amount, paid_amount, contract_cost_id")
                    .in("contract_cost_id", costIds);

                if (debts) {
                    debts.forEach((d: any) => {
                        if (d.contract_cost_id) {
                            debtMap.set(d.contract_cost_id, {
                                id: d.id,
                                total_amount: d.total_amount,
                                paid_amount: d.paid_amount,
                            });
                        }
                    });
                }
            }

            const fixedData = data.map((item: any) => ({
                ...item,
                supplier: Array.isArray(item.supplier) ? item.supplier[0] : item.supplier,
                debt: debtMap.get(item.id) || null,
            }));
            return fixedData as ContractCostRow[];
        }
        return [];
    }, []);

    // Fetch Contract Info + Costs on mount
    useEffect(() => {
        async function fetchContractAndCosts() {
            setLoadingContract(true);
            const sb = createClient();
            const { data, error } = await sb
                .from("contracts")
                .select("*, client:partners!client_id(name)")
                .eq("id", contractId)
                .single();

            if (error || !data) {
                router.push("/contracts");
                return;
            }

            const fixedData = { ...data };
            if (Array.isArray(fixedData.client)) {
                fixedData.client = fixedData.client[0];
            }

            setContract(fixedData as ExtendedContract);

            // Also fetch costs immediately for overview summary
            const costsData = await loadCostsData(sb, contractId);
            setCosts(costsData);
            setLoadingCosts(false);

            setLoadingContract(false);
        }

        if (contractId) fetchContractAndCosts();
    }, [contractId, router, loadCostsData]);

    // Fetch Costs (for tab refresh)
    const fetchCosts = useCallback(async () => {
        if (!contractId) return;
        setLoadingCosts(true);
        const sb = createClient();
        const costsData = await loadCostsData(sb, contractId);
        setCosts(costsData);
        setLoadingCosts(false);
    }, [contractId, loadCostsData]);

    useEffect(() => {
        if (activeTab === "costs") {
            fetchCosts();
        }
        if (activeTab === "payments") {
            fetchPayments();
        }
        if (activeTab === "quote_details") {
            fetchQuoteDetails();
        }
    }, [activeTab, fetchCosts]);

    // Fetch Quote Details
    const fetchQuoteDetails = useCallback(async () => {
        if (!contract) return;
        setLoadingQuoteDetails(true);

        try {
            // 1. Fetch Base Quote if exists
            if (contract.quote_id) {
                const { data: quote } = await supabase
                    .from("quotes")
                    .select("total_amount, vat_rate")
                    .eq("id", contract.quote_id)
                    .single();

                if (quote) {
                    setQuoteVatRate(quote.vat_rate || 0);
                }

                const { data: items } = await supabase
                    .from("quote_items")
                    .select("*, service:services!service_id(name, unit)")
                    .eq("quote_id", contract.quote_id)
                    .order("created_at", { ascending: true });

                if (items) {
                    const fixedData = items.map((item: any) => ({
                        ...item,
                        service: Array.isArray(item.service) ? item.service[0] : item.service,
                    }));
                    setBaseQuoteItems(fixedData as QuoteItemRow[]);

                    const subtotal = fixedData.reduce((sum, item) => sum + item.line_total, 0);
                    setQuoteSubtotal(subtotal);
                }
            } else {
                setBaseQuoteItems([]);
                setQuoteSubtotal(0);
                setQuoteVatRate(0);
            }

            // 2. Fetch Add-on Quotes associated with this contract_id
            const { data: addons } = await supabase
                .from("quotes")
                .select("id, total_amount, vat_rate")
                .eq("contract_id", contract.id)
                .order("created_at", { ascending: true });

            if (addons && addons.length > 0) {
                const addonQuoteIds = addons.map(a => a.id);
                const { data: addonItems } = await supabase
                    .from("quote_items")
                    .select("*, service:services!service_id(name, unit)")
                    .in("quote_id", addonQuoteIds)
                    .order("created_at", { ascending: true });

                const groupedAddons = addons.map(addon => {
                    const itemsForAddon = addonItems ? addonItems.filter(item => item.quote_id === addon.id).map((item: any) => ({
                        ...item,
                        service: Array.isArray(item.service) ? item.service[0] : item.service,
                    })) : [];

                    return {
                        id: addon.id,
                        total_amount: addon.total_amount,
                        vat_rate: addon.vat_rate || 0,
                        items: itemsForAddon as QuoteItemRow[]
                    };
                });

                setAddonQuotes(groupedAddons);
            } else {
                setAddonQuotes([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingQuoteDetails(false);
        }
    }, [contract, supabase]);

    // Fetch Payments
    const fetchPayments = useCallback(async () => {
        if (!contractId) return;
        setLoadingPayments(true);
        const { data } = await supabase
            .from("transactions")
            .select("*, partner:partners!partner_id(name)")
            .eq("contract_id", contractId)
            .eq("type", "RECEIPT")
            .order("transaction_date", { ascending: false });
        if (data) {
            const fixedData = data.map((item: any) => ({
                ...item,
                partner: Array.isArray(item.partner) ? item.partner[0] : item.partner,
            }));
            setPayments(fixedData as TransactionRow[]);
        }
        setLoadingPayments(false);
    }, [contractId, supabase]);

    async function handleDeleteCost() {
        if (!deleteCost) return;
        setDeletingCost(true);
        // DB cascade will also delete linked debt
        await supabase.from("contract_costs").delete().eq("id", deleteCost.id);
        setCosts((prev) => prev.filter((c) => c.id !== deleteCost.id));
        setDeletingCost(false);
        setDeleteCost(null);
    }

    async function handleDeletePayment() {
        if (!deletePayment) return;
        setDeletingPayment(true);
        // Revert debt paid_amount
        if (deletePayment.debt_id) {
            const { data: debt } = await supabase
                .from("debts")
                .select("paid_amount")
                .eq("id", deletePayment.debt_id)
                .single();
            if (debt) {
                await supabase
                    .from("debts")
                    .update({ paid_amount: Math.max(0, debt.paid_amount - deletePayment.amount) })
                    .eq("id", deletePayment.debt_id);
            }
        }
        await supabase.from("transactions").delete().eq("id", deletePayment.id);
        setPayments((prev) => prev.filter((p) => p.id !== deletePayment.id));
        setDeletingPayment(false);
        setDeletePayment(null);
    }

    function handleEditCost(cost: ContractCostRow) {
        setEditingCost(cost);
        setIsCostModalOpen(true);
    }

    function handleCreateCost() {
        setEditingCost(null);
        setIsCostModalOpen(true);
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

    function getCategoryLabel(cat: string) {
        const map: Record<string, string> = {
            VAT_TU: "Vật tư",
            NHAN_CONG: "Nhân công",
            MAY_MOC: "Máy móc",
            VAN_CHUYEN: "Vận chuyển",
            QUANG_CAO: "Quảng cáo",
            KHAC: "Khác",
        };
        return map[cat] || cat;
    }

    function getCategoryColor(cat: string) {
        const map: Record<string, string> = {
            VAT_TU: "bg-blue-100 text-blue-700",
            NHAN_CONG: "bg-green-100 text-green-700",
            MAY_MOC: "bg-orange-100 text-orange-700",
            VAN_CHUYEN: "bg-purple-100 text-purple-700",
            QUANG_CAO: "bg-pink-100 text-pink-700",
            KHAC: "bg-slate-100 text-slate-700",
        };
        return map[cat] || "bg-slate-100 text-slate-700";
    }

    const totalCost = costs.reduce((sum, item) => sum + item.amount, 0);
    const totalPaid = payments.reduce((sum, item) => sum + item.amount, 0);

    if (loadingContract) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!contract) return null;

    return (
        <div className="animate-fade-in max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/contracts"
                    className="inline-flex items-center text-sm text-slate-500 hover:text-primary-600 mb-3"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Quay lại danh sách
                </Link>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-5 h-5 text-primary-500" />
                            <h1 className="text-2xl font-bold text-slate-900">
                                {contract.name}
                            </h1>
                        </div>
                        <p className="text-slate-500">
                            {contract.client?.name || "—"} • Ký ngày {formatDate(contract.signed_date)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500">Giá trị hợp đồng</p>
                        <p className="text-2xl font-bold text-primary-600">
                            {formatCurrency(contract.total_value)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-6">
                <nav className="flex gap-6">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "overview"
                            ? "border-primary-600 text-primary-600"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        Tổng quan
                    </button>
                    <button
                        onClick={() => setActiveTab("costs")}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "costs"
                            ? "border-primary-600 text-primary-600"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        Chi phí thực hiện
                    </button>
                    <button
                        onClick={() => setActiveTab("quote_details")}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "quote_details"
                            ? "border-primary-600 text-primary-600"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        Chi tiết hợp đồng
                    </button>
                    <button
                        onClick={() => setActiveTab("payments")}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "payments"
                            ? "border-primary-600 text-primary-600"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        Thanh toán
                    </button>
                </nav>
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div className="card p-6">
                        <h3 className="font-semibold text-slate-900 mb-4">Thông tin hợp đồng</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Khách hàng</span>
                                <span className="font-medium">{contract.client?.name || "—"}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Ngày ký</span>
                                <span className="font-medium">{formatDate(contract.signed_date)}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Giá trị</span>
                                <span className="font-bold text-primary-600">{formatCurrency(contract.total_value)}</span>
                            </div>
                            <div className="pt-2">
                                <span className="text-slate-500 block mb-1">Ghi chú</span>
                                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg min-h-[60px]">
                                    {contract.notes || "Không có ghi chú"}
                                </p>
                            </div>
                            {contract.quote_id && (
                                <div className="pt-2">
                                    <span className="text-slate-500 block mb-1">Báo giá tham chiếu</span>
                                    <Link href={`/quotes`} className="text-sm font-medium text-primary-600 hover:underline">
                                        Xem báo giá #{contract.quote_id.substring(0, 6)}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="font-semibold text-slate-900 mb-4">Tóm tắt chi phí</h3>
                        {(() => {
                            const vatRate = (contract as any).vat_rate || 0;
                            const preTaxValue = vatRate > 0 ? contract.total_value / (1 + vatRate / 100) : contract.total_value;
                            const profit = preTaxValue - totalCost;
                            const costRatio = preTaxValue > 0 ? totalCost / preTaxValue : 0;
                            return (
                                <div className="space-y-4">
                                    <div className="flex justify-between border-b border-slate-100 pb-2">
                                        <span className="text-slate-500">
                                            Giá trị HĐ (trước thuế)
                                            {vatRate > 0 && <span className="text-xs text-slate-400 ml-1">VAT {vatRate}%</span>}
                                        </span>
                                        <span className="font-bold text-primary-600">
                                            {formatCurrency(preTaxValue)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-2">
                                        <span className="text-slate-500">Tổng chi phí</span>
                                        <span className="font-bold text-red-600">
                                            {formatCurrency(totalCost)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pb-2">
                                        <span className="text-slate-500">Lợi nhuận dự kiến</span>
                                        <span className={`font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                            {formatCurrency(profit)}
                                        </span>
                                    </div>
                                    {preTaxValue > 0 && (
                                        <div>
                                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                <span>Tỷ lệ chi phí</span>
                                                <span>{(costRatio * 100).toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5">
                                                <div
                                                    className={`h-2.5 rounded-full transition-all ${costRatio > 0.9
                                                        ? "bg-red-500"
                                                        : costRatio > 0.7
                                                            ? "bg-amber-500"
                                                            : "bg-green-500"
                                                        }`}
                                                    style={{ width: `${Math.min(costRatio * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                        <button
                            onClick={() => setActiveTab("costs")}
                            className="mt-4 text-sm text-primary-600 hover:underline"
                        >
                            Xem chi tiết chi phí →
                        </button>
                    </div>
                </div>
            )}

            {/* Costs Tab */}
            {
                activeTab === "costs" && (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">
                                    Danh sách chi phí
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Tổng chi phí: <span className="font-bold text-red-600">{formatCurrency(totalCost)}</span>
                                    {contract.total_value > 0 && (
                                        <span className="ml-2 text-slate-400">
                                            ({((totalCost / contract.total_value) * 100).toFixed(1)}% giá trị HĐ)
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button onClick={handleCreateCost} className="btn-primary">
                                <Plus className="w-4 h-4" />
                                Thêm chi phí
                            </button>
                        </div>

                        {loadingCosts ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                            </div>
                        ) : costs.length === 0 ? (
                            <div className="card p-8 text-center text-slate-500">
                                Chưa có chi phí nào được ghi nhận.
                                <br />
                                <button
                                    onClick={handleCreateCost}
                                    className="mt-2 text-primary-600 hover:underline text-sm"
                                >
                                    Thêm chi phí đầu tiên
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Mobile Cards */}
                                <div className="space-y-3 lg:hidden">
                                    {costs.map((cost) => (
                                        <div key={cost.id} className="card p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className={`badge ${getCategoryColor(cost.cost_category)}`}>
                                                        {getCategoryLabel(cost.cost_category)}
                                                    </span>
                                                    {cost.supplier && (
                                                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                                            <LinkIcon className="w-3 h-3" />
                                                            {cost.supplier.name}
                                                        </div>
                                                    )}
                                                    {cost.debt ? (
                                                        <div className="mt-1">
                                                            {cost.debt.paid_amount >= cost.debt.total_amount ? (
                                                                <span className="badge bg-green-50 text-green-700 text-[10px]">✅ Đã thanh toán</span>
                                                            ) : cost.debt.paid_amount > 0 ? (
                                                                <span className="badge bg-amber-50 text-amber-700 text-[10px]">⏳ TT {formatCurrency(cost.debt.paid_amount)}/{formatCurrency(cost.debt.total_amount)}</span>
                                                            ) : (
                                                                <span className="badge bg-red-50 text-red-600 text-[10px]">❌ Chưa thanh toán</span>
                                                            )}
                                                        </div>
                                                    ) : cost.supplier ? (
                                                        <div className="mt-1">
                                                            <span className="badge bg-red-50 text-red-600 text-[10px]">❌ Chưa thanh toán</span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <span className="font-bold text-slate-900">
                                                    {formatCurrency(cost.amount)}
                                                </span>
                                            </div>
                                            {cost.description && (
                                                <p className="text-sm text-slate-600 mb-2 line-clamp-2">{cost.description}</p>
                                            )}
                                            <div className="flex justify-end gap-1 pt-2 border-t border-slate-100">
                                                <button
                                                    onClick={() => handleEditCost(cost)}
                                                    className="btn-sm btn-secondary"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteCost(cost)}
                                                    className="btn-sm bg-red-50 text-red-600 hover:bg-red-100 border-red-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Table */}
                                <div className="hidden lg:block card overflow-hidden">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th className="w-[10%]">Loại</th>
                                                <th className="w-[25%]">Mô tả</th>
                                                <th className="w-[18%]">Nhà cung cấp</th>
                                                <th className="text-right w-[17%] whitespace-nowrap">Số tiền</th>
                                                <th className="text-center w-[18%]">Thanh toán</th>
                                                <th className="text-right w-[12%]">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {costs.map((cost) => (
                                                <tr key={cost.id}>
                                                    <td>
                                                        <span className={`badge ${getCategoryColor(cost.cost_category)}`}>
                                                            {getCategoryLabel(cost.cost_category)}
                                                        </span>
                                                    </td>
                                                    <td className="max-w-[200px] truncate" title={cost.description || ""}>
                                                        {cost.description || "—"}
                                                    </td>
                                                    <td>{cost.supplier?.name || "—"}</td>
                                                    <td className="text-right font-medium text-slate-900">
                                                        {formatCurrency(cost.amount)}
                                                    </td>
                                                    <td className="text-center">
                                                        {cost.debt ? (
                                                            cost.debt.paid_amount >= cost.debt.total_amount ? (
                                                                <span className="badge bg-green-50 text-green-700 text-xs">✅ Đã TT</span>
                                                            ) : cost.debt.paid_amount > 0 ? (
                                                                <div>
                                                                    <span className="badge bg-amber-50 text-amber-700 text-xs">⏳ TT 1 phần</span>
                                                                    <p className="text-[10px] text-slate-500 mt-0.5">{formatCurrency(cost.debt.paid_amount)}/{formatCurrency(cost.debt.total_amount)}</p>
                                                                </div>
                                                            ) : (
                                                                <span className="badge bg-red-50 text-red-600 text-xs">❌ Chưa TT</span>
                                                            )
                                                        ) : cost.supplier ? (
                                                            <span className="badge bg-red-50 text-red-600 text-xs">❌ Chưa TT</span>
                                                        ) : (
                                                            <span className="text-slate-300">—</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="flex justify-end gap-1">
                                                            <button
                                                                onClick={() => handleEditCost(cost)}
                                                                className="p-1.5 rounded text-slate-400 hover:text-primary-600"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteCost(cost)}
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
                            </>
                        )}
                    </div>
                )
            }

            {/* Payments Tab */}
            {
                activeTab === "payments" && (
                    <div className="animate-fade-in">
                        {/* Payment progress */}
                        <div className="card p-6 mb-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-green-500" />
                                        Tiến độ thanh toán
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Đã thu {formatCurrency(totalPaid)} / {formatCurrency(contract.total_value)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-2xl font-bold ${totalPaid >= contract.total_value ? "text-green-600" : "text-amber-600"}`}>
                                        {contract.total_value > 0 ? ((totalPaid / contract.total_value) * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full transition-all ${totalPaid >= contract.total_value
                                        ? "bg-green-500"
                                        : (totalPaid / contract.total_value) > 0.5
                                            ? "bg-amber-500"
                                            : "bg-blue-500"
                                        }`}
                                    style={{ width: `${Math.min((totalPaid / contract.total_value) * 100, 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-slate-500">
                                <span>Còn lại: {formatCurrency(Math.max(0, contract.total_value - totalPaid))}</span>
                                <span>{payments.length} đợt thanh toán</span>
                            </div>
                        </div>

                        {/* Add payment button */}
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">Lịch sử thanh toán</h3>
                            <button onClick={() => setIsPaymentModalOpen(true)} className="btn-primary">
                                <Plus className="w-4 h-4" />
                                Tạo phiếu thu
                            </button>
                        </div>

                        {loadingPayments ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                            </div>
                        ) : payments.length === 0 ? (
                            <div className="card p-8 text-center text-slate-500">
                                Chưa có đợt thanh toán nào.
                                <br />
                                <button
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="mt-2 text-primary-600 hover:underline text-sm"
                                >
                                    Tạo phiếu thu đầu tiên
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Mobile Cards */}
                                <div className="space-y-3 lg:hidden">
                                    {payments.map((p) => (
                                        <div key={p.id} className="card p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Receipt className="w-4 h-4 text-green-500" />
                                                        <span className="font-medium text-slate-900">{p.partner?.name}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {formatDate(p.transaction_date)}
                                                    </p>
                                                </div>
                                                <span className="text-lg font-bold text-green-600">
                                                    +{formatCurrency(p.amount)}
                                                </span>
                                            </div>
                                            {p.description && (
                                                <p className="text-sm text-slate-600 mb-2">{p.description}</p>
                                            )}
                                            <div className="flex justify-end pt-2 border-t border-slate-100">
                                                <button
                                                    onClick={() => setDeletePayment(p)}
                                                    className="btn-sm bg-red-50 text-red-600 hover:bg-red-100 border-red-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Table */}
                                <div className="hidden lg:block card overflow-hidden">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Ngày</th>
                                                <th>Đối tác</th>
                                                <th>Nội dung</th>
                                                <th className="text-right">Số tiền</th>
                                                <th className="text-right w-16">...</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.map((p) => (
                                                <tr key={p.id}>
                                                    <td className="whitespace-nowrap">{formatDate(p.transaction_date)}</td>
                                                    <td className="font-medium">{p.partner?.name}</td>
                                                    <td className="max-w-[200px] truncate text-sm" title={p.description || ""}>
                                                        {p.description || "—"}
                                                    </td>
                                                    <td className="text-right font-bold text-green-600">
                                                        +{formatCurrency(p.amount)}
                                                    </td>
                                                    <td>
                                                        <div className="flex justify-end">
                                                            <button
                                                                onClick={() => setDeletePayment(p)}
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
                            </>
                        )}
                    </div>
                )
            }

            {/* Quote Details Tab */}
            {
                activeTab === "quote_details" && (
                    <div className="animate-fade-in card overflow-hidden">
                        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Chi tiết hợp đồng</h3>
                                {!contract.quote_id && addonQuotes.length === 0 && (
                                    <p className="text-sm text-amber-600 mt-1">Hợp đồng này không có báo giá nào.</p>
                                )}
                            </div>
                            <Link
                                href={`/quotes/new?contractId=${contractId}&clientId=${contract.client_id}`}
                                className="btn-primary py-2 px-3 text-sm h-auto w-fit"
                            >
                                Tạo báo giá phát sinh
                            </Link>
                        </div>

                        {loadingQuoteDetails ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6 p-4">
                                {/* Base Quote Section */}
                                {contract.quote_id && (
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <div className="bg-slate-50 p-3 border-b border-slate-200">
                                            <h4 className="font-semibold text-slate-800">Báo giá gốc</h4>
                                        </div>
                                        {baseQuoteItems.length === 0 ? (
                                            <div className="p-6 text-center text-slate-500">
                                                Báo giá này không có hạng mục nào.
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="overflow-x-auto">
                                                    <table className="table min-w-full">
                                                        <thead>
                                                            <tr>
                                                                <th className="w-10 text-center">STT</th>
                                                                <th className="w-[35%]">Hạng mục / Dịch vụ</th>
                                                                <th className="text-center w-16">ĐVT</th>
                                                                <th className="text-right w-16">SL</th>
                                                                <th className="text-right">Đơn giá</th>
                                                                <th className="text-right w-14">CK(%)</th>
                                                                <th className="text-right">Thành tiền</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {baseQuoteItems.map((item, index) => {
                                                                const name = item.custom_name || item.service?.name || "—";
                                                                const unit = item.custom_unit || item.service?.unit || "—";
                                                                return (
                                                                    <tr key={item.id}>
                                                                        <td className="text-center text-slate-500">{index + 1}</td>
                                                                        <td>
                                                                            <div className="font-medium text-slate-900">{name}</div>
                                                                            {item.description && (
                                                                                <div className="text-xs text-slate-500 mt-1 line-clamp-2" title={item.description}>
                                                                                    {item.description}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="text-center">{unit}</td>
                                                                        <td className="text-right">{item.quantity}</td>
                                                                        <td className="text-right">{formatCurrency(item.unit_price)}</td>
                                                                        <td className="text-right">{item.discount > 0 ? `${item.discount}%` : "—"}</td>
                                                                        <td className="text-right font-medium text-primary-600">{formatCurrency(item.line_total)}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="p-4 bg-slate-50 border-t border-slate-200">
                                                    <div className="space-y-2 max-w-sm ml-auto">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-500">Tạm tính:</span>
                                                            <span className="font-medium">{formatCurrency(quoteSubtotal)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-500">Thuế VAT ({quoteVatRate}%):</span>
                                                            <span className="font-medium">{formatCurrency(quoteSubtotal * (quoteVatRate / 100))}</span>
                                                        </div>
                                                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200">
                                                            <span className="text-slate-700">Tổng cộng:</span>
                                                            <span className="text-primary-600">{formatCurrency(quoteSubtotal * (1 + quoteVatRate / 100))}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Add-on Quotes Section */}
                                {addonQuotes.map((addon, aIndex) => (
                                    <div key={addon.id} className="border border-indigo-200 rounded-lg overflow-hidden">
                                        <div className="bg-indigo-50 p-3 border-b border-indigo-200 flex justify-between items-center">
                                            <h4 className="font-semibold text-indigo-800">
                                                Báo giá phát sinh #{aIndex + 1}
                                            </h4>
                                            <Link
                                                href={`/quotes/${addon.id}`}
                                                className="text-sm text-indigo-600 hover:text-indigo-800 underline"
                                            >
                                                Chi tiết báo giá
                                            </Link>
                                        </div>
                                        {addon.items.length === 0 ? (
                                            <div className="p-6 text-center text-slate-500">
                                                Báo giá phát sinh này không có hạng mục nào.
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="overflow-x-auto">
                                                    <table className="table min-w-full">
                                                        <thead>
                                                            <tr className="bg-slate-50">
                                                                <th className="w-10 text-center text-slate-500">STT</th>
                                                                <th className="w-[35%] text-slate-500">Hạng mục / Dịch vụ</th>
                                                                <th className="text-center w-16 text-slate-500">ĐVT</th>
                                                                <th className="text-right w-16 text-slate-500">SL</th>
                                                                <th className="text-right text-slate-500">Đơn giá</th>
                                                                <th className="text-right w-14 text-slate-500">CK(%)</th>
                                                                <th className="text-right text-slate-500">Thành tiền</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {addon.items.map((item, index) => {
                                                                const name = item.custom_name || item.service?.name || "—";
                                                                const unit = item.custom_unit || item.service?.unit || "—";
                                                                return (
                                                                    <tr key={item.id}>
                                                                        <td className="text-center text-slate-500">{index + 1}</td>
                                                                        <td>
                                                                            <div className="font-medium text-slate-900">{name}</div>
                                                                            {item.description && (
                                                                                <div className="text-xs text-slate-500 mt-1 line-clamp-2" title={item.description}>
                                                                                    {item.description}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="text-center">{unit}</td>
                                                                        <td className="text-right">{item.quantity}</td>
                                                                        <td className="text-right">{formatCurrency(item.unit_price)}</td>
                                                                        <td className="text-right">{item.discount > 0 ? `${item.discount}%` : "—"}</td>
                                                                        <td className="text-right font-medium text-primary-600">{formatCurrency(item.line_total)}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="p-4 bg-indigo-50/30 border-t border-indigo-100">
                                                    <div className="space-y-2 max-w-sm ml-auto">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-500">Tạm tính:</span>
                                                            <span className="font-medium">
                                                                {formatCurrency(
                                                                    addon.items.reduce((sum, item) => sum + item.line_total, 0)
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-500">Thuế VAT ({addon.vat_rate}%):</span>
                                                            <span className="font-medium">
                                                                {formatCurrency(
                                                                    addon.items.reduce((sum, item) => sum + item.line_total, 0) * (addon.vat_rate / 100)
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-indigo-200">
                                                            <span className="text-slate-700">Tổng cộng:</span>
                                                            <span className="text-primary-600">{formatCurrency(addon.total_amount)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }

            <ContractCostModal
                contractId={contractId}
                contractName={contract.name}
                cost={editingCost}
                isOpen={isCostModalOpen}
                onClose={() => setIsCostModalOpen(false)}
                onSaved={fetchCosts}
            />

            <TransactionModal
                transaction={null}
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSaved={() => {
                    fetchPayments();
                }}
                defaultType="RECEIPT"
                defaultPartnerId={contract.client_id}
                defaultContractId={contractId}
            />

            {
                deleteCost && (
                    <DeleteConfirm
                        title="Xóa chi phí"
                        message="Bạn có chắc muốn xóa khoản chi này? Khoản phải trả liên kết (nếu có) cũng sẽ bị xóa."
                        loading={deletingCost}
                        onConfirm={handleDeleteCost}
                        onCancel={() => setDeleteCost(null)}
                    />
                )
            }

            {
                deletePayment && (
                    <DeleteConfirm
                        title="Xóa phiếu thu"
                        message="Bạn có chắc muốn xóa phiếu thu này? Số tiền đã ghi nhận vào công nợ sẽ được hoàn trả."
                        loading={deletingPayment}
                        onConfirm={handleDeletePayment}
                        onCancel={() => setDeletePayment(null)}
                    />
                )
            }
        </div >
    );
}
