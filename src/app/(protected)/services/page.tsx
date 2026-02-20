"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/types/database";
import {
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    Wrench,
    Package,
    Hammer,
    Megaphone,
    Loader2,
} from "lucide-react";
import ServiceModal from "@/components/modules/services/ServiceModal";
import DeleteConfirm from "@/components/ui/DeleteConfirm";

type FilterType = "all" | "Material" | "Labor" | "Service" | "Ads";

export default function ServicesPage() {
    const supabase = createClient();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [deleteService, setDeleteService] = useState<Service | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchServices = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from("services")
            .select("*")
            .order("type", { ascending: true })
            .order("name", { ascending: true });

        if (filterType !== "all") {
            query = query.eq("type", filterType);
        }

        if (searchQuery.trim()) {
            query = query.ilike("name", `%${searchQuery}%`);
        }

        const { data, error } = await query;
        if (!error && data) {
            setServices(data as Service[]);
        }
        setLoading(false);
    }, [filterType, searchQuery]);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    function handleEdit(service: Service) {
        setEditingService(service);
        setModalOpen(true);
    }

    function handleCreate() {
        setEditingService(null);
        setModalOpen(true);
    }

    async function handleDelete() {
        if (!deleteService) return;
        setDeleting(true);

        await supabase.from("services").delete().eq("id", deleteService.id);

        setServices((prev) => prev.filter((s) => s.id !== deleteService.id));
        setDeleting(false);
        setDeleteService(null);
    }

    function handleSaved() {
        setModalOpen(false);
        setEditingService(null);
        fetchServices();
    }

    const typeConfig: Record<string, { label: string; icon: React.ElementType; badgeClass: string }> = {
        Material: { label: "Vật tư", icon: Package, badgeClass: "badge-warning" },
        Labor: { label: "Nhân công", icon: Hammer, badgeClass: "badge-sent" },
        Service: { label: "Dịch vụ", icon: Wrench, badgeClass: "badge-approved" },
        Ads: { label: "Quảng cáo", icon: Megaphone, badgeClass: "badge-danger" },
    };

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dịch vụ & Vật tư</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Quản lý danh mục dịch vụ, vật tư, nhân công
                    </p>
                </div>
                <button onClick={handleCreate} className="btn-primary">
                    <Plus className="w-4 h-4" />
                    Thêm mới
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {(["Material", "Labor", "Service", "Ads"] as const).map((type) => {
                    const config = typeConfig[type];
                    const Icon = config.icon;
                    const count = services.filter((s) => s.type === type).length;
                    return (
                        <button
                            key={type}
                            onClick={() =>
                                setFilterType(filterType === type ? "all" : type)
                            }
                            className={`stat-card cursor-pointer transition-all ${filterType === type
                                    ? "ring-2 ring-primary-400 bg-primary-50/50"
                                    : "hover:shadow-md"
                                }`}
                        >
                            <div className="stat-icon bg-slate-50">
                                <Icon className="w-5 h-5 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-2xl font-bold text-slate-900">{count}</p>
                                <p className="text-xs text-slate-500 truncate">
                                    {config.label}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên dịch vụ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-10"
                    />
                </div>
                <div className="relative sm:hidden">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as FilterType)}
                        className="select pl-10 w-full"
                    >
                        <option value="all">Tất cả loại</option>
                        <option value="Material">Vật tư</option>
                        <option value="Labor">Nhân công</option>
                        <option value="Service">Dịch vụ</option>
                        <option value="Ads">Quảng cáo</option>
                    </select>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                </div>
            ) : services.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Wrench className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">
                            Chưa có dịch vụ nào
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                            Nhấn &quot;Thêm mới&quot; để bắt đầu
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Mobile Cards */}
                    <div className="space-y-3 lg:hidden">
                        {services.map((service) => {
                            const config = typeConfig[service.type];
                            const Icon = config.icon;
                            return (
                                <div key={service.id} className="card p-4 animate-fade-in">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-semibold text-slate-900 truncate">
                                                {service.name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={config.badgeClass}>
                                                    <Icon className="w-3 h-3 mr-1" />
                                                    {config.label}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    /{service.unit}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 ml-2">
                                            <button
                                                onClick={() => handleEdit(service)}
                                                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteService(service)}
                                                className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-lg font-bold text-primary-600">
                                        {formatCurrency(service.default_price)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden lg:block table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Tên dịch vụ</th>
                                    <th>Loại</th>
                                    <th>Đơn vị</th>
                                    <th className="text-right">Giá mặc định</th>
                                    <th className="text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {services.map((service) => {
                                    const config = typeConfig[service.type];
                                    const Icon = config.icon;
                                    return (
                                        <tr key={service.id}>
                                            <td className="font-medium text-slate-900">
                                                {service.name}
                                            </td>
                                            <td>
                                                <span className={config.badgeClass}>
                                                    <Icon className="w-3 h-3 mr-1" />
                                                    {config.label}
                                                </span>
                                            </td>
                                            <td>{service.unit}</td>
                                            <td className="text-right font-medium text-primary-600">
                                                {formatCurrency(service.default_price)}
                                            </td>
                                            <td>
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleEdit(service)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteService(service)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Modals */}
            {modalOpen && (
                <ServiceModal
                    service={editingService}
                    onClose={() => {
                        setModalOpen(false);
                        setEditingService(null);
                    }}
                    onSaved={handleSaved}
                />
            )}

            {deleteService && (
                <DeleteConfirm
                    title="Xóa dịch vụ"
                    message={`Bạn có chắc muốn xóa "${deleteService.name}"? Hành động này không thể hoàn tác.`}
                    loading={deleting}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteService(null)}
                />
            )}
        </div>
    );
}
