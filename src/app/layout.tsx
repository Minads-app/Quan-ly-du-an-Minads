import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Minads - Quản lý Dự án & Công nợ",
    description:
        "Hệ thống quản lý Hợp đồng, Dự án, Báo giá và Công nợ cho doanh nghiệp",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="vi">
            <body className="min-h-screen bg-slate-50">{children}</body>
        </html>
    );
}
