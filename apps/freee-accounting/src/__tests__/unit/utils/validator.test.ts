/**
 * Validator ユニットテスト
 */

import 'reflect-metadata';
import { Validator, CreateDealDto, DealDetailDto } from '../../../utils/validator.js';

describe('Validator', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator();
  });

  describe('validateDto', () => {
    describe('DealDetailDto', () => {
      it('有効なDealDetailDtoを正しく検証する', async () => {
        // Arrange
        const dto = new DealDetailDto();
        dto.account_item_id = 123;
        dto.tax_code = 1;
        dto.amount = 1000;
        dto.entry_side = 'debit';
        dto.description = 'Test description';

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(dto);
        }
      });

      it('無効なaccount_item_idを持つDealDetailDtoを正しく検証する', async () => {
        // Arrange
        const dto = new DealDetailDto();
        dto.account_item_id = 'invalid' as any;
        dto.tax_code = 1;
        dto.amount = 1000;
        dto.entry_side = 'debit';

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
          expect(result.error.message).toContain('account_item_id');
        }
      });

      it('無効なentry_sideを持つDealDetailDtoを正しく検証する', async () => {
        // Arrange
        const dto = new DealDetailDto();
        dto.account_item_id = 123;
        dto.tax_code = 1;
        dto.amount = 1000;
        dto.entry_side = 'invalid' as any;

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
          expect(result.error.message).toContain('entry_side');
        }
      });
    });

    describe('CreateDealDto', () => {
      it('有効なCreateDealDtoを正しく検証する', async () => {
        // Arrange
        const detail = new DealDetailDto();
        detail.account_item_id = 123;
        detail.tax_code = 1;
        detail.amount = 1000;
        detail.entry_side = 'debit';

        const dto = new CreateDealDto();
        dto.issue_date = '2024-01-15';
        dto.type = 'income';
        dto.details = [detail];

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(dto);
        }
      });

      it('無効な日付を持つCreateDealDtoを正しく検証する', async () => {
        // Arrange
        const detail = new DealDetailDto();
        detail.account_item_id = 123;
        detail.tax_code = 1;
        detail.amount = 1000;
        detail.entry_side = 'debit';

        const dto = new CreateDealDto();
        dto.issue_date = 'invalid-date';
        dto.type = 'income';
        dto.details = [detail];

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
          expect(result.error.message).toContain('issue_date');
        }
      });

      it('無効なtypeを持つCreateDealDtoを正しく検証する', async () => {
        // Arrange
        const detail = new DealDetailDto();
        detail.account_item_id = 123;
        detail.tax_code = 1;
        detail.amount = 1000;
        detail.entry_side = 'debit';

        const dto = new CreateDealDto();
        dto.issue_date = '2024-01-15';
        dto.type = 'invalid' as any;
        dto.details = [detail];

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
          expect(result.error.message).toContain('type');
        }
      });

      it('空のdetailsを持つCreateDealDtoを正しく検証する', async () => {
        // Arrange
        const dto = new CreateDealDto();
        dto.issue_date = '2024-01-15';
        dto.type = 'income';
        dto.details = [];

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        // class-validatorは空配列を許可するため、このテストは成功する
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('validateRequired', () => {
    it('有効な値を正しく検証する', () => {
      // Act
      const result = validator.validateRequired('test value', 'testField');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('test value');
      }
    });

    it('undefinedを正しく検証する', () => {
      // Act
      const result = validator.validateRequired(undefined, 'testField');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe('testField は必須です');
        expect(result.error.type === 'VALIDATION_ERROR' && result.error.field).toBe('testField');
      }
    });

    it('nullを正しく検証する', () => {
      // Act
      const result = validator.validateRequired(null, 'testField');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe('testField は必須です');
        expect(result.error.type === 'VALIDATION_ERROR' && result.error.field).toBe('testField');
      }
    });

    it('空文字列を正しく検証する', () => {
      // Act
      const result = validator.validateRequired('', 'testField');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe('testField は必須です');
        expect(result.error.type === 'VALIDATION_ERROR' && result.error.field).toBe('testField');
      }
    });
  });

  describe('validateNumberRange', () => {
    it('範囲内の数値を正しく検証する', () => {
      // Act
      const result = validator.validateNumberRange(50, 1, 100, 'testNumber');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(50);
      }
    });

    it('最小値を正しく検証する', () => {
      // Act
      const result = validator.validateNumberRange(1, 1, 100, 'testNumber');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(1);
      }
    });

    it('最大値を正しく検証する', () => {
      // Act
      const result = validator.validateNumberRange(100, 1, 100, 'testNumber');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(100);
      }
    });

    it('範囲外の小さい数値を正しく検証する', () => {
      // Act
      const result = validator.validateNumberRange(0, 1, 100, 'testNumber');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe('testNumber は1-100の範囲で入力してください');
        expect(result.error.type === 'VALIDATION_ERROR' && result.error.field).toBe('testNumber');
      }
    });

    it('範囲外の大きい数値を正しく検証する', () => {
      // Act
      const result = validator.validateNumberRange(101, 1, 100, 'testNumber');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe('testNumber は1-100の範囲で入力してください');
        expect(result.error.type === 'VALIDATION_ERROR' && result.error.field).toBe('testNumber');
      }
    });
  });

  describe('validateDealBalance', () => {
    it('バランスの取れた取引明細を正しく検証する', () => {
      // Arrange
      const details = [
        { account_item_id: 1, tax_code: 1, amount: 1000, entry_side: 'debit' as const },
        { account_item_id: 2, tax_code: 1, amount: 1000, entry_side: 'credit' as const },
      ];

      // Act
      const result = validator.validateDealBalance(details);

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('バランスの取れていない取引明細を正しく検証する', () => {
      // Arrange
      const details = [
        { account_item_id: 1, tax_code: 1, amount: 1000, entry_side: 'debit' as const },
        { account_item_id: 2, tax_code: 1, amount: 500, entry_side: 'credit' as const },
      ];

      // Act
      const result = validator.validateDealBalance(details);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('借方と貸方の金額が一致しません');
      }
    });

    it('空の取引明細を正しく検証する', () => {
      // Act
      const result = validator.validateDealBalance([]);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe('取引明細が必要です');
      }
    });
  });

  describe('validateDateString', () => {
    it('有効な日付文字列を正しく検証する', () => {
      // Act
      const result = validator.validateDateString('2024-01-15');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('2024-01-15');
      }
    });

    it('無効な月を持つ日付を正しく検証する', () => {
      // Act
      const result = validator.validateDateString('2024-13-01');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe('有効な月を入力してください（1-12）');
      }
    });

    it('存在しない日付を正しく検証する', () => {
      // Act
      const result = validator.validateDateString('2024-02-30');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe('存在しない日付です');
      }
    });

    it('平年のうるう日を正しく検証する', () => {
      // Act
      const result = validator.validateDateString('2023-02-29');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe('存在しない日付です');
      }
    });

    it('うるう年の2月29日を正しく検証する', () => {
      // Act
      const result = validator.validateDateString('2024-02-29');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('2024-02-29');
      }
    });

    it('間違った形式の日付を正しく検証する', () => {
      // Act
      const result = validator.validateDateString('invalid-date');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe('日付はYYYY-MM-DD形式で入力してください');
      }
    });
  });
});
