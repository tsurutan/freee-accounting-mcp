/**
 * freee会計 MCP Server 型定義
 */

// freee API 基本型
export interface FreeeApiResponse<T> {
  data: T;
  meta?: {
    total_count?: number;
    limit?: number;
    offset?: number;
  };
}

// 事業所型
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

// 勘定科目型
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

// 取引先型
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

// 部門型
export interface Section {
  id: number;
  name: string;
  long_name?: string;
  shortcut1?: string;
  shortcut2?: string;
  indent_count?: number;
  parent_id?: number;
}

// 品目型
export interface Item {
  id: number;
  name: string;
  shortcut1?: string;
  shortcut2?: string;
}

// 取引型
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

// 取引明細型
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

// MCP固有型
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

// エラー型
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

export class FreeeError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errors?: FreeeApiError['errors']
  ) {
    super(message);
    this.name = 'FreeeError';
  }
}
