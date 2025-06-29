/**
 * 事業所関連リソースハンドラー
 */

import { injectable, inject } from 'inversify';
import { Result, ok, err } from 'neverthrow';
import { TYPES } from '../container/types.js';
import { BaseResourceHandler, ResourceInfo } from './base-resource-handler.js';
import { MCPResourceResponse } from '../utils/response-builder.js';
import { AppError } from '../utils/error-handler.js';
import { AppConfig } from '../config/app-config.js';
import { FreeeClient } from '@mcp-server/shared';

/**
 * 事業所関連リソースハンドラー
 */
@injectable()
export class CompaniesResourceHandler extends BaseResourceHandler {
  constructor(
    @inject(TYPES.AuthService) authService: any,
    @inject(TYPES.ResponseBuilder) responseBuilder: any,
    @inject(TYPES.ErrorHandler) errorHandler: any,
    @inject(TYPES.Logger) logger: any,
    @inject(TYPES.AppConfig) private appConfig: AppConfig,
    @inject(TYPES.FreeeClient) private freeeClient: FreeeClient
  ) {
    super(authService, responseBuilder, errorHandler, logger);
  }

  /**
   * 処理可能なリソース情報を返す
   */
  getResourceInfo(): ResourceInfo[] {
    return [
      {
        uri: 'companies://list',
        name: '事業所一覧',
        description: '利用可能な事業所の一覧を取得します',
        mimeType: 'application/json',
      },
      {
        uri: 'companies://current',
        name: '現在の事業所情報',
        description: '現在選択されている事業所の詳細情報を取得します',
        mimeType: 'application/json',
      },
    ];
  }

  /**
   * リソースを読み取り
   */
  async readResource(uri: string): Promise<Result<MCPResourceResponse, AppError>> {
    switch (uri) {
      case 'companies://list':
        return this.getCompaniesList();
      
      case 'companies://current':
        return this.getCurrentCompany();
      
      default:
        return err(this.errorHandler.apiError(`Unknown resource: ${uri}`, 404));
    }
  }

  /**
   * 事業所一覧を取得
   */
  private async getCompaniesList(): Promise<Result<MCPResourceResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Fetching companies list');
      
      // 事業所一覧を取得（型安全なメソッドを使用）
      const response = await this.freeeClient.getCompanies();
      const companies = response.companies;

      if (companies.length === 0) {
        this.logger.warn('No companies found');
        return this.responseBuilder.resourceSuccess(
          'companies://list',
          {
            companies: [],
            message: '利用可能な事業所が見つかりませんでした。',
            current_company_id: this.appConfig.companyId,
          }
        );
      }

      this.logger.info('Companies list retrieved successfully', { 
        count: companies.length 
      });

      return this.responseBuilder.resourceSuccess(
        'companies://list',
        {
          companies: companies,
          current_company_id: this.appConfig.companyId,
        }
      );
    }, 'getCompaniesList');
  }

  /**
   * 現在の事業所情報を取得
   */
  private async getCurrentCompany(): Promise<Result<MCPResourceResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Fetching current company info', { 
        companyId: this.appConfig.companyId 
      });

      // 固定の事業所情報を取得
      const companyId = this.appConfig.companyId;
      const companyResponse = await this.freeeClient.get(`/api/1/companies/${companyId}`);
      const currentCompany = companyResponse.data;

      this.logger.info('Current company info retrieved successfully', { 
        companyId,
        companyName: currentCompany?.name 
      });

      return this.responseBuilder.resourceSuccess(
        'companies://current',
        {
          company: currentCompany,
          company_id: companyId,
        }
      );
    }, 'getCurrentCompany');
  }

  /**
   * 事業所の存在確認
   */
  async validateCompanyExists(companyId: number): Promise<Result<boolean, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.debug('Validating company existence', { companyId });

      const companiesResponse = await this.freeeClient.getCompanies();
      const companies = companiesResponse.companies;
      const exists = companies.some(c => c.id === companyId);

      this.logger.debug('Company validation result', { companyId, exists });
      return exists;
    }, 'validateCompanyExists');
  }

  /**
   * 事業所情報を名前で検索
   */
  async findCompanyByName(name: string): Promise<Result<any | null, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.debug('Finding company by name', { name });

      const companiesResponse = await this.freeeClient.getCompanies();
      const companies = companiesResponse.companies;
      const company = companies.find(c => 
        c.name.toLowerCase().includes(name.toLowerCase())
      );

      this.logger.debug('Company search result', { 
        name, 
        found: !!company,
        companyId: company?.id 
      });

      return company || null;
    }, 'findCompanyByName');
  }

  /**
   * 事業所の詳細情報を取得
   */
  async getCompanyDetails(companyId: number): Promise<Result<any, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.debug('Fetching company details', { companyId });

      const response = await this.freeeClient.get(`/api/1/companies/${companyId}`);
      const company = response.data;

      this.logger.debug('Company details retrieved', { 
        companyId,
        companyName: company?.name 
      });

      return company;
    }, 'getCompanyDetails');
  }
}
