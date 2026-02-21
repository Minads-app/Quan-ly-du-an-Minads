"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Partner, Service } from "@/types/database";
import {
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    Send,
    Loader2,
    PlusCircle,
} from "lucide-react";
import Link from "next/link";
import ServiceModal from "@/components/modules/services/ServiceModal";

interface QuoteItemRow {
    id?: string;
    service_id: string;
    custom_name: string;
    custom_unit: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount: number;
    line_total: number;
    is_custom?: boolean;
}

interface QuoteFormProps {
    quoteId?: string;
}

export default function QuoteForm({ quoteId }: QuoteFormProps) {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] = useState(!!quoteId);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [clients, setClients] = useState<Partner[]>([]);
    const [services, setServices] = useState<Service[]>([]);

    const [clientId, setClientId] = useState("");
    const [contractId, setContractId] = useState<string | null>(null);
    const [status, setStatus] = useState<"Draft" | "Sent" | "Approved">("Draft");
    const [notes, setNotes] = useState("");
    const [vatRate, setVatRate] = useState<number>(0);
    const [createdAt, setCreatedAt] = useState<string>(new Date().toISOString().split("T")[0]);
    const [items, setItems] = useState<QuoteItemRow[]>([]);
    const [serviceModalOpen, setServiceModalOpen] = useState(false);
    const [serviceModalForIndex, setServiceModalForIndex] = useState<number | null>(null);

    const isEditing = !!quoteId;

    // Fetch clients & services
    useEffect(() => {
        async function loadData() {
            const [clientsRes, servicesRes] = await Promise.all([
                supabase
                    .from("partners")
                    .select("*")
                    .eq("type", "Client")
                    .order("name"),
                supabase.from("services").select("*").order("name"),
            ]);

            if (clientsRes.data) setClients(clientsRes.data as Partner[]);
            if (servicesRes.data) setServices(servicesRes.data as Service[]);

            // Load existing quote if editing
            if (quoteId) {
                const { data: quote } = await supabase
                    .from("quotes")
                    .select("*")
                    .eq("id", quoteId)
                    .single();

                if (quote) {
                    setClientId(quote.client_id as string);
                    setStatus(quote.status as "Draft" | "Sent" | "Approved");
                    setNotes((quote.notes as string) || "");
                    setVatRate(Number(quote.vat_rate) || 0);
                    if (quote.created_at) {
                        setCreatedAt(new Date(quote.created_at as string).toISOString().split("T")[0]);
                    }

                    const { data: qItems } = await supabase
                        .from("quote_items")
                        .select("*")
                        .eq("quote_id", quoteId)
                        .order("created_at");

                    if (qItems) {
                        setItems(
                            qItems.map((qi: any) => ({
                                id: qi.id as string,
                                service_id: (qi.service_id as string) || "",
                                custom_name: (qi.custom_name as string) || "",
                                custom_unit: (qi.custom_unit as string) || "",
                                description: (qi.description as string) || "",
                                quantity: qi.quantity as number,
                                unit_price: qi.unit_price as number,
                                discount: qi.discount as number,
                                line_total: qi.line_total as number,
                                is_custom: !qi.service_id,
                            }))
                        );
                    }
                }
                setLoading(false);
            } else {
                // If not editing, check for URL parameters (e.g. from Add-on Quote flow)
                const params = new URLSearchParams(window.location.search);
                const urlClientId = params.get("clientId");
                const urlContractId = params.get("contractId");

                if (urlClientId) {
                    setClientId(urlClientId);
                }
                if (urlContractId) {
                    setContractId(urlContractId);
                }
                setLoading(false);
            }
        }

        loadData();
    }, [quoteId]);

    // Refresh services list (sau khi tạo dịch vụ mới inline)
    async function refreshServices() {
        const { data } = await supabase
            .from("services")
            .select("*")
            .order("name");
        if (data) setServices(data as Service[]);
        return data as Service[] | null;
    }

    function openServiceModal(itemIndex: number) {
        setServiceModalForIndex(itemIndex);
        setServiceModalOpen(true);
    }

    async function handleServiceCreated() {
        setServiceModalOpen(false);
        const updatedServices = await refreshServices();
        // Auto-select dịch vụ mới nhất cho hạng mục đang chọn
        if (updatedServices && updatedServices.length > 0 && serviceModalForIndex !== null) {
            // Dịch vụ mới nhất nằm cuối danh sách (sort by name)
            // Tốt hơn: lấy dịch vụ có created_at mới nhất
            const newest = [...updatedServices].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];
            if (newest) {
                updateItem(serviceModalForIndex, "service_id", newest.id);
            }
        }
        setServiceModalForIndex(null);
    }

    function addItem() {
        setItems((prev) => [
            ...prev,
            {
                service_id: "",
                custom_name: "",
                custom_unit: "",
                description: "",
                quantity: 1,
                unit_price: 0,
                discount: 0,
                line_total: 0,
                is_custom: false,
            },
        ]);
    }

    function removeItem(index: number) {
        setItems((prev) => prev.filter((_, i) => i !== index));
    }

    function updateItem(index: number, field: keyof QuoteItemRow, value: any) {
        setItems((prev) => {
            const updated = [...prev];
            const item = { ...updated[index] };

            if (field === "is_custom") {
                item.is_custom = value as boolean;
                if (value) {
                    item.service_id = "";
                }
            } else if (field === "service_id") {
                item.service_id = value as string;
                // Auto-fill price & clear custom fields from service
                const svc = services.find((s) => s.id === value);
                if (svc) {
                    item.unit_price = svc.default_price;
                    item.custom_name = "";
                    item.custom_unit = "";
                }
                if (!value) {
                    // Switched to custom mode
                    item.unit_price = 0;
                }
            } else if (field === "custom_name") {
                item.custom_name = value as string;
            } else if (field === "custom_unit") {
                item.custom_unit = value as string;
            } else if (field === "description") {
                item.description = value as string;
            } else if (field === "quantity") {
                item.quantity = Number(value) || 0;
            } else if (field === "unit_price") {
                item.unit_price = Number(value) || 0;
            } else if (field === "discount") {
                item.discount = Math.min(100, Math.max(0, Number(value) || 0));
            }

            // Recalc line_total
            item.line_total =
                item.quantity * item.unit_price * (1 - item.discount / 100);

            updated[index] = item;
            return updated;
        });
    }

    const totalAmount = items.reduce((sum, item) => sum + item.line_total, 0);
    const vatAmount = totalAmount * (vatRate / 100);
    const grandTotal = totalAmount + vatAmount;

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    }

    async function handleSave(saveStatus?: "Draft" | "Sent" | "Approved") {
        if (!clientId) {
            setError("Vui lòng chọn khách hàng");
            return;
        }
        if (items.length === 0) {
            setError("Vui lòng thêm ít nhất 1 hạng mục");
            return;
        }
        if (items.some((item) => !item.service_id && !item.custom_name.trim())) {
            setError("Vui lòng chọn dịch vụ hoặc nhập tên hạng mục");
            return;
        }

        setSaving(true);
        setError(null);

        const finalStatus = saveStatus || status;

        // Get current user
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setError("Phiên đăng nhập hết hạn");
            setSaving(false);
            return;
        }

        if (isEditing) {
            // Update quote
            const { error: qErr } = await supabase
                .from("quotes")
                .update({
                    client_id: clientId,
                    total_amount: grandTotal,
                    vat_rate: vatRate,
                    status: finalStatus,
                    notes: notes || null,
                    created_at: new Date(createdAt).toISOString(),
                })
                .eq("id", quoteId);

            if (qErr) {
                setError("Lỗi cập nhật: " + qErr.message);
                setSaving(false);
                return;
            }

            // Delete old items then re-insert
            await supabase.from("quote_items").delete().eq("quote_id", quoteId);

            const itemsData = items.map((item) => ({
                quote_id: quoteId,
                service_id: item.service_id || null,
                custom_name: item.custom_name || null,
                custom_unit: item.custom_unit || null,
                description: item.description || null,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount: item.discount,
                line_total: item.line_total,
            }));

            const { error: iErr } = await supabase
                .from("quote_items")
                .insert(itemsData);

            if (iErr) {
                setError("Lỗi cập nhật hạng mục: " + iErr.message);
                setSaving(false);
                return;
            }
        } else {
            // Create new quote
            const { data: newQuote, error: qErr } = await supabase
                .from("quotes")
                .insert({
                    client_id: clientId,
                    contract_id: contractId,
                    total_amount: grandTotal,
                    vat_rate: vatRate,
                    status: finalStatus,
                    notes: notes || null,
                    created_by: user.id,
                    created_at: new Date(createdAt).toISOString(),
                })
                .select("id")
                .single();

            if (qErr || !newQuote) {
                setError("Lỗi tạo báo giá: " + (qErr?.message || "Unknown"));
                setSaving(false);
                return;
            }

            const itemsData = items.map((item) => ({
                quote_id: (newQuote as { id: string }).id,
                service_id: item.service_id || null,
                custom_name: item.custom_name || null,
                custom_unit: item.custom_unit || null,
                description: item.description || null,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount: item.discount,
                line_total: item.line_total,
            }));

            const { error: iErr } = await supabase
                .from("quote_items")
                .insert(itemsData);

            if (iErr) {
                setError("Lỗi tạo hạng mục: " + iErr.message);
                setSaving(false);
                return;
            }
        }

        setSaving(false);
        router.push("/quotes");
        router.refresh();
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in max-w-4xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link
                    href="/quotes"
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-slate-900">
                        {isEditing ? "Sửa báo giá" : "Tạo báo giá mới"}
                    </h1>
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
                    {error}
                </div>
            )}

            {/* Client & Status */}
            <div className="card p-4 sm:p-6 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="label">
                            Khách hàng <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            className="select"
                            disabled={!!contractId || isEditing}
                        >
                            <option value="">Chọn khách hàng</option>
                            {clients.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label">Trạng thái</label>
                        <select
                            value={status}
                            onChange={(e) =>
                                setStatus(e.target.value as "Draft" | "Sent" | "Approved")
                            }
                            className="select"
                        >
                            <option value="Draft">Nháp</option>
                            <option value="Sent">Đã gửi</option>
                            <option value="Approved">Đã duyệt</option>
                        </select>
                    </div>
                    <div>
                        <label className="label">Ngày tạo</label>
                        <input
                            type="date"
                            value={createdAt}
                            onChange={(e) => setCreatedAt(e.target.value)}
                            className="input"
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <label className="label">Ghi chú</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Ghi chú cho báo giá..."
                        className="input resize-none"
                    />
                </div>
            </div>

            {/* Quote Items */}
            <div className="card mb-4">
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <h2 className="font-semibold text-slate-900">Hạng mục báo giá</h2>
                    <button
                        onClick={addItem}
                        className="btn-sm btn-primary"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm
                    </button>
                </div>

                {items.length === 0 ? (
                    <div className="empty-state py-8">
                        <p className="text-slate-400 text-sm">
                            Chưa có hạng mục nào. Nhấn &quot;Thêm&quot; để bắt đầu
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {items.map((item, index) => {
                            const selectedService = services.find(
                                (s) => s.id === item.service_id
                            );
                            const isCustom = item.is_custom ?? (!item.service_id && !!item.custom_name);
                            return (
                                <div key={index} className="p-4">
                                    <div className="flex items-start gap-2">
                                        <div className="flex-1 space-y-3">
                                            {/* Mode toggle */}
                                            <div className="flex items-center gap-2 mb-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (isCustom) return;
                                                        updateItem(index, "is_custom", true);
                                                    }}
                                                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${isCustom ? "bg-primary-100 text-primary-700 font-medium" : "text-slate-500 hover:text-slate-700"}`}
                                                >
                                                    Nhập tự do
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!isCustom) return;
                                                        updateItem(index, "is_custom", false);
                                                    }}
                                                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${!isCustom ? "bg-primary-100 text-primary-700 font-medium" : "text-slate-500 hover:text-slate-700"}`}
                                                >
                                                    Chọn dịch vụ
                                                </button>
                                            </div>

                                            {/* Service select OR custom input */}
                                            <div>
                                                <label className="label text-xs">
                                                    {isCustom ? "Tên hạng mục" : "Dịch vụ"}
                                                </label>
                                                {isCustom ? (
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="col-span-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Nhập tên hạng mục..."
                                                                value={item.custom_name}
                                                                onChange={(e) =>
                                                                    updateItem(index, "custom_name", e.target.value)
                                                                }
                                                                className="input text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <input
                                                                type="text"
                                                                placeholder="ĐVT (m², bộ...)"
                                                                value={item.custom_unit}
                                                                onChange={(e) =>
                                                                    updateItem(index, "custom_unit", e.target.value)
                                                                }
                                                                className="input text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={item.service_id}
                                                            onChange={(e) =>
                                                                updateItem(index, "service_id", e.target.value)
                                                            }
                                                            className="select text-sm flex-1"
                                                        >
                                                            <option value="">Chọn dịch vụ</option>
                                                            {services.map((s) => (
                                                                <option key={s.id} value={s.id}>
                                                                    {s.name} ({s.unit})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={() => openServiceModal(index)}
                                                            className="flex-shrink-0 p-2.5 rounded-lg border border-dashed border-primary-400 text-primary-600 hover:bg-primary-50 transition-colors"
                                                            title="Thêm dịch vụ mới"
                                                        >
                                                            <PlusCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Description / Ghi chú */}
                                            <div>
                                                <label className="label text-xs">Ghi chú / Diễn giải</label>
                                                <input
                                                    type="text"
                                                    placeholder="Diễn giải cụ thể cho hạng mục này..."
                                                    value={item.description}
                                                    onChange={(e) =>
                                                        updateItem(index, "description", e.target.value)
                                                    }
                                                    className="input text-sm"
                                                />
                                            </div>

                                            {/* Quantity, Price, Discount */}
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="label text-xs">
                                                        SL {selectedService ? `(${selectedService.unit})` : item.custom_unit ? `(${item.custom_unit})` : ""}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        value={item.quantity}
                                                        onChange={(e) =>
                                                            updateItem(index, "quantity", e.target.value)
                                                        }
                                                        className="input text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="label text-xs">Đơn giá</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.unit_price}
                                                        onChange={(e) =>
                                                            updateItem(index, "unit_price", e.target.value)
                                                        }
                                                        className="input text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="label text-xs">CK (%)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={item.discount}
                                                        onChange={(e) =>
                                                            updateItem(index, "discount", e.target.value)
                                                        }
                                                        className="input text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Line total & Remove */}
                                        <div className="flex flex-col items-end gap-2 pt-5">
                                            <p className="text-sm font-bold text-primary-600 whitespace-nowrap">
                                                {formatCurrency(item.line_total)}
                                            </p>
                                            <button
                                                onClick={() => removeItem(index)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Total Summary */}
                {items.length > 0 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-xl space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Tạm tính</span>
                            <span className="font-medium text-slate-800">{formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-600">Thuế VAT</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={vatRate}
                                    onChange={(e) => setVatRate(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                                    className="input text-sm w-16 text-center py-0.5 px-1"
                                />
                                <span className="text-slate-500">%</span>
                            </div>
                            <span className="font-medium text-slate-800">{formatCurrency(vatAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                            <span className="font-semibold text-slate-700">Tổng cộng (đã gồm VAT)</span>
                            <span className="text-xl font-bold text-primary-600">{formatCurrency(grandTotal)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Service Modal inline */}
            {serviceModalOpen && (
                <ServiceModal
                    service={null}
                    onClose={() => {
                        setServiceModalOpen(false);
                        setServiceModalForIndex(null);
                    }}
                    onSaved={handleServiceCreated}
                />
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/quotes" className="btn-secondary flex-1 text-center">
                    Hủy
                </Link>
                {isEditing ? (
                    <button
                        onClick={() => handleSave()}
                        disabled={saving}
                        className="btn-primary flex-1"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Cập nhật
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => handleSave("Draft")}
                            disabled={saving}
                            className="btn-secondary flex-1"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Lưu nháp
                        </button>
                        <button
                            onClick={() => handleSave("Sent")}
                            disabled={saving}
                            className="btn-primary flex-1"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Gửi báo giá
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
