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
import type { Project, Contract } from "@/types/database";

const projectSchema = z.object({
    name: z.string().min(1, "Vui lòng nhập tên dự án"),
    contract_id: z.string().min(1, "Vui lòng chọn hợp đồng"),
    type: z.enum(["THI_CONG", "DICH_VU"], {
        required_error: "Vui lòng chọn loại dự án",
    }),
    status: z.enum(
        ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"],
        { required_error: "Vui lòng chọn trạng thái" }
    ),
    assigned_to: z.string().optional().nullable(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectModalProps {
    project: Project | null;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

export default function ProjectModal({
    project,
    isOpen,
    onClose,
    onSaved,
}: ProjectModalProps) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [profiles, setProfiles] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!project && !!project.id;

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        watch,
        formState: { errors },
    } = useForm<ProjectFormData>({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            name: "",
            contract_id: "",
            type: "THI_CONG",
            status: "NOT_STARTED",
            assigned_to: "",
            start_date: new Date().toISOString().split("T")[0],
            end_date: "",
            notes: "",
        },
    });

    // Load contracts and profiles
    useEffect(() => {
        async function loadData() {
            const [contractsRes, profilesRes] = await Promise.all([
                supabase
                    .from("contracts")
                    .select("*")
                    .order("created_at", { ascending: false }),
                supabase
                    .from("profiles")
                    .select("id, full_name, email")
                    .order("full_name")
            ]);

            if (contractsRes.data) setContracts(contractsRes.data as Contract[]);
            if (profilesRes.data) setProfiles(profilesRes.data);
        }
        loadData();
    }, []);

    // Load form data
    useEffect(() => {
        if (isOpen) {
            if (project) {
                setValue("name", project.name);
                setValue("contract_id", project.contract_id);
                setValue("type", project.type);
                setValue("status", project.status);
                setValue("assigned_to", project.assigned_to || "");
                setValue(
                    "start_date",
                    project.start_date ? project.start_date.split("T")[0] : ""
                );
                setValue(
                    "end_date",
                    project.end_date ? project.end_date.split("T")[0] : ""
                );
                setValue("notes", project.notes || "");
            } else {
                reset({
                    name: "",
                    contract_id: "",
                    type: "THI_CONG",
                    status: "NOT_STARTED",
                    assigned_to: "",
                    start_date: new Date().toISOString().split("T")[0],
                    end_date: "",
                    notes: "",
                });
            }
            setError(null);
        }
    }, [isOpen, project, setValue, reset]);

    async function onSubmit(data: ProjectFormData) {
        setLoading(true);
        setError(null);

        const payload = {
            name: data.name,
            contract_id: data.contract_id,
            type: data.type,
            status: data.status,
            assigned_to: data.assigned_to || null,
            start_date: data.start_date || null,
            end_date: data.end_date || null,
            notes: data.notes || null,
        };

        if (isEditing) {
            const { error: err } = await supabase
                .from("projects")
                .update(payload)
                .eq("id", project.id);
            if (err) setError(err.message);
            else {
                onSaved();
                onClose();
            }
        } else {
            const { error: err } = await supabase.from("projects").insert(payload);
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
                        {isEditing ? "Sửa dự án" : "Thêm dự án mới"}
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

                    {/* Tên dự án */}
                    <div>
                        <label className="label">
                            Tên dự án <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="VD: Thi công hệ thống điện..."
                            className={`input ${errors.name ? "input-error" : ""}`}
                            {...register("name")}
                        />
                        {errors.name && <p className="error-text">{errors.name.message}</p>}
                    </div>

                    {/* Hợp đồng */}
                    <div>
                        <label className="label">
                            Thuộc hợp đồng <span className="text-red-500">*</span>
                        </label>
                        <select
                            className={`select ${errors.contract_id ? "input-error" : ""}`}
                            {...register("contract_id")}
                        >
                            <option value="">Chọn hợp đồng</option>
                            {contracts.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        {errors.contract_id && (
                            <p className="error-text">{errors.contract_id.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Loại */}
                        <div>
                            <label className="label">
                                Loại dự án <span className="text-red-500">*</span>
                            </label>
                            <select
                                className={`select ${errors.type ? "input-error" : ""}`}
                                {...register("type")}
                            >
                                <option value="THI_CONG">Thi công</option>
                                <option value="DICH_VU">Dịch vụ</option>
                            </select>
                        </div>

                        {/* Trạng thái */}
                        <div>
                            <label className="label">
                                Trạng thái <span className="text-red-500">*</span>
                            </label>
                            <select
                                className={`select ${errors.status ? "input-error" : ""}`}
                                {...register("status")}
                            >
                                <option value="NOT_STARTED">Chưa bắt đầu</option>
                                <option value="IN_PROGRESS">Đang thực hiện</option>
                                <option value="ON_HOLD">Tạm hoãn</option>
                                <option value="COMPLETED">Hoàn thành</option>
                                <option value="CANCELLED">Đã hủy</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Ngày bắt đầu */}
                        <div>
                            <label className="label">Ngày bắt đầu</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    className="input pl-10"
                                    {...register("start_date")}
                                />
                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            </div>
                        </div>

                        {/* Ngày kết thúc */}
                        <div>
                            <label className="label">Ngày kết thúc</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    className="input pl-10"
                                    {...register("end_date")}
                                />
                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    {/* Người phụ trách */}
                    <div>
                        <label className="label">Người phụ trách</label>
                        <select
                            className="select"
                            {...register("assigned_to")}
                        >
                            <option value="">-- Chọn nhân viên --</option>
                            {profiles.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.full_name || p.email}
                                </option>
                            ))}
                        </select>
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
