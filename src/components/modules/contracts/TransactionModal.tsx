"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import {
    X,
    Loader2,
    Save,
    Calendar as CalendarIcon,
    FileSignature,
    Wallet,
    ArrowLeft,
    Plus,
    ChevronRight,
    Receipt,
    TrendingUp,
} from "lucide-react";
import type { Transaction, Partner, Contract, Debt, ContractCost } from "@/types/database";

// ---- Schema ----
const transactionSchema = z.object({
    type: z.enum(["RECEIPT", "PAYMENT"]),
    partner_id: z.string().min(1, "Vui lòng chọn đối tác"),
    contract_id: z.string().optional().nullable(),
    debt_id: z.string().optional().nullable(),
    amount: z.coerce.number().min(1, "Số tiền phải lớn hơn 0"),
    transaction_date: z.string().min(1, "Vui lòng chọn ngày"),
    description: z.string().optional().nullable(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

type ModalMode = "select" | "contract" | "general";

interface ContractOption extends Contract {
    client: { name: string } | null;
}

interface ContractCostRow extends ContractCost {
    supplier: { name: string } | null;
}

interface TransactionModalProps {
    transaction: Transaction | null;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    defaultType?: "RECEIPT" | "PAYMENT";
    defaultPartnerId?: string;
    defaultContractId?: string;
    defaultDebtId?: string;
}

// ---- Helpers ----
function formatCurrency(amount: number) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount);
}

// ============================================================
export default function TransactionModal({
    transaction,
    isOpen,
    onClose,
    onSaved,
    defaultType,
    defaultPartnerId,
    defaultContractId,
    defaultDebtId,
}: TransactionModalProps) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!transaction && !!transaction.id;

    // Step state
    const [mode, setMode] = useState<ModalMode>("select");

    // Data
    const [partners, setPartners] = useState<Partner[]>([]);
    const [allContracts, setAllContracts] = useState<ContractOption[]>([]);
    const [selectedContract, setSelectedContract] = useState<ContractOption | null>(null);

    // Contract-linked data
    const [contractDebts, setContractDebts] = useState<Debt[]>([]);
    const [contractCosts, setContractCosts] = useState<ContractCostRow[]>([]);
    const [contractPayments, setContractPayments] = useState<{ amount: number; transaction_date: string; description: string | null }[]>([]);
    const [loadingContractData, setLoadingContractData] = useState(false);

    // Inline cost creation
    const [showNewCost, setShowNewCost] = useState(false);
    const [newCostCategory, setNewCostCategory] = useState("VAT_TU");
    const [newCostAmount, setNewCostAmount] = useState(0);
    const [newCostSupplierId, setNewCostSupplierId] = useState("");
    const [newCostDescription, setNewCostDescription] = useState("");
    const [selectedCostId, setSelectedCostId] = useState<string>("");

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        watch,
        formState: { errors },
    } = useForm<TransactionFormData>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            type: defaultType || "RECEIPT",
            partner_id: defaultPartnerId || "",
            contract_id: defaultContractId || "",
            debt_id: defaultDebtId || "",
            amount: 0,
            transaction_date: new Date().toISOString().split("T")[0],
            description: "",
        },
    });

    const type = watch("type");

    // ---- Load partners & contracts on open ----
    useEffect(() => {
        if (!isOpen) return;
        async function loadData() {
            const [{ data: partnersData }, { data: contractsData }] = await Promise.all([
                supabase.from("partners").select("*").order("name"),
                supabase.from("contracts").select("*, client:partners!client_id(name)").order("created_at", { ascending: false }),
            ]);
            if (partnersData) setPartners(partnersData as Partner[]);
            if (contractsData) {
                const fixed = contractsData.map((c: any) => ({
                    ...c,
                    client: Array.isArray(c.client) ? c.client[0] : c.client,
                }));
                setAllContracts(fixed as ContractOption[]);
            }
        }
        loadData();
    }, [isOpen]);

    // ---- Reset state on open/close ----
    useEffect(() => {
        if (isOpen) {
            if (transaction) {
                // Editing existing transaction
                setValue("type", transaction.type);
                setValue("partner_id", transaction.partner_id);
                setValue("contract_id", transaction.contract_id || "");
                setValue("debt_id", transaction.debt_id || "");
                setValue("amount", transaction.amount);
                setValue("transaction_date", transaction.transaction_date?.split("T")[0] || "");
                setValue("description", transaction.description || "");
                setMode(transaction.contract_id ? "contract" : "general");
            } else if (defaultContractId) {
                // Pre-filled from contract detail page
                setMode("contract");
                reset({
                    type: defaultType || "RECEIPT",
                    partner_id: defaultPartnerId || "",
                    contract_id: defaultContractId || "",
                    debt_id: defaultDebtId || "",
                    amount: 0,
                    transaction_date: new Date().toISOString().split("T")[0],
                    description: "",
                });
            } else {
                setMode("select");
                reset({
                    type: defaultType || "RECEIPT",
                    partner_id: "",
                    contract_id: "",
                    debt_id: "",
                    amount: 0,
                    transaction_date: new Date().toISOString().split("T")[0],
                    description: "",
                });
            }
            setSelectedContract(null);
            setContractDebts([]);
            setContractCosts([]);
            setContractPayments([]);
            setShowNewCost(false);
            setSelectedCostId("");
            setError(null);
        }
    }, [isOpen, transaction, defaultType, defaultPartnerId, defaultContractId, defaultDebtId, setValue, reset]);

    // ---- Load contract data when contract is selected ----
    const loadContractData = useCallback(async (contract: ContractOption) => {
        setLoadingContractData(true);
        setSelectedContract(contract);
        setValue("contract_id", contract.id);
        setValue("partner_id", contract.client_id);

        try {
            // Load existing payments for this contract
            const { data: payments } = await supabase
                .from("transactions")
                .select("amount, transaction_date, description")
                .eq("contract_id", contract.id)
                .eq("type", "RECEIPT")
                .order("transaction_date", { ascending: false });
            setContractPayments(payments || []);

            // Load debts (RECEIVABLE for this contract's partner)
            const { data: debts } = await supabase
                .from("debts")
                .select("*")
                .eq("partner_id", contract.client_id)
                .eq("type", type === "RECEIPT" ? "RECEIVABLE" : "PAYABLE")
                .order("created_at", { ascending: false });
            setContractDebts((debts || []) as Debt[]);

            // Load contract costs (for PAYMENT mode)
            if (type === "PAYMENT") {
                const { data: costs } = await supabase
                    .from("contract_costs")
                    .select("*, supplier:partners!supplier_id(name)")
                    .eq("contract_id", contract.id)
                    .order("created_at", { ascending: false });
                if (costs) {
                    const fixed = costs.map((c: any) => ({
                        ...c,
                        supplier: Array.isArray(c.supplier) ? c.supplier[0] : c.supplier,
                    }));
                    setContractCosts(fixed as ContractCostRow[]);
                }
            }
        } catch (err) {
            console.error("Error loading contract data:", err);
        } finally {
            setLoadingContractData(false);
        }
    }, [supabase, type, setValue]);

    // Pre-load contract data when defaultContractId is provided
    useEffect(() => {
        if (isOpen && defaultContractId && allContracts.length > 0 && !selectedContract) {
            const c = allContracts.find(c => c.id === defaultContractId);
            if (c) loadContractData(c);
        }
    }, [isOpen, defaultContractId, allContracts, selectedContract, loadContractData]);

    // ---- Submit ----
    async function onSubmit(data: TransactionFormData) {
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Chưa đăng nhập");

            let debtId = data.debt_id || null;

            // === Auto debt accounting for contract-linked transactions ===
            if (mode === "contract" && selectedContract) {
                if (type === "RECEIPT") {
                    // Find or create RECEIVABLE debt for this contract
                    const { data: existingDebts } = await supabase
                        .from("debts")
                        .select("id, paid_amount, total_amount")
                        .eq("partner_id", selectedContract.client_id)
                        .eq("type", "RECEIVABLE")
                        .eq("contract_id", selectedContract.id)
                        .limit(1);

                    if (existingDebts && existingDebts.length > 0) {
                        // Update existing debt
                        const debt = existingDebts[0];
                        debtId = debt.id;
                        await supabase
                            .from("debts")
                            .update({ paid_amount: debt.paid_amount + data.amount })
                            .eq("id", debt.id);
                    } else {
                        // Try debts linked by partner without contract_id (old data)
                        const { data: oldDebts } = await supabase
                            .from("debts")
                            .select("id, paid_amount, total_amount, contract_id")
                            .eq("partner_id", selectedContract.client_id)
                            .eq("type", "RECEIVABLE")
                            .is("contract_id", null)
                            .limit(1);

                        if (oldDebts && oldDebts.length > 0) {
                            const debt = oldDebts[0];
                            debtId = debt.id;
                            // Link old debt to contract + update
                            await supabase
                                .from("debts")
                                .update({
                                    paid_amount: debt.paid_amount + data.amount,
                                    contract_id: selectedContract.id,
                                })
                                .eq("id", debt.id);
                        } else {
                            // Create new RECEIVABLE debt
                            const { data: newDebt } = await supabase
                                .from("debts")
                                .insert({
                                    partner_id: selectedContract.client_id,
                                    type: "RECEIVABLE" as const,
                                    total_amount: selectedContract.total_value,
                                    paid_amount: data.amount,
                                    contract_id: selectedContract.id,
                                    notes: `Phải thu HĐ: ${selectedContract.name}`,
                                })
                                .select("id")
                                .single();
                            if (newDebt) debtId = newDebt.id;
                        }
                    }
                } else if (type === "PAYMENT" && selectedCostId) {
                    // Find PAYABLE debt linked to this contract_cost
                    const { data: costDebts } = await supabase
                        .from("debts")
                        .select("id, paid_amount")
                        .eq("contract_cost_id", selectedCostId)
                        .eq("type", "PAYABLE")
                        .limit(1);

                    if (costDebts && costDebts.length > 0) {
                        const debt = costDebts[0];
                        debtId = debt.id;
                        await supabase
                            .from("debts")
                            .update({ paid_amount: debt.paid_amount + data.amount })
                            .eq("id", debt.id);
                    }
                }
            } else if (mode === "general" && data.debt_id) {
                // General mode: manually selected debt → update paid_amount
                const { data: debt } = await supabase
                    .from("debts")
                    .select("paid_amount")
                    .eq("id", data.debt_id)
                    .single();
                if (debt) {
                    await supabase
                        .from("debts")
                        .update({ paid_amount: debt.paid_amount + data.amount })
                        .eq("id", data.debt_id);
                }
                debtId = data.debt_id;
            }

            const payload = {
                type: data.type as "RECEIPT" | "PAYMENT",
                partner_id: data.partner_id,
                contract_id: mode === "contract" ? (selectedContract?.id || null) : null,
                debt_id: debtId,
                amount: data.amount,
                transaction_date: data.transaction_date,
                description: data.description || null,
                created_by: user.id,
            };

            if (isEditing) {
                // Revert old debt before updating
                if (transaction.debt_id) {
                    const { data: oldDebt } = await supabase
                        .from("debts")
                        .select("paid_amount")
                        .eq("id", transaction.debt_id)
                        .single();
                    if (oldDebt) {
                        await supabase
                            .from("debts")
                            .update({ paid_amount: Math.max(0, oldDebt.paid_amount - transaction.amount) })
                            .eq("id", transaction.debt_id);
                    }
                }

                const { error: err } = await supabase
                    .from("transactions")
                    .update(payload)
                    .eq("id", transaction.id);
                if (err) throw new Error(err.message);
            } else {
                const { error: err } = await supabase
                    .from("transactions")
                    .insert(payload);
                if (err) throw new Error(err.message);
            }

            onSaved();
            onClose();
        } catch (err: any) {
            setError(err.message || "Đã xảy ra lỗi");
        } finally {
            setLoading(false);
        }
    }

    // ---- Create inline cost (for PAYMENT by contract) ----
    async function handleCreateInlineCost() {
        if (!selectedContract || newCostAmount <= 0) return;
        setLoading(true);

        try {
            const costPayload = {
                contract_id: selectedContract.id,
                cost_category: newCostCategory,
                supplier_id: newCostSupplierId || null,
                amount: newCostAmount,
                description: newCostDescription || null,
            };

            const { data: newCost, error: costErr } = await supabase
                .from("contract_costs")
                .insert(costPayload)
                .select("id")
                .single();

            if (costErr || !newCost) throw new Error(costErr?.message || "Không tạo được chi phí");

            // Auto-create PAYABLE debt if supplier selected
            if (newCostSupplierId) {
                await supabase.from("debts").insert({
                    partner_id: newCostSupplierId,
                    type: "PAYABLE" as const,
                    total_amount: newCostAmount,
                    paid_amount: 0,
                    contract_cost_id: newCost.id,
                    notes: `Chi phí HĐ: ${selectedContract.name} - ${newCostDescription || newCostCategory}`,
                });
            }

            // Reload costs
            const { data: costs } = await supabase
                .from("contract_costs")
                .select("*, supplier:partners!supplier_id(name)")
                .eq("contract_id", selectedContract.id)
                .order("created_at", { ascending: false });

            if (costs) {
                const fixed = costs.map((c: any) => ({
                    ...c,
                    supplier: Array.isArray(c.supplier) ? c.supplier[0] : c.supplier,
                }));
                setContractCosts(fixed as ContractCostRow[]);
            }

            // Select the new cost
            setSelectedCostId(newCost.id);
            setShowNewCost(false);
            setNewCostAmount(0);
            setNewCostDescription("");
            setNewCostSupplierId("");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // ---- Category helpers ----
    function getCategoryLabel(cat: string) {
        const map: Record<string, string> = {
            VAT_TU: "Vật tư", NHAN_CONG: "Nhân công", MAY_MOC: "Máy móc",
            VAN_CHUYEN: "Vận chuyển", QUANG_CAO: "Quảng cáo", KHAC: "Khác",
        };
        return map[cat] || cat;
    }

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                        {mode !== "select" && !isEditing && !defaultContractId && (
                            <button
                                onClick={() => { setMode("select"); setSelectedContract(null); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <h2 className="text-lg font-semibold text-slate-900">
                            {mode === "select"
                                ? `Tạo ${type === "RECEIPT" ? "phiếu thu" : "phiếu chi"}`
                                : isEditing
                                    ? "Sửa phiếu"
                                    : mode === "contract"
                                        ? `${type === "RECEIPT" ? "Thu" : "Chi"} theo Hợp đồng`
                                        : `${type === "RECEIPT" ? "Thu" : "Chi"} khác`
                            }
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ======== STEP 1: Select Mode ======== */}
                {mode === "select" && (
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-slate-500 mb-4">Chọn hình thức {type === "RECEIPT" ? "thu" : "chi"}:</p>

                        {/* Type toggle */}
                        <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                            <button
                                onClick={() => setValue("type", "RECEIPT")}
                                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${type === "RECEIPT" ? "bg-white text-green-700 shadow-sm" : "text-slate-600"}`}
                            >
                                Phiếu thu
                            </button>
                            <button
                                onClick={() => setValue("type", "PAYMENT")}
                                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${type === "PAYMENT" ? "bg-white text-red-700 shadow-sm" : "text-slate-600"}`}
                            >
                                Phiếu chi
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setMode("contract")}
                                className="p-5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50/50 transition-all text-left group"
                            >
                                <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl w-fit mb-3 group-hover:bg-primary-100 transition-colors">
                                    <FileSignature className="w-5 h-5" />
                                </div>
                                <h3 className="font-semibold text-slate-900 mb-1">Theo Hợp đồng</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    {type === "RECEIPT"
                                        ? "Thu tiền gắn với HĐ cụ thể, tự động hạch toán công nợ"
                                        : "Chi phí gắn với HĐ, chọn từ chi phí thực hiện hoặc thêm mới"
                                    }
                                </p>
                            </button>

                            <button
                                onClick={() => setMode("general")}
                                className="p-5 rounded-xl border-2 border-slate-200 hover:border-orange-400 hover:bg-orange-50/50 transition-all text-left group"
                            >
                                <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl w-fit mb-3 group-hover:bg-orange-100 transition-colors">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <h3 className="font-semibold text-slate-900 mb-1">{type === "RECEIPT" ? "Thu" : "Chi"} khác</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Không thuộc hợp đồng nào, dùng để quản lý thu chi chung
                                </p>
                            </button>
                        </div>
                    </div>
                )}

                {/* ======== STEP 2a: Contract Mode ======== */}
                {mode === "contract" && (
                    <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
                        )}

                        {/* Contract selector */}
                        {!selectedContract ? (
                            <div>
                                <label className="label">Chọn Hợp đồng <span className="text-red-500">*</span></label>
                                <select
                                    className="select"
                                    onChange={(e) => {
                                        const c = allContracts.find(c => c.id === e.target.value);
                                        if (c) loadContractData(c);
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>-- Chọn hợp đồng --</option>
                                    {allContracts.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} — {c.client?.name} ({formatCurrency(c.total_value)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <>
                                {/* Selected contract info */}
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-900">{selectedContract.name}</p>
                                            <p className="text-sm text-slate-500 mt-0.5">KH: {selectedContract.client?.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-slate-500">Giá trị HĐ</p>
                                            <p className="font-bold text-primary-600">{formatCurrency(selectedContract.total_value)}</p>
                                        </div>
                                    </div>

                                    {/* Payment summary for RECEIPT */}
                                    {type === "RECEIPT" && contractPayments.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <TrendingUp className="w-4 h-4 text-green-500" />
                                                <span className="text-sm font-medium text-slate-700">Lịch sử thanh toán ({contractPayments.length} đợt)</span>
                                            </div>
                                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                                {contractPayments.map((p, i) => (
                                                    <div key={i} className="flex justify-between text-sm">
                                                        <span className="text-slate-500">
                                                            {new Date(p.transaction_date).toLocaleDateString("vi-VN")}
                                                            {p.description && ` — ${p.description}`}
                                                        </span>
                                                        <span className="font-medium text-green-600">+{formatCurrency(p.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between mt-2 pt-2 border-t border-slate-200 text-sm font-semibold">
                                                <span className="text-slate-600">Đã thu</span>
                                                <span className="text-green-600">
                                                    {formatCurrency(contractPayments.reduce((s, p) => s + p.amount, 0))}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Còn lại</span>
                                                <span className="font-semibold text-amber-600">
                                                    {formatCurrency(Math.max(0, selectedContract.total_value - contractPayments.reduce((s, p) => s + p.amount, 0)))}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {!defaultContractId && (
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedContract(null); setContractDebts([]); setContractCosts([]); setContractPayments([]); }}
                                            className="mt-3 text-xs text-primary-600 hover:underline"
                                        >
                                            Đổi hợp đồng
                                        </button>
                                    )}
                                </div>

                                {loadingContractData ? (
                                    <div className="flex justify-center py-6">
                                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                    </div>
                                ) : (
                                    <>
                                        {/* Cost selection for PAYMENT */}
                                        {type === "PAYMENT" && (
                                            <div>
                                                <label className="label">Chọn khoản chi phí thực hiện</label>
                                                {contractCosts.length > 0 ? (
                                                    <div className="space-y-2 max-h-40 overflow-y-auto mb-2">
                                                        {contractCosts.map((cost) => (
                                                            <label
                                                                key={cost.id}
                                                                className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedCostId === cost.id
                                                                    ? "border-primary-400 bg-primary-50"
                                                                    : "border-slate-200 hover:border-slate-300"
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <input
                                                                        type="radio"
                                                                        name="cost_selection"
                                                                        value={cost.id}
                                                                        checked={selectedCostId === cost.id}
                                                                        onChange={() => {
                                                                            setSelectedCostId(cost.id);
                                                                            setValue("amount", cost.amount);
                                                                            if (cost.supplier_id) setValue("partner_id", cost.supplier_id);
                                                                        }}
                                                                        className="accent-primary-600"
                                                                    />
                                                                    <div>
                                                                        <p className="text-sm font-medium text-slate-800">
                                                                            {getCategoryLabel(cost.cost_category)}
                                                                            {cost.description && ` — ${cost.description}`}
                                                                        </p>
                                                                        <p className="text-xs text-slate-500">{cost.supplier?.name || "Không có NCC"}</p>
                                                                    </div>
                                                                </div>
                                                                <span className="font-semibold text-slate-800 text-sm">{formatCurrency(cost.amount)}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-400 mb-2">Chưa có chi phí nào được ghi nhận.</p>
                                                )}

                                                {/* Inline create cost */}
                                                {!showNewCost ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewCost(true)}
                                                        className="flex items-center gap-1 text-sm text-primary-600 hover:underline"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Thêm khoản chi phí mới
                                                    </button>
                                                ) : (
                                                    <div className="p-4 rounded-xl border-2 border-dashed border-primary-300 bg-primary-50/30 space-y-3">
                                                        <p className="text-sm font-semibold text-slate-700">Thêm chi phí mới</p>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="text-xs text-slate-500">Loại</label>
                                                                <select className="select text-sm" value={newCostCategory} onChange={e => setNewCostCategory(e.target.value)}>
                                                                    <option value="VAT_TU">Vật tư</option>
                                                                    <option value="NHAN_CONG">Nhân công</option>
                                                                    <option value="MAY_MOC">Máy móc</option>
                                                                    <option value="VAN_CHUYEN">Vận chuyển</option>
                                                                    <option value="QUANG_CAO">Quảng cáo</option>
                                                                    <option value="KHAC">Khác</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-slate-500">Số tiền</label>
                                                                <input type="number" min="0" className="input text-sm" value={newCostAmount} onChange={e => setNewCostAmount(Number(e.target.value))} />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-slate-500">Nhà cung cấp</label>
                                                            <select className="select text-sm" value={newCostSupplierId} onChange={e => setNewCostSupplierId(e.target.value)}>
                                                                <option value="">-- Không chọn --</option>
                                                                {partners.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-slate-500">Mô tả</label>
                                                            <input type="text" className="input text-sm" placeholder="Mô tả..." value={newCostDescription} onChange={e => setNewCostDescription(e.target.value)} />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button type="button" onClick={() => setShowNewCost(false)} className="btn-secondary text-sm py-1.5 flex-1">Hủy</button>
                                                            <button
                                                                type="button"
                                                                onClick={handleCreateInlineCost}
                                                                disabled={loading || newCostAmount <= 0}
                                                                className="btn-primary text-sm py-1.5 flex-1"
                                                            >
                                                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                                Tạo & Chọn
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Hidden inputs */}
                                        <input type="hidden" {...register("type")} />
                                        <input type="hidden" {...register("partner_id")} />
                                        <input type="hidden" {...register("contract_id")} />

                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Số tiền */}
                                            <div>
                                                <label className="label">Số tiền (VNĐ) <span className="text-red-500">*</span></label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className={`input ${errors.amount ? "input-error" : ""}`}
                                                    {...register("amount")}
                                                />
                                                {errors.amount && <p className="error-text">{errors.amount.message}</p>}
                                            </div>
                                            {/* Ngày */}
                                            <div>
                                                <label className="label">Ngày <span className="text-red-500">*</span></label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        className={`input pl-10 ${errors.transaction_date ? "input-error" : ""}`}
                                                        {...register("transaction_date")}
                                                    />
                                                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Nội dung */}
                                        <div>
                                            <label className="label">Nội dung / Diễn giải</label>
                                            <textarea
                                                rows={2}
                                                placeholder={type === "RECEIPT" ? "VD: Thanh toán đợt 1..." : "VD: Thanh toán vật tư..."}
                                                className="input resize-none"
                                                {...register("description")}
                                            />
                                        </div>

                                        <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                                            <button type="button" onClick={onClose} className="btn-secondary flex-1">Hủy</button>
                                            <button type="submit" disabled={loading} className="btn-primary flex-1">
                                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                {isEditing ? "Cập nhật" : "Tạo phiếu"}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </form>
                )}

                {/* ======== STEP 2b: General Mode ======== */}
                {mode === "general" && (
                    <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {/* Loại phiếu */}
                            <div>
                                <label className="label">Loại phiếu</label>
                                <select className="select" {...register("type")}>
                                    <option value="RECEIPT">Phiếu thu</option>
                                    <option value="PAYMENT">Phiếu chi</option>
                                </select>
                            </div>
                            {/* Ngày */}
                            <div>
                                <label className="label">Ngày <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        className={`input pl-10 ${errors.transaction_date ? "input-error" : ""}`}
                                        {...register("transaction_date")}
                                    />
                                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                </div>
                            </div>
                        </div>

                        {/* Đối tác */}
                        <div>
                            <label className="label">Đối tác <span className="text-red-500">*</span></label>
                            <select className={`select ${errors.partner_id ? "input-error" : ""}`} {...register("partner_id")}>
                                <option value="">-- Chọn đối tác --</option>
                                {partners.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            {errors.partner_id && <p className="error-text">{errors.partner_id.message}</p>}
                        </div>

                        {/* Số tiền */}
                        <div>
                            <label className="label">Số tiền (VNĐ) <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                min="0"
                                className={`input ${errors.amount ? "input-error" : ""}`}
                                {...register("amount")}
                            />
                            {errors.amount && <p className="error-text">{errors.amount.message}</p>}
                        </div>

                        {/* Nội dung */}
                        <div>
                            <label className="label">Nội dung / Diễn giải</label>
                            <textarea
                                rows={2}
                                placeholder="VD: Tiền điện tháng 2, Lương nhân viên..."
                                className="input resize-none"
                                {...register("description")}
                            />
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                            <button type="button" onClick={onClose} className="btn-secondary flex-1">Hủy</button>
                            <button type="submit" disabled={loading} className="btn-primary flex-1">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isEditing ? "Cập nhật" : "Tạo phiếu"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
