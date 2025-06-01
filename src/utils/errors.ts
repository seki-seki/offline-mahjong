export enum ErrorCode {
  P2P_CONNECTION_FAILED = 'P2P_CONNECTION_FAILED',
  P2P_MESSAGE_SEND_FAILED = 'P2P_MESSAGE_SEND_FAILED',
  P2P_TIMEOUT = 'P2P_TIMEOUT',
  P2P_PEER_DISCONNECTED = 'P2P_PEER_DISCONNECTED',
  
  CRYPTO_ENCRYPTION_FAILED = 'CRYPTO_ENCRYPTION_FAILED',
  CRYPTO_DECRYPTION_FAILED = 'CRYPTO_DECRYPTION_FAILED',
  CRYPTO_KEY_GENERATION_FAILED = 'CRYPTO_KEY_GENERATION_FAILED',
  CRYPTO_SIGNATURE_FAILED = 'CRYPTO_SIGNATURE_FAILED',
  CRYPTO_VERIFICATION_FAILED = 'CRYPTO_VERIFICATION_FAILED',
  
  GAME_INVALID_ACTION = 'GAME_INVALID_ACTION',
  GAME_STATE_CORRUPTED = 'GAME_STATE_CORRUPTED',
  GAME_VERIFICATION_FAILED = 'GAME_VERIFICATION_FAILED',
  
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ErrorContext {
  [key: string]: any;
}

export abstract class BaseError extends Error {
  public readonly code: ErrorCode;
  public readonly timestamp: Date;
  public readonly context: ErrorContext;

  constructor(code: ErrorCode, message: string, context: ErrorContext = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    this.context = context;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if ('captureStackTrace' in Error && typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack
    };
  }
}

export class P2PError extends BaseError {
  constructor(code: ErrorCode, message: string, context: ErrorContext = {}) {
    super(code, message, context);
  }
}

export class CryptoError extends BaseError {
  constructor(code: ErrorCode, message: string, context: ErrorContext = {}) {
    super(code, message, context);
  }
}

export class GameError extends BaseError {
  constructor(code: ErrorCode, message: string, context: ErrorContext = {}) {
    super(code, message, context);
  }
}

export class TimeoutError extends BaseError {
  constructor(message: string, operation: string, timeoutMs: number) {
    super(ErrorCode.P2P_TIMEOUT, message, { operation, timeoutMs });
  }
}

export function isRetryableError(error: BaseError): boolean {
  const retryableCodes = [
    ErrorCode.P2P_CONNECTION_FAILED,
    ErrorCode.P2P_MESSAGE_SEND_FAILED,
    ErrorCode.P2P_TIMEOUT,
    ErrorCode.CRYPTO_ENCRYPTION_FAILED,
    ErrorCode.CRYPTO_DECRYPTION_FAILED
  ];
  
  return retryableCodes.includes(error.code);
}

export function getUserFriendlyMessage(error: BaseError): string {
  const messages: Record<ErrorCode, string> = {
    [ErrorCode.P2P_CONNECTION_FAILED]: '接続に失敗しました。ネットワーク設定を確認してください。',
    [ErrorCode.P2P_MESSAGE_SEND_FAILED]: 'メッセージの送信に失敗しました。',
    [ErrorCode.P2P_TIMEOUT]: '通信がタイムアウトしました。',
    [ErrorCode.P2P_PEER_DISCONNECTED]: '他のプレイヤーとの接続が切断されました。',
    [ErrorCode.CRYPTO_ENCRYPTION_FAILED]: '暗号化に失敗しました。',
    [ErrorCode.CRYPTO_DECRYPTION_FAILED]: '復号化に失敗しました。',
    [ErrorCode.CRYPTO_KEY_GENERATION_FAILED]: '鍵の生成に失敗しました。',
    [ErrorCode.CRYPTO_SIGNATURE_FAILED]: '署名の生成に失敗しました。',
    [ErrorCode.CRYPTO_VERIFICATION_FAILED]: '署名の検証に失敗しました。',
    [ErrorCode.GAME_INVALID_ACTION]: '無効な操作です。',
    [ErrorCode.GAME_STATE_CORRUPTED]: 'ゲーム状態が破損しています。',
    [ErrorCode.GAME_VERIFICATION_FAILED]: 'ゲームの検証に失敗しました。',
    [ErrorCode.UNKNOWN_ERROR]: '予期しないエラーが発生しました。'
  };
  
  return messages[error.code] || messages[ErrorCode.UNKNOWN_ERROR];
}