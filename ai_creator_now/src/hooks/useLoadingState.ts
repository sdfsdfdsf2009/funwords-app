import { useState, useEffect, useCallback, useRef } from 'react';

// 加载状态接口
export interface LoadingState {
  isLoading: boolean;
  loading: boolean;
  error: Error | null;
  progress: number;
  message: string;
  stage: string;
}

// 加载配置接口
export interface LoadingConfig {
  initialMessage?: string;
  showProgress?: boolean;
  timeout?: number;
  stages?: string[];
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  onTimeout?: () => void;
}

// 加载操作接口
export interface LoadingActions {
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  setError: (error: Error | null) => void;
  setProgress: (progress: number, message?: string) => void;
  setStage: (stage: string, message?: string) => void;
  reset: () => void;
  executeWithLoading: <T>(
    asyncFunction: () => Promise<T>,
    loadingMessage?: string
  ) => Promise<T>;
}

// 完整的Hook返回类型
export type UseLoadingStateReturn = LoadingState & LoadingActions;

// 主要的加载状态Hook
export function useLoadingState(config: LoadingConfig = {}): UseLoadingStateReturn {
  const {
    initialMessage = '加载中...',
    showProgress = false,
    timeout = 30000, // 30秒超时
    stages = [],
    onProgress,
    onComplete,
    onError,
    onTimeout
  } = config;

  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    loading: false,
    error: null,
    progress: 0,
    message: initialMessage,
    stage: ''
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // 清理超时
  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // 设置超时
  const setupTimeout = useCallback(() => {
    if (timeout > 0) {
      clearTimeoutRef();
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            loading: false,
            error: new Error('加载超时，请重试')
          }));
          onTimeout?.();
        }
      }, timeout);
    }
  }, [timeout, onTimeout, clearTimeoutRef]);

  // 开始加载
  const startLoading = useCallback((message?: string) => {
    if (!isMountedRef.current) return;

    setState(prev => ({
      ...prev,
      isLoading: true,
      loading: true,
      error: null,
      progress: 0,
      message: message || initialMessage,
      stage: stages[0] || ''
    }));

    setupTimeout();
  }, [initialMessage, stages, setupTimeout]);

  // 停止加载
  const stopLoading = useCallback(() => {
    if (!isMountedRef.current) return;

    clearTimeoutRef();
    setState(prev => ({
      ...prev,
      isLoading: false,
      loading: false,
      progress: showProgress ? 100 : prev.progress
    }));

    onComplete?.();
  }, [showProgress, onComplete, clearTimeoutRef]);

  // 设置错误
  const setError = useCallback((error: Error | null) => {
    if (!isMountedRef.current) return;

    clearTimeoutRef();
    setState(prev => ({
      ...prev,
      isLoading: false,
      loading: false,
      error
    }));

    if (error) {
      onError?.(error);
    }
  }, [onError, clearTimeoutRef]);

  // 设置进度
  const setProgress = useCallback((progress: number, message?: string) => {
    if (!isMountedRef.current) return;

    const clampedProgress = Math.max(0, Math.min(100, progress));

    setState(prev => ({
      ...prev,
      progress: clampedProgress,
      message: message || prev.message
    }));

    onProgress?.(clampedProgress);

    // 如果进度完成，自动停止加载
    if (clampedProgress >= 100) {
      setTimeout(() => stopLoading(), 500);
    }
  }, [onProgress, stopLoading]);

  // 设置阶段
  const setStage = useCallback((stage: string, message?: string) => {
    if (!isMountedRef.current) return;

    setState(prev => ({
      ...prev,
      stage,
      message: message || prev.message
    }));
  }, []);

  // 重置状态
  const reset = useCallback(() => {
    if (!isMountedRef.current) return;

    clearTimeoutRef();
    setState({
      isLoading: false,
      loading: false,
      error: null,
      progress: 0,
      message: initialMessage,
      stage: ''
    });
  }, [initialMessage, clearTimeoutRef]);

  // 执行异步操作并自动管理加载状态
  const executeWithLoading = useCallback(async <T>(
    asyncFunction: () => Promise<T>,
    loadingMessage?: string
  ): Promise<T> => {
    startLoading(loadingMessage);

    try {
      const result = await asyncFunction();
      stopLoading();
      return result;
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, [startLoading, stopLoading, setError]);

  // 组件卸载时清理
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimeoutRef();
    };
  }, [clearTimeoutRef]);

  return {
    ...state,
    startLoading,
    stopLoading,
    setError,
    setProgress,
    setStage,
    reset,
    executeWithLoading
  };
}

// 分步加载Hook
export function useSteppedLoading(steps: string[], config: LoadingConfig = {}) {
  const [currentStep, setCurrentStep] = useState(0);
  const loadingState = useLoadingState({
    ...config,
    stages: steps
  });

  const { setProgress, setStage, startLoading } = loadingState;

  const nextStep = useCallback((message?: string) => {
    if (currentStep < steps.length - 1) {
      const nextIndex = currentStep + 1;
      setCurrentStep(nextIndex);
      const stepName = steps[nextIndex];
      setStage(stepName, message);

      // 计算进度
      const progress = ((nextIndex + 1) / steps.length) * 100;
      setProgress(progress, message);

      return nextIndex;
    }
    return currentStep;
  }, [currentStep, steps, setProgress, setStage]);

  const jumpToStep = useCallback((stepIndex: number, message?: string) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
      const stepName = steps[stepIndex];
      setStage(stepName, message);

      const progress = ((stepIndex + 1) / steps.length) * 100;
      setProgress(progress, message);
    }
  }, [steps, setProgress, setStage]);

  const startSteppedLoading = useCallback((message?: string) => {
    setCurrentStep(0);
    startLoading(message);
    if (steps.length > 0) {
      setStage(steps[0], message);
      setProgress((1 / steps.length) * 100, message);
    }
  }, [steps, startLoading, setStage, setProgress]);

  return {
    ...loadingState,
    currentStep,
    totalSteps: steps.length,
    currentStepName: steps[currentStep] || '',
    nextStep,
    jumpToStep,
    startSteppedLoading
  };
}

// 多个加载状态管理Hook
export function useMultiLoadingState(keys: string[]) {
  const [states, setStates] = useState<Record<string, LoadingState>>(() => {
    return keys.reduce((acc, key) => ({
      ...acc,
      [key]: {
        isLoading: false,
        loading: false,
        error: null,
        progress: 0,
        message: '加载中...',
        stage: ''
      }
    }), {});
  });

  const updateState = useCallback((key: string, updates: Partial<LoadingState>) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates }
    }));
  }, []);

  const startLoading = useCallback((key: string, message?: string) => {
    updateState(key, {
      isLoading: true,
      loading: true,
      error: null,
      progress: 0,
      message: message || '加载中...'
    });
  }, [updateState]);

  const stopLoading = useCallback((key: string) => {
    updateState(key, {
      isLoading: false,
      loading: false,
      progress: 100
    });
  }, [updateState]);

  const setError = useCallback((key: string, error: Error | null) => {
    updateState(key, {
      isLoading: false,
      loading: false,
      error
    });
  }, [updateState]);

  const setProgress = useCallback((key: string, progress: number, message?: string) => {
    updateState(key, {
      progress: Math.max(0, Math.min(100, progress)),
      message: message || states[key]?.message
    });
  }, [updateState, states]);

  const isAnyLoading = Object.values(states).some(state => state.isLoading);
  const globalProgress = Object.values(states).reduce((sum, state) => sum + state.progress, 0) / keys.length;

  return {
    states,
    isAnyLoading,
    globalProgress,
    startLoading,
    stopLoading,
    setError,
    setProgress,
    updateState
  };
}

// 带重试功能的加载Hook
export function useLoadingWithRetry<T>(
  asyncFunction: () => Promise<T>,
  config: LoadingConfig & { maxRetries?: number; retryDelay?: number } = {}
) {
  const { maxRetries = 3, retryDelay = 1000, ...loadingConfig } = config;
  const [retryCount, setRetryCount] = useState(0);
  const loadingState = useLoadingState(loadingConfig);

  const execute = useCallback(async (): Promise<T> => {
    try {
      const result = await loadingState.executeWithLoading(asyncFunction);
      setRetryCount(0); // 重置重试计数
      return result;
    } catch (error) {
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        console.warn(`加载失败，正在重试 (${retryCount + 1}/${maxRetries})...`, error);

        // 延迟后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return execute();
      } else {
        setRetryCount(0);
        throw error;
      }
    }
  }, [asyncFunction, loadingState, retryCount, maxRetries, retryDelay]);

  return {
    ...loadingState,
    retryCount,
    execute,
    canRetry: retryCount < maxRetries
  };
}

// 导出类型
export type { LoadingConfig, LoadingState, LoadingActions };