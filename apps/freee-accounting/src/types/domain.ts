/**
 * ドメイン固有の型定義
 * 
 * freee会計のビジネスドメインに関連する型定義を集約
 */

// 型レジストリ（実行時にアクセス可能）
export const DOMAIN_TYPES = {
  Company: 'Company',
  AccountItem: 'AccountItem',
  Partner: 'Partner',
  Section: 'Section', 
  Item: 'Item',
  Tag: 'Tag',
  Deal: 'Deal',
  DealDetail: 'DealDetail',
  TrialBalance: 'TrialBalance',
  TrialBalancePartner: 'TrialBalancePartner',
  TrialBalanceBreakdown: 'TrialBalanceBreakdown',
} as const;

// 基本的なドメインエンティティ
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

export interface TrialBalance {
  id: number;
  company_id: number;
  fiscal_year?: number;
  created_at?: string;
  account_item_id?: number;
  account_item_name?: string;
  hierarchy_level?: number;
  parent_account_category_id?: number;
  parent_account_category_name?: string;
  account_category_id?: number;
  account_category_name?: string;
  total_line?: boolean;
  closing_balance?: number;
  debit_amount?: number;
  credit_amount?: number;
  account_group_name?: string;
  partners?: TrialBalancePartner[];
  breakdown?: TrialBalanceBreakdown[];
}

export interface TrialBalancePartner {
  id: number;
  name: string;
  long_name?: string;
  closing_balance?: number;
  debit_amount?: number;
  credit_amount?: number;
}

export interface TrialBalanceBreakdown {
  account_item_id: number;
  account_item_name: string;
  closing_balance?: number;
  debit_amount?: number;
  credit_amount?: number;
}

// ドメインサービス関連の型
export interface CompanyContext {
  companyId: number;
  fiscalYear?: number;
  period?: {
    start: string;
    end: string;
  };
}

export interface DealFilter {
  companyId: number;
  type?: 'income' | 'expense';
  partnerId?: number;
  accountItemId?: number;
  sectionId?: number;
  startIssueDate?: string;
  endIssueDate?: string;
  startDueDate?: string;
  endDueDate?: string;
  startAmount?: number;
  endAmount?: number;
  offset?: number;
  limit?: number;
}

export interface DealCreateRequest {
  companyId: number;
  issue_date: string;
  type: 'income' | 'expense';
  due_date?: string;
  partner_id?: number;
  partner_code?: string;
  ref_number?: string;
  details: DealDetailCreateRequest[];
  payments?: PaymentCreateRequest[];
  receipt_ids?: number[];
}

export interface DealDetailCreateRequest {
  tax_code: number;
  account_item_id?: number;
  account_item_code?: string;
  amount: number;
  item_id?: number;
  item_code?: string;
  section_id?: number;
  section_code?: string;
  tag_ids?: number[];
  segment_1_tag_id?: number;
  segment_1_tag_code?: string;
  segment_2_tag_id?: number;
  segment_2_tag_code?: string;
  segment_3_tag_id?: number;
  segment_3_tag_code?: string;
  description?: string;
  vat?: number;
  // Keep entrySide for backward compatibility with existing logic
  entrySide?: 'credit' | 'debit';
}

export interface PaymentCreateRequest {
  amount: number;
  from_walletable_id: number;
  from_walletable_type: 'bank_account' | 'credit_card' | 'wallet' | 'private_account_item';
  date: string;
}

export interface DealUpdateRequest {
  issueDate?: string;
  type?: 'income' | 'expense';
  partnerId?: number;
  refNumber?: string;
  details?: DealDetailUpdateRequest[];
}

export interface DealDetailUpdateRequest {
  id?: number;
  accountItemId?: number;
  taxCode?: number;
  amount?: number;
  itemId?: number;
  sectionId?: number;
  tagIds?: number[];
  description?: string;
  entrySide?: 'credit' | 'debit';
}

// ビジネスルール関連の型
export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
  params?: any[];
}

export interface BusinessRule {
  name: string;
  description: string;
  validate: (data: any) => ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  value?: any;
}

// ドメインイベント関連の型
export interface DomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

export interface DealCreatedEvent extends DomainEvent {
  type: 'DealCreated';
  aggregateType: 'Deal';
  data: {
    dealId: number;
    companyId: number;
    amount: number;
    type: 'income' | 'expense';
    issueDate: string;
  };
}

export interface DealUpdatedEvent extends DomainEvent {
  type: 'DealUpdated';
  aggregateType: 'Deal';
  data: {
    dealId: number;
    companyId: number;
    changes: Record<string, any>;
  };
}

export interface DealDeletedEvent extends DomainEvent {
  type: 'DealDeleted';
  aggregateType: 'Deal';
  data: {
    dealId: number;
    companyId: number;
  };
}

// 値オブジェクト関連の型
export interface Money {
  amount: number;
  currency: 'JPY';
}

export interface DateRange {
  start: string; // ISO 8601 date string
  end: string;   // ISO 8601 date string
}

export interface FiscalYear {
  year: number;
  startDate: string;
  endDate: string;
}

export interface TaxRate {
  code: number;
  name: string;
  rate: number;
  isReduced: boolean;
}

// 集約ルート関連の型
export interface AggregateRoot {
  id: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  events: DomainEvent[];
}

export interface DealAggregate extends AggregateRoot {
  companyId: number;
  issueDate: string;
  amount: Money;
  type: 'income' | 'expense';
  details: DealDetail[];
  partner?: Partner;
}

// リポジトリ関連の型
export interface Repository<T extends AggregateRoot> {
  findById(id: number): Promise<T | null>;
  save(aggregate: T): Promise<void>;
  delete(id: number): Promise<void>;
}

export interface DealRepository extends Repository<DealAggregate> {
  findByCompanyId(companyId: number, filter?: DealFilter): Promise<DealAggregate[]>;
  findByPartnerId(partnerId: number): Promise<DealAggregate[]>;
  findByDateRange(companyId: number, dateRange: DateRange): Promise<DealAggregate[]>;
}
