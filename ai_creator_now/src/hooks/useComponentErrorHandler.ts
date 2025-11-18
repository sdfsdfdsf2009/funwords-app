import { useState, useCallback } from 'react';

export interface ComponentError {
  id: string;
  message: string;
  type: 'error' | 'warning';
  timestamp: Date;
  retryCount: number;
}

export const useComponentErrorHandler = () => {
  const [errors, setErrors] = useState<ComponentError[]>([]);

  const handleError = useCallback((error: Error | string, type: 'error' | 'warning' = 'error') => {
    const newError: ComponentError = {
      id: Date.now().toString(),
      message: typeof error === 'string' ? error : error.message,
      type,
      timestamp: new Date(),
      retryCount: 0
    };

    setErrors(prev => [...prev, newError]);
  }, []);

  const retryAction = useCallback(async (action: () => Promise<void>, errorId: string) => {
    setErrors(prev =>
      prev.map(error =>
        error.id === errorId
          ? { ...error, retryCount: error.retryCount + 1 }
          : error
      )
    );

    try {
      await action();
      setErrors(prev => prev.filter(error => error.id !== errorId));
    } catch (error) {
      handleError(error as Error, 'error');
    }
  }, [handleError]);

  const clearError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    errors,
    handleError,
    retryAction,
    clearError,
    clearAllErrors,
    hasErrors: errors.length > 0
  };
};