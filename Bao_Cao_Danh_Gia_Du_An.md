# BÁO CÁO ĐÁNH GIÁ DỰ ÁN MINADS

## 1. Chức Năng Của Hệ Thống
Phần mềm quản lý dự án Minads là một hệ thống ERP thu nhỏ (SME ERP) tập trung vào việc số hóa quy trình vận hành và tài chính của doanh nghiệp. Các module chức năng chính bao gồm:
- **Dashboard:** Cung cấp cái nhìn tổng quan về tình hình kinh doanh (doanh thu, chi phí, lợi nhuận, thống kê dự án và báo giá).
- **Quản lý Đối tác:** Lưu trữ và quản lý thông tin khách hàng, nhà cung cấp, và đối tác thi công.
- **Quản lý Dịch vụ:** Danh mục các dịch vụ mà công ty cung cấp, phục vụ cho việc làm báo giá.
- **Quản lý Báo giá (Quotes):** Tạo báo giá từ danh mục dịch vụ, tính toán tiền tệ, xuất file PDF và theo dõi trạng thái báo giá (Nháp, Đã gửi, Đã duyệt).
- **Quản lý Hợp đồng (Contracts):** Khởi tạo từ báo giá đã chốt, theo dõi tiến độ pháp lý và giá trị cam kết với khách hàng.
- **Quản lý Dự án (Projects):** Thực thi hợp đồng, quản lý tiến độ, phân công nhân sự và ghi nhận chi phí phát sinh trong dự án.
- **Quản lý Công nợ (Debts):** Theo dõi nợ phải thu (từ khách hàng) và nợ phải trả (cho nhà cung cấp).
- **Quản lý Thu/Chi (Transactions):** Quản lý dòng tiền thực tế, tạo phiếu thu/chi và cấn trừ trực tiếp vào công nợ.
- **Cài đặt & Quản trị:** Quản lý nhân viên (users), phân quyền, cài đặt thông tin doanh nghiệp (để in trên báo giá/hợp đồng).

## 2. Quy Trình Thao Tác (Workflow)
Hệ thống được thiết kế theo một luồng làm việc logic và xuyên suốt:
1. **Thiết lập ban đầu (Admin):** 
   - Cài đặt thông tin doanh nghiệp, logo.
   - Định nghĩa các "Dịch vụ" chuẩn.
   - Thêm nhân sự và phân quyền.
2. **Khởi tạo chuỗi giá trị (Sales / Kế toán):**
   - Thêm "Đối tác" (Khách hàng).
   - Lập "Báo giá" chi tiết và xuất PDF gửi khách hàng.
3. **Thực thi cam kết (Nhân viên / Quản lý):**
   - Báo giá được chốt sẽ chuyển thành "Hợp đồng".
   - Từ Hợp đồng tạo ra các "Dự án" thi công hoặc dịch vụ.
   - Trong quá trình chạy dự án, ghi nhận chi phí (Cost) phát sinh.
4. **Đóng vòng tài chính (Kế toán):**
   - Hệ thống tự động ghi nhận Công nợ (Phải thu từ hợp đồng, Phải trả từ chi phí dự án).
   - Kế toán làm "Phiếu Thu", "Phiếu Chi" (Transactions) khi có dòng tiền thực tế, giúp trừ tự động vào bảng Công nợ.

## 3. Phân Quyền User
Hệ thống định nghĩa 3 Role (vai trò) chính:
- **Admin:** Có toàn quyền trên hệ thống, bao gồm cấu hình doanh nghiệp, quản lý người dùng (tạo/sửa/xóa user thông qua Admin API của Supabase), có thể xem toàn bộ các báo cáo tài chính.
- **Accountant (Kế toán):** Quản lý các vấn đề liên quan đến dòng tiền: Báo giá, Hợp đồng, Công nợ, Thu/Chi.
- **Employee (Nhân viên):** Tập trung vào việc thực thi: Quản lý/xem Dịch vụ, xem Báo giá, theo dõi Hợp đồng và cập nhật trạng thái/chi phí cho Dự án.

**Cơ chế bảo mật:** 
- Tuyến đường (Routes) được bảo vệ bằng middleware kiểm tra session (Supabase Auth). 
- Các thao tác nhạy cảm như "Tạo User Mới" được kiểm tra Role trên Server Actions (chỉ `Admin` mới có quyền gọi API tạo qua `supabase.auth.admin`).

## 4. Đánh Giá Dự Án & Các Điểm Cần Khắc Phục

### Ưu Điểm (Strengths):
- **Công nghệ hiện đại:** Sử dụng Next.js 14 (App Router), Tailwind CSS mang lại hiệu năng cao và giao diện mượt mà.
- **Kiến trúc rõ ràng:** Cơ sở dữ liệu thiết kế trên Supabase (PostgreSQL) rất chuẩn mực cho mô hình ERP (có sự liên kết chặt chẽ từ Quote -> Contract -> Project -> Debt).
- **Trải nghiệm người dùng (UX):** Có hỗ trợ Responsive, các components UI được chia nhỏ (shadcn/radix style), tích hợp xuất PDF trực tiếp từ client.

### Các Điểm Cần Khắc Phục (Weaknesses / Points for Improvement):

1. **Lỗ hổng xử lý lỗi (Error Handling) ở Client:**
   - Tại nhiều trang (ví dụ `quotes/page.tsx`), các thao tác như Xóa (Delete) gọi trực tiếp qua Supabase Client nhưng **không kiểm tra biến `error`** trả về từ API.
   - Thao tác cập nhật giao diện đang làm theo hướng "Optimistic Update" (cập nhật state ngay lập tức), nếu API lỗi, người dùng sẽ lầm tưởng là đã xóa thành công cho đến khi tải lại trang.
   - *=> Khắc phục:* Cần bọc các lệnh mutate dữ liệu trong `try/catch` hoặc kiểm tra `if (error)`, đồng thời hiển thị thông báo (toast/sonner) cho người dùng.

2. **Quản lý Data Fetching (State Management):**
   - Hiện tại ứng dụng đang dùng `useEffect` kết hợp `useState` để fetch dữ liệu từ Supabase. Điều này gây dư thừa code (boilerplate) và khó quản lý việc cache hay re-fetch.
   - *=> Khắc phục:* Nên tích hợp **React Query (TanStack Query)** hoặc **SWR** để quản lý Server State ở phía Client, hoặc sử dụng tính năng fetch dữ liệu trên Server Component của Next.js 14 nếu không cần tương tác realtime quá nhiều.

3. **Bảo mật và Phân quyền trên Giao diện (UI Authorization):**
   - Dù Server Actions có kiểm tra quyền, nhưng ở phía UI Client (ví dụ danh sách báo giá), các nút "Xóa", "Sửa" vẫn được hiển thị công khai cho mọi user. Việc ẩn/hiện các Control này theo `Role` chưa được áp dụng triệt để tại các component.
   - *=> Khắc phục:* Truyền thông tin `User Role` vào trong các Client Component và điều kiện hóa (conditional rendering) các nút thao tác nhạy cảm.

4. **Quản lý Constants / Enums:**
   - Các trạng thái ("Draft", "Sent", "Approved") đang được viết cứng (hardcode) dưới dạng chuỗi (string) trong các file UI.
   - *=> Khắc phục:* Nên import trực tiếp các enum/type từ `database.ts` hoặc tạo 1 file `constants.ts` để sử dụng chung, tránh sai sót chính tả khi code lớn lên.

5. **Logic Xóa Dữ Liệu (Cascade Delete):**
   - Khi xóa một báo giá, code client đang phải gọi 2 lần API (`Xóa quote_items`, sau đó `Xóa quote`).
   - *=> Khắc phục:* Nên thiết lập khóa ngoại `ON DELETE CASCADE` trực tiếp ở database PostgreSQL trên Supabase cho các bảng con (như `quote_items` trỏ về `quotes`). Như vậy client chỉ cần gọi xóa bảng cha 1 lần, Database sẽ tự động dọn dẹp dữ liệu rác.
