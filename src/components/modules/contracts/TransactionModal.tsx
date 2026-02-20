"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import {
    X,
    Loader2,
    Save,
    Calendar as CalendarIcon,
} from "lucide-react";
import type { Transaction, Partner, Contract, Debt } from "@/types/database";

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

interface TransactionModalProps {
    transaction: Transaction | null;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    // Pre-fill options
    defaultType?: "RECEIPT" | "PAYMENT";
    defaultPartnerId?: string;
    defaultContractId?: string;
    defaultDebtId?: string;
}

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
    const [partners, setPartners] = useState<Partner[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!transaction && !!transaction.id;

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
    const partnerId = watch("partner_id");

    // Load partners
    useEffect(() => {
        async function loadPartners() {
            const { data } = await supabase
                .from("partners")
                .select("*")
                .order("name");
            if (data) setPartners(data as Partner[]);
        }
        loadPartners();
    }, []);

    // Load contracts for selected partner
    useEffect(() => {
        async function loadContracts() {
            if (!partnerId) {
                setContracts([]);
                return;
            }
            const { data } = await supabase
                .from("contracts")
                .select("*")
                .eq("client_id", partnerId)
                .order("created_at", { ascending: false });
            if (data) setContracts(data as Contract[]);
        }
        if (type === "RECEIPT") loadContracts();
        else setContracts([]);
    }, [partnerId, type]);

    // Load debts for selected partner
    useEffect(() => {
        async function loadDebts() {
            if (!partnerId) {
                setDebts([]);
                return;
            }
            const debtType = type === "RECEIPT" ? "RECEIVABLE" : "PAYABLE";
            const { data } = await supabase
                .from("debts")
                .select("*")
                .eq("partner_id", partnerId)
                .eq("type", debtType)
                .order("created_at", { ascending: false });
            if (data) setDebts(data as Debt[]);
        }
        loadDebts();
    }, [partnerId, type]);

    useEffect(() => {
        if (isOpen) {
            if (transaction) {
                setValue("type", transaction.type);
                setValue("partner_id", transaction.partner_id);
                setValue("contract_id", transaction.contract_id || "");
                setValue("debt_id", transaction.debt_id || "");
                setValue("amount", transaction.amount);
                setValue("transaction_date", transaction.transaction_date?.split("T")[0] || "");
                setValue("description", transaction.description || "");
            } else {
                reset({
                    type: defaultType || "RECEIPT",
                    partner_id: defaultPartnerId || "",
                    contract_id: defaultContractId || "",
                    debt_id: defaultDebtId || "",
                    amount: 0,
                    transaction_date: new Date().toISOString().split("T")[0],
                    description: "",
                });
            }
            setError(null);
        }
    }, [isOpen, transaction, setValue, reset, defaultType, defaultPartnerId, defaultContractId, defaultDebtId]);

    async function onSubmit(data: TransactionFormData) {
        setLoading(true);
        setError(null);

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Chưa đăng nhập");

            const payload = {
                type: data.type as "RECEIPT" | "PAYMENT",
                partner_id: data.partner_id,
                contract_id: data.contract_id || null,
                debt_id: data.debt_id || null,
                amount: data.amount,
                transaction_date: data.transaction_date,
                description: data.description || null,
                created_by: user.id,
            };

            if (isEditing) {
                // For edit: revert old debt paid_amount, then apply new
                if (transaction.debt_id) {
                    // Subtract old amount from old debt
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

                // Add new amount to new debt
                if (data.debt_id) {
                    const { data: newDebt } = await supabase
                        .from("debts")
                        .select("paid_amount")
                        .eq("id", data.debt_id)
                        .single();
                    if (newDebt) {
                        await supabase
                            .from("debts")
                            .update({ paid_amount: newDebt.paid_amount + data.amount })
                            .eq("id", data.debt_id);
                    }
                }
            } else {
                const { error: err } = await supabase
                    .from("transactions")
                    .insert(payload);
                if (err) throw new Error(err.message);

                // Auto-update debt paid_amount
                if (data.debt_id) {
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
                }
            }

            onSaved();
            onClose();
        } catch (err: any) {
            setError(err.message || "Đã xảy ra lỗi");
        } finally {
            setLoading(false);
        }
    }

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    }

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">
                        {isEditing ? "Sửa phiếu" : type === "RECEIPT" ? "Tạo phiếu thu" : "Tạo phiếu chi"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                            {error}
                        </div>
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
                            <label className="label">
                                Ngày <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    className={`input pl-10 ${errors.transaction_date ? "input-error" : ""}`}
                                    {...register("transaction_date")}
                                />
                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            </div>
                            {errors.transaction_date && (
                                <p className="error-text">{errors.transaction_date.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Đối tác */}
                    <div>
                        <label className="label">
                            Đối tác <span className="text-red-500">*</span>
                        </label>
                        <select
                            className={`select ${errors.partner_id ? "input-error" : ""}`}
                            {...register("partner_id")}
                        >
                            <option value="">-- Chọn đối tác --</option>
                            {partners
                                .filter((p) => {
                                    if (type === "RECEIPT") return ["Client", "Both"].includes(p.type);
                                    return ["Supplier", "Both"].includes(p.type);
                                })
                                .map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                        </select>
                        {errors.partner_id && (
                            <p className="error-text">{errors.partner_id.message}</p>
                        )}
                    </div>

                    {/* Hợp đồng liên kết (chỉ cho phiếu thu) */}
                    {type === "RECEIPT" && contracts.length > 0 && (
                        <div>
                            <label className="label">Hợp đồng liên kết</label>
                            <select className="select" {...register("contract_id")}>
                                <option value="">-- Không chọn --</option>
                                {contracts.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({formatCurrency(c.total_value)})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Công nợ liên kết */}
                    {debts.length > 0 && (
                        <div>
                            <label className="label">
                                Công nợ liên kết
                                <span className="text-xs text-slate-400 ml-2">(tự động cập nhật số đã trả)</span>
                            </label>
                            <select className="select" {...register("debt_id")}>
                                <option value="">-- Không chọn --</option>
                                {debts.map((d) => {
                                    const remaining = d.total_amount - d.paid_amount;
                                    return (
                                        <option key={d.id} value={d.id}>
                                            Còn {formatCurrency(remaining)} / {formatCurrency(d.total_amount)}
                                            {d.notes ? ` - ${d.notes}` : ""}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    {/* Số tiền */}
                    <div>
                        <label className="label">
                            Số tiền (VNĐ) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            className={`input ${errors.amount ? "input-error" : ""}`}
                            {...register("amount")}
                        />
                        {errors.amount && (
                            <p className="error-text">{errors.amount.message}</p>
                        )}
                    </div>

                    {/* Mô tả */}
                    <div>
                        <label className="label">Nội dung / Diễn giải</label>
                        <textarea
                            rows={3}
                            placeholder="VD: Thanh toán đợt 1, Thu tiền cọc..."
                            className="input resize-none"
                            {...register("description")}
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary flex-1"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary flex-1"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {isEditing ? "Cập nhật" : "Tạo phiếu"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
