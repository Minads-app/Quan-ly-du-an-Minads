"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateSettings, getSettings } from "@/lib/actions/settings";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save, Upload, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Reuse schema from server action (duplicated for client validation simplicity or import if possible)
const settingsSchema = z.object({
    name: z.string().min(1, "Tên công ty là bắt buộc"),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
    website: z.string().url("Website không hợp lệ").optional().or(z.literal("")),
    tax_id: z.string().optional(),
    bank_info: z.string().optional(),
    logo_url: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            name: "Minads Company",
        },
    });

    const currentLogoUrl = watch("logo_url");

    useEffect(() => {
        async function loadSettings() {
            try {
                const data = await getSettings();
                if (data) {
                    setValue("name", data.name);
                    setValue("address", data.address || "");
                    setValue("phone", data.phone || "");
                    setValue("email", data.email || "");
                    setValue("website", data.website || "");
                    setValue("tax_id", data.tax_id || "");
                    setValue("bank_info", data.bank_info || "");
                    setValue("logo_url", data.logo_url || "");
                    if (data.logo_url) setPreviewUrl(data.logo_url);
                }
            } catch (error) {
                console.error("Failed to load settings", error);
                toast.error("Không thể tải thông tin cài đặt");
            } finally {
                setFetching(false);
            }
        }
        loadSettings();
    }, [setValue]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        }
    };

    const onSubmit = async (data: SettingsFormData) => {
        setLoading(true);
        try {
            let finalLogoUrl = data.logo_url;

            // Upload logo if changed
            if (logoFile) {
                const supabase = createClient();
                const fileExt = logoFile.name.split(".").pop();
                const fileName = `company-logo-${Date.now()}.${fileExt}`;
                const { error: uploadError, data: uploadData } = await supabase.storage
                    .from("organization")
                    .upload(fileName, logoFile);

                if (uploadError) throw uploadError;

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from("organization")
                    .getPublicUrl(fileName);

                finalLogoUrl = publicUrl;
            }

            const result = await updateSettings({
                ...data,
                logo_url: finalLogoUrl,
            });

            if (result.error) {
                toast.error(result.error);
                return;
            }

            toast.success("Đã lưu cài đặt thành công");
            router.refresh();
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Có lỗi xảy ra khi lưu");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Cài đặt Hệ thống</h1>
                    <p className="text-slate-500 text-sm">Quản lý thông tin công ty và cấu hình chung</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Logo Section */}
                <div className="md:col-span-1">
                    <div className="card">
                        <div className="card-header font-semibold">Logo Công ty</div>
                        <div className="card-body flex flex-col items-center gap-4">
                            <div className="w-40 h-40 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden relative group hover:border-primary-500 transition-colors">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <Building2 className="w-12 h-12 text-slate-300" />
                                )}
                                <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer font-medium text-sm">
                                    <Upload className="w-4 h-4 mr-2" /> Thay đổi
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                                </label>
                            </div>
                            <p className="text-xs text-slate-500 text-center">
                                Upload ảnh định dạng PNG, JPG.<br />Kích thước khuyến nghị: 200x200px.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Info Form */}
                <div className="md:col-span-2">
                    <form onSubmit={handleSubmit(onSubmit)} className="card">
                        <div className="card-header font-semibold flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-primary-500" />
                            Thông tin Tổ chức
                        </div>
                        <div className="card-body grid gap-5">
                            <div className="grid gap-2">
                                <label className="label">Tên Công ty <span className="text-red-500">*</span></label>
                                <input {...register("name")} className={`input ${errors.name ? "input-error" : ""}`} placeholder="Nhập tên công ty" />
                                {errors.name && <p className="error-text">{errors.name.message}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <label className="label">Mã số thuế</label>
                                    <input {...register("tax_id")} className="input" placeholder="MST..." />
                                </div>
                                <div className="grid gap-2">
                                    <label className="label">Số điện thoại</label>
                                    <input {...register("phone")} className="input" placeholder="Hotline..." />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <label className="label">Địa chỉ</label>
                                <input {...register("address")} className="input" placeholder="Địa chỉ trụ sở..." />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <label className="label">Email</label>
                                    <input {...register("email")} className="input" placeholder="contact@..." />
                                </div>
                                <div className="grid gap-2">
                                    <label className="label">Website</label>
                                    <input {...register("website")} className="input" placeholder="https://..." />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <label className="label">Thông tin Ngân hàng</label>
                                <textarea
                                    {...register("bank_info")}
                                    className="input h-24 resize-none"
                                    placeholder="Tên ngân hàng, Số tài khoản, Chủ tài khoản..."
                                />
                                <p className="text-xs text-slate-500">Thông tin này sẽ hiển thị trên Báo giá và Hợp đồng.</p>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end">
                            <button type="submit" disabled={loading} className="btn-primary min-w-[120px]">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Lưu Cài đặt
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
