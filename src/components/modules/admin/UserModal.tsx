"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    X,
    Loader2,
    Save,
    Eye,
    EyeOff,
} from "lucide-react";
import { createUser, updateUser } from "@/actions/admin";
import type { Profile, UserRole } from "@/types/database";

const userSchema = z.object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().optional(),
    fullName: z.string().min(1, "Vui lòng nhập họ tên"),
    role: z.enum(["Admin", "Accountant", "Employee"]),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserModalProps {
    user: Profile | null;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

export default function UserModal({
    user,
    isOpen,
    onClose,
    onSaved,
}: UserModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const isEditing = !!user;

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors },
    } = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            email: "",
            password: "",
            fullName: "",
            role: "Employee",
        },
    });

    useEffect(() => {
        if (isOpen) {
            if (user) {
                setValue("email", user.email);
                setValue("fullName", user.full_name || "");
                setValue("role", user.role);
                setValue("password", ""); // Reset password field
            } else {
                reset({
                    email: "",
                    password: "",
                    fullName: "",
                    role: "Employee",
                });
            }
            setError(null);
            setShowPassword(false);
        }
    }, [isOpen, user, setValue, reset]);

    async function onSubmit(data: UserFormData) {
        setLoading(true);
        setError(null);

        try {
            if (isEditing) {
                // Update
                const res = await updateUser(user!.id, {
                    fullName: data.fullName,
                    role: data.role,
                });

                if (res.error) {
                    setError(res.error);
                } else {
                    onSaved();
                    onClose();
                }
            } else {
                // Create
                if (!data.password || data.password.length < 6) {
                    setError("Mật khẩu tối thiểu 6 ký tự");
                    setLoading(false);
                    return;
                }

                const res = await createUser({
                    email: data.email,
                    password: data.password,
                    fullName: data.fullName,
                    role: data.role,
                });

                if (res.error) {
                    setError(res.error);
                } else {
                    onSaved();
                    onClose();
                }
            }
        } catch (e: any) {
            setError(e.message || "Đã xảy ra lỗi");
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
                        {isEditing ? "Cập nhật nhân viên" : "Thêm nhân viên mới"}
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

                    {/* Email */}
                    <div>
                        <label className="label">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            disabled={isEditing}
                            className={`input ${errors.email ? "input-error" : ""} ${isEditing ? "bg-slate-100 text-slate-500" : ""}`}
                            {...register("email")}
                        />
                        {errors.email && <p className="error-text">{errors.email.message}</p>}
                    </div>

                    {/* Password - Only show explicit field when creating */}
                    {!isEditing && (
                        <div>
                            <label className="label">
                                Mật khẩu <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className={`input pr-10 ${errors.password ? "input-error" : ""}`}
                                    {...register("password")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="error-text">{errors.password.message}</p>
                            )}
                        </div>
                    )}

                    {/* Full Name */}
                    <div>
                        <label className="label">
                            Họ và tên <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className={`input ${errors.fullName ? "input-error" : ""}`}
                            {...register("fullName")}
                        />
                        {errors.fullName && (
                            <p className="error-text">{errors.fullName.message}</p>
                        )}
                    </div>

                    {/* Role */}
                    <div>
                        <label className="label">
                            Vai trò / Phân quyền <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="select"
                            {...register("role")}
                        >
                            <option value="Employee">Nhân viên (Xem dự án, việc được giao)</option>
                            <option value="Accountant">Kế toán (Xem/Sửa tài chính)</option>
                            <option value="Admin">Quản trị viên (Toàn quyền)</option>
                        </select>
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
                            {isEditing ? "Lưu thay đổi" : "Tạo mới"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
