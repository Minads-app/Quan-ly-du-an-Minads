import { z } from "zod";

// ---- Partner ----
export const partnerSchema = z.object({
    name: z.string().min(1, "Tên không được để trống"),
    type: z.enum(["Client", "Supplier"], {
        required_error: "Vui lòng chọn loại đối tác",
    }),
    phone: z
        .string()
        .regex(/^(0|\+84)\d{9,10}$/, "Số điện thoại không hợp lệ")
        .nullable()
        .optional()
        .or(z.literal("")),
    address: z.string().nullable().optional(),
    tax_code: z
        .string()
        .regex(/^\d{10}(-\d{3})?$/, "Mã số thuế không hợp lệ (10 hoặc 13 số)")
        .nullable()
        .optional()
        .or(z.literal("")),
});

export type PartnerFormData = z.infer<typeof partnerSchema>;

// ---- Service ----
export const serviceSchema = z.object({
    name: z.string().min(1, "Tên dịch vụ không được để trống"),
    default_price: z.coerce
        .number()
        .min(0, "Giá phải lớn hơn hoặc bằng 0"),
    unit: z.string().min(1, "Đơn vị không được để trống"),
    type: z.enum(["Material", "Labor", "Service", "Ads"], {
        required_error: "Vui lòng chọn loại dịch vụ",
    }),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

// ---- Quote ----
export const quoteSchema = z.object({
    client_id: z.string().uuid("Vui lòng chọn khách hàng"),
    notes: z.string().nullable().optional(),
    status: z.enum(["Draft", "Sent", "Approved"]).default("Draft"),
});

export type QuoteFormData = z.infer<typeof quoteSchema>;

// ---- Quote Item ----
export const quoteItemSchema = z.object({
    service_id: z.string().uuid("Vui lòng chọn dịch vụ"),
    quantity: z.coerce.number().min(0.01, "Số lượng phải lớn hơn 0"),
    unit_price: z.coerce.number().min(0, "Đơn giá phải lớn hơn hoặc bằng 0"),
    discount: z.coerce
        .number()
        .min(0, "Chiết khấu tối thiểu 0%")
        .max(100, "Chiết khấu tối đa 100%")
        .default(0),
});

export type QuoteItemFormData = z.infer<typeof quoteItemSchema>;

// ---- Contract ----
export const contractSchema = z.object({
    quote_id: z.string().uuid().nullable().optional(),
    client_id: z.string().uuid("Vui lòng chọn khách hàng"),
    name: z.string().min(1, "Tên hợp đồng không được để trống"),
    total_value: z.coerce.number().min(0, "Giá trị phải lớn hơn hoặc bằng 0"),
    signed_date: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
});

export type ContractFormData = z.infer<typeof contractSchema>;

// ---- Project ----
export const projectSchema = z.object({
    contract_id: z.string().uuid("Vui lòng chọn hợp đồng"),
    name: z.string().min(1, "Tên dự án không được để trống"),
    type: z.enum(["THI_CONG", "DICH_VU"], {
        required_error: "Vui lòng chọn loại dự án",
    }),
    status: z
        .enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"])
        .default("NOT_STARTED"),
    assigned_to: z.string().uuid().nullable().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

// ---- Project Cost ----
export const projectCostSchema = z.object({
    project_id: z.string().uuid("Vui lòng chọn dự án"),
    supplier_id: z.string().uuid().nullable().optional(),
    cost_category: z.string().min(1, "Danh mục chi phí không được để trống"),
    amount: z.coerce.number().min(0, "Số tiền phải lớn hơn hoặc bằng 0"),
    description: z.string().nullable().optional(),
});

export type ProjectCostFormData = z.infer<typeof projectCostSchema>;

// ---- Debt ----
export const debtSchema = z.object({
    partner_id: z.string().uuid("Vui lòng chọn đối tác"),
    type: z.enum(["RECEIVABLE", "PAYABLE"], {
        required_error: "Vui lòng chọn loại công nợ",
    }),
    total_amount: z.coerce.number().min(0, "Tổng tiền phải lớn hơn hoặc bằng 0"),
    paid_amount: z.coerce.number().min(0, "Số tiền đã trả phải lớn hơn hoặc bằng 0"),
    due_date: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
});

export type DebtFormData = z.infer<typeof debtSchema>;

// ---- Login ----
export const loginSchema = z.object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
