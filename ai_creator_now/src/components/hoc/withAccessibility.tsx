import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityProps, KeyboardNavigation, ScreenReaderSupport } from '../../utils/accessibility';

// 可访问性增强的Props
interface WithAccessibilityProps {
  role?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaLive?: 'off' | 'polite' | 'assertive';
  ariaExpanded?: boolean;
  ariaPressed?: boolean;
  ariaSelected?: boolean;
  ariaDisabled?: boolean;
  ariaRequired?: boolean;
  ariaInvalid?: boolean;
  ariaErrorMessage?: string;
  tabIndex?: number;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  children?: React.ReactNode;
}

// 可访问性增强的HOC
export function withAccessibility<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  accessibilityOptions?: Partial<WithAccessibilityProps>
) {
  return function AccessibilityEnhancedComponent(props: P & WithAccessibilityProps) {
    const elementRef = useRef<HTMLElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [announcedMessage, setAnnouncedMessage] = useState<string>('');

    const {
      role,
      ariaLabel,
      ariaDescribedBy,
      ariaLive,
      ariaExpanded,
      ariaPressed,
      ariaSelected,
      ariaDisabled,
      ariaRequired,
      ariaInvalid,
      ariaErrorMessage,
      tabIndex,
      onFocus,
      onBlur,
      onKeyDown,
      children,
      ...restProps
    } = props;

    // 合并可访问性选项
    const mergedAccessibilityProps = {
      ...accessibilityOptions,
      role,
      'aria-label': ariaLabel || accessibilityOptions?.ariaLabel,
      'aria-describedby': ariaDescribedBy || accessibilityOptions?.ariaDescribedBy,
      'aria-live': ariaLive || accessibilityOptions?.ariaLive,
      'aria-expanded': ariaExpanded !== undefined ? ariaExpanded : accessibilityOptions?.ariaExpanded,
      'aria-pressed': ariaPressed !== undefined ? ariaPressed : accessibilityOptions?.ariaPressed,
      'aria-selected': ariaSelected !== undefined ? ariaSelected : accessibilityOptions?.ariaSelected,
      'aria-disabled': ariaDisabled !== undefined ? ariaDisabled : accessibilityOptions?.ariaDisabled,
      'aria-required': ariaRequired !== undefined ? ariaRequired : accessibilityOptions?.ariaRequired,
      'aria-invalid': ariaInvalid !== undefined ? ariaInvalid : accessibilityOptions?.ariaInvalid,
      'aria-errormessage': ariaErrorMessage || accessibilityOptions?.ariaErrorMessage,
      tabIndex: tabIndex !== undefined ? tabIndex : accessibilityOptions?.tabIndex,
      ref: elementRef,
    };

    // 处理焦点事件
    const handleFocus = (e: React.FocusEvent) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    // 处理键盘事件
    const handleKeyDown = (e: React.KeyboardEvent) => {
      // 通用键盘导航支持
      switch (e.key) {
        case 'Enter':
        case ' ':
          if (props.role === 'button' || props.role === 'menuitem') {
            e.preventDefault();
            e.currentTarget.click();
          }
          break;
        case 'Escape':
          if (ariaExpanded) {
            e.preventDefault();
            // 触发关闭事件
            e.currentTarget.dispatchEvent(new CustomEvent('accessibility:close'));
          }
          break;
      }

      onKeyDown?.(e);
    };

    // 屏幕阅读器公告
    const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      setAnnouncedMessage(message);
      ScreenReaderSupport.announceToScreenReader(message, priority);
    };

    // 添加键盘快捷键
    useEffect(() => {
      if (elementRef.current) {
        const cleanup = KeyboardNavigation.addKeyboardShortcut(
          elementRef.current,
          'Enter',
          () => {
            announce('按钮已激活');
            elementRef.current?.click();
          },
          '激活'
        );

        return cleanup;
      }
    }, []);

    // 监听自定义事件
    useEffect(() => {
      const element = elementRef.current;
      if (!element) return;

      const handleCustomEvent = (e: CustomEvent) => {
        switch (e.type) {
          case 'accessibility:announce':
            announce(e.detail.message, e.detail.priority);
            break;
          case 'accessibility:focus':
            element.focus();
            break;
          case 'accessibility:close':
            if (ariaExpanded) {
              element.click();
            }
            break;
        }
      };

      element.addEventListener('accessibility:announce', handleCustomEvent as EventListener);
      element.addEventListener('accessibility:focus', handleCustomEvent as EventListener);
      element.addEventListener('accessibility:close', handleCustomEvent as EventListener);

      return () => {
        element.removeEventListener('accessibility:announce', handleCustomEvent as EventListener);
        element.removeEventListener('accessibility:focus', handleCustomEvent as EventListener);
        element.removeEventListener('accessibility:close', handleCustomEvent as EventListener);
      };
    }, [ariaExpanded]);

    return (
      <div
        className={`accessibility-enhanced ${isFocused ? 'accessibility-focused' : ''}`}
        {...mergedAccessibilityProps}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-accessibility-enhanced="true"
      >
        <WrappedComponent
          {...(restProps as P)}
          announce={announce}
          isFocused={isFocused}
        />
        {announcedMessage && (
          <div
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {announcedMessage}
          </div>
        )}
      </div>
    );
  };
}

// 特定组件的可访问性增强
export function withButtonAccessibility<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return withAccessibility(WrappedComponent, {
    role: 'button',
    tabIndex: 0,
    'aria-disabled': false
  });
}

export function withLinkAccessibility<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return withAccessibility(WrappedComponent, {
    role: 'link',
    tabIndex: 0
  });
}

export function withModalAccessibility<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function ModalEnhancedComponent(props: P) {
    const [isVisible, setIsVisible] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setIsVisible(true);

      // 焦点管理
      if (elementRef.current) {
        const cleanup = KeyboardNavigation.createFocusTrap(elementRef.current);
        return cleanup;
      }
    }, []);

    useEffect(() => {
      if (isVisible) {
        ScreenReaderSupport.announceToScreenReader('模态框已打开', 'polite');
      }
    }, [isVisible]);

    const handleClose = () => {
      setIsVisible(false);
      ScreenReaderSupport.announceToScreenReader('模态框已关闭', 'polite');
    };

    return (
      <div
        ref={elementRef}
        role="dialog"
        aria-modal="true"
        aria-label="对话框"
        className="accessibility-modal"
        data-accessibility-enhanced="true"
      >
        <WrappedComponent
          {...(props as P)}
          onClose={handleClose}
          isVisible={isVisible}
        />
      </div>
    );
  };
}

export function withFormAccessibility<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function FormEnhancedComponent(props: P) {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const handleFieldError = (fieldName: string, error: string) => {
      setErrors(prev => ({ ...prev, [fieldName]: error }));
      setTouched(prev => ({ ...prev, [fieldName]: true }));
      ScreenReaderSupport.announceFormErrors({ [fieldName]: error });
    };

    const clearFieldError = (fieldName: string) => {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    };

    const handleValidation = (validationErrors: Record<string, string>) => {
      setErrors(validationErrors);
      Object.keys(validationErrors).forEach(field => {
        setTouched(prev => ({ ...prev, [field]: true }));
      });
      ScreenReaderSupport.announceFormErrors(validationErrors);
    };

    return (
      <div
        role="form"
        aria-label="表单"
        noValidate
        className="accessibility-form"
        data-accessibility-enhanced="true"
      >
        <WrappedComponent
          {...(props as P)}
          errors={errors}
          touched={touched}
          onFieldError={handleFieldError}
          clearFieldError={clearFieldError}
          onValidation={handleValidation}
        />
      </div>
    );
  };
}

export function withTableAccessibility<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function TableEnhancedComponent(props: P) {
    return (
      <div
        role="region"
        aria-label="数据表格"
        tabIndex={0}
        className="accessibility-table-container"
        data-accessibility-enhanced="true"
      >
        <WrappedComponent
          {...(props as P)}
        />
      </div>
    );
  };
}

// 可访问性Hook
export function useAccessibility() {
  const [announcements, setAnnouncements] = useState<string[]>([]);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements(prev => [...prev, message]);
    ScreenReaderSupport.announceToScreenReader(message, priority);
  };

  const focusElement = (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
      announce(`已聚焦到 ${element.getAttribute('aria-label') || selector}`);
    }
  };

  const createSkipLink = (targetId: string, text?: string) => {
    return ScreenReaderSupport.createSkipLink(targetId, text);
  };

  const checkAccessibility = () => {
    const report = {
      images: 0,
      headings: 0,
      forms: 0,
      links: 0
    };

    // 简化的可访问性检查
    report.images = document.querySelectorAll('img').length;
    report.headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    report.forms = document.querySelectorAll('form').length;
    report.links = document.querySelectorAll('a').length;

    announce(`可访问性检查完成: ${report.images}张图片, ${report.headings}个标题, ${report.forms}个表单, ${report.links}个链接`);

    return report;
  };

  return {
    announce,
    focusElement,
    createSkipLink,
    checkAccessibility,
    announcements
  };
}

export default withAccessibility;