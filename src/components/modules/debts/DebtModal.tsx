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
import type { Debt, Partner } from "@/types/database";

const debtSchema = z.object({
    partner_id: z.string().min(1, "Vui lòng chọn đối tác"),
    type: z.enum(["RECEIVABLE", "PAYABLE"]),
    total_amount: z.coerce.number().min(0, "Số tiền không hợp lệ"),
    paid_amount: z.coerce.number().min(0, "Số tiền không hợp lệ"),
    due_date: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

type DebtFormData = z.infer<typeof debtSchema>;

interface DebtModalProps {
    debt: Debt | null;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

export default function DebtModal({
    debt,
    isOpen,
    onClose,
    onSaved,
}: DebtModalProps) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!debt && !!debt.id;

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        watch,
        formState: { errors },
    } = useForm<DebtFormData>({
        resolver: zodResolver(debtSchema),
        defaultValues: {
            partner_id: "",
            type: "RECEIVABLE",
            total_amount: 0,
            paid_amount: 0,
            due_date: "",
            notes: "",
        },
    });

    const type = watch("type");

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

    // Load form data
    useEffect(() => {
        if (isOpen) {
            if (debt) {
                setValue("partner_id", debt.partner_id);
                setValue("type", debt.type);
                setValue("total_amount", debt.total_amount);
                setValue("paid_amount", debt.paid_amount);
                setValue(
                    "due_date",
                    debt.due_date ? debt.due_date.split("T")[0] : ""
                );
                setValue("notes", debt.notes || "");
            } else {
                reset({
                    partner_id: "",
                    type: "RECEIVABLE",
                    total_amount: 0,
                    paid_amount: 0,
                    due_date: "",
                    notes: "",
                });
            }
            setError(null);
        }
    }, [isOpen, debt, setValue, reset]);

    async function onSubmit(data: DebtFormData) {
        setLoading(true);
        setError(null);

        const payload = {
            partner_id: data.partner_id,
            type: data.type,
            total_amount: data.total_amount,
            paid_amount: data.paid_amount,
            due_date: data.due_date || null,
            notes: data.notes || null,
        };

        if (isEditing) {
            const { error: err } = await supabase
                .from("debts")
                .update(payload)
                .eq("id", debt.id);
            if (err) setError(err.message);
            else {
                onSaved();
                onClose();
            }
        } else {
            const { error: err } = await supabase.from("debts").insert(payload);
            if (err) setError(err.message);
            else {
                onSaved();
                onClose();
            }
        }
        setLoading(false);
    }

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">
                        {isEditing ? "Cập nhật công nợ" : "Ghi nhận công nợ"}
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
                        {/* Loại công nợ */}
                        <div>
                            <label className="label">Loại công nợ</label>
                            <select
                                className="select"
                                {...register("type")}
                            >
                                <option value="RECEIVABLE">Phải thu (Khách nợ)</option>
                                <option value="PAYABLE">Phải trả (Nợ NCC)</option>
                            </select>
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Tổng tiền */}
                        <div>
                            <label className="label">
                                Tổng giá trị <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                className={`input ${errors.total_amount ? "input-error" : ""}`}
                                {...register("total_amount")}
                            />
                            {errors.total_amount && (
                                <p className="error-text">{errors.total_amount.message}</p>
                            )}
                        </div>

                        {/* Đã thanh toán */}
                        <div>
                            <label className="label">Đã thanh toán</label>
                            <input
                                type="number"
                                min="0"
                                className={`input ${errors.paid_amount ? "input-error" : ""}`}
                                {...register("paid_amount")}
                            />
                        </div>
                    </div>

                    {/* Hạn thanh toán */}
                    <div>
                        <label className="label">Hạn thanh toán</label>
                        <div className="relative">
                            <input
                                type="date"
                                className="input pl-10"
                                {...register("due_date")}
                            />
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                    </div>

                    {/* Ghi chú */}
                    <div>
                        <label className="label">Ghi chú</label>
                        <textarea
                            rows={3}
                            placeholder="Ghi chú thêm..."
                            className="input resize-none"
                            {...register("notes")}
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
                            {isEditing ? "Lưu lại" : "Tạo mới"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
