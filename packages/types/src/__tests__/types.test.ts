/**
 * 型定義のテスト
 */

import {
  FreeeError,
  Company,
  AccountItem,
  Partner,
  Deal,
  DealDetail,
  OAuthTokens,
  AuthState,
  CreateDealRequest,
} from '../index';

describe('Types', () => {
  describe('FreeeError', () => {
    it('should create error with message and status code', () => {
      const error = new FreeeError('Test error', 400);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('FreeeError');
      expect(error.errors).toBeUndefined();
    });

    it('should create error with errors array', () => {
      const errors = [
        {
          type: 'validation',
          resource_name: 'deal',
          field: 'amount',
          code: 'required',
          message: 'Amount is required',
        },
      ];

      const error = new FreeeError('Validation error', 422, errors);

      expect(error.message).toBe('Validation error');
      expect(error.statusCode).toBe(422);
      expect(error.errors).toEqual(errors);
    });
  });

  describe('Company type', () => {
    it('should accept valid company object', () => {
      const company: Company = {
        id: 1,
        name: 'テスト株式会社',
        name_kana: 'テストカブシキガイシャ',
        display_name: 'テスト会社',
        role: 'admin',
      };

      expect(company.id).toBe(1);
      expect(company.name).toBe('テスト株式会社');
    });
  });

  describe('AccountItem type', () => {
    it('should accept valid account item object', () => {
      const accountItem: AccountItem = {
        id: 1,
        name: '現金',
        shortcut: 'CASH',
        account_category: 'asset',
        available: true,
      };

      expect(accountItem.id).toBe(1);
      expect(accountItem.name).toBe('現金');
    });
  });

  describe('Partner type', () => {
    it('should accept valid partner object', () => {
      const partner: Partner = {
        id: 1,
        name: '取引先A',
        shortcut1: 'A',
        email: 'contact@partner-a.com',
      };

      expect(partner.id).toBe(1);
      expect(partner.name).toBe('取引先A');
    });
  });

  describe('Deal and DealDetail types', () => {
    it('should accept valid deal object', () => {
      const dealDetail: DealDetail = {
        id: 1,
        account_item_id: 1,
        tax_code: 0,
        amount: 1000,
        entry_side: 'debit',
        description: 'テスト取引',
      };

      const deal: Deal = {
        id: 1,
        company_id: 1,
        issue_date: '2024-01-15',
        amount: 1000,
        type: 'expense',
        details: [dealDetail],
      };

      expect(deal.id).toBe(1);
      expect(deal.details).toHaveLength(1);
      expect(deal.details[0]?.amount).toBe(1000);
    });
  });

  describe('OAuthTokens type', () => {
    it('should accept valid tokens object', () => {
      const tokens: OAuthTokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        created_at: Math.floor(Date.now() / 1000),
      };

      expect(tokens.access_token).toBe('test_access_token');
      expect(tokens.expires_in).toBe(3600);
    });

    it('should accept tokens object with company information', () => {
      const tokens: OAuthTokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        created_at: Math.floor(Date.now() / 1000),
        company_id: '123456',
        external_cid: 'ext_123456',
      };

      expect(tokens.company_id).toBe('123456');
      expect(tokens.external_cid).toBe('ext_123456');
    });

    it('should accept tokens object without optional company information', () => {
      const tokens: OAuthTokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        created_at: Math.floor(Date.now() / 1000),
      };

      expect(tokens.company_id).toBeUndefined();
      expect(tokens.external_cid).toBeUndefined();
    });
  });

  describe('AuthState type', () => {
    it('should accept unauthenticated state', () => {
      const authState: AuthState = {
        isAuthenticated: false,
      };

      expect(authState.isAuthenticated).toBe(false);
      expect(authState.tokens).toBeUndefined();
    });

    it('should accept authenticated state', () => {
      const tokens: OAuthTokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        created_at: Math.floor(Date.now() / 1000),
      };

      const authState: AuthState = {
        isAuthenticated: true,
        tokens,
        expiresAt: tokens.created_at + tokens.expires_in,
      };

      expect(authState.isAuthenticated).toBe(true);
      expect(authState.tokens).toEqual(tokens);
    });
  });

  describe('CreateDealRequest type', () => {
    it('should accept valid create deal request', () => {
      const createDealRequest: CreateDealRequest = {
        company_id: 1,
        issue_date: '2024-01-15',
        type: 'expense',
        details: [
          {
            account_item_id: 1,
            tax_code: 0,
            amount: 1000,
            entry_side: 'debit',
            description: 'テスト取引',
          },
        ],
      };

      expect(createDealRequest.company_id).toBe(1);
      expect(createDealRequest.details).toHaveLength(1);
    });
  });
});
