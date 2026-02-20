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
import type { Contract, Partner } from "@/types/database";

// Schema validation thủ công vì chưa có trong validators.ts cho Contract
const contractSchema = z.object({
    name: z.string().min(1, "Vui lòng nhập tên hợp đồng"),
    client_id: z.string().min(1, "Vui lòng chọn khách hàng"),
    total_value: z.coerce.number().min(0, "Giá trị không hợp lệ"),
    signed_date: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

type ContractFormData = z.infer<typeof contractSchema>;

interface ContractModalProps {
    contract: Contract | null;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

export default function ContractModal({
    contract,
    isOpen,
    onClose,
    onSaved,
}: ContractModalProps) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Partner[]>([]);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!contract && !!contract.id;

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors },
    } = useForm<ContractFormData>({
        resolver: zodResolver(contractSchema),
        defaultValues: {
            name: "",
            client_id: "",
            total_value: 0,
            signed_date: new Date().toISOString().split("T")[0],
            notes: "",
        },
    });

    // Load clients and set form values
    useEffect(() => {
        async function loadClients() {
            const { data } = await supabase
                .from("partners")
                .select("*")
                .eq("type", "Client")
                .order("name");
            if (data) setClients(data as Partner[]);
        }
        loadClients();
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (contract) {
                setValue("name", contract.name);
                setValue("client_id", contract.client_id);
                setValue("total_value", contract.total_value);
                setValue(
                    "signed_date",
                    contract.signed_date ? contract.signed_date.split("T")[0] : ""
                );
                setValue("notes", contract.notes || "");
            } else {
                reset({
                    name: "",
                    client_id: "",
                    total_value: 0,
                    signed_date: new Date().toISOString().split("T")[0],
                    notes: "",
                });
            }
            setError(null);
        }
    }, [isOpen, contract, setValue, reset]);

    async function onSubmit(data: ContractFormData) {
        setLoading(true);
        setError(null);

        const payload = {
            name: data.name,
            client_id: data.client_id,
            total_value: data.total_value,
            signed_date: data.signed_date || null,
            notes: data.notes || null,
        };

        if (isEditing) {
            const { error: err } = await supabase
                .from("contracts")
                .update(payload)
                .eq("id", contract.id);
            if (err) setError(err.message);
            else {
                onSaved();
                onClose();
            }
        } else {
            const { error: err } = await supabase.from("contracts").insert(payload);
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
                        {isEditing ? "Sửa hợp đồng" : "Tạo hợp đồng mới"}
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

                    {/* Tên hợp đồng */}
                    <div>
                        <label className="label">
                            Tên hợp đồng <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="VD: Hợp đồng thi công nhà Mr. A..."
                            className={`input ${errors.name ? "input-error" : ""}`}
                            {...register("name")}
                        />
                        {errors.name && <p className="error-text">{errors.name.message}</p>}
                    </div>

                    {/* Khách hàng */}
                    <div>
                        <label className="label">
                            Khách hàng <span className="text-red-500">*</span>
                        </label>
                        <select
                            className={`select ${errors.client_id ? "input-error" : ""}`}
                            {...register("client_id")}
                        >
                            <option value="">Chọn khách hàng</option>
                            {clients.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        {errors.client_id && (
                            <p className="error-text">{errors.client_id.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Giá trị */}
                        <div>
                            <label className="label">
                                Giá trị (VNĐ) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                className={`input ${errors.total_value ? "input-error" : ""}`}
                                {...register("total_value")}
                            />
                            {errors.total_value && (
                                <p className="error-text">{errors.total_value.message}</p>
                            )}
                        </div>

                        {/* Ngày ký */}
                        <div>
                            <label className="label">Ngày ký</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    className="input pl-10"
                                    {...register("signed_date")}
                                />
                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            </div>
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
                            {isEditing ? "Cập nhật" : "Tạo mới"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
