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

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return err({
        type: 'VALIDATION_ERROR',
        message: '有効な日付を入力してください',
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
