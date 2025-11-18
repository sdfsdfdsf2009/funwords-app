/**
 * 状态管理错误监控
 * 监控和拦截状态管理中的错误
 */

import { workflowManager } from '../WorkflowManager';

export interface StateErrorMonitorConfig {
  enableStackTrace?: boolean;
  maxStateHistory?: number;
  ignoredActions?: string[];
  ignoredStates?: string[];
  enableStateDiff?: boolean;
  enablePerformanceMonitoring?: boolean;
  stateSizeThreshold?: number;
}

export interface StateTransition {
  storeName: string;
  action: string;
  prevState: any;
  nextState: any;
  timestamp: Date;
  duration: number;
  stackTrace?: string;
}

export interface StateErrorInfo {
  storeName: string;
  action: string;
  error: Error;
  transition?: StateTransition;
  stateSize?: number;
  context?: any;
}

export class StateErrorMonitor {
  private static instance: StateErrorMonitor;
  private config: Required<StateErrorMonitorConfig>;
  private stateHistory: Map<string, StateTransition[]> = new Map();
  private storeWrappers: Map<string, any> = new Map();
  private errorListeners: Array<(errorInfo: StateErrorInfo) => void> = [];

  private constructor(config: StateErrorMonitorConfig = {}) {
    this.config = {
      enableStackTrace: true,
      maxStateHistory: 50,
      ignoredActions: [],
      ignoredStates: [],
      enableStateDiff: true,
      enablePerformanceMonitoring: true,
      stateSizeThreshold: 1024 * 1024, // 1MB
      ...config
    };
  }

  public static getInstance(config?: StateErrorMonitorConfig): StateErrorMonitor {
    if (!StateErrorMonitor.instance) {
      StateErrorMonitor.instance = new StateErrorMonitor(config);
    }
    return StateErrorMonitor.instance;
  }

  /**
   * 包装状态存储以监控错误
   */
  public wrapStore<T extends Record<string, any>>(
    storeName: string,
    store: T,
    options: {
      getState?: () => any;
      setState?: (state: any) => void;
      dispatch?: (action: any) => any;
      subscribe?: (listener: () => void) => () => void;
    } = {}
  ): T {
    if (this.storeWrappers.has(storeName)) {
      return this.storeWrappers.get(storeName);
    }

    const wrappedStore = { ...store };

    // 包装dispatch方法（如果存在）
    if (store.dispatch && options.dispatch) {
      wrappedStore.dispatch = this.wrapDispatch(storeName, store.dispatch, options.dispatch);
    }

    // 包装setState方法（如果存在）
    if (store.setState && options.setState) {
      wrappedStore.setState = this.wrapSetState(storeName, store.setState, options.setState);
    }

    // 监听状态变化
    if (options.subscribe && options.getState) {
      let prevState = options.getState();

      const unsubscribe = options.subscribe(() => {
        try {
          const nextState = options.getState();
          this.recordStateTransition(storeName, 'unknown', prevState, nextState);
          prevState = nextState;
        } catch (error) {
          console.warn(`Error in state subscription for ${storeName}:`, error);
        }
      });

      // 保存取消订阅函数
      (wrappedStore as any)._unsubscribe = unsubscribe;
    }

    this.storeWrappers.set(storeName, wrappedStore);
    return wrappedStore;
  }

  /**
   * 包装Redux dispatch
   */
  public wrapReduxStore(storeName: string, store: any): any {
    if (this.storeWrappers.has(storeName)) {
      return this.storeWrappers.get(storeName);
    }

    const originalDispatch = store.dispatch;
    const originalGetState = store.getState;

    const wrappedStore = {
      ...store,
      dispatch: (action: any) => {
        return this.wrapDispatch(storeName, originalDispatch, () => {
          return originalDispatch(action);
        })(action);
      },
      getState: () => originalGetState()
    };

    // 监听状态变化
    const unsubscribe = store.subscribe(() => {
      try {
        const state = store.getState();
        this.checkStateSize(storeName, state);
      } catch (error) {
        console.warn(`Error checking state size for ${storeName}:`, error);
      }
    });

    (wrappedStore as any)._unsubscribe = unsubscribe;
    this.storeWrappers.set(storeName, wrappedStore);
    return wrappedStore;
  }

  /**
   * 包装Zustand store
   */
  public wrapZustandStore<T extends Record<string, any>>(
    storeName: string,
    useStore: any
  ): any {
    if (this.storeWrappers.has(storeName)) {
      return this.storeWrappers.get(storeName);
    }

    const wrappedUseStore = (...args: any[]) => {
      const result = useStore(...args);

      // 创建一个包装的状态对象，拦截方法调用
      const wrappedResult = { ...result };

      // 包装所有方法
      Object.keys(result).forEach(key => {
        if (typeof result[key] === 'function') {
          wrappedResult[key] = this.wrapStoreMethod(
            storeName,
            key,
            result[key],
            () => useStore(...args)
          );
        }
      });

      return wrappedResult;
    };

    this.storeWrappers.set(storeName, wrappedUseStore);
    return wrappedUseStore;
  }

  /**
   * 手动记录状态错误
   */
  public async recordStateError(errorInfo: StateErrorInfo): Promise<void> {
    // 构建完整的错误信息
    const fullErrorInfo = {
      type: 'state',
      message: errorInfo.error.message,
      stack: errorInfo.error.stack,
      source: `${errorInfo.storeName}.${errorInfo.action}`,
      timestamp: new Date(),
      context: {
        ...errorInfo.context,
        storeName: errorInfo.storeName,
        action: errorInfo.action,
        stateSize: errorInfo.stateSize,
        transition: errorInfo.transition
      }
    };

    try {
      await workflowManager.handleError(fullErrorInfo);
    } catch (workflowError) {
      console.error('Failed to submit state error to workflow:', workflowError);
    }

    // 通知监听器
    this.errorListeners.forEach(listener => {
      try {
        listener(errorInfo);
      } catch (error) {
        console.error('Error in state error listener:', error);
      }
    });
  }

  /**
   * 添加错误监听器
   */
  public addErrorListener(listener: (errorInfo: StateErrorInfo) => void): () => void {
    this.errorListeners.push(listener);

    // 返回移除函数
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取状态历史
   */
  public getStateHistory(storeName?: string): Map<string, StateTransition[]> {
    if (storeName) {
      return new Map([[storeName, this.stateHistory.get(storeName) || []]);
    }
    return new Map(this.stateHistory);
  }

  /**
   * 清除状态历史
   */
  public clearStateHistory(storeName?: string): void {
    if (storeName) {
      this.stateHistory.delete(storeName);
    } else {
      this.stateHistory.clear();
    }
  }

  /**
   * 包装dispatch方法
   */
  private wrapDispatch<T extends any[]>(
    storeName: string,
    originalDispatch: (...args: T) => any,
    getOriginalDispatch: () => (...args: T) => any
  ): (...args: T) => any {
    return async (...args: T) => {
      const action = args[0];
      const actionType = action.type || 'unknown';

      // 检查是否应该忽略此action
      if (this.config.ignoredActions.includes(actionType)) {
        return originalDispatch(...args);
      }

      let prevState: any;
      try {
        prevState = (originalDispatch as any).getState?.();
      } catch (error) {
        // 无法获取当前状态，继续执行
      }

      const startTime = Date.now();

      try {
        const result = originalDispatch(...args);

        // 如果返回Promise，处理异步结果
        if (result && typeof result.then === 'function') {
          return result.catch((error: any) => {
            this.handleDispatchError(storeName, actionType, error, {
              args,
              prevState,
              async: true,
              duration: Date.now() - startTime
            });
            throw error;
          });
        }

        return result;

      } catch (error) {
        this.handleDispatchError(storeName, actionType, error, {
          args,
          prevState,
          async: false,
          duration: Date.now() - startTime
        });
        throw error;
      }
    };
  }

  /**
   * 包装setState方法
   */
  private wrapSetState<T extends any[]>(
    storeName: string,
    originalSetState: (...args: T) => void,
    getOriginalSetState: () => (...args: T) => void
  ): (...args: T) => void {
    return (...args: T) => {
      try {
        originalSetState(...args);
      } catch (error) {
        this.handleStateError(storeName, 'setState', error, {
          args
        });
        throw error;
      }
    };
  }

  /**
   * 包装store方法
   */
  private wrapStoreMethod<T extends any[]>(
    storeName: string,
    methodName: string,
    originalMethod: (...args: T) => any,
    getCurrentState: () => any
  ): (...args: T) => any {
    return (...args: T) => {
      const prevState = getCurrentState();
      const startTime = Date.now();

      try {
        const result = originalMethod(...args);

        // 如果返回Promise，处理异步结果
        if (result && typeof result.then === 'function') {
          return result.then((value: any) => {
            const nextState = getCurrentState();
            this.recordStateTransition(storeName, methodName, prevState, nextState, Date.now() - startTime);
            return value;
          }).catch((error: any) => {
            this.handleStateError(storeName, methodName, error, {
              args,
              prevState,
              async: true,
              duration: Date.now() - startTime
            });
            throw error;
          });
        }

        // 同步结果，记录状态变化
        const nextState = getCurrentState();
        this.recordStateTransition(storeName, methodName, prevState, nextState, Date.now() - startTime);

        return result;

      } catch (error) {
        this.handleStateError(storeName, methodName, error, {
          args,
          prevState,
          async: false,
          duration: Date.now() - startTime
        });
        throw error;
      }
    };
  }

  /**
   * 记录状态转换
   */
  private recordStateTransition(
    storeName: string,
    action: string,
    prevState: any,
    nextState: any,
    duration: number = 0
  ): void {
    const transition: StateTransition = {
      storeName,
      action,
      prevState: this.config.enableStateDiff ? prevState : undefined,
      nextState: this.config.enableStateDiff ? nextState : undefined,
      timestamp: new Date(),
      duration,
      stackTrace: this.config.enableStackTrace ? this.captureStackTrace() : undefined
    };

    // 保存到历史记录
    if (!this.stateHistory.has(storeName)) {
      this.stateHistory.set(storeName, []);
    }

    const history = this.stateHistory.get(storeName)!;
    history.push(transition);

    // 限制历史记录长度
    if (history.length > this.config.maxStateHistory) {
      history.splice(0, history.length - this.config.maxStateHistory);
    }
  }

  /**
   * 处理dispatch错误
   */
  private async handleDispatchError(
    storeName: string,
    action: string,
    error: Error,
    context: any
  ): Promise<void> {
    await this.recordStateError({
      storeName,
      action,
      error,
      context
    });
  }

  /**
   * 处理状态错误
   */
  private async handleStateError(
    storeName: string,
    action: string,
    error: Error,
    context: any
  ): Promise<void> {
    await this.recordStateError({
      storeName,
      action,
      error,
      context
    });
  }

  /**
   * 检查状态大小
   */
  private checkStateSize(storeName: string, state: any): void {
    try {
      const stateSize = JSON.stringify(state).length;

      if (stateSize > this.config.stateSizeThreshold) {
        console.warn(`Large state detected in ${storeName}: ${stateSize} bytes`);

        // 记录大状态警告
        this.recordStateError({
          storeName,
          action: 'large_state_warning',
          error: new Error(`State size too large: ${stateSize} bytes`),
          stateSize,
          context: {
            threshold: this.config.stateSizeThreshold,
            warning: true
          }
        });
      }
    } catch (error) {
      console.warn(`Failed to check state size for ${storeName}:`, error);
    }
  }

  /**
   * 捕获堆栈跟踪
   */
  private captureStackTrace(): string {
    try {
      throw new Error();
    } catch (error) {
      return (error as Error).stack || '';
    }
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<StateErrorMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  public getConfig(): Required<StateErrorMonitorConfig> {
    return { ...this.config };
  }
}

// 创建默认实例
export const stateErrorMonitor = StateErrorMonitor.getInstance();

// React Hook
export function useStateErrorMonitor() {
  const [errors, setErrors] = React.useState<StateErrorInfo[]>([]);

  React.useEffect(() => {
    const unsubscribe = stateErrorMonitor.addErrorListener((errorInfo) => {
      setErrors(prev => [...prev.slice(-9), errorInfo]); // 保留最新10个错误
    });

    return unsubscribe;
  }, []);

  const wrapStore = React.useCallback((storeName: string, store: any, options?: any) => {
    return stateErrorMonitor.wrapStore(storeName, store, options);
  }, []);

  const wrapReduxStore = React.useCallback((storeName: string, store: any) => {
    return stateErrorMonitor.wrapReduxStore(storeName, store);
  }, []);

  const wrapZustandStore = React.useCallback((storeName: string, useStore: any) => {
    return stateErrorMonitor.wrapZustandStore(storeName, useStore);
  }, []);

  const clearErrors = React.useCallback(() => {
    setErrors([]);
  }, []);

  return {
    errors,
    clearErrors,
    wrapStore,
    wrapReduxStore,
    wrapZustandStore
  };
}

// 导出默认实例
export default stateErrorMonitor;