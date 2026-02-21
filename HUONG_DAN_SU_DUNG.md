# Hướng Dẫn Sử Dụng & Giới Thiệu Tính Năng - Minads

Chào mừng bạn đến với **Minads** - Hệ thống Quản lý Dự án & Công nợ toàn diện dành cho doanh nghiệp SME. Tài liệu này sẽ giới thiệu chi tiết về các tính năng và hướng dẫn cách sử dụng phần mềm hiệu quả.

---

## 🌟 MỤC LỤC

1. [Giới Thiệu Chung](#1-giới-thiệu-chung)
2. [Các Tính Năng Chính Màn Hình](#2-các-tính-năng-chính-màn-hình)
   - [Dashboard (Bảng Điều Khiển)](#dashboard-bảng-điều-khiển)
   - [Đối Tác (Khách hàng & Nhà cung cấp)](#đối-tác)
   - [Dịch Vụ](#dịch-vụ)
   - [Báo Giá](#báo-giá)
   - [Hợp Đồng](#hợp-đồng)
   - [Dự Án](#dự-án)
   - [Công Nợ](#công-nợ)
   - [Thu Chi (Giao Dịch)](#thu-chi)
   - [Phân Quyền & Nhân Viên](#nhân-viên--phân-quyền)
   - [Cài Đặt Hệ Thống](#cài-đặt)
3. [Hướng Dẫn Sử Dụng (Quy Trình Chuẩn)](#3-hướng-dẫn-sử-dụng-quy-trình-chuẩn)

---

## 1. GIỚI THIỆU CHUNG

**Minads** được thiết kế để số hóa và tự động hóa các quy trình vận hành cốt lõi của doanh nghiệp, từ khâu tiếp cận khách hàng (Báo giá) đến thực hiện cam kết (Hợp đồng, Dự án) và quản lý tài chính (Thu chi, Công nợ). 

Hệ thống cung cấp sự phân quyền chặt chẽ với các vai trò (Role) như Admin, Kế toán (Accountant), và Nhân viên (Staff), đảm bảo tính bảo mật và chuyên môn hóa trong quá trình làm việc.

---

## 2. CÁC TÍNH NĂNG CHÍNH MÀN HÌNH

### Dashboard (Bảng Điều Khiển)
- **Tổng quan**: Nơi hiển thị các chỉ số quan trọng nhất của doanh nghiệp.
- **Tính năng**: 
  - Thống kê doanh thu, chi phí, lợi nhuận.
  - Theo dõi nhanh số lượng dự án đang chạy, số lượng báo giá chờ duyệt.
  - Biểu đồ trực quan về dòng tiền và tình hình công nợ.

### Đối Tác
- **Tổng quan**: Quản lý toàn bộ thông tin về các bên liên quan.
- **Tính năng**:
  - Thêm, sửa, xóa thông tin **Khách hàng**, **Nhà cung cấp**, hoặc **Đối tác thi công**.
  - Lưu trữ lịch sử giao dịch, công nợ gắn liền với từng đối tác để dễ dàng tra cứu.

### Dịch Vụ
- **Tổng quan**: Quản lý danh mục các dịch vụ mà doanh nghiệp đang cung cấp.
- **Tính năng**:
  - Tạo mới các gói dịch vụ, thiết lập đơn giá chuẩn.
  - Cập nhật thông tin dịch vụ, giúp tự động điền thông tin khi tạo Báo Giá.

### Báo Giá
- **Tổng quan**: Quy trình chuẩn bị và gửi báo giá cho khách hàng.
- **Tính năng**:
  - Tạo bảng báo giá chuyên nghiệp với các hạng mục dịch vụ đã định nghĩa.
  - Tự động tính toán tổng tiền, thuế, chiết khấu.
  - **Xuất file PDF** báo giá theo template chuẩn của công ty để gửi ngay cho khách hàng.
  - Chuyển đổi trạng thái Báo giá sang "Đã chốt" để tiến tới làm Hợp đồng.

### Hợp Đồng
- **Tổng quan**: Số hóa việc quản lý văn bản thỏa thuận với khách hàng.
- **Tính năng**:
  - Tạo hợp đồng mới hoặc tự động **chuyển đổi từ Báo Giá** đã chốt.
  - Theo dõi trạng thái hợp đồng (Đang hiệu lực, Đã thanh lý, Hủy, v.v.).
  - Liên kết trực tiếp Hợp đồng với các Dự Án để thực thi.

### Dự Án
- **Tổng quan**: Trái tim của hệ thống hoạt động thực thi.
- **Tính năng**:
  - Khởi tạo dự án dựa trên Hợp Đồng đã ký.
  - Lên kế hoạch, theo dõi tiến độ thi công hoặc cung cấp dịch vụ.
  - Phân bổ nhân sự chịu trách nhiệm.
  - Quản lý các chi phí phát sinh trực tiếp trong quá trình thực hiện dự án.

### Công Nợ (Dành cho Admin/Kế toán)
- **Tổng quan**: Quản lý dòng tiền chưa thu hoặc chưa chi.
- **Tính năng**:
  - Bảng tổng hợp chi tiết Khách hàng đang nợ (Phải thu).
  - Bảng tổng hợp chi tiết Nợ nhà cung cấp (Phải trả).
  - Đối soát công nợ định kỳ, theo dõi ngày đến hạn thanh toán.

### Thu Chi (Dành cho Admin/Kế toán)
- **Tổng quan**: Quản lý sổ quỹ, dòng tiền thực tế.
- **Tính năng**:
  - Tạo Phiếu Thu (khi khách thanh toán) và Phiếu Chi (khi mua vật tư, trả lương...).
  - Quản lý các hạng mục thu/chi dòng tiền, kết nối tự động nhằm cấn trừ vào **Công Nợ**.

### Nhân Viên & Phân Quyền (Dành cho Admin)
- **Tổng quan**: Phân bổ quyền truy cập hệ thống.
- **Tính năng**:
  - Cấp tài khoản cho nhân viên mới.
  - Gán quyền (Role): Admin (Toàn quyền), Kế toán (Quản lý tài chính, báo giá), Nhân viên (Quản lý dự án, dịch vụ).

### Cài Đặt (Dành cho Admin)
- **Tổng quan**: Cấu hình chung cho toàn hệ thống.
- **Tính năng**:
  - Cập nhật thông tin công ty (Tên, Mã số thuế, Địa chỉ, Logo, Thông tin Ngân hàng...).
  - Các thông tin này sẽ **tự động được in** lên các mẫu PDF xuất ra của Báo giá và Hợp đồng.

---

## 3. HƯỚNG DẪN SỬ DỤNG (QUY TRÌNH CHUẨN)

Để tối ưu hóa ứng dụng, người dùng nên tuân theo một "Flow" (luồng) công việc chuẩn hóa như sau:

**Bước 1: Thiết lập ban đầu (Dành cho Admin)**
1. Vào **Cài đặt** -> Cập nhật thông tin công ty, tải lên Logo và thông tin ngân hàng.
2. Vào **Dịch Vụ** -> Tạo danh sách các dịch vụ kèm đơn giá để sẵn sàng sử dụng.
3. Vào **Nhân viên** -> Tạo tài khoản cho các thành viên trong đội ngũ và cấu hình phân quyền.

**Bước 2: Tìm kiếm & Tạo Báo Giá**
1. Vào **Đối Tác** -> Thêm khách hàng mới.
2. Vào **Báo Giá** -> Nhấn "Tạo báo giá", chọn khách hàng vừa tạo.
3. Thêm các hạng mục Dịch vụ vào báo giá. Hệ thống tự tính tiền.
4. Kiểm tra, **Xuất PDF** và gửi cho khách hàng.

**Bước 3: Chốt Hợp Đồng & Triển Khai**
1. Khi khách đồng ý Báo giá, vào Báo giá đó chọn chuyển trạng thái thành "Đã chốt" và tạo **Hợp Đồng**.
2. Từ Hợp đồng, tạo **Dự Án**. Phân công nhân sự để thực hiện dự án.
3. Trong quá trình chạy Dự Án, mọi chi phí phát sinh sẽ được ghi nhận vào phần chi phí dự án.

**Bước 4: Quản lý Tài chính (Dành cho Kế toán)**
1. Khi dự án đến đợt thanh toán, tạo **Phiếu Thu** trong mục **Thu Chi**. Phiếu thu này sẽ làm giảm **Công Nợ** phải thu của Khách hàng.
2. Khi thuê đơn vị ngoài thi công, tạo Phiếu Chi. Phiếu chi kết nối với **Đối tác** là nhà cung cấp.
3. Cuối tháng, Kế toán mở trang **Công Nợ** và **Dashboard** để rà soát toàn bộ sức khỏe tài chính và chốt số liệu.

---
*Minads Management System - Xây dựng quy trình, tối ưu lợi nhuận.*
