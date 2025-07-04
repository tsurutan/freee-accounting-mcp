/**
 * サービスコンテナ - 依存性注入の統合管理
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { configureBindings } from './bindings.js';

/**
 * サービスコンテナクラス
 */
export class ServiceContainer {
  private container: Container;

  constructor() {
    this.container = new Container();
    this.configure();
  }

  /**
   * コンテナの設定
   */
  private configure(): void {
    // 依存関係の設定を実行
    configureBindings(this.container);
  }

  /**
   * サービスを取得
   */
  get<T>(serviceIdentifier: any): T {
    return this.container.get<T>(serviceIdentifier);
  }

  /**
   * サービスが登録されているかチェック
   */
  isBound(serviceIdentifier: any): boolean {
    return this.container.isBound(serviceIdentifier);
  }

  /**
   * サービスを登録
   */
  bind<T>(serviceIdentifier: any): any {
    return this.container.bind<T>(serviceIdentifier);
  }

  /**
   * サービスの登録を解除
   */
  unbind(serviceIdentifier: any): void {
    this.container.unbind(serviceIdentifier);
  }

  /**
   * コンテナをリセット
   */
  reset(): void {
    this.container = new Container();
    this.configure();
  }

  /**
   * 内部コンテナを取得（テスト用）
   */
  getContainer(): Container {
    return this.container;
  }

  /**
   * コンテナの統計情報を取得
   */
  getStats(): {
    totalServices: number;
    boundServices: string[];
    categories: {
      config: number;
      utils: number;
      infrastructure: number;
      services: number;
      handlers: number;
      server: number;
    };
  } {
    const boundServices = (this.container as any)['_bindingDictionary']
      ? Object.keys((this.container as any)['_bindingDictionary']._map || {})
      : [];

    // カテゴリ別の分類
    const categories = {
      config: boundServices.filter(s => s.includes('Config')).length,
      utils: boundServices.filter(s => 
        s.includes('Builder') || s.includes('Handler') || s.includes('Utils') || s.includes('Validator')
      ).length,
      infrastructure: boundServices.filter(s => 
        s.includes('Logger') || s.includes('Client') || s.includes('Mapper') || s.includes('Interceptor')
      ).length,
      services: boundServices.filter(s => s.includes('Service')).length,
      handlers: boundServices.filter(s => s.includes('Handler') || s.includes('Registry')).length,
      server: boundServices.filter(s => s.includes('Server')).length,
    };

    return {
      totalServices: boundServices.length,
      boundServices,
      categories,
    };
  }
}

/**
 * グローバルサービスコンテナインスタンス
 */
export const serviceContainer = new ServiceContainer();

/**
 * 後方互換性のためのエクスポート
 */
export const container = serviceContainer.getContainer();
export const createContainer = () => serviceContainer.getContainer();
