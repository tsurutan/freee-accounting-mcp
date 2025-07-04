/**
 * インターフェースのインデックスファイル
 * 
 * 全てのインターフェース定義を一箇所からエクスポート
 */

// リソースハンドラーインターフェース
export * from './resource-handler.js';

// ツールハンドラーインターフェース
export * from './tool-handler.js';

// プロンプトハンドラーインターフェース
export * from './prompt-handler.js';

// サービスインターフェース
export * from './service.js';

// インターフェースレジストリの再エクスポート
export { RESOURCE_HANDLER_INTERFACES } from './resource-handler.js';
export { TOOL_HANDLER_INTERFACES } from './tool-handler.js';
export { PROMPT_HANDLER_INTERFACES } from './prompt-handler.js';
export { SERVICE_INTERFACES } from './service.js';

// 共通インターフェース
export interface IDisposable {
  dispose(): Promise<void>;
}

export interface IInitializable {
  initialize(): Promise<void>;
}

export interface IConfigurable<T> {
  configure(config: T): void;
  getConfig(): T;
}

export interface IValidatable {
  validate(): Promise<ValidationResult>;
}

export interface ISerializable<T> {
  serialize(): T;
  deserialize(data: T): void;
}

export interface ICloneable<T> {
  clone(): T;
}

export interface IComparable<T> {
  compareTo(other: T): number;
  equals(other: T): boolean;
}

export interface IObservable<T> {
  subscribe(observer: IObserver<T>): ISubscription;
  unsubscribe(subscription: ISubscription): void;
  notify(data: T): void;
}

export interface IObserver<T> {
  next(data: T): void;
  error(error: Error): void;
  complete(): void;
}

export interface ISubscription {
  id: string;
  unsubscribe(): void;
  isActive(): boolean;
}

// ファクトリーインターフェース
export interface IFactory<T> {
  create(...args: any[]): T;
  createAsync(...args: any[]): Promise<T>;
}

export interface IBuilder<T> {
  build(): T;
  reset(): IBuilder<T>;
}

export interface IRepository<T, K> {
  findById(id: K): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  update(id: K, entity: Partial<T>): Promise<T>;
  delete(id: K): Promise<void>;
  exists(id: K): Promise<boolean>;
}

export interface IUnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
}

// ストラテジーインターフェース
export interface IStrategy<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
  canHandle(input: TInput): boolean;
  getName(): string;
}

export interface IStrategyRegistry<TInput, TOutput> {
  register(strategy: IStrategy<TInput, TOutput>): void;
  unregister(strategyName: string): void;
  findStrategy(input: TInput): IStrategy<TInput, TOutput> | null;
  executeStrategy(input: TInput): Promise<TOutput>;
}

// コマンドインターフェース
export interface ICommand<TResult = void> {
  execute(): Promise<TResult>;
  undo?(): Promise<void>;
  canUndo?(): boolean;
  getName(): string;
}

export interface ICommandHandler<TCommand extends ICommand<TResult>, TResult = void> {
  handle(command: TCommand): Promise<TResult>;
  canHandle(command: ICommand): boolean;
}

export interface ICommandBus {
  execute<TResult>(command: ICommand<TResult>): Promise<TResult>;
  register<TCommand extends ICommand<TResult>, TResult>(
    commandType: new (...args: any[]) => TCommand,
    handler: ICommandHandler<TCommand, TResult>
  ): void;
}

// クエリインターフェース
export interface IQuery<TResult> {
  getName(): string;
}

export interface IQueryHandler<TQuery extends IQuery<TResult>, TResult> {
  handle(query: TQuery): Promise<TResult>;
  canHandle(query: IQuery<any>): boolean;
}

export interface IQueryBus {
  execute<TResult>(query: IQuery<TResult>): Promise<TResult>;
  register<TQuery extends IQuery<TResult>, TResult>(
    queryType: new (...args: any[]) => TQuery,
    handler: IQueryHandler<TQuery, TResult>
  ): void;
}

// イベントインターフェース
export interface IEvent {
  id: string;
  type: string;
  timestamp: Date;
  data: any;
}

export interface IEventHandler<TEvent extends IEvent> {
  handle(event: TEvent): Promise<void>;
  canHandle(event: IEvent): boolean;
  getName(): string;
}

export interface IEventBus {
  publish(event: IEvent): Promise<void>;
  subscribe<TEvent extends IEvent>(
    eventType: string,
    handler: IEventHandler<TEvent>
  ): ISubscription;
  unsubscribe(subscription: ISubscription): void;
}

export interface IEventStore {
  append(streamId: string, events: IEvent[]): Promise<void>;
  getEvents(streamId: string, fromVersion?: number): Promise<IEvent[]>;
  getSnapshot<T>(streamId: string): Promise<T | null>;
  saveSnapshot<T>(streamId: string, snapshot: T, version: number): Promise<void>;
}

// ミドルウェアインターフェース
export interface IMiddleware<TContext> {
  getName(): string;
  getPriority(): number;
  execute(context: TContext, next: () => Promise<void>): Promise<void>;
}

export interface IMiddlewarePipeline<TContext> {
  use(middleware: IMiddleware<TContext>): void;
  execute(context: TContext): Promise<void>;
}

// プラグインインターフェース
export interface IPlugin {
  getName(): string;
  getVersion(): string;
  getDescription(): string;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  isEnabled(): boolean;
}

export interface IPluginManager {
  register(plugin: IPlugin): void;
  unregister(pluginName: string): void;
  getPlugin(name: string): IPlugin | null;
  getAllPlugins(): IPlugin[];
  enablePlugin(name: string): Promise<void>;
  disablePlugin(name: string): Promise<void>;
}

// セキュリティインターフェース
export interface IAuthenticationProvider {
  authenticate(credentials: any): Promise<AuthenticationResult>;
  validateToken(token: string): Promise<TokenValidationResult>;
  refreshToken(refreshToken: string): Promise<TokenRefreshResult>;
}

export interface IAuthorizationProvider {
  authorize(principal: any, resource: string, action: string): Promise<AuthorizationResult>;
  getRoles(principal: any): Promise<string[]>;
  getPermissions(principal: any): Promise<string[]>;
}

export interface AuthenticationResult {
  success: boolean;
  principal?: any;
  token?: string;
  refreshToken?: string;
  expiresAt?: Date;
  error?: string;
}

export interface TokenValidationResult {
  valid: boolean;
  principal?: any;
  expiresAt?: Date;
  error?: string;
}

export interface TokenRefreshResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresAt?: Date;
  error?: string;
}

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
}

// 監査インターフェース
export interface IAuditLogger {
  log(entry: AuditEntry): Promise<void>;
  query(criteria: AuditQueryCriteria): Promise<AuditEntry[]>;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}

export interface AuditQueryCriteria {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// 設定インターフェース
export interface IConfigurationProvider {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): Promise<void>;
  has(key: string): boolean;
  delete(key: string): Promise<void>;
  getAll(): Record<string, any>;
  watch(key: string, callback: (value: any) => void): ISubscription;
}

export interface IConfigurationValidator {
  validate(config: Record<string, any>): ValidationResult;
  validateEntry(key: string, value: any): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// メトリクスインターフェース
export interface IMetricsCollector {
  increment(name: string, value?: number, tags?: Record<string, string>): void;
  decrement(name: string, value?: number, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
  timer(name: string, duration: number, tags?: Record<string, string>): void;
  flush(): Promise<void>;
}

export interface IMetricsReporter {
  report(metrics: MetricEntry[]): Promise<void>;
  getName(): string;
}

export interface MetricEntry {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

// ヘルスチェックインターフェース
export interface IHealthCheck {
  getName(): string;
  check(): Promise<HealthCheckResult>;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  details?: Record<string, any>;
  duration: number;
}

export interface IHealthCheckRegistry {
  register(healthCheck: IHealthCheck): void;
  unregister(name: string): void;
  checkAll(): Promise<Record<string, HealthCheckResult>>;
  check(name: string): Promise<HealthCheckResult>;
}
