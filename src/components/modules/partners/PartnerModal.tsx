"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { partnerSchema, type PartnerFormData } from "@/lib/validators";
import { createClient } from "@/lib/supabase/client";
import type { Partner, PartnerInsert, PartnerUpdate } from "@/types/database";
import { X, Loader2, Save } from "lucide-react";

interface PartnerModalProps {
    partner: Partner | null;
    onClose: () => void;
    onSaved: () => void;
}

export default function PartnerModal({
    partner,
    onClose,
    onSaved,
}: PartnerModalProps) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!partner;

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<PartnerFormData>({
        resolver: zodResolver(partnerSchema),
        defaultValues: {
            name: partner?.name || "",
            type: partner?.type || "Client",
            phone: partner?.phone || "",
            address: partner?.address || "",
            tax_code: partner?.tax_code || "",
        },
    });

    async function onSubmit(data: PartnerFormData) {
        setLoading(true);
        setError(null);

        // Clean data: chuyển empty string thành null cho Supabase
        const cleanData = {
            name: data.name,
            type: data.type as "Client" | "Supplier",
            phone: data.phone || null,
            address: data.address || null,
            tax_code: data.tax_code || null,
        };

        if (isEditing) {
            const { error: err } = await supabase
                .from("partners")
                .update(cleanData as PartnerUpdate)
                .eq("id", partner.id);

            if (err) {
                setError("Không thể cập nhật đối tác: " + err.message);
                setLoading(false);
                return;
            }
        } else {
            const { error: err } = await supabase
                .from("partners")
                .insert(cleanData as PartnerInsert);

            if (err) {
                setError("Không thể tạo đối tác: " + err.message);
                setLoading(false);
                return;
            }
        }

        setLoading(false);
        onSaved();
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">
                        {isEditing ? "Sửa đối tác" : "Thêm đối tác mới"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Tên đối tác */}
                    <div>
                        <label htmlFor="name" className="label">
                            Tên đối tác <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="name"
                            type="text"
                            placeholder="Nhập tên đối tác"
                            className={`input ${errors.name ? "input-error" : ""}`}
                            {...register("name")}
                        />
                        {errors.name && (
                            <p className="error-text">{errors.name.message}</p>
                        )}
                    </div>

                    {/* Loại đối tác */}
                    <div>
                        <label htmlFor="type" className="label">
                            Loại đối tác <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="type"
                            className={`select ${errors.type ? "input-error" : ""}`}
                            {...register("type")}
                        >
                            <option value="Client">Khách hàng</option>
                            <option value="Supplier">Nhà cung cấp</option>
                        </select>
                        {errors.type && (
                            <p className="error-text">{errors.type.message}</p>
                        )}
                    </div>

                    {/* Số điện thoại */}
                    <div>
                        <label htmlFor="phone" className="label">
                            Số điện thoại
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            placeholder="0901 234 567"
                            className="input"
                            {...register("phone")}
                        />
                    </div>

                    {/* Địa chỉ */}
                    <div>
                        <label htmlFor="address" className="label">
                            Địa chỉ
                        </label>
                        <input
                            id="address"
                            type="text"
                            placeholder="Nhập địa chỉ"
                            className="input"
                            {...register("address")}
                        />
                    </div>

                    {/* Mã số thuế */}
                    <div>
                        <label htmlFor="tax_code" className="label">
                            Mã số thuế
                        </label>
                        <input
                            id="tax_code"
                            type="text"
                            placeholder="Nhập mã số thuế"
                            className="input"
                            {...register("tax_code")}
                        />
                    </div>

                    {/* Actions */}
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
                            {loading ? "Đang lưu..." : isEditing ? "Cập nhật" : "Tạo mới"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
