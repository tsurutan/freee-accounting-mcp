/**
 * バリデーションユーティリティ
 */

import { injectable } from 'inversify';
import { Result, ok, err } from 'neverthrow';
import { validate, IsDateString, IsEnum, IsNumber, IsString, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AppError } from './error-handler.js';

/**
 * 取引明細のDTO
 */
export class DealDetailDto {
  @IsNumber()
  account_item_id!: number;

  @IsNumber()
  tax_code!: number;

  @IsNumber()
  amount!: number;

  @IsEnum(['credit', 'debit'])
  entry_side!: 'credit' | 'debit';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  id?: number;
}

/**
 * 取引作成のDTO
 */
export class CreateDealDto {
  @IsDateString()
  issue_date!: string;

  @IsEnum(['income', 'expense'])
  type!: 'income' | 'expense';

  @IsOptional()
  @IsNumber()
  partner_id?: number;

  @IsOptional()
  @IsString()
  ref_number?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DealDetailDto)
  details!: DealDetailDto[];
}

/**
 * 取引更新のDTO
 */
export class UpdateDealDto {
  @IsNumber()
  deal_id!: number;

  @IsOptional()
  @IsDateString()
  issue_date?: string;

  @IsOptional()
  @IsNumber()
  partner_id?: number;

  @IsOptional()
  @IsString()
  ref_number?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DealDetailDto)
  details?: DealDetailDto[];
}

/**
 * 取引先作成のDTO
 */
export class CreatePartnerDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  shortcut1?: string;

  @IsOptional()
  @IsString()
  shortcut2?: string;

  @IsOptional()
  @IsString()
  long_name?: string;

  @IsOptional()
  @IsString()
  name_kana?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

/**
 * 勘定科目作成のDTO
 */
export class CreateAccountItemDto {
  @IsString()
  name!: string;

  @IsNumber()
  tax_code!: number;

  @IsNumber()
  account_category_id!: number;

  @IsOptional()
  @IsString()
  shortcut?: string;
}

/**
 * 取引一覧取得のDTO
 */
export class GetDealsDto {
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  year?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  month?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  offset?: number;
}

/**
 * 請求書内容のDTO
 */
export class InvoiceContentDto {
  @IsNumber()
  order!: number;

  @IsEnum(['normal', 'discount', 'text'])
  type!: 'normal' | 'discount' | 'text';

  @IsOptional()
  @IsNumber()
  qty?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  unit_price?: number;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  vat?: number;

  @IsOptional()
  reduced_vat?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  account_item_id?: number;

  @IsOptional()
  @IsNumber()
  tax_code?: number;

  @IsOptional()
  @IsNumber()
  item_id?: number;

  @IsOptional()
  @IsNumber()
  section_id?: number;

  @IsOptional()
  @IsArray()
  tag_ids?: number[];

  @IsOptional()
  @IsNumber()
  segment_1_tag_id?: number;

  @IsOptional()
  @IsNumber()
  segment_2_tag_id?: number;

  @IsOptional()
  @IsNumber()
  segment_3_tag_id?: number;

  @IsOptional()
  @IsNumber()
  id?: number;
}

/**
 * 請求書作成のDTO
 */
export class CreateInvoiceDto {
  @IsOptional()
  @IsNumber()
  partner_id?: number;

  @IsOptional()
  @IsString()
  partner_code?: string;

  @IsOptional()
  @IsString()
  invoice_number?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsDateString()
  due_date!: string;

  @IsOptional()
  @IsDateString()
  issue_date?: string;

  @IsOptional()
  @IsEnum(['transfer', 'direct_debit'])
  payment_type?: 'transfer' | 'direct_debit';

  @IsOptional()
  @IsEnum(['not_use', 'use'])
  use_virtual_transfer_account?: 'not_use' | 'use';

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['default_classic', 'standard_classic', 'envelope_classic', 'carried_forward_classic', 'default_modern', 'standard_modern', 'envelope_modern'])
  invoice_layout?: 'default_classic' | 'standard_classic' | 'envelope_classic' | 'carried_forward_classic' | 'default_modern' | 'standard_modern' | 'envelope_modern';

  @IsOptional()
  @IsEnum(['inclusive', 'exclusive'])
  tax_entry_method?: 'inclusive' | 'exclusive';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceContentDto)
  invoice_contents!: InvoiceContentDto[];
}

/**
 * 請求書更新のDTO
 */
export class UpdateInvoiceDto {
  @IsNumber()
  invoice_id!: number;

  @IsOptional()
  @IsNumber()
  partner_id?: number;

  @IsOptional()
  @IsString()
  partner_code?: string;

  @IsOptional()
  @IsString()
  invoice_number?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsDateString()
  issue_date?: string;

  @IsOptional()
  @IsEnum(['transfer', 'direct_debit'])
  payment_type?: 'transfer' | 'direct_debit';

  @IsOptional()
  @IsEnum(['not_use', 'use'])
  use_virtual_transfer_account?: 'not_use' | 'use';

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['default_classic', 'standard_classic', 'envelope_classic', 'carried_forward_classic', 'default_modern', 'standard_modern', 'envelope_modern'])
  invoice_layout?: 'default_classic' | 'standard_classic' | 'envelope_classic' | 'carried_forward_classic' | 'default_modern' | 'standard_modern' | 'envelope_modern';

  @IsOptional()
  @IsEnum(['inclusive', 'exclusive'])
  tax_entry_method?: 'inclusive' | 'exclusive';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceContentDto)
  invoice_contents?: InvoiceContentDto[];
}

/**
 * 請求書一覧取得のDTO
 */
export class GetInvoicesDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  partner_id?: number;

  @IsOptional()
  @IsString()
  partner_code?: string;

  @IsOptional()
  @IsDateString()
  start_issue_date?: string;

  @IsOptional()
  @IsDateString()
  end_issue_date?: string;

  @IsOptional()
  @IsDateString()
  start_due_date?: string;

  @IsOptional()
  @IsDateString()
  end_due_date?: string;

  @IsOptional()
  @IsString()
  invoice_number?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['draft', 'applying', 'remanded', 'rejected', 'approved', 'issued', 'sending', 'sent', 'delivered', 'paid'])
  invoice_status?: 'draft' | 'applying' | 'remanded' | 'rejected' | 'approved' | 'issued' | 'sending' | 'sent' | 'delivered' | 'paid';

  @IsOptional()
  @IsEnum(['unsettled', 'settled'])
  payment_status?: 'unsettled' | 'settled';

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  offset?: number;
}

/**
 * 見積書内容のDTO
 */
export class QuotationContentDto {
  @IsNumber()
  order!: number;

  @IsEnum(['normal', 'discount', 'text'])
  type!: 'normal' | 'discount' | 'text';

  @IsOptional()
  @IsNumber()
  qty?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  unit_price?: number;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  vat?: number;

  @IsOptional()
  reduced_vat?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  account_item_id?: number;

  @IsOptional()
  @IsNumber()
  tax_code?: number;

  @IsOptional()
  @IsNumber()
  item_id?: number;

  @IsOptional()
  @IsNumber()
  section_id?: number;

  @IsOptional()
  @IsArray()
  tag_ids?: number[];

  @IsOptional()
  @IsNumber()
  segment_1_tag_id?: number;

  @IsOptional()
  @IsNumber()
  segment_2_tag_id?: number;

  @IsOptional()
  @IsNumber()
  segment_3_tag_id?: number;

  @IsOptional()
  @IsNumber()
  id?: number;
}

/**
 * 見積書作成のDTO
 */
export class CreateQuotationDto {
  @IsOptional()
  @IsNumber()
  partner_id?: number;

  @IsOptional()
  @IsString()
  partner_code?: string;

  @IsOptional()
  @IsString()
  quotation_number?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDateString()
  quotation_date?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['default_classic', 'standard_classic', 'envelope_classic', 'default_modern', 'standard_modern', 'envelope_modern'])
  quotation_layout?: 'default_classic' | 'standard_classic' | 'envelope_classic' | 'default_modern' | 'standard_modern' | 'envelope_modern';

  @IsOptional()
  @IsEnum(['inclusive', 'exclusive'])
  tax_entry_method?: 'inclusive' | 'exclusive';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationContentDto)
  quotation_contents!: QuotationContentDto[];
}

/**
 * 見積書更新のDTO
 */
export class UpdateQuotationDto {
  @IsNumber()
  quotation_id!: number;

  @IsOptional()
  @IsNumber()
  partner_id?: number;

  @IsOptional()
  @IsString()
  partner_code?: string;

  @IsOptional()
  @IsString()
  quotation_number?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDateString()
  quotation_date?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['default_classic', 'standard_classic', 'envelope_classic', 'default_modern', 'standard_modern', 'envelope_modern'])
  quotation_layout?: 'default_classic' | 'standard_classic' | 'envelope_classic' | 'default_modern' | 'standard_modern' | 'envelope_modern';

  @IsOptional()
  @IsEnum(['inclusive', 'exclusive'])
  tax_entry_method?: 'inclusive' | 'exclusive';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationContentDto)
  quotation_contents?: QuotationContentDto[];
}

/**
 * 見積書一覧取得のDTO
 */
export class GetQuotationsDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  partner_id?: number;

  @IsOptional()
  @IsString()
  partner_code?: string;

  @IsOptional()
  @IsDateString()
  start_issue_date?: string;

  @IsOptional()
  @IsDateString()
  end_issue_date?: string;

  @IsOptional()
  @IsString()
  quotation_number?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['draft', 'applying', 'remanded', 'rejected', 'approved', 'issued'])
  quotation_status?: 'draft' | 'applying' | 'remanded' | 'rejected' | 'approved' | 'issued';

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  offset?: number;
}

/**
 * 納品書内容のDTO
 */
export class DeliverySlipContentDto {
  @IsNumber()
  order!: number;

  @IsEnum(['normal', 'discount', 'text'])
  type!: 'normal' | 'discount' | 'text';

  @IsOptional()
  @IsNumber()
  qty?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  unit_price?: number;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  vat?: number;

  @IsOptional()
  reduced_vat?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  account_item_id?: number;

  @IsOptional()
  @IsNumber()
  tax_code?: number;

  @IsOptional()
  @IsNumber()
  item_id?: number;

  @IsOptional()
  @IsNumber()
  section_id?: number;

  @IsOptional()
  @IsArray()
  tag_ids?: number[];

  @IsOptional()
  @IsNumber()
  segment_1_tag_id?: number;

  @IsOptional()
  @IsNumber()
  segment_2_tag_id?: number;

  @IsOptional()
  @IsNumber()
  segment_3_tag_id?: number;

  @IsOptional()
  @IsNumber()
  id?: number;
}

/**
 * 納品書作成のDTO
 */
export class CreateDeliverySlipDto {
  @IsOptional()
  @IsNumber()
  partner_id?: number;

  @IsOptional()
  @IsString()
  partner_code?: string;

  @IsOptional()
  @IsString()
  delivery_slip_number?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDateString()
  delivery_date?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['default_classic', 'standard_classic', 'envelope_classic', 'default_modern', 'standard_modern', 'envelope_modern'])
  delivery_slip_layout?: 'default_classic' | 'standard_classic' | 'envelope_classic' | 'default_modern' | 'standard_modern' | 'envelope_modern';

  @IsOptional()
  @IsEnum(['inclusive', 'exclusive'])
  tax_entry_method?: 'inclusive' | 'exclusive';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliverySlipContentDto)
  delivery_slip_contents!: DeliverySlipContentDto[];
}

/**
 * 納品書更新のDTO
 */
export class UpdateDeliverySlipDto {
  @IsNumber()
  delivery_slip_id!: number;

  @IsOptional()
  @IsNumber()
  partner_id?: number;

  @IsOptional()
  @IsString()
  partner_code?: string;

  @IsOptional()
  @IsString()
  delivery_slip_number?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDateString()
  delivery_date?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['default_classic', 'standard_classic', 'envelope_classic', 'default_modern', 'standard_modern', 'envelope_modern'])
  delivery_slip_layout?: 'default_classic' | 'standard_classic' | 'envelope_classic' | 'default_modern' | 'standard_modern' | 'envelope_modern';

  @IsOptional()
  @IsEnum(['inclusive', 'exclusive'])
  tax_entry_method?: 'inclusive' | 'exclusive';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliverySlipContentDto)
  delivery_slip_contents?: DeliverySlipContentDto[];
}

/**
 * 納品書一覧取得のDTO
 */
export class GetDeliverySlipsDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  partner_id?: number;

  @IsOptional()
  @IsString()
  partner_code?: string;

  @IsOptional()
  @IsDateString()
  start_issue_date?: string;

  @IsOptional()
  @IsDateString()
  end_issue_date?: string;

  @IsOptional()
  @IsString()
  delivery_slip_number?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['draft', 'applying', 'remanded', 'rejected', 'approved', 'issued'])
  delivery_slip_status?: 'draft' | 'applying' | 'remanded' | 'rejected' | 'approved' | 'issued';

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  offset?: number;
}

/**
 * バリデーションクラス
 */
@injectable()
export class Validator {
  /**
   * DTOオブジェクトをバリデーション
   */
  async validateDto<T extends object>(dto: T): Promise<Result<T, AppError>> {
    const errors = await validate(dto);
    
    if (errors.length > 0) {
      const errorMessages = errors.map(error => {
        const constraints = error.constraints;
        if (constraints) {
          return `${error.property}: ${Object.values(constraints).join(', ')}`;
        }
        return `${error.property}: バリデーションエラー`;
      });

      return err({
        type: 'VALIDATION_ERROR',
        message: `バリデーションエラー: ${errorMessages.join('; ')}`,
        retryable: false,
      });
    }

    return ok(dto);
  }

  /**
   * 日付文字列の検証
   */
  validateDateString(dateString: string): Result<string, AppError> {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return err({
        type: 'VALIDATION_ERROR',
        message: '日付はYYYY-MM-DD形式で入力してください',
        field: 'date',
        retryable: false,
      });
    }

    // Split the date string to validate components
    const parts = dateString.split('-').map(Number);
    if (parts.length !== 3) {
      return err({
        type: 'VALIDATION_ERROR',
        message: '日付は YYYY-MM-DD 形式で入力してください',
        field: 'date',
        retryable: false,
      });
    }
    
    const year = parts[0]!;
    const month = parts[1]!;
    const day = parts[2]!;
    
    // Check if all parts are valid numbers
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return err({
        type: 'VALIDATION_ERROR',
        message: '有効な数値で日付を入力してください',
        field: 'date',
        retryable: false,
      });
    }
    
    // Check if the date components are valid
    if (month < 1 || month > 12) {
      return err({
        type: 'VALIDATION_ERROR',
        message: '有効な月を入力してください（1-12）',
        field: 'date',
        retryable: false,
      });
    }
    
    // Create date object to check if the day is valid for the given month/year
    const date = new Date(year, month - 1, day);
    
    // Check if the date object represents the same date we input
    // This catches invalid dates like February 30th
    if (date.getFullYear() !== year || 
        date.getMonth() !== month - 1 || 
        date.getDate() !== day) {
      return err({
        type: 'VALIDATION_ERROR',
        message: '存在しない日付です',
        field: 'date',
        retryable: false,
      });
    }

    return ok(dateString);
  }

  /**
   * 年月の検証
   */
  validateYearMonth(year: number, month: number): Result<{ year: number; month: number }, AppError> {
    if (year < 2000 || year > 2100) {
      return err({
        type: 'VALIDATION_ERROR',
        message: '年は2000-2100の範囲で入力してください',
        field: 'year',
        retryable: false,
      });
    }

    if (month < 1 || month > 12) {
      return err({
        type: 'VALIDATION_ERROR',
        message: '月は1-12の範囲で入力してください',
        field: 'month',
        retryable: false,
      });
    }

    return ok({ year, month });
  }

  /**
   * 取引明細の貸借バランス検証
   */
  validateDealBalance(details: DealDetailDto[]): Result<DealDetailDto[], AppError> {
    if (details.length === 0) {
      return err({
        type: 'VALIDATION_ERROR',
        message: '取引明細が必要です',
        field: 'details',
        retryable: false,
      });
    }

    let debitTotal = 0;
    let creditTotal = 0;

    for (const detail of details) {
      if (detail.entry_side === 'debit') {
        debitTotal += detail.amount;
      } else {
        creditTotal += detail.amount;
      }
    }

    if (debitTotal !== creditTotal) {
      return err({
        type: 'VALIDATION_ERROR',
        message: `借方と貸方の金額が一致しません（借方: ${debitTotal}, 貸方: ${creditTotal}）`,
        field: 'details',
        retryable: false,
      });
    }

    return ok(details);
  }

  /**
   * 必須フィールドの検証
   */
  validateRequired<T>(value: T | undefined | null, fieldName: string): Result<T, AppError> {
    if (value === undefined || value === null || value === '') {
      return err({
        type: 'VALIDATION_ERROR',
        message: `${fieldName} は必須です`,
        field: fieldName,
        retryable: false,
      });
    }

    return ok(value);
  }

  /**
   * 数値の範囲検証
   */
  validateNumberRange(
    value: number, 
    min: number, 
    max: number, 
    fieldName: string
  ): Result<number, AppError> {
    if (value < min || value > max) {
      return err({
        type: 'VALIDATION_ERROR',
        message: `${fieldName} は${min}-${max}の範囲で入力してください`,
        field: fieldName,
        retryable: false,
      });
    }

    return ok(value);
  }

  /**
   * 文字列の長さ検証
   */
  validateStringLength(
    value: string, 
    minLength: number, 
    maxLength: number, 
    fieldName: string
  ): Result<string, AppError> {
    if (value.length < minLength || value.length > maxLength) {
      return err({
        type: 'VALIDATION_ERROR',
        message: `${fieldName} は${minLength}-${maxLength}文字で入力してください`,
        field: fieldName,
        retryable: false,
      });
    }

    return ok(value);
  }
}
