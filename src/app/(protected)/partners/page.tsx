"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Partner } from "@/types/database";
import {
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    Phone,
    MapPin,
    Building2,
    Users,
    Loader2,
} from "lucide-react";
import PartnerModal from "@/components/modules/partners/PartnerModal";
import DeleteConfirm from "@/components/ui/DeleteConfirm";

type FilterType = "all" | "Client" | "Supplier";

export default function PartnersPage() {
    const supabase = createClient();
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [deletePartner, setDeletePartner] = useState<Partner | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchPartners = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from("partners")
            .select("*")
            .order("created_at", { ascending: false });

        if (filterType !== "all") {
            query = query.eq("type", filterType);
        }

        if (searchQuery.trim()) {
            query = query.or(
                `name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,tax_code.ilike.%${searchQuery}%`
            );
        }

        const { data, error } = await query;

        if (!error && data) {
            setPartners(data);
        }
        setLoading(false);
    }, [filterType, searchQuery]);

    useEffect(() => {
        fetchPartners();
    }, [fetchPartners]);

    function handleEdit(partner: Partner) {
        setEditingPartner(partner);
        setModalOpen(true);
    }

    function handleCreate() {
        setEditingPartner(null);
        setModalOpen(true);
    }

    async function handleDelete() {
        if (!deletePartner) return;
        setDeleting(true);

        const { error } = await supabase
            .from("partners")
            .delete()
            .eq("id", deletePartner.id);

        if (!error) {
            setPartners((prev) => prev.filter((p) => p.id !== deletePartner.id));
        }

        setDeleting(false);
        setDeletePartner(null);
    }

    function handleSaved() {
        setModalOpen(false);
        setEditingPartner(null);
        fetchPartners();
    }

    const typeLabels: Record<string, string> = {
        Client: "Khách hàng",
        Supplier: "Nhà cung cấp",
    };

    const stats = {
        total: partners.length,
        clients: partners.filter((p) => p.type === "Client").length,
        suppliers: partners.filter((p) => p.type === "Supplier").length,
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Đối tác</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Quản lý khách hàng và nhà cung cấp
                    </p>
                </div>
                <button onClick={handleCreate} className="btn-primary">
                    <Plus className="w-4 h-4" />
                    Thêm đối tác
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                <div className="stat-card">
                    <div className="stat-icon bg-primary-50">
                        <Users className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                        <p className="text-xs text-slate-500 truncate">Tổng cộng</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon bg-blue-50">
                        <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-2xl font-bold text-slate-900">{stats.clients}</p>
                        <p className="text-xs text-slate-500 truncate">Khách hàng</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon bg-amber-50">
                        <Building2 className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-2xl font-bold text-slate-900">
                            {stats.suppliers}
                        </p>
                        <p className="text-xs text-slate-500 truncate">Nhà cung cấp</p>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên, SĐT, mã số thuế..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-10"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as FilterType)}
                        className="select pl-10 w-full sm:w-44"
                    >
                        <option value="all">Tất cả</option>
                        <option value="Client">Khách hàng</option>
                        <option value="Supplier">Nhà cung cấp</option>
                    </select>
                </div>
            </div>

            {/* Partners List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                </div>
            ) : partners.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Users className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">Chưa có đối tác nào</p>
                        <p className="text-sm text-slate-400 mt-1">
                            Nhấn &quot;Thêm đối tác&quot; để bắt đầu
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Mobile: Card layout */}
                    <div className="space-y-3 lg:hidden">
                        {partners.map((partner) => (
                            <div key={partner.id} className="card p-4 animate-fade-in">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-slate-900 truncate">
                                            {partner.name}
                                        </h3>
                                        <span
                                            className={`inline-block mt-1 ${partner.type === "Client"
                                                    ? "badge-sent"
                                                    : "badge-warning"
                                                }`}
                                        >
                                            {typeLabels[partner.type]}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2">
                                        <button
                                            onClick={() => handleEdit(partner)}
                                            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setDeletePartner(partner)}
                                            className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1 text-sm text-slate-500">
                                    {partner.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5" />
                                            <span>{partner.phone}</span>
                                        </div>
                                    )}
                                    {partner.address && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="truncate">{partner.address}</span>
                                        </div>
                                    )}
                                    {partner.tax_code && (
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5" />
                                            <span>MST: {partner.tax_code}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop: Table layout */}
                    <div className="hidden lg:block table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Tên đối tác</th>
                                    <th>Loại</th>
                                    <th>Số điện thoại</th>
                                    <th>Địa chỉ</th>
                                    <th>Mã số thuế</th>
                                    <th className="text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {partners.map((partner) => (
                                    <tr key={partner.id}>
                                        <td className="font-medium text-slate-900">
                                            {partner.name}
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    partner.type === "Client"
                                                        ? "badge-sent"
                                                        : "badge-warning"
                                                }
                                            >
                                                {typeLabels[partner.type]}
                                            </span>
                                        </td>
                                        <td>{partner.phone || "—"}</td>
                                        <td className="max-w-[200px] truncate">
                                            {partner.address || "—"}
                                        </td>
                                        <td>{partner.tax_code || "—"}</td>
                                        <td>
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleEdit(partner)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors"
                                                    title="Sửa"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeletePartner(partner)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                    title="Xóa"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Partner Modal */}
            {modalOpen && (
                <PartnerModal
                    partner={editingPartner}
                    onClose={() => {
                        setModalOpen(false);
                        setEditingPartner(null);
                    }}
                    onSaved={handleSaved}
                />
            )}

            {/* Delete Confirm */}
            {deletePartner && (
                <DeleteConfirm
                    title="Xóa đối tác"
                    message={`Bạn có chắc muốn xóa "${deletePartner.name}"? Hành động này không thể hoàn tác.`}
                    loading={deleting}
                    onConfirm={handleDelete}
                    onCancel={() => setDeletePartner(null)}
                />
            )}
        </div>
    );
}
