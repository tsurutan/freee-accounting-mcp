/**
 * freee会計 MCP Server 型定義
 */
export interface FreeeApiResponse<T> {
    data: T;
    meta?: {
        total_count?: number;
        limit?: number;
        offset?: number;
    };
}
export interface FreeeCompaniesResponse {
    companies: Company[];
}
export interface FreeeDealsResponse {
    deals: Deal[];
    meta: {
        total_count: number;
    };
}
export interface FreeeAccountItemsResponse {
    account_items: AccountItem[];
}
export interface FreeePartnersResponse {
    partners: Partner[];
}
export interface FreeeSectionsResponse {
    sections: Section[];
}
export interface FreeeItemsResponse {
    items: Item[];
}
export interface FreeeTagsResponse {
    tags: Tag[];
}
export interface FreeeTrialBalanceResponse {
    trial_bs: TrialBalance;
    trial_pl: TrialBalance;
}
export interface Company {
    id: number;
    name: string;
    name_kana?: string;
    display_name?: string;
    tax_at_source_calc_type?: number;
    contact_name?: string;
    head_count?: number;
    corporate_number?: string;
    txn_number_format?: string;
    default_wallet_account_id?: number;
    private_settlement?: boolean;
    minus_format?: number;
    role?: string;
}
export interface AccountItem {
    id: number;
    name: string;
    shortcut?: string;
    shortcut_num?: string;
    tax_code?: number;
    default_tax_id?: number;
    default_tax_code?: number;
    account_category?: string;
    account_category_id?: number;
    categories?: string[];
    available?: boolean;
    walletable_id?: number;
    group_name?: string;
    corresponding_income_id?: number;
    corresponding_expense_id?: number;
}
export interface Partner {
    id: number;
    name: string;
    shortcut1?: string;
    shortcut2?: string;
    long_name?: string;
    name_kana?: string;
    default_title?: string;
    phone?: string;
    contact_name?: string;
    email?: string;
    payer_walletable_id?: number;
    transfer_fee_handling_side?: string;
    address_attributes?: {
        zipcode?: string;
        prefecture_code?: number;
        street_name1?: string;
        street_name2?: string;
    };
    partner_doc_setting_attributes?: {
        sending_method?: string;
    };
    partner_bank_account_attributes?: {
        bank_name?: string;
        bank_name_kana?: string;
        bank_code?: string;
        branch_name?: string;
        branch_kana?: string;
        branch_code?: string;
        account_type?: string;
        account_number?: string;
        account_name?: string;
        long_account_name?: string;
    };
}
export interface Section {
    id: number;
    name: string;
    long_name?: string;
    shortcut1?: string;
    shortcut2?: string;
    indent_count?: number;
    parent_id?: number;
}
export interface Item {
    id: number;
    name: string;
    shortcut1?: string;
    shortcut2?: string;
}
export interface Tag {
    id: number;
    name: string;
    color?: string;
    shortcut1?: string;
    shortcut2?: string;
}
export interface TrialBalance {
    company_id: number;
    fiscal_year: number;
    start_month: number;
    end_month: number;
    account_item_display_type: string;
    breakdown_display_type: string;
    partner_display_type: string;
    partner_code?: string;
    item_display_type: string;
    item_id?: number;
    section_display_type: string;
    section_id?: number;
    adjustment: string;
    cost_allocation: string;
    balances: TrialBalanceItem[];
}
export interface TrialBalanceItem {
    account_item_id: number;
    account_item_name: string;
    account_category_name: string;
    total_line: boolean;
    hierarchy_level: number;
    parent_account_category_name?: string;
    opening_balance: number;
    debit_amount: number;
    credit_amount: number;
    closing_balance: number;
    composition_ratio?: number;
    partners?: TrialBalancePartner[];
    items?: TrialBalanceItemDetail[];
    sections?: TrialBalanceSection[];
}
export interface TrialBalancePartner {
    id: number;
    name: string;
    long_name?: string;
    code?: string;
    opening_balance: number;
    debit_amount: number;
    credit_amount: number;
    closing_balance: number;
    composition_ratio?: number;
}
export interface TrialBalanceItemDetail {
    id: number;
    name: string;
    opening_balance: number;
    debit_amount: number;
    credit_amount: number;
    closing_balance: number;
    composition_ratio?: number;
}
export interface TrialBalanceSection {
    id: number;
    name: string;
    opening_balance: number;
    debit_amount: number;
    credit_amount: number;
    closing_balance: number;
    composition_ratio?: number;
}
export interface Invoice {
    id: number;
    company_id: number;
    issue_date: string;
    partner_id?: number;
    partner_name?: string;
    partner_code?: string;
    invoice_number: string;
    title?: string;
    total_amount: number;
    total_vat: number;
    sub_total: number;
    booking_date?: string;
    description?: string;
    invoice_status: 'draft' | 'applying' | 'remanded' | 'rejected' | 'approved' | 'issued';
    payment_status: 'unsettled' | 'settled';
    payment_date?: string;
    web_published_at?: string;
    web_downloaded_at?: string;
    web_confirmed_at?: string;
    mail_sent_at?: string;
    posting_status: 'unrequested' | 'preview_registered' | 'preview_failed' | 'ordered' | 'order_failed' | 'printing' | 'canceled' | 'posted';
    partner_contact_info?: string;
    invoice_layout: 'default_classic' | 'standard_classic' | 'envelope_classic' | 'carried_forward_standard_classic' | 'carried_forward_envelope_classic' | 'default_modern' | 'standard_modern' | 'envelope_modern';
    tax_entry_method: 'inclusive' | 'exclusive';
    deal_id?: number;
    invoice_contents: InvoiceContent[];
}
export interface InvoiceContent {
    id: number;
    order: number;
    type: 'normal' | 'discount' | 'text';
    qty?: number;
    unit?: string;
    unit_price?: number;
    amount?: number;
    vat?: number;
    reduced_vat?: boolean;
    description?: string;
    account_item_id?: number;
    account_item_name?: string;
    tax_code?: number;
    item_id?: number;
    item_name?: string;
    section_id?: number;
    section_name?: string;
    tag_ids?: number[];
    tag_names?: string[];
    segment_1_tag_id?: number;
    segment_1_tag_name?: string;
    segment_2_tag_id?: number;
    segment_2_tag_name?: string;
    segment_3_tag_id?: number;
    segment_3_tag_name?: string;
}
export interface Quotation {
    id: number;
    company_id: number;
    issue_date: string;
    partner_id?: number;
    partner_name?: string;
    partner_code?: string;
    quotation_number: string;
    title?: string;
    total_amount: number;
    total_vat: number;
    sub_total: number;
    description?: string;
    quotation_status: 'unsubmitted' | 'submitted' | 'acknowledged';
    web_published_at?: string;
    web_downloaded_at?: string;
    web_confirmed_at?: string;
    mail_sent_at?: string;
    partner_contact_info?: string;
    quotation_layout: 'default_classic' | 'standard_classic' | 'envelope_classic' | 'default_modern' | 'standard_modern' | 'envelope_modern';
    tax_entry_method: 'inclusive' | 'exclusive';
    quotation_contents: QuotationContent[];
}
export interface QuotationContent {
    id: number;
    order: number;
    type: 'normal' | 'discount' | 'text';
    qty?: number;
    unit?: string;
    unit_price?: number;
    amount?: number;
    vat?: number;
    reduced_vat?: boolean;
    description?: string;
    account_item_id?: number;
    account_item_name?: string;
    tax_code?: number;
    item_id?: number;
    item_name?: string;
    section_id?: number;
    section_name?: string;
    tag_ids?: number[];
    tag_names?: string[];
}
export interface Deal {
    id: number;
    company_id: number;
    issue_date: string;
    due_date?: string;
    amount: number;
    due_amount?: number;
    type: 'income' | 'expense';
    partner_id?: number;
    partner_code?: string;
    ref_number?: string;
    details: DealDetail[];
}
export interface DealDetail {
    id: number;
    account_item_id: number;
    tax_code: number;
    item_id?: number;
    section_id?: number;
    tag_ids?: number[];
    amount: number;
    vat?: number;
    description?: string;
    entry_side: 'credit' | 'debit';
}
export interface MCPResource {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
}
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: object;
}
export interface MCPPrompt {
    name: string;
    description: string;
    arguments?: Array<{
        name: string;
        description: string;
        required?: boolean;
    }>;
}
export interface FreeeApiError {
    status_code: number;
    errors: Array<{
        type: string;
        resource_name: string;
        field: string;
        code: string;
        message: string;
    }>;
}
export declare class FreeeError extends Error {
    statusCode: number;
    errors?: {
        type: string;
        resource_name: string;
        field: string;
        code: string;
        message: string;
    }[] | undefined;
    originalError?: Error | undefined;
    readonly timestamp: string;
    readonly requestId?: string;
    readonly retryable: boolean;
    constructor(message: string, statusCode: number, errors?: {
        type: string;
        resource_name: string;
        field: string;
        code: string;
        message: string;
    }[] | undefined, originalError?: Error | undefined, requestId?: string);
    private isRetryable;
    toJSON(): object;
    static isFreeeError(error: any): error is FreeeError;
    static fromAxiosError(error: any, requestId?: string): FreeeError;
}
export interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    baseUrl?: string;
}
export interface OAuthTokens {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    created_at: number;
    company_id?: string;
    external_cid?: string;
}
export interface OAuthTokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    company_id?: string;
    external_cid?: string;
}
export interface AuthState {
    isAuthenticated: boolean;
    tokens?: OAuthTokens;
    expiresAt?: number;
}
export interface CreateDealRequest {
    company_id: number;
    issue_date: string;
    type: 'income' | 'expense';
    partner_id?: number;
    partner_code?: string;
    ref_number?: string;
    details: CreateDealDetailRequest[];
}
export interface UpdateDealRequest {
    issue_date?: string;
    due_date?: string;
    partner_id?: number;
    partner_code?: string;
    ref_number?: string;
    details?: UpdateDealDetailRequest[];
}
export interface UpdateDealDetailRequest {
    id?: number;
    account_item_id?: number;
    tax_code?: number;
    item_id?: number;
    section_id?: number;
    tag_ids?: number[];
    amount?: number;
    vat?: number;
    description?: string;
    entry_side?: 'credit' | 'debit';
}
export interface CreatePartnerRequest {
    company_id: number;
    name: string;
    shortcut1?: string;
    shortcut2?: string;
    long_name?: string;
    name_kana?: string;
    default_title?: string;
    phone?: string;
    contact_name?: string;
    email?: string;
    payer_wallets?: Array<{
        walletable_type: string;
        walletable_id: number;
    }>;
    transfer_fee_handling_side?: 'payer' | 'payee';
    address_attributes?: {
        zipcode?: string;
        prefecture_code?: number;
        street_name1?: string;
        street_name2?: string;
    };
    partner_doc_setting_attributes?: {
        sending_method: 'posting' | 'email';
    };
    partner_bank_account_attributes?: {
        bank_name?: string;
        bank_name_kana?: string;
        bank_code?: string;
        branch_name?: string;
        branch_kana?: string;
        branch_code?: string;
        account_type?: 'ordinary' | 'checking' | 'savings';
        account_number?: string;
        account_name?: string;
        long_account_name?: string;
    };
}
export interface CreateAccountItemRequest {
    company_id: number;
    name: string;
    tax_code: number;
    account_category_id: number;
    shortcut?: string;
    shortcut_num?: string;
    searchable?: number;
    accumulated_dep_account_item_id?: number;
    items?: Array<{
        name: string;
        shortcut1?: string;
        shortcut2?: string;
    }>;
}
export interface CreateInvoiceRequest {
    company_id: number;
    issue_date: string;
    partner_id?: number;
    partner_code?: string;
    invoice_number?: string;
    title?: string;
    due_date?: string;
    booking_date?: string;
    description?: string;
    invoice_status?: 'draft' | 'applying' | 'approved' | 'issued';
    partner_contact_info?: string;
    invoice_layout?: 'default_classic' | 'standard_classic' | 'envelope_classic' | 'carried_forward_standard_classic' | 'carried_forward_envelope_classic' | 'default_modern' | 'standard_modern' | 'envelope_modern';
    tax_entry_method?: 'inclusive' | 'exclusive';
    invoice_contents?: Array<{
        order: number;
        type: 'normal' | 'discount' | 'text';
        qty?: number;
        unit?: string;
        unit_price?: number;
        amount?: number;
        vat?: number;
        reduced_vat?: boolean;
        description?: string;
        account_item_id?: number;
        tax_code?: number;
        item_id?: number;
        section_id?: number;
        tag_ids?: number[];
    }>;
}
export interface CreateQuotationRequest {
    company_id: number;
    issue_date: string;
    partner_id?: number;
    partner_code?: string;
    quotation_number?: string;
    title?: string;
    description?: string;
    quotation_status?: 'unsubmitted' | 'submitted';
    partner_contact_info?: string;
    quotation_layout?: 'default_classic' | 'standard_classic' | 'envelope_classic' | 'default_modern' | 'standard_modern' | 'envelope_modern';
    tax_entry_method?: 'inclusive' | 'exclusive';
    quotation_contents?: Array<{
        order: number;
        type: 'normal' | 'discount' | 'text';
        qty?: number;
        unit?: string;
        unit_price?: number;
        amount?: number;
        vat?: number;
        reduced_vat?: boolean;
        description?: string;
        account_item_id?: number;
        tax_code?: number;
        item_id?: number;
        section_id?: number;
        tag_ids?: number[];
    }>;
}
export interface CreateDealDetailRequest {
    account_item_id: number;
    tax_code: number;
    item_id?: number;
    section_id?: number;
    tag_ids?: number[];
    amount: number;
    description?: string;
    entry_side: 'credit' | 'debit';
}
export interface CreateDealResponse {
    deal: Deal;
}
//# sourceMappingURL=index.d.ts.map