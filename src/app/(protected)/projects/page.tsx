"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    FileText,
    Loader2,
    Inbox,
    Briefcase,
    Wrench,
} from "lucide-react";
import ProjectModal from "@/components/modules/projects/ProjectModal";
import DeleteConfirm from "@/components/ui/DeleteConfirm";
import type { Project, ProjectStatus, ProjectType } from "@/types/database";

// Extended interface includes contract info
interface ProjectRow extends Project {
    contract: { name: string; client: { name: string } | null } | null;
    assignee: { full_name: string } | null;
}

export default function ProjectsPage() {
    const supabase = createClient();
    const [projects, setProjects] = useState<ProjectRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">("ALL");
    const [typeFilter, setTypeFilter] = useState<ProjectType | "ALL">("ALL");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    const [deleteProject, setDeleteProject] = useState<Project | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from("projects")
            .select("*, contract:contracts!contract_id(name, client:partners!client_id(name)), assignee:profiles!assigned_to(full_name)")
            .order("created_at", { ascending: false });

        if (statusFilter !== "ALL") {
            query = query.eq("status", statusFilter);
        }
        if (typeFilter !== "ALL") {
            query = query.eq("type", typeFilter);
        }

        const { data, error } = await query;

        if (!error && data) {
            // Fix contract array issue if any
            const fixedData = data.map((item: any) => ({
                ...item,
                contract: Array.isArray(item.contract) ? item.contract[0] : item.contract,
                assignee: Array.isArray(item.assignee) ? item.assignee[0] : item.assignee,
            }));

            let result = fixedData as unknown as ProjectRow[];
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                result = result.filter(
                    (p) =>
                        p.name.toLowerCase().includes(q) ||
                        p.contract?.name.toLowerCase().includes(q) ||
                        p.contract?.client?.name.toLowerCase().includes(q) ||
                        p.assignee?.full_name.toLowerCase().includes(q)
                );
            }
            setProjects(result);
        }
        setLoading(false);
    }, [searchQuery, statusFilter, typeFilter]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    async function handleDelete() {
        if (!deleteProject) return;
        setDeleting(true);
        await supabase.from("projects").delete().eq("id", deleteProject.id);
        setProjects((prev) => prev.filter((p) => p.id !== deleteProject.id));
        setDeleting(false);
        setDeleteProject(null);
    }

    function handleEdit(project: ProjectRow) {
        setEditingProject(project);
        setIsModalOpen(true);
    }

    function handleCreate() {
        setEditingProject(null);
        setIsModalOpen(true);
    }

    function getStatusBadge(status: ProjectStatus) {
        switch (status) {
            case "NOT_STARTED":
                return <span className="badge bg-slate-100 text-slate-700">Mới</span>;
            case "IN_PROGRESS":
                return <span className="badge bg-blue-100 text-blue-700">Đang thực hiện</span>;
            case "ON_HOLD":
                return <span className="badge bg-orange-100 text-orange-700">Tạm hoãn</span>;
            case "COMPLETED":
                return <span className="badge bg-green-100 text-green-700">Hoàn thành</span>;
            case "CANCELLED":
                return <span className="badge bg-red-100 text-red-700">Đã hủy</span>;
            default:
                return null;
        }
    }

    function getTypeIcon(type: ProjectType) {
        if (type === "THI_CONG") return <Wrench className="w-4 h-4 text-orange-500" />;
        return <Briefcase className="w-4 h-4 text-blue-500" />;
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Quản lý Dự án</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Theo dõi tiến độ thi công và dịch vụ
                    </p>
                </div>
                <button onClick={handleCreate} className="btn-primary">
                    <Plus className="w-4 h-4" />
                    Thêm dự án
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm dự án, hợp đồng, khách hàng..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-10"
                    />
                </div>
                <select
                    className="select w-full sm:w-48"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as ProjectType | "ALL")}
                >
                    <option value="ALL">Tất cả loại</option>
                    <option value="THI_CONG">Thi công</option>
                    <option value="DICH_VU">Dịch vụ</option>
                </select>
                <select
                    className="select w-full sm:w-48"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "ALL")}
                >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="NOT_STARTED">Mới tạo</option>
                    <option value="IN_PROGRESS">Đang chạy</option>
                    <option value="ON_HOLD">Tạm dừng</option>
                    <option value="COMPLETED">Hoàn thành</option>
                    <option value="CANCELLED">Hủy bỏ</option>
                </select>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                </div>
            ) : projects.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Inbox className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">Không tìm thấy dự án nào</p>
                        <button
                            onClick={handleCreate}
                            className="mt-3 text-primary-600 hover:underline text-sm"
                        >
                            Tạo dự án mới
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Mobile Cards */}
                    <div className="space-y-3 lg:hidden">
                        {projects.map((project) => (
                            <div key={project.id} className="card p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-start gap-2">
                                        <div className="mt-1">{getTypeIcon(project.type)}</div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 line-clamp-1">
                                                {project.name}
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                {project.contract?.name}
                                            </p>
                                        </div>
                                    </div>
                                    {getStatusBadge(project.status)}
                                </div>
                                <div className="mt-2 text-sm text-slate-600">
                                    <p>Phụ trách: <strong>{project.assignee?.full_name || "—"}</strong></p>
                                </div>
                                <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end gap-2">
                                    <button
                                        onClick={() => handleEdit(project)}
                                        className="btn-sm btn-secondary"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteProject(project)}
                                        className="btn-sm bg-red-50 text-red-600 hover:bg-red-100 border-red-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden lg:block table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="w-10"></th>
                                    <th>Tên dự án</th>
                                    <th>Hợp đồng / Khách hàng</th>
                                    <th>Trạng thái</th>
                                    <th>Người phụ trách</th>
                                    <th className="text-right w-24">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map((project) => (
                                    <tr key={project.id}>
                                        <td>{getTypeIcon(project.type)}</td>
                                        <td className="font-medium text-slate-900">
                                            {project.name}
                                        </td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="text-slate-900">{project.contract?.name}</span>
                                                <span className="text-xs text-slate-500">
                                                    {project.contract?.client?.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td>{getStatusBadge(project.status)}</td>
                                        <td className="font-medium text-slate-900">
                                            {project.assignee?.full_name || "—"}
                                        </td>
                                        <td>
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => handleEdit(project)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors"
                                                    title="Sửa"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteProject(project)}
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

            <ProjectModal
                project={editingProject}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaved={fetchProjects}
            />

            {deleteProject && (
                <DeleteConfirm
                    title="Xóa dự án"
                    message={`Bạn có chắc muốn xóa dự án "${deleteProject.name}"?`}
                    loading={deleting}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteProject(null)}
                />
            )}
        </div>
    );
}
