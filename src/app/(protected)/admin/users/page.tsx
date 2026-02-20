"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    Loader2,
    Shield,
    Users,
} from "lucide-react";
import DeleteConfirm from "@/components/ui/DeleteConfirm";
import UserModal from "@/components/modules/admin/UserModal";
import type { Profile } from "@/types/database";
import { deleteUser } from "@/actions/admin";

export default function AdminUsersPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [deleteUserItem, setDeleteUserItem] = useState<Profile | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Current user role check (client side only strictly for UI)
    // Server actions enforce actual security
    const [isAdmin, setIsAdmin] = useState(false);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);

        // Check current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: currentProfile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();
            setIsAdmin(currentProfile?.role === "Admin");
        }

        // Fetch all profiles
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error && data) {
            setProfiles(data);
            setFilteredProfiles(data);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredProfiles(profiles);
        } else {
            const q = searchQuery.toLowerCase();
            setFilteredProfiles(
                profiles.filter(
                    (p) =>
                        p.email.toLowerCase().includes(q) ||
                        (p.full_name && p.full_name.toLowerCase().includes(q))
                )
            );
        }
    }, [searchQuery, profiles]);

    async function handleDelete() {
        if (!deleteUserItem) return;
        setDeleting(true);

        // Call server action to delete user from Auth
        const res = await deleteUser(deleteUserItem.id);

        if (res.error) {
            alert("Lỗi: " + res.error);
        } else {
            setProfiles((prev) => prev.filter((p) => p.id !== deleteUserItem.id));
            setDeleteUserItem(null);
        }
        setDeleting(false);
    }

    function handleEdit(user: Profile) {
        setEditingUser(user);
        setIsModalOpen(true);
    }

    function handleCreate() {
        setEditingUser(null);
        setIsModalOpen(true);
    }

    function getRoleBadge(role: string) {
        switch (role) {
            case "Admin":
                return <span className="badge bg-red-100 text-red-700">Quản trị viên</span>;
            case "Accountant":
                return <span className="badge bg-blue-100 text-blue-700">Kế toán</span>;
            case "Employee":
                return <span className="badge bg-slate-100 text-slate-700">Nhân viên</span>;
            default:
                return <span className="badge bg-gray-100 text-gray-700">{role}</span>;
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
                <Shield className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Truy cập bị từ chối</h2>
                <p className="text-slate-500 max-w-md">
                    Bạn không có quyền truy cập vào trang quản trị này. Vui lòng liên hệ Admin nếu cần hỗ trợ.
                </p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary-600" />
                        Quản lý Nhân viên
                    </h1>
                    <p className="text-slate-500">
                        Danh sách tài khoản, phân quyền và quản lý truy cập
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleCreate} className="btn-primary">
                        <Plus className="w-4 h-4" />
                        Thêm nhân viên
                    </button>
                </div>
            </div>

            {/* Filter */}
            <div className="card p-4">
                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Tìm theo tên hoặc email..."
                        className="input pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
            </div>

            {/* List */}
            {filteredProfiles.length === 0 ? (
                <div className="card p-12 text-center text-slate-500">
                    Không tìm thấy nhân viên nào.
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Họ và tên</th>
                                    <th>Email</th>
                                    <th>Vai trò</th>
                                    <th>Ngày tạo</th>
                                    <th className="text-right w-24">...</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProfiles.map((user) => (
                                    <tr key={user.id}>
                                        <td className="font-medium text-slate-900">
                                            {user.full_name || "—"}
                                        </td>
                                        <td>{user.email}</td>
                                        <td>{getRoleBadge(user.role)}</td>
                                        <td>
                                            {new Date(user.created_at).toLocaleDateString("vi-VN")}
                                        </td>
                                        <td>
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-1.5 rounded text-slate-400 hover:text-primary-600"
                                                    title="Sửa thông tin"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {/* Prevent deleting yourself? Ideally check ID */}
                                                <button
                                                    onClick={() => setDeleteUserItem(user)}
                                                    className="p-1.5 rounded text-slate-400 hover:text-red-600"
                                                    title="Xóa tài khoản"
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
                </div>
            )}

            <UserModal
                user={editingUser}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaved={fetchProfiles}
            />

            {deleteUserItem && (
                <DeleteConfirm
                    title="Xóa tài khoản"
                    message={`Bạn có chắc muốn xóa tài khoản "${deleteUserItem.email}"? Hành động này không thể hoàn tác.`}
                    loading={deleting}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteUserItem(null)}
                />
            )}
        </div>
    );
}
