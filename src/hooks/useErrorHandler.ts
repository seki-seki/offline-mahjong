import { useState, useCallback } from 'react';
import { BaseError, getUserFriendlyMessage } from '../utils/errors';
import { logger } from '../utils/logger';

export interface UseErrorHandlerResult {
  error: string | null;
  clearError: () => void;
  handleError: (error: any) => void;
}

export function useErrorHandler(): UseErrorHandlerResult {
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: any) => {
    logger.error('Error caught by useErrorHandler', error);
    
    let message: string;
    if (error instanceof BaseError) {
      message = getUserFriendlyMessage(error);
    } else if (error instanceof Error) {
      message = error.message;
    } else {
      message = '予期しないエラーが発生しました。';
    }
    
    setError(message);
    
    // Auto-clear error after 5 seconds
    setTimeout(() => {
      setError(null);
    }, 5000);
  }, []);

  return {
    error,
    clearError,
    handleError
  };
}