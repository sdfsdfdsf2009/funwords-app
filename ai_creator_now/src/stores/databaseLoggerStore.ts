import { create } from 'zustand';
import { prismaHelpers } from '@/lib/prisma';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogEntry {
  id?: string;
  level: LogLevel;
  message: string;
  category?: string;
  metadata?: any;
  timestamp?: Date;
  userId?: string;
}

export interface LoggerStore {
  logs: LogEntry[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadLogs: (userId?: string, options?: {
    level?: LogLevel;
    category?: string;
    limit?: number;
  }) => Promise<void>;
  addLog: (level: LogLevel, message: string, category?: string, metadata?: any) => Promise<void>;
  clearLogs: (userId?: string) => Promise<void>;
  getLogStats: (userId?: string) => Promise<{
    total: number;
    debug: number;
    info: number;
    warn: number;
    error: number;
  }>;

  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Fallback methods
  saveToStorage: () => void;
  loadFromStorage: () => LogEntry[] | null;
}

// 默认用户ID
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

class LoggerAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/system-logs';
  }

  async createLog(data: Omit<LogEntry, 'id' | 'timestamp'>): Promise<LogEntry> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        userId: data.userId || DEFAULT_USER_ID,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create log: ${response.statusText}`);
    }

    return await response.json();
  }

  async getLogs(userId?: string, options?: {
    level?: LogLevel;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<LogEntry[]> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (options?.level) params.append('level', options.level);
    if (options?.category) params.append('category', options.category);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await fetch(`${this.baseUrl}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to load logs: ${response.statusText}`);
    }

    const data = await response.json();
    return data.logs || [];
  }

  async clearLogs(userId?: string): Promise<void> {
    const params = userId ? `?userId=${userId}` : '';
    const response = await fetch(`${this.baseUrl}${params}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to clear logs: ${response.statusText}`);
    }
  }

  async getLogStats(userId?: string): Promise<{
    total: number;
    debug: number;
    info: number;
    warn: number;
    error: number;
  }> {
    const params = userId ? `?userId=${userId}` : '';
    const response = await fetch(`${this.baseUrl}/stats${params}`);
    if (!response.ok) {
      throw new Error(`Failed to get log stats: ${response.statusText}`);
    }

    return await response.json();
  }
}

const loggerAPI = new LoggerAPI();

export const useDatabaseLoggerStore = create<LoggerStore>((set, get) => ({
  // Initial state
  logs: [],
  isLoading: false,
  error: null,

  // Load logs from database
  loadLogs: async (userId, options) => {
    set({ isLoading: true, error: null });

    try {
      const logs = await loggerAPI.getLogs(userId || DEFAULT_USER_ID, options);
      set({ logs, error: null });
    } catch (error) {
      console.error('Error loading logs:', error);
      set({ error: '加载日志失败' });

      // Fallback to localStorage
      const localStorageLogs = get().loadFromStorage();
      if (localStorageLogs) {
        set({ logs: localStorageLogs });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  // Add new log entry
  addLog: async (level, message, category, metadata) => {
    const logEntry: Omit<LogEntry, 'id' | 'timestamp'> = {
      level,
      message: message.trim(),
      category: category?.trim() || 'system',
      metadata: metadata || {},
      userId: DEFAULT_USER_ID,
    };

    try {
      const createdLog = await loggerAPI.createLog(logEntry);
      set(state => ({
        logs: [createdLog, ...state.logs],
        error: null
      }));

      // Backup to localStorage
      get().saveToStorage();
    } catch (error) {
      console.error('Error creating log:', error);

      // Fallback to localStorage
      const fallbackLog: LogEntry = {
        ...logEntry,
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };

      set(state => ({
        logs: [fallbackLog, ...state.logs]
      }));

      get().saveToStorage();
    }
  },

  // Clear all logs
  clearLogs: async (userId) => {
    try {
      await loggerAPI.clearLogs(userId || DEFAULT_USER_ID);
      set({ logs: [], error: null });

      // Clear localStorage backup
      if (typeof window !== 'undefined') {
        localStorage.removeItem('video-workstation-logs');
      }
    } catch (error) {
      console.error('Error clearing logs:', error);
      set({ error: '清除日志失败' });
    }
  },

  // Get log statistics
  getLogStats: async (userId) => {
    try {
      return await loggerAPI.getLogStats(userId || DEFAULT_USER_ID);
    } catch (error) {
      console.error('Error getting log stats:', error);

      // Fallback to localStorage stats
      const { logs } = get();
      const stats = logs.reduce((acc, log) => {
        acc.total++;
        switch (log.level) {
          case LogLevel.DEBUG:
            acc.debug++;
            break;
          case LogLevel.INFO:
            acc.info++;
            break;
          case LogLevel.WARN:
            acc.warn++;
            break;
          case LogLevel.ERROR:
            acc.error++;
            break;
        }
        return acc;
      }, { total: 0, debug: 0, info: 0, warn: 0, error: 0 });

      return stats;
    }
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  // Save to localStorage as backup
  saveToStorage: () => {
    if (typeof window !== 'undefined') {
      const { logs } = get();
      try {
        // Keep only the last 1000 logs in localStorage to prevent storage issues
        const logsToSave = logs.slice(0, 1000);
        localStorage.setItem('video-workstation-logs', JSON.stringify(logsToSave));
      } catch (error) {
        console.error('Error saving logs to localStorage:', error);
      }
    }
  },

  // Load from localStorage as fallback
  loadFromStorage: () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('video-workstation-logs');
        return stored ? JSON.parse(stored) : null;
      } catch (error) {
        console.error('Error loading logs from localStorage:', error);
        return null;
      }
    }
    return null;
  }
}));

// Export convenience methods for backward compatibility
export const Logger = {
  debug: (message: string, category?: string, metadata?: any) => {
    const store = useDatabaseLoggerStore.getState();
    store.addLog(LogLevel.DEBUG, message, category, metadata);
  },

  info: (message: string, category?: string, metadata?: any) => {
    const store = useDatabaseLoggerStore.getState();
    store.addLog(LogLevel.INFO, message, category, metadata);
  },

  warn: (message: string, category?: string, metadata?: any) => {
    const store = useDatabaseLoggerStore.getState();
    store.addLog(LogLevel.WARN, message, category, metadata);
  },

  error: (message: string, category?: string, metadata?: any) => {
    const store = useDatabaseLoggerStore.getState();
    store.addLog(LogLevel.ERROR, message, category, metadata);
  }
};

export default useDatabaseLoggerStore;