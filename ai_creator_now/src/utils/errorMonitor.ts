interface ErrorInfo {
  id: string;
  timestamp: Date;
  type: 'react' | 'javascript' | 'api' | 'network' | 'state' | 'user-interaction';
  message: string;
  stack?: string;
  source: string;
  component?: string;
  action?: string;
  userId?: string;
  sessionId: string;
  url: string;
  userAgent: string;
  context?: Record<string, any>;
}

interface UserAction {
  type: string;
  timestamp: Date;
  target: string;
  details?: Record<string, any>;
}

class ErrorMonitor {
  private errors: ErrorInfo[] = [];
  private userActions: UserAction[] = [];
  private sessionId: string;
  private maxErrors = 100;
  private maxActions = 50;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeErrorHandlers();
    this.initializeActionTracking();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeErrorHandlers(): void {
    // Global error handler for unhandled JavaScript errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logError({
          id: this.generateErrorId(),
          timestamp: new Date(),
          type: 'javascript',
          message: event.message,
          stack: event.error?.stack,
          source: event.filename || 'unknown',
          line: event.lineno,
          column: event.colno,
          sessionId: this.sessionId,
          url: window.location.href,
          userAgent: navigator.userAgent,
          context: {
            line: event.lineno,
            column: event.colno
          }
        });
      });

      // Global error handler for unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.logError({
          id: this.generateErrorId(),
          timestamp: new Date(),
          type: 'javascript',
          message: `Unhandled Promise Rejection: ${event.reason}`,
          stack: event.reason?.stack,
          source: 'promise',
          sessionId: this.sessionId,
          url: window.location.href,
          userAgent: navigator.userAgent,
          context: {
            reason: event.reason
          }
        });
      });
    }
  }

  private initializeActionTracking(): void {
    if (typeof window !== 'undefined') {
      // Track user clicks
      document.addEventListener('click', (event) => {
        try {
          const target = event.target as HTMLElement;
          if (!target || !target.tagName) {
            return; // Skip invalid targets
          }

          this.logUserAction({
            type: 'click',
            timestamp: new Date(),
            target: this.getElementSelector(target),
            details: {
              text: target.textContent?.slice(0, 50) || '',
              tagName: target.tagName || 'unknown',
              className: this.safeGetClassName(target)
            }
          });
        } catch (error) {
          // Log tracking errors without crashing
          console.warn('[ErrorMonitor] Failed to track click event:', error);
        }
      });

      // Track form submissions
      document.addEventListener('submit', (event) => {
        try {
          const target = event.target as HTMLFormElement;
          if (!target || !target.tagName) {
            return; // Skip invalid targets
          }

          this.logUserAction({
            type: 'form-submit',
            timestamp: new Date(),
            target: this.getElementSelector(target),
            details: {
              action: target.action || '',
              method: target.method || '',
              fields: target.elements?.length || 0
            }
          });
        } catch (error) {
          // Log tracking errors without crashing
          console.warn('[ErrorMonitor] Failed to track submit event:', error);
        }
      });
    }
  }

  private safeGetClassName(element: HTMLElement): string {
    try {
      if (!element.className) {
        return '';
      }

      if (typeof element.className === 'string') {
        return element.className;
      }

      if (typeof element.className === 'object' && 'baseVal' in element.className) {
        const svgClassName = element.className as SVGAnimatedString;
        return typeof svgClassName.baseVal === 'string' ? svgClassName.baseVal : '';
      }

      return '';
    } catch (error) {
      return '';
    }
  }

  private getElementSelector(element: HTMLElement): string {
    try {
      if (!element || !element.tagName) {
        return 'unknown';
      }

      if (element.id) {
        return `#${element.id}`;
      }

      // Safely extract class names from any element type
      const classNames = this.extractClassNames(element);
      if (classNames) {
        return `${element.tagName.toLowerCase()}.${classNames}`;
      }

      return element.tagName.toLowerCase();
    } catch (error) {
      // Fallback selector if anything goes wrong
      return element?.tagName?.toLowerCase?.() || 'unknown';
    }
  }

  private extractClassNames(element: HTMLElement): string {
    try {
      // Use classList when available - it's the most reliable method
      if (element.classList && typeof element.classList.length === 'number' && element.classList.length > 0) {
        try {
          const classArray = Array.from(element.classList);
          if (classArray && classArray.length > 0) {
            return classArray.join('.');
          }
        } catch (classListError) {
          // classList iteration failed, fall back to className
        }
      }

      // Fallback to className with robust type checking
      if (!element.className) {
        return '';
      }

      let classNameString = '';

      // Handle string className (HTML elements)
      if (typeof element.className === 'string') {
        classNameString = element.className.trim();
      }
      // Handle SVGAnimatedString (SVG elements)
      else if (element.className && typeof element.className === 'object' && 'baseVal' in element.className) {
        try {
          const svgClassName = element.className as SVGAnimatedString;
          if (typeof svgClassName.baseVal === 'string') {
            classNameString = svgClassName.baseVal.trim();
          }
        } catch (svgError) {
          // SVG className access failed
        }
      }
      // Handle objects with toString method
      else if (element.className && typeof element.className.toString === 'function') {
        try {
          const stringified = element.className.toString();
          if (typeof stringified === 'string') {
            classNameString = stringified.trim();
          }
        } catch (toStringError) {
          // toString failed
        }
      }

      // Validate and clean the class name string
      if (!classNameString || typeof classNameString !== 'string' || classNameString.trim() === '') {
        return '';
      }

      // Split by whitespace and filter out empty strings and invalid characters
      const classes = classNameString.split(/\s+/)
        .filter(cls => typeof cls === 'string' && cls.length > 0)
        .filter(cls => /^[a-zA-Z0-9_-]+$/.test(cls)) // Only allow valid CSS class characters

      if (classes.length === 0) {
        return '';
      }

      return classes.join('.');
    } catch (error) {
      // If anything goes wrong, return empty string
      return '';
    }
  }

  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public logError(errorInfo: Partial<ErrorInfo>): void {
    const fullErrorInfo: ErrorInfo = {
      id: errorInfo.id || this.generateErrorId(),
      timestamp: errorInfo.timestamp || new Date(),
      type: errorInfo.type || 'javascript',
      message: errorInfo.message || 'Unknown error',
      stack: errorInfo.stack,
      source: errorInfo.source || 'unknown',
      component: errorInfo.component,
      action: errorInfo.action,
      userId: errorInfo.userId,
      sessionId: this.sessionId,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
      context: errorInfo.context
    };

    this.errors.unshift(fullErrorInfo);

    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console for debugging
    console.error('[ErrorMonitor]', fullErrorInfo);

    // Store in localStorage for persistence
    this.persistErrors();
  }

  public logUserAction(action: UserAction): void {
    this.userActions.unshift(action);

    // Keep only the most recent actions
    if (this.userActions.length > this.maxActions) {
      this.userActions = this.userActions.slice(0, this.maxActions);
    }

    this.persistActions();
  }

  public logReactError(error: Error, errorInfo: any, component?: string): void {
    this.logError({
      id: this.generateErrorId(),
      timestamp: new Date(),
      type: 'react',
      message: error.message,
      stack: error.stack,
      source: errorInfo.componentStack || 'unknown',
      component,
      sessionId: this.sessionId,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
      context: {
        componentStack: errorInfo.componentStack
      }
    });
  }

  public logApiError(url: string, method: string, status: number, message: string, response?: any): void {
    this.logError({
      id: this.generateErrorId(),
      timestamp: new Date(),
      type: 'api',
      message: `API Error: ${method} ${url} - ${status} ${message}`,
      source: url,
      action: `${method} ${url}`,
      sessionId: this.sessionId,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
      context: {
        method,
        status,
        response
      }
    });
  }

  public logStateError(storeName: string, action: string, error: Error): void {
    this.logError({
      id: this.generateErrorId(),
      timestamp: new Date(),
      type: 'state',
      message: `State Error in ${storeName}: ${action} - ${error.message}`,
      source: storeName,
      action,
      sessionId: this.sessionId,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
      context: {
        storeName,
        action,
        stack: error.stack
      }
    });
  }

  private persistErrors(): void {
    try {
      localStorage.setItem('error-monitor-errors', JSON.stringify(this.errors.slice(0, 50)));
    } catch (error) {
      console.warn('[ErrorMonitor] Failed to persist errors:', error);
    }
  }

  private persistActions(): void {
    try {
      localStorage.setItem('error-monitor-actions', JSON.stringify(this.userActions.slice(0, 25)));
    } catch (error) {
      console.warn('[ErrorMonitor] Failed to persist actions:', error);
    }
  }

  public getErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  public getUserActions(): UserAction[] {
    return [...this.userActions];
  }

  public getErrorsByType(type: ErrorInfo['type']): ErrorInfo[] {
    return this.errors.filter(error => error.type === type);
  }

  public getRecentErrors(count: number = 10): ErrorInfo[] {
    return this.errors.slice(0, count);
  }

  public clearErrors(): void {
    this.errors = [];
    this.persistErrors();
  }

  public generateErrorReport(): string {
    const errors = this.getErrors();
    const actions = this.getUserActions();

    const report = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: errors.length,
        errorsByType: this.errors.reduce((acc, error) => {
          acc[error.type] = (acc[error.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        recentUserActions: actions.length
      },
      errors: errors.slice(0, 10), // Last 10 errors
      recentActions: actions.slice(0, 5), // Last 5 actions
      environment: {
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown'
      }
    };

    return JSON.stringify(report, null, 2);
  }

  public downloadErrorReport(): void {
    const report = this.generateErrorReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${this.sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public initializeFromStorage(): void {
    try {
      const storedErrors = localStorage.getItem('error-monitor-errors');
      if (storedErrors) {
        this.errors = JSON.parse(storedErrors);
      }

      const storedActions = localStorage.getItem('error-monitor-actions');
      if (storedActions) {
        this.userActions = JSON.parse(storedActions);
      }
    } catch (error) {
      console.warn('[ErrorMonitor] Failed to load from storage:', error);
    }
  }
}

// Create singleton instance
export const errorMonitor = new ErrorMonitor();

// Initialize on import
if (typeof window !== 'undefined') {
  errorMonitor.initializeFromStorage();
}