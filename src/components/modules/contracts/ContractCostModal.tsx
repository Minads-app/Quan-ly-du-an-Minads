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
} from "lucide-react";
import type { ContractCost, Partner } from "@/types/database";

const costSchema = z.object({
    cost_category: z.string().min(1, "Vui lòng chọn loại chi phí"),
    supplier_id: z.string().optional().nullable(),
    amount: z.coerce.number().min(1, "Số tiền phải lớn hơn 0"),
    description: z.string().optional().nullable(),
});

type CostFormData = z.infer<typeof costSchema>;

interface ContractCostModalProps {
    contractId: string;
    contractName: string;
    cost: ContractCost | null;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

export default function ContractCostModal({
    contractId,
    contractName,
    cost,
    isOpen,
    onClose,
    onSaved,
}: ContractCostModalProps) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState<Partner[]>([]);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!cost && !!cost.id;

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors },
    } = useForm<CostFormData>({
        resolver: zodResolver(costSchema),
        defaultValues: {
            cost_category: "VAT_TU",
            supplier_id: "",
            amount: 0,
            description: "",
        },
    });

    // Load suppliers
    useEffect(() => {
        async function loadSuppliers() {
            const { data } = await supabase
                .from("partners")
                .select("*")
                .order("name");
            if (data) setSuppliers(data as Partner[]);
        }
        loadSuppliers();
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (cost) {
                setValue("cost_category", cost.cost_category);
                setValue("supplier_id", cost.supplier_id || "");
                setValue("amount", cost.amount);
                setValue("description", cost.description || "");
            } else {
                reset({
                    cost_category: "VAT_TU",
                    supplier_id: "",
                    amount: 0,
                    description: "",
                });
            }
            setError(null);
        }
    }, [isOpen, cost, setValue, reset]);

    async function onSubmit(data: CostFormData) {
        setLoading(true);
        setError(null);

        const costPayload = {
            contract_id: contractId,
            cost_category: data.cost_category,
            supplier_id: data.supplier_id || null,
            amount: data.amount,
            description: data.description || null,
        };

        try {
            if (isEditing) {
                // --- UPDATE cost ---
                const { error: costErr } = await supabase
                    .from("contract_costs")
                    .update(costPayload)
                    .eq("id", cost.id);

                if (costErr) throw new Error(costErr.message);

                // Update linked debt
                if (data.supplier_id) {
                    // Check if debt exists for this cost
                    const { data: existingDebt } = await supabase
                        .from("debts")
                        .select("id")
                        .eq("contract_cost_id", cost.id)
                        .maybeSingle();

                    if (existingDebt) {
                        // Update existing debt
                        await supabase
                            .from("debts")
                            .update({
                                partner_id: data.supplier_id,
                                total_amount: data.amount,
                                notes: `Chi phí HĐ: ${contractName} - ${data.description || data.cost_category}`,
                            })
                            .eq("id", existingDebt.id);
                    } else {
                        // Create new debt (supplier was added)
                        await supabase.from("debts").insert({
                            partner_id: data.supplier_id,
                            type: "PAYABLE" as const,
                            total_amount: data.amount,
                            paid_amount: 0,
                            contract_cost_id: cost.id,
                            notes: `Chi phí HĐ: ${contractName} - ${data.description || data.cost_category}`,
                        });
                    }
                } else {
                    // Supplier removed → delete linked debt
                    await supabase
                        .from("debts")
                        .delete()
                        .eq("contract_cost_id", cost.id);
                }
            } else {
                // --- CREATE cost ---
                const { data: newCost, error: costErr } = await supabase
                    .from("contract_costs")
                    .insert(costPayload)
                    .select("id")
                    .single();

                if (costErr || !newCost) throw new Error(costErr?.message || "Không tạo được chi phí");

                // Auto-create PAYABLE debt if supplier selected
                if (data.supplier_id) {
                    const { error: debtErr } = await supabase.from("debts").insert({
                        partner_id: data.supplier_id,
                        type: "PAYABLE" as const,
                        total_amount: data.amount,
                        paid_amount: 0,
                        contract_cost_id: newCost.id,
                        notes: `Chi phí HĐ: ${contractName} - ${data.description || data.cost_category}`,
                    });

                    if (debtErr) {
                        console.error("Auto-create debt error:", debtErr);
                        // Don't block — cost was created, debt failed
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

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">
                        {isEditing ? "Sửa chi phí" : "Thêm chi phí"}
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

                    {/* Loại chi phí */}
                    <div>
                        <label className="label">
                            Loại chi phí <span className="text-red-500">*</span>
                        </label>
                        <select
                            className={`select ${errors.cost_category ? "input-error" : ""}`}
                            {...register("cost_category")}
                        >
                            <option value="VAT_TU">Vật tư</option>
                            <option value="NHAN_CONG">Nhân công</option>
                            <option value="MAY_MOC">Máy móc</option>
                            <option value="VAN_CHUYEN">Vận chuyển</option>
                            <option value="QUANG_CAO">Quảng cáo</option>
                            <option value="KHAC">Khác</option>
                        </select>
                        {errors.cost_category && (
                            <p className="error-text">{errors.cost_category.message}</p>
                        )}
                    </div>

                    {/* Nhà cung cấp */}
                    <div>
                        <label className="label">
                            Nhà cung cấp / Đối tác
                            <span className="text-xs text-slate-400 ml-2">(chọn để tự động tạo khoản phải trả)</span>
                        </label>
                        <select
                            className="select"
                            {...register("supplier_id")}
                        >
                            <option value="">-- Không chọn --</option>
                            {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

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
                        <label className="label">Mô tả / Ghi chú</label>
                        <textarea
                            rows={3}
                            placeholder="Chi tiết chi phí..."
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
                            {isEditing ? "Cập nhật" : "Thêm mới"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
