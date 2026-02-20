"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
    ArrowLeft,
    Calendar,
    Plus,
    Edit2,
    Trash2,
    Loader2,
    FileText,
    LinkIcon,
} from "lucide-react";
import Link from "next/link";
import DeleteConfirm from "@/components/ui/DeleteConfirm";
import ContractCostModal from "@/components/modules/contracts/ContractCostModal";
import type { Contract, ContractCost } from "@/types/database";

interface ContractCostRow extends ContractCost {
    supplier: { name: string } | null;
}

interface ExtendedContract extends Contract {
    client: { name: string } | null;
}

export default function ContractDetail() {
    const params = useParams();
    const router = useRouter();
    const contractId = params.id as string;
    const supabase = createClient();

    const [contract, setContract] = useState<ExtendedContract | null>(null);
    const [loadingContract, setLoadingContract] = useState(true);

    const [activeTab, setActiveTab] = useState("overview");

    // Cost state
    const [costs, setCosts] = useState<ContractCostRow[]>([]);
    const [loadingCosts, setLoadingCosts] = useState(true);
    const [isCostModalOpen, setIsCostModalOpen] = useState(false);
    const [editingCost, setEditingCost] = useState<ContractCost | null>(null);
    const [deleteCost, setDeleteCost] = useState<ContractCost | null>(null);
    const [deletingCost, setDeletingCost] = useState(false);

    // Fetch Contract Info
    useEffect(() => {
        async function fetchContract() {
            setLoadingContract(true);
            const { data, error } = await supabase
                .from("contracts")
                .select("*, client:partners!client_id(name)")
                .eq("id", contractId)
                .single();

            if (error || !data) {
                router.push("/contracts");
                return;
            }

            const fixedData = { ...data };
            if (Array.isArray(fixedData.client)) {
                fixedData.client = fixedData.client[0];
            }

            setContract(fixedData as ExtendedContract);
            setLoadingContract(false);
        }

        if (contractId) fetchContract();
    }, [contractId, router, supabase]);

    // Fetch Costs
    const fetchCosts = useCallback(async () => {
        if (!contractId) return;
        setLoadingCosts(true);
        const { data } = await supabase
            .from("contract_costs")
            .select("*, supplier:partners!supplier_id(name)")
            .eq("contract_id", contractId)
            .order("created_at", { ascending: false });

        if (data) {
            const fixedData = data.map((item: any) => ({
                ...item,
                supplier: Array.isArray(item.supplier) ? item.supplier[0] : item.supplier,
            }));
            setCosts(fixedData as ContractCostRow[]);
        }
        setLoadingCosts(false);
    }, [contractId, supabase]);

    useEffect(() => {
        if (activeTab === "costs") {
            fetchCosts();
        }
    }, [activeTab, fetchCosts]);

    async function handleDeleteCost() {
        if (!deleteCost) return;
        setDeletingCost(true);
        // DB cascade will also delete linked debt
        await supabase.from("contract_costs").delete().eq("id", deleteCost.id);
        setCosts((prev) => prev.filter((c) => c.id !== deleteCost.id));
        setDeletingCost(false);
        setDeleteCost(null);
    }

    function handleEditCost(cost: ContractCostRow) {
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

    function getCategoryLabel(cat: string) {
        const map: Record<string, string> = {
            VAT_TU: "Vật tư",
            NHAN_CONG: "Nhân công",
            MAY_MOC: "Máy móc",
            VAN_CHUYEN: "Vận chuyển",
            QUANG_CAO: "Quảng cáo",
            KHAC: "Khác",
        };
        return map[cat] || cat;
    }

    function getCategoryColor(cat: string) {
        const map: Record<string, string> = {
            VAT_TU: "bg-blue-100 text-blue-700",
            NHAN_CONG: "bg-green-100 text-green-700",
            MAY_MOC: "bg-orange-100 text-orange-700",
            VAN_CHUYEN: "bg-purple-100 text-purple-700",
            QUANG_CAO: "bg-pink-100 text-pink-700",
            KHAC: "bg-slate-100 text-slate-700",
        };
        return map[cat] || "bg-slate-100 text-slate-700";
    }

    const totalCost = costs.reduce((sum, item) => sum + item.amount, 0);

    if (loadingContract) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!contract) return null;

    return (
        <div className="animate-fade-in max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/contracts"
                    className="inline-flex items-center text-sm text-slate-500 hover:text-primary-600 mb-3"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Quay lại danh sách
                </Link>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-5 h-5 text-primary-500" />
                            <h1 className="text-2xl font-bold text-slate-900">
                                {contract.name}
                            </h1>
                        </div>
                        <p className="text-slate-500">
                            {contract.client?.name || "—"} • Ký ngày {formatDate(contract.signed_date)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500">Giá trị hợp đồng</p>
                        <p className="text-2xl font-bold text-primary-600">
                            {formatCurrency(contract.total_value)}
                        </p>
                    </div>
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
                        Chi phí thực hiện
                    </button>
                </nav>
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div className="card p-6">
                        <h3 className="font-semibold text-slate-900 mb-4">Thông tin hợp đồng</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Khách hàng</span>
                                <span className="font-medium">{contract.client?.name || "—"}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Ngày ký</span>
                                <span className="font-medium">{formatDate(contract.signed_date)}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Giá trị</span>
                                <span className="font-bold text-primary-600">{formatCurrency(contract.total_value)}</span>
                            </div>
                            <div className="pt-2">
                                <span className="text-slate-500 block mb-1">Ghi chú</span>
                                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg min-h-[60px]">
                                    {contract.notes || "Không có ghi chú"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="font-semibold text-slate-900 mb-4">Tóm tắt chi phí</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Giá trị hợp đồng</span>
                                <span className="font-bold text-primary-600">
                                    {formatCurrency(contract.total_value)}
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Tổng chi phí</span>
                                <span className="font-bold text-red-600">
                                    {formatCurrency(totalCost)}
                                </span>
                            </div>
                            <div className="flex justify-between pb-2">
                                <span className="text-slate-500">Lợi nhuận dự kiến</span>
                                <span className={`font-bold ${contract.total_value - totalCost >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {formatCurrency(contract.total_value - totalCost)}
                                </span>
                            </div>
                            {contract.total_value > 0 && (
                                <div>
                                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                                        <span>Tỷ lệ chi phí</span>
                                        <span>{((totalCost / contract.total_value) * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                                        <div
                                            className={`h-2.5 rounded-full transition-all ${(totalCost / contract.total_value) > 0.9
                                                    ? "bg-red-500"
                                                    : (totalCost / contract.total_value) > 0.7
                                                        ? "bg-amber-500"
                                                        : "bg-green-500"
                                                }`}
                                            style={{ width: `${Math.min((totalCost / contract.total_value) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setActiveTab("costs")}
                            className="mt-4 text-sm text-primary-600 hover:underline"
                        >
                            Xem chi tiết chi phí →
                        </button>
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
                                {contract.total_value > 0 && (
                                    <span className="ml-2 text-slate-400">
                                        ({((totalCost / contract.total_value) * 100).toFixed(1)}% giá trị HĐ)
                                    </span>
                                )}
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
                            <br />
                            <button
                                onClick={handleCreateCost}
                                className="mt-2 text-primary-600 hover:underline text-sm"
                            >
                                Thêm chi phí đầu tiên
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Cards */}
                            <div className="space-y-3 lg:hidden">
                                {costs.map((cost) => (
                                    <div key={cost.id} className="card p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className={`badge ${getCategoryColor(cost.cost_category)}`}>
                                                    {getCategoryLabel(cost.cost_category)}
                                                </span>
                                                {cost.supplier && (
                                                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                                        <LinkIcon className="w-3 h-3" />
                                                        {cost.supplier.name}
                                                        <span className="badge bg-emerald-50 text-emerald-600 text-[10px]">→ Phải trả</span>
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-bold text-slate-900">
                                                {formatCurrency(cost.amount)}
                                            </span>
                                        </div>
                                        {cost.description && (
                                            <p className="text-sm text-slate-600 mb-2 line-clamp-2">{cost.description}</p>
                                        )}
                                        <div className="flex justify-end gap-1 pt-2 border-t border-slate-100">
                                            <button
                                                onClick={() => handleEditCost(cost)}
                                                className="btn-sm btn-secondary"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteCost(cost)}
                                                className="btn-sm bg-red-50 text-red-600 hover:bg-red-100 border-red-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden lg:block card overflow-hidden">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Loại</th>
                                            <th>Mô tả</th>
                                            <th>Nhà cung cấp</th>
                                            <th className="text-right">Số tiền</th>
                                            <th className="text-center w-24">Công nợ</th>
                                            <th className="text-right w-24">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {costs.map((cost) => (
                                            <tr key={cost.id}>
                                                <td>
                                                    <span className={`badge ${getCategoryColor(cost.cost_category)}`}>
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
                                                <td className="text-center">
                                                    {cost.supplier ? (
                                                        <span className="badge bg-emerald-50 text-emerald-600 text-xs">
                                                            → Phải trả
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
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
                        </>
                    )}
                </div>
            )}

            <ContractCostModal
                contractId={contractId}
                contractName={contract.name}
                cost={editingCost}
                isOpen={isCostModalOpen}
                onClose={() => setIsCostModalOpen(false)}
                onSaved={fetchCosts}
            />

            {deleteCost && (
                <DeleteConfirm
                    title="Xóa chi phí"
                    message="Bạn có chắc muốn xóa khoản chi này? Khoản phải trả liên kết (nếu có) cũng sẽ bị xóa."
                    loading={deletingCost}
                    onConfirm={handleDeleteCost}
                    onCancel={() => setDeleteCost(null)}
                />
            )}
        </div>
    );
}
