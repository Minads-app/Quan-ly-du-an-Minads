"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";

interface DeleteConfirmProps {
    title: string;
    message: string;
    loading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function DeleteConfirm({
    title,
    message,
    loading,
    onConfirm,
    onCancel,
}: DeleteConfirmProps) {
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div
                className="modal-content max-w-sm"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {title}
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">{message}</p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onCancel}
                            disabled={loading}
                            className="btn-secondary flex-1"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : null}
                            {loading ? "Đang xóa..." : "Xóa"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
