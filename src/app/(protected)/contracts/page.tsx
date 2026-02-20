"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    FileText,
    Loader2,
    Calendar,
} from "lucide-react";
import ContractModal from "@/components/modules/contracts/ContractModal";
import DeleteConfirm from "@/components/ui/DeleteConfirm";
import type { Contract } from "@/types/database";

// Extended interface includes client name
interface ContractRow extends Contract {
    client: { name: string } | null;
}

function ContractsContent() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [contracts, setContracts] = useState<ContractRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContract, setEditingContract] = useState<Contract | null>(null);

    const [deleteContract, setDeleteContract] = useState<Contract | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Check for createFromQuote
    useEffect(() => {
        const quoteId = searchParams.get("quoteId");
        if (quoteId) {
            const fetchQuote = async () => {
                // Fetch quote details
                const { data: quote } = await supabase
                    .from("quotes")
                    .select("client_id, total_amount, client:partners!client_id(name)")
                    .eq("id", quoteId)
                    .single();

                if (quote) {
                    // Open modal with pre-filled data
                    setEditingContract({
                        id: "", // Empty ID signals create new
                        client_id: quote.client_id,
                        name: `Hợp đồng từ báo giá của ${(quote.client as any)?.name || ""}`,
                        total_value: quote.total_amount,
                        signed_date: new Date().toISOString(),
                        notes: `Tạo từ Báo giá #${quoteId!.slice(0, 8)}`,
                        created_at: "",
                        updated_at: "",
                        quote_id: quoteId,
                    } as Contract);
                    setIsModalOpen(true);
                    // Remove param
                    router.replace("/contracts");
                }
            };
            fetchQuote();
        }
    }, [searchParams, supabase, router]);

    const fetchContracts = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("contracts")
            .select("*, client:partners!client_id(name)")
            .order("created_at", { ascending: false });

        if (!error && data) {
            // Client-side filtering
            let result = data as unknown as ContractRow[];
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                result = result.filter(
                    (c) =>
                        c.name.toLowerCase().includes(q) ||
                        c.client?.name.toLowerCase().includes(q)
                );
            }
            setContracts(result);
        }
        setLoading(false);
    }, [searchQuery, supabase]); // Added supabase dependency

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    async function handleDelete() {
        if (!deleteContract) return;
        setDeleting(true);
        await supabase.from("contracts").delete().eq("id", deleteContract.id);
        setContracts((prev) => prev.filter((c) => c.id !== deleteContract.id));
        setDeleting(false);
        setDeleteContract(null);
    }

    function handleEdit(contract: ContractRow) {
        setEditingContract(contract);
        setIsModalOpen(true);
    }

    function handleCreate() {
        setEditingContract(null);
        setIsModalOpen(true);
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

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Hợp đồng</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Quản lý hợp đồng thi công và dịch vụ
                    </p>
                </div>
                <button onClick={handleCreate} className="btn-primary">
                    <Plus className="w-4 h-4" />
                    Tạo hợp đồng
                </button>
            </div>

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên hợp đồng, khách hàng..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-10"
                    />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                </div>
            ) : contracts.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <FileText className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">Chưa có hợp đồng nào</p>
                        <button
                            onClick={handleCreate}
                            className="mt-3 text-primary-600 hover:underline text-sm"
                        >
                            Tạo hợp đồng ngay
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Mobile Cards */}
                    <div className="space-y-3 lg:hidden">
                        {contracts.map((contract) => (
                            <div key={contract.id} className="card p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <Link
                                        href={`/contracts/${contract.id}`}
                                        className="font-semibold text-slate-900 line-clamp-2 hover:text-primary-600 transition-colors"
                                    >
                                        {contract.name}
                                    </Link>
                                    <div className="flex gap-1 ml-2">
                                        <button
                                            onClick={() => handleEdit(contract)}
                                            className="p-1.5 text-slate-400 hover:text-primary-600 bg-slate-50 rounded"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteContract(contract)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="text-sm text-slate-600 mb-2 truncate">
                                    {contract.client?.name}
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                    <div className="flex items-center text-xs text-slate-500 gap-1 min-w-0 pr-2">
                                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{formatDate(contract.signed_date)}</span>
                                    </div>
                                    <div className="font-bold text-primary-600 shrink-0">
                                        {formatCurrency(contract.total_value)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden lg:block table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Tên hợp đồng</th>
                                    <th>Khách hàng</th>
                                    <th>Ngày ký</th>
                                    <th className="text-right">Giá trị</th>
                                    <th className="text-right w-24">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contracts.map((contract) => (
                                    <tr key={contract.id}>
                                        <td className="font-medium text-slate-900">
                                            <Link
                                                href={`/contracts/${contract.id}`}
                                                className="hover:text-primary-600 transition-colors"
                                            >
                                                {contract.name}
                                            </Link>
                                        </td>
                                        <td>{contract.client?.name || "—"}</td>
                                        <td>{formatDate(contract.signed_date)}</td>
                                        <td className="text-right font-medium text-primary-600">
                                            {formatCurrency(contract.total_value)}
                                        </td>
                                        <td>
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => handleEdit(contract)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors"
                                                    title="Sửa"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteContract(contract)}
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
            )
            }

            <ContractModal
                contract={editingContract}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaved={fetchContracts}
            />

            {
                deleteContract && (
                    <DeleteConfirm
                        title="Xóa hợp đồng"
                        message={`Bạn có chắc muốn xóa hợp đồng "${deleteContract.name}"?`}
                        loading={deleting}
                        onConfirm={handleDelete}
                        onCancel={() => setDeleteContract(null)}
                    />
                )
            }
        </div >
    );
}

export default function ContractsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>}>
            <ContractsContent />
        </Suspense>
    );
}
