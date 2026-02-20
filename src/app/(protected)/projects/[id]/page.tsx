"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
    ArrowLeft,
    Calendar,
    Briefcase,
    Wrench,
    Plus,
    Edit2,
    Trash2,
    Loader2,
} from "lucide-react";
import Link from "next/link";
import DeleteConfirm from "@/components/ui/DeleteConfirm";
import CostModal from "@/components/modules/projects/CostModal";
import type { Project, ProjectCost, ProjectStatus, ProjectType } from "@/types/database";

// Extended interface for Cost row
interface ProjectCostRow extends ProjectCost {
    supplier: { name: string } | null;
}

interface ExtendedProject extends Project {
    contract: { name: string; client: { name: string } | null } | null;
}

export default function ProjectDetail() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const supabase = createClient();

    const [project, setProject] = useState<ExtendedProject | null>(null);
    const [loadingProject, setLoadingProject] = useState(true);

    // Tab state: "overview" | "costs"
    const [activeTab, setActiveTab] = useState("overview");

    // Cost state
    const [costs, setCosts] = useState<ProjectCostRow[]>([]);
    const [loadingCosts, setLoadingCosts] = useState(true);
    const [isCostModalOpen, setIsCostModalOpen] = useState(false);
    const [editingCost, setEditingCost] = useState<ProjectCost | null>(null);
    const [deleteCost, setDeleteCost] = useState<ProjectCost | null>(null);
    const [deletingCost, setDeletingCost] = useState(false);

    // Fetch Project Info
    useEffect(() => {
        async function fetchProject() {
            setLoadingProject(true);
            const { data, error } = await supabase
                .from("projects")
                .select("*, contract:contracts!contract_id(name, client:partners!client_id(name))")
                .eq("id", projectId)
                .single();

            if (error || !data) {
                // Handle 404
                router.push("/projects");
                return;
            }

            // Fix possible array return for relation
            const fixedData = { ...data };
            if (Array.isArray(fixedData.contract)) {
                fixedData.contract = fixedData.contract[0];
            }

            setProject(fixedData as ExtendedProject);
            setLoadingProject(false);
        }

        if (projectId) fetchProject();
    }, [projectId, router, supabase]);

    // Fetch Costs
    const fetchCosts = useCallback(async () => {
        if (!projectId) return;
        setLoadingCosts(true);
        const { data } = await supabase
            .from("project_costs")
            .select("*, supplier:partners!supplier_id(name)")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false });

        if (data) {
            // Fix supplier array issue if any
            const fixedData = data.map((item: any) => ({
                ...item,
                supplier: Array.isArray(item.supplier) ? item.supplier[0] : item.supplier,
            }));
            setCosts(fixedData as ProjectCostRow[]);
        }
        setLoadingCosts(false);
    }, [projectId, supabase]);

    // Load costs when switching to 'costs' tab
    useEffect(() => {
        if (activeTab === "costs") {
            fetchCosts();
        }
    }, [activeTab, fetchCosts]);

    async function handleDeleteCost() {
        if (!deleteCost) return;
        setDeletingCost(true);
        await supabase.from("project_costs").delete().eq("id", deleteCost.id);
        setCosts((prev) => prev.filter((c) => c.id !== deleteCost.id));
        setDeletingCost(false);
        setDeleteCost(null);
    }

    function handleEditCost(cost: ProjectCostRow) {
        setEditingCost(cost);
        setIsCostModalOpen(true);
    }

    function handleCreateCost() {
        setEditingCost(null);
        setIsCostModalOpen(true);
    }

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    }

    function formatDate(dateStr: string | null) {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
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

    function getCategoryLabel(cat: string) {
        const map: Record<string, string> = {
            VAT_TU: "Vật tư",
            NHAN_CONG: "Nhân công",
            MAY_MOC: "Máy móc",
            VAN_CHUYEN: "Vận chuyển",
            KHAC: "Khác",
        };
        return map[cat] || cat;
    }

    // Calculate total cost
    const totalCost = costs.reduce((sum, item) => sum + item.amount, 0);

    if (loadingProject) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="animate-fade-in max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/projects"
                    className="inline-flex items-center text-sm text-slate-500 hover:text-primary-600 mb-3"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Quay lại danh sách
                </Link>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {project.type === "THI_CONG" ? (
                                <Wrench className="w-5 h-5 text-orange-500" />
                            ) : (
                                <Briefcase className="w-5 h-5 text-blue-500" />
                            )}
                            <h1 className="text-2xl font-bold text-slate-900">
                                {project.name}
                            </h1>
                        </div>
                        <p className="text-slate-500">
                            {project.contract?.client?.name} • {project.contract?.name}
                        </p>
                    </div>
                    {getStatusBadge(project.status)}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-6">
                <nav className="flex gap-6">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "overview"
                                ? "border-primary-600 text-primary-600"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        Tổng quan
                    </button>
                    <button
                        onClick={() => setActiveTab("costs")}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "costs"
                                ? "border-primary-600 text-primary-600"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        Chi phí dự án
                    </button>
                </nav>
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div className="card p-6">
                        <h3 className="font-semibold text-slate-900 mb-4">Thông tin chung</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Ngày bắt đầu</span>
                                <span className="font-medium">{formatDate(project.start_date)}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Ngày kết thúc</span>
                                <span className="font-medium">{formatDate(project.end_date)}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Người phụ trách</span>
                                <span className="font-medium">{project.assigned_to || "—"}</span>
                            </div>
                            <div className="pt-2">
                                <span className="text-slate-500 block mb-1">Ghi chú</span>
                                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg min-h-[80px]">
                                    {project.notes || "Không có ghi chú"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6 bg-blue-50 border-blue-100">
                        <h3 className="font-semibold text-blue-900 mb-4">Tóm tắt tài chính(chưa tính)</h3>
                        {/* Placeholder for now until we calculate revenue from contract (payment tracking) often separate module */}
                        {/* But we can show Contract Value from contract info if available in query? 
                             In fetchProject contract query, I fetched name and client name. I could adding total_value. 
                         */}
                        <p className="text-sm text-blue-800">
                            Tính năng tổng hợp doanh thu/lợi nhuận sẽ được cập nhật sau khi hoàn thiện module Công nợ.
                        </p>
                    </div>
                </div>
            )}

            {/* Costs Tab */}
            {activeTab === "costs" && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                                Danh sách chi phí
                            </h3>
                            <p className="text-sm text-slate-500">
                                Tổng chi phí: <span className="font-bold text-red-600">{formatCurrency(totalCost)}</span>
                            </p>
                        </div>
                        <button onClick={handleCreateCost} className="btn-primary">
                            <Plus className="w-4 h-4" />
                            Thêm chi phí
                        </button>
                    </div>

                    {loadingCosts ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                    ) : costs.length === 0 ? (
                        <div className="card p-8 text-center text-slate-500">
                            Chưa có chi phí nào được ghi nhận.
                        </div>
                    ) : (
                        <div className="card overflow-hidden">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Loại</th>
                                        <th>Mô tả</th>
                                        <th>Nhà cung cấp</th>
                                        <th className="text-right">Số tiền</th>
                                        <th className="text-right w-24">...</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {costs.map((cost) => (
                                        <tr key={cost.id}>
                                            <td>
                                                <span className="badge bg-slate-100 text-slate-700">
                                                    {getCategoryLabel(cost.cost_category)}
                                                </span>
                                            </td>
                                            <td className="max-w-[200px] truncate" title={cost.description || ""}>
                                                {cost.description || "—"}
                                            </td>
                                            <td>{cost.supplier?.name || "—"}</td>
                                            <td className="text-right font-medium text-slate-900">
                                                {formatCurrency(cost.amount)}
                                            </td>
                                            <td>
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => handleEditCost(cost)}
                                                        className="p-1.5 rounded text-slate-400 hover:text-primary-600"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteCost(cost)}
                                                        className="p-1.5 rounded text-slate-400 hover:text-red-600"
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
                    )}
                </div>
            )}

            <CostModal
                projectId={projectId}
                cost={editingCost}
                isOpen={isCostModalOpen}
                onClose={() => setIsCostModalOpen(false)}
                onSaved={fetchCosts}
            />

            {deleteCost && (
                <DeleteConfirm
                    title="Xóa chi phí"
                    message="Bạn có chắc muốn xóa khoản chi này?"
                    loading={deletingCost}
                    onConfirm={handleDeleteCost}
                    onCancel={() => setDeleteCost(null)}
                />
            )}
        </div>
    );
}
