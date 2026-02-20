# Minads - Hệ thống Quản lý Dự án & Công nợ

Minads là phần mềm quản lý toàn diện dành cho doanh nghiệp SME, giúp tối ưu hóa quy trình từ báo giá, hợp đồng đến quản lý dự án và công nợ.

## 🚀 Tính năng chính

- **Quản lý Đối tác**: Khách hàng, Nhà cung cấp, Đối tác thi công.
- **Báo giá & Hợp đồng**: Tạo báo giá chuyên nghiệp (export PDF), chuyển đổi sang hợp đồng nhanh chóng.
- **Quản lý Dự án**: Theo dõi tiến độ thi công, dịch vụ, phân bổ nhân sự.
- **Chi phí & Công nợ**: Kiểm soát chi phí dự án, theo dõi nợ phải thu/phải trả.
- **Dashboard**: Báo cáo trực quan về tình hình kinh doanh.
- **Phân quyền**: Admin, Kế toán, Nhân viên.

## 🛠️ Công nghệ sử dụng

- **Frontend**: [Next.js 14](https://nextjs.org) (App Router), React, TypeScript.
- **Styling**: [Tailwind CSS](https://tailwindcss.com).
- **Backend & Database**: [Supabase](https://supabase.com) (PostgreSQL, Auth, Realtime).
- **Form Handling**: React Hook Form, Zod.
- **Deployment**: [Vercel](https://vercel.com).

## 📦 Cài đặt & Chạy Local

1.  Clone dự án:
    ```bash
    git clone https://github.com/Minads-app/Quan-ly-du-an-Minads.git
    cd Quan-ly-du-an-Minads
    ```

2.  Cài đặt dependencies:
    ```bash
    npm install
    ```

3.  Cấu hình biến môi trường (`.env.local`):
    ```env
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
    ```

4.  Chạy server development:
    ```bash
    npm run dev
    ```
    Truy cập [http://localhost:3000](http://localhost:3000).

## 🚀 Deployment

Dự án được cấu hình để deploy tự động lên Vercel mỗi khi push code lên nhánh `main`.
Sử dụng script `push_to_github.bat` để đẩy code nhanh.

## 📄 License

Internal Use Only.
