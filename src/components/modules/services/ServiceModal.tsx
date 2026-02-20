"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceSchema, type ServiceFormData } from "@/lib/validators";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/types/database";
import { X, Loader2, Save } from "lucide-react";

interface ServiceModalProps {
    service: Service | null;
    onClose: () => void;
    onSaved: () => void;
}

export default function ServiceModal({
    service,
    onClose,
    onSaved,
}: ServiceModalProps) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!service;

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ServiceFormData>({
        resolver: zodResolver(serviceSchema),
        defaultValues: {
            name: service?.name || "",
            default_price: service?.default_price || 0,
            unit: service?.unit || "",
            type: service?.type || "Service",
        },
    });

    async function onSubmit(data: ServiceFormData) {
        setLoading(true);
        setError(null);

        const cleanData = {
            name: data.name,
            default_price: data.default_price,
            unit: data.unit,
            type: data.type,
        };

        if (isEditing) {
            const { error: err } = await supabase
                .from("services")
                .update(cleanData)
                .eq("id", service.id);

            if (err) {
                setError("Không thể cập nhật: " + err.message);
                setLoading(false);
                return;
            }
        } else {
            const { error: err } = await supabase.from("services").insert(cleanData);

            if (err) {
                setError("Không thể tạo: " + err.message);
                setLoading(false);
                return;
            }
        }

        setLoading(false);
        onSaved();
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">
                        {isEditing ? "Sửa dịch vụ" : "Thêm dịch vụ mới"}
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

                    {/* Tên */}
                    <div>
                        <label htmlFor="name" className="label">
                            Tên dịch vụ <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="name"
                            type="text"
                            placeholder="VD: Xi măng PCB40, Thợ sơn..."
                            className={`input ${errors.name ? "input-error" : ""}`}
                            {...register("name")}
                        />
                        {errors.name && (
                            <p className="error-text">{errors.name.message}</p>
                        )}
                    </div>

                    {/* Loại */}
                    <div>
                        <label htmlFor="type" className="label">
                            Loại <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="type"
                            className={`select ${errors.type ? "input-error" : ""}`}
                            {...register("type")}
                        >
                            <option value="Material">Vật tư</option>
                            <option value="Labor">Nhân công</option>
                            <option value="Service">Dịch vụ</option>
                            <option value="Ads">Quảng cáo</option>
                        </select>
                        {errors.type && (
                            <p className="error-text">{errors.type.message}</p>
                        )}
                    </div>

                    {/* Đơn vị & Giá — 2 cột */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="unit" className="label">
                                Đơn vị <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="unit"
                                type="text"
                                placeholder="VD: bao, m², công..."
                                className={`input ${errors.unit ? "input-error" : ""}`}
                                {...register("unit")}
                            />
                            {errors.unit && (
                                <p className="error-text">{errors.unit.message}</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="default_price" className="label">
                                Giá mặc định <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="default_price"
                                type="number"
                                placeholder="0"
                                className={`input ${errors.default_price ? "input-error" : ""}`}
                                {...register("default_price")}
                            />
                            {errors.default_price && (
                                <p className="error-text">{errors.default_price.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Hủy
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary flex-1">
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
