// ===================== ENUMS =====================

export type UserRole = "Admin" | "Accountant" | "Employee";
export type PartnerType = "Client" | "Supplier";
export type ServiceType = "Material" | "Labor" | "Service" | "Ads";
export type QuoteStatus = "Draft" | "Sent" | "Approved";
export type ProjectType = "THI_CONG" | "DICH_VU";
export type ProjectStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "CANCELLED";
export type DebtType = "RECEIVABLE" | "PAYABLE";
export type TransactionType = "RECEIPT" | "PAYMENT";

// ===================== TABLES =====================

export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
    created_at: string;
    updated_at: string;
}

export interface Partner {
    id: string;
    name: string;
    type: PartnerType;
    phone: string | null;
    address: string | null;
    tax_code: string | null;
    created_at: string;
    updated_at: string;
}

export type PartnerInsert = Omit<Partner, "id" | "created_at" | "updated_at">;
export type PartnerUpdate = Partial<PartnerInsert>;

export interface Service {
    id: string;
    name: string;
    default_price: number;
    unit: string;
    type: ServiceType;
    created_at: string;
    updated_at: string;
}

export interface Quote {
    id: string;
    client_id: string;
    total_amount: number;
    status: QuoteStatus;
    notes: string | null;
    vat_rate: number;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface QuoteItem {
    id: string;
    quote_id: string;
    service_id: string | null;
    custom_name: string | null;
    custom_unit: string | null;
    description: string | null;
    quantity: number;
    unit_price: number;
    discount: number;
    line_total: number;
    created_at: string;
}

export interface Contract {
    id: string;
    quote_id: string | null;
    client_id: string;
    name: string;
    total_value: number;
    vat_rate?: number;
    signed_date: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface ContractCost {
    id: string;
    contract_id: string;
    supplier_id: string | null;
    cost_category: string;
    amount: number;
    description: string | null;
    created_at: string;
}

export interface Project {
    id: string;
    contract_id: string;
    name: string;
    type: ProjectType;
    status: ProjectStatus;
    assigned_to: string | null;
    start_date: string | null;
    end_date: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProjectCost {
    id: string;
    project_id: string;
    supplier_id: string | null;
    cost_category: string;
    amount: number;
    description: string | null;
    created_at: string;
}

export interface Debt {
    id: string;
    partner_id: string;
    type: DebtType;
    total_amount: number;
    paid_amount: number;
    due_date: string | null;
    notes: string | null;
    contract_cost_id?: string | null;
    contract_id?: string | null;
    created_at: string;
    updated_at: string;
}

export interface Transaction {
    id: string;
    type: TransactionType;
    partner_id: string;
    contract_id: string | null;
    debt_id: string | null;
    amount: number;
    transaction_date: string;
    description: string | null;
    created_by: string;
    created_at: string;
}
