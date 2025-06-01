export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 99
}

export interface LogEntry {
  level: LogLevel;
  timestamp: Date;
  message: string;
  context?: any;
  error?: Error;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableLocalStorage: boolean;
  maxStoredLogs: number;
}

class Logger {
  private config: LoggerConfig = {
    level: LogLevel.INFO,
    enableConsole: true,
    enableLocalStorage: true,
    maxStoredLogs: 1000
  };

  private logs: LogEntry[] = [];
  private readonly STORAGE_KEY = 'mahjong_logs';

  constructor() {
    // Load config from localStorage if available
    this.loadConfig();
    // Load existing logs from localStorage
    this.loadLogs();
  }

  private loadConfig() {
    try {
      const savedConfig = localStorage.getItem('mahjong_logger_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.error('Failed to load logger config:', error);
    }
  }

  private loadLogs() {
    try {
      const savedLogs = localStorage.getItem(this.STORAGE_KEY);
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  }

  private saveLogs() {
    if (!this.config.enableLocalStorage) return;
    
    try {
      // Keep only the most recent logs
      if (this.logs.length > this.config.maxStoredLogs) {
        this.logs = this.logs.slice(-this.config.maxStoredLogs);
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save logs:', error);
    }
  }

  private log(level: LogLevel, message: string, context?: any, error?: Error) {
    if (level < this.config.level) return;

    const entry: LogEntry = {
      level,
      timestamp: new Date(),
      message,
      context,
      error
    };

    this.logs.push(entry);
    this.saveLogs();

    if (this.config.enableConsole) {
      this.consoleLog(entry);
    }
  }

  private consoleLog(entry: LogEntry) {
    const prefix = `[${LogLevel[entry.level]}] ${entry.timestamp.toISOString()}`;
    const args: any[] = [prefix, entry.message];
    
    if (entry.context) {
      args.push(entry.context);
    }
    
    if (entry.error) {
      args.push(entry.error);
    }

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.log(...args);
        break;
      case LogLevel.INFO:
        console.info(...args);
        break;
      case LogLevel.WARN:
        console.warn(...args);
        break;
      case LogLevel.ERROR:
        console.error(...args);
        break;
    }
  }

  debug(message: string, context?: any) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: any) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: any) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: any) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  setLevel(level: LogLevel) {
    this.config.level = level;
    this.saveConfig();
  }

  setConfig(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
    this.saveConfig();
  }

  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  private saveConfig() {
    try {
      localStorage.setItem('mahjong_logger_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save logger config:', error);
    }
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level === undefined) {
      return [...this.logs];
    }
    return this.logs.filter(log => log.level >= level);
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  generateErrorReport(): string {
    const errorLogs = this.getLogs(LogLevel.ERROR);
    const report = {
      timestamp: new Date().toISOString(),
      totalErrors: errorLogs.length,
      errors: errorLogs,
      systemInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`
      }
    };
    return JSON.stringify(report, null, 2);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for convenient usage
export const log = {
  debug: (message: string, context?: any) => logger.debug(message, context),
  info: (message: string, context?: any) => logger.info(message, context),
  warn: (message: string, context?: any) => logger.warn(message, context),
  error: (message: string, error?: Error, context?: any) => logger.error(message, error, context)
};