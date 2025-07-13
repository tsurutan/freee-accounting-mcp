/**
 * Validator ユニットテスト
 */

import 'reflect-metadata';
import { 
  Validator, 
  CreateDealDto, 
  DealDetailDto,
  CreateInvoiceDto,
  InvoiceContentDto,
  UpdateInvoiceDto,
  GetInvoicesDto,
  CreateQuotationDto,
  QuotationContentDto,
  UpdateQuotationDto,
  GetQuotationsDto,
  CreateDeliverySlipDto,
  DeliverySlipContentDto,
  UpdateDeliverySlipDto,
  GetDeliverySlipsDto
} from '../../../utils/validator.js';

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

  describe('Invoice DTOs', () => {
    describe('InvoiceContentDto', () => {
      it('有効なInvoiceContentDtoを正しく検証する', async () => {
        // Arrange
        const dto = new InvoiceContentDto();
        dto.order = 1;
        dto.type = 'normal';
        dto.description = 'テストサービス';
        dto.qty = 1;
        dto.unit_price = 100000;
        dto.amount = 100000;

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(dto);
        }
      });

      it('無効なtypeを持つInvoiceContentDtoを正しく検証する', async () => {
        // Arrange
        const dto = new InvoiceContentDto();
        dto.order = 1;
        dto.type = 'invalid' as any;

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
          expect(result.error.message).toContain('type');
        }
      });
    });

    describe('CreateInvoiceDto', () => {
      it('有効なCreateInvoiceDtoを正しく検証する', async () => {
        // Arrange
        const content = new InvoiceContentDto();
        content.order = 1;
        content.type = 'normal';
        content.description = 'テストサービス';
        content.amount = 100000;

        const dto = new CreateInvoiceDto();
        dto.due_date = '2024-02-15';
        dto.invoice_contents = [content];

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(dto);
        }
      });

      it('due_dateが不足するCreateInvoiceDtoを正しく検証する', async () => {
        // Arrange
        const content = new InvoiceContentDto();
        content.order = 1;
        content.type = 'normal';

        const dto = new CreateInvoiceDto();
        dto.invoice_contents = [content];
        // due_date is missing

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
          expect(result.error.message).toContain('due_date');
        }
      });
    });

    describe('UpdateInvoiceDto', () => {
      it('有効なUpdateInvoiceDtoを正しく検証する', async () => {
        // Arrange
        const dto = new UpdateInvoiceDto();
        dto.invoice_id = 1;
        dto.title = '更新されたタイトル';

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(dto);
        }
      });

      it('invoice_idが不足するUpdateInvoiceDtoを正しく検証する', async () => {
        // Arrange
        const dto = new UpdateInvoiceDto();
        dto.title = 'タイトル';
        // invoice_id is missing

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
          expect(result.error.message).toContain('invoice_id');
        }
      });
    });

    describe('GetInvoicesDto', () => {
      it('有効なGetInvoicesDtoを正しく検証する', async () => {
        // Arrange
        const dto = new GetInvoicesDto();
        dto.partner_id = 1;
        dto.invoice_status = 'issued';
        dto.limit = 50;

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(dto);
        }
      });
    });
  });

  describe('Quotation DTOs', () => {
    describe('QuotationContentDto', () => {
      it('有効なQuotationContentDtoを正しく検証する', async () => {
        // Arrange
        const dto = new QuotationContentDto();
        dto.order = 1;
        dto.type = 'normal';
        dto.description = 'テストサービス';
        dto.qty = 1;
        dto.unit_price = 100000;
        dto.amount = 100000;

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(dto);
        }
      });
    });

    describe('CreateQuotationDto', () => {
      it('有効なCreateQuotationDtoを正しく検証する', async () => {
        // Arrange
        const content = new QuotationContentDto();
        content.order = 1;
        content.type = 'normal';
        content.description = 'テストサービス';
        content.amount = 100000;

        const dto = new CreateQuotationDto();
        dto.quotation_contents = [content];

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(dto);
        }
      });

      it('quotation_contentsが不足するCreateQuotationDtoを正しく検証する', async () => {
        // Arrange
        const dto = new CreateQuotationDto();
        // quotation_contents is missing

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
          expect(result.error.message).toContain('quotation_contents');
        }
      });
    });

    describe('UpdateQuotationDto', () => {
      it('有効なUpdateQuotationDtoを正しく検証する', async () => {
        // Arrange
        const dto = new UpdateQuotationDto();
        dto.quotation_id = 1;
        dto.title = '更新されたタイトル';

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(dto);
        }
      });
    });
  });

  describe('DeliverySlip DTOs', () => {
    describe('DeliverySlipContentDto', () => {
      it('有効なDeliverySlipContentDtoを正しく検証する', async () => {
        // Arrange
        const dto = new DeliverySlipContentDto();
        dto.order = 1;
        dto.type = 'normal';
        dto.description = 'テスト商品';
        dto.qty = 1;
        dto.unit_price = 100000;
        dto.amount = 100000;

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(dto);
        }
      });
    });

    describe('CreateDeliverySlipDto', () => {
      it('有効なCreateDeliverySlipDtoを正しく検証する', async () => {
        // Arrange
        const content = new DeliverySlipContentDto();
        content.order = 1;
        content.type = 'normal';
        content.description = 'テスト商品';
        content.amount = 100000;

        const dto = new CreateDeliverySlipDto();
        dto.delivery_slip_contents = [content];

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(dto);
        }
      });

      it('delivery_slip_contentsが不足するCreateDeliverySlipDtoを正しく検証する', async () => {
        // Arrange
        const dto = new CreateDeliverySlipDto();
        // delivery_slip_contents is missing

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
          expect(result.error.message).toContain('delivery_slip_contents');
        }
      });
    });

    describe('UpdateDeliverySlipDto', () => {
      it('有効なUpdateDeliverySlipDtoを正しく検証する', async () => {
        // Arrange
        const dto = new UpdateDeliverySlipDto();
        dto.delivery_slip_id = 1;
        dto.title = '更新されたタイトル';

        // Act
        const result = await validator.validateDto(dto);

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(dto);
        }
      });
    });
  });
});
