/**
 * freee OAuth2.0認証クライアント
 */
import { OAuthConfig, OAuthTokens, AuthState } from '@mcp-server/types';
export declare class FreeeOAuthClient {
    private config;
    private httpClient;
    private authState;
    private tokenFilePath;
    constructor(config: OAuthConfig);
    /**
     * 認証URLを生成
     */
    generateAuthUrl(state?: string, enableCompanySelection?: boolean): string;
    /**
     * CSRF対策用のランダムなstate文字列を生成
     */
    private generateRandomState;
    /**
     * 認証コードからアクセストークンを取得
     */
    exchangeCodeForTokens(code: string): Promise<OAuthTokens>;
    /**
     * リフレッシュトークンを使用してアクセストークンを更新
     */
    refreshTokens(refreshToken: string): Promise<OAuthTokens>;
    /**
     * 現在の認証状態を取得
     */
    getAuthState(): AuthState;
    /**
     * 認証されている事業所IDを取得
     */
    getCompanyId(): string | null;
    /**
     * 外部連携IDを取得
     */
    getExternalCid(): string | null;
    /**
     * 事業所選択が有効かどうかを判定
     */
    isCompanySelectionEnabled(): boolean;
    /**
     * 詳細なエラーメッセージを生成
     */
    private getDetailedErrorMessage;
    /**
     * アクセストークンを取得（必要に応じて自動更新）
     */
    getValidAccessToken(): Promise<string>;
    /**
     * トークンが有効かどうかをチェック
     */
    isTokenValid(): boolean;
    /**
     * アクセストークンを取得（期限切れの場合はnullを返す）
     */
    getCurrentAccessToken(): string | null;
    /**
     * トークンをファイルに保存（暗号化）
     */
    private saveTokensToFile;
    /**
     * ファイルからトークンを読み込み（復号化）
     */
    private loadTokensFromFile;
    /**
     * トークンファイルを削除
     */
    private deleteTokenFile;
    /**
     * トークンを設定（オーバーライド）
     */
    setTokens(tokens: OAuthTokens): void;
    /**
     * 認証状態をクリア（オーバーライド）
     */
    clearAuth(): void;
}
//# sourceMappingURL=auth.d.ts.map