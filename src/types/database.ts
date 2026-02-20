// ============================================================
// Database Types - ERP Mini
// Tự động sinh từ database schema, có thể thay bằng Supabase CLI
// ============================================================

export type UserRole = "Admin" | "Accountant" | "Employee";
export type PartnerType = "Client" | "Supplier";
export type ServiceType = "Material" | "Labor" | "Service" | "Ads";
export type QuoteStatus = "Draft" | "Sent" | "Approved";
export type ProjectType = "THI_CONG" | "DICH_VU";
export type ProjectStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "CANCELLED";
export type DebtType = "RECEIVABLE" | "PAYABLE";
export type TransactionType = "RECEIPT" | "PAYMENT";

// ---- Row types (dữ liệu trả về từ DB) ----

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
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface QuoteItem {
    id: string;
    quote_id: string;
    service_id: string;
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
    signed_date: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
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

export interface ContractCost {
    id: string;
    contract_id: string;
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
    contract_cost_id: string | null;
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

// ---- Insert types (dữ liệu gửi lên khi tạo mới) ----

export type ProfileInsert = Omit<Profile, "created_at" | "updated_at">;
export type PartnerInsert = Omit<Partner, "id" | "created_at" | "updated_at">;
export type ServiceInsert = Omit<Service, "id" | "created_at" | "updated_at">;
export type QuoteInsert = Omit<Quote, "id" | "created_at" | "updated_at">;
export type QuoteItemInsert = Omit<QuoteItem, "id" | "created_at">;
export type ContractInsert = Omit<Contract, "id" | "created_at" | "updated_at">;
export type ProjectInsert = Omit<Project, "id" | "created_at" | "updated_at">;
export type ProjectCostInsert = Omit<ProjectCost, "id" | "created_at">;
export type ContractCostInsert = Omit<ContractCost, "id" | "created_at">;
export type DebtInsert = Omit<Debt, "id" | "created_at" | "updated_at">;
export type TransactionInsert = Omit<Transaction, "id" | "created_at">;

// ---- Update types ----

export type ProfileUpdate = Partial<ProfileInsert>;
export type PartnerUpdate = Partial<PartnerInsert>;
export type ServiceUpdate = Partial<ServiceInsert>;
export type QuoteUpdate = Partial<QuoteInsert>;
export type QuoteItemUpdate = Partial<QuoteItemInsert>;
export type ContractUpdate = Partial<ContractInsert>;
export type ProjectUpdate = Partial<ProjectInsert>;
export type ProjectCostUpdate = Partial<ProjectCostInsert>;
export type ContractCostUpdate = Partial<ContractCostInsert>;
export type DebtUpdate = Partial<DebtInsert>;
export type TransactionUpdate = Partial<TransactionInsert>;

// ---- Database type cho Supabase client ----

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: ProfileInsert;
                Update: ProfileUpdate;
                Relationships: [];
            };
            partners: {
                Row: Partner;
                Insert: PartnerInsert;
                Update: PartnerUpdate;
                Relationships: [];
            };
            services: {
                Row: Service;
                Insert: ServiceInsert;
                Update: ServiceUpdate;
                Relationships: [];
            };
            quotes: {
                Row: Quote;
                Insert: QuoteInsert;
                Update: QuoteUpdate;
                Relationships: [];
            };
            quote_items: {
                Row: QuoteItem;
                Insert: QuoteItemInsert;
                Update: QuoteItemUpdate;
                Relationships: [];
            };
            contracts: {
                Row: Contract;
                Insert: ContractInsert;
                Update: ContractUpdate;
                Relationships: [];
            };
            projects: {
                Row: Project;
                Insert: ProjectInsert;
                Update: ProjectUpdate;
                Relationships: [];
            };
            project_costs: {
                Row: ProjectCost;
                Insert: ProjectCostInsert;
                Update: ProjectCostUpdate;
                Relationships: [];
            };
            contract_costs: {
                Row: ContractCost;
                Insert: ContractCostInsert;
                Update: ContractCostUpdate;
                Relationships: [];
            };
            debts: {
                Row: Debt;
                Insert: DebtInsert;
                Update: DebtUpdate;
                Relationships: [];
            };
            transactions: {
                Row: Transaction;
                Insert: TransactionInsert;
                Update: TransactionUpdate;
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: {
            user_role: UserRole;
            partner_type: PartnerType;
            service_type: ServiceType;
            quote_status: QuoteStatus;
            project_type: ProjectType;
            project_status: ProjectStatus;
            debt_type: DebtType;
            transaction_type: TransactionType;
        };
        CompositeTypes: Record<string, never>;
    };
}
