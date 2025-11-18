/**
 * 可访问性工具模块
 * 提供可访问性相关的实用函数和组件增强
 */

// ARIA属性生成器
export class AriaUtils {
  /**
   * 生成按钮的ARIA属性
   */
  static buttonAttributes(options: {
    label?: string;
    describedBy?: string;
    expanded?: boolean;
    pressed?: boolean;
    disabled?: boolean;
  }) {
    const attributes: Record<string, string | boolean> = {};

    if (options.label) attributes['aria-label'] = options.label;
    if (options.describedBy) attributes['aria-describedby'] = options.describedBy;
    if (options.expanded !== undefined) attributes['aria-expanded'] = options.expanded;
    if (options.pressed !== undefined) attributes['aria-pressed'] = options.pressed;
    if (options.disabled) attributes['aria-disabled'] = true;

    return attributes;
  }

  /**
   * 生成输入框的ARIA属性
   */
  static inputAttributes(options: {
    label?: string;
    describedBy?: string;
    required?: boolean;
    invalid?: boolean;
    errorMessage?: string;
  }) {
    const attributes: Record<string, string | boolean> = {};

    if (options.label) attributes['aria-label'] = options.label;
    if (options.describedBy) attributes['aria-describedby'] = options.describedBy;
    if (options.required) attributes['aria-required'] = true;
    if (options.invalid) attributes['aria-invalid'] = true;
    if (options.errorMessage) attributes['aria-errormessage'] = options.errorMessage;

    return attributes;
  }

  /**
   * 生成列表的ARIA属性
   */
  static listAttributes(options: {
    label?: string;
    size?: number;
    orientation?: 'horizontal' | 'vertical';
  }) {
    const attributes: Record<string, string | number> = {};

    if (options.label) attributes['aria-label'] = options.label;
    if (options.size) attributes['aria-setsize'] = options.size;
    if (options.orientation) attributes['aria-orientation'] = options.orientation;

    return attributes;
  }

  /**
   * 生成模态框的ARIA属性
   */
  static modalAttributes(options: {
    label?: string;
    describedBy?: string;
  }) {
    return {
      role: 'dialog' as const,
      'aria-modal': true,
      ...(options.label && { 'aria-label': options.label }),
      ...(options.describedBy && { 'aria-describedby': options.describedBy })
    };
  }
}

// 键盘导航增强
export class KeyboardNavigation {
  /**
   * 管理焦点陷阱
   */
  static createFocusTrap(container: HTMLElement) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 触发关闭事件
        container.dispatchEvent(new CustomEvent('closeModal'));
      }
    };

    container.addEventListener('keydown', handleTabKey);
    container.addEventListener('keydown', handleEscapeKey);

    // 初始焦点
    firstElement?.focus();

    // 返回清理函数
    return () => {
      container.removeEventListener('keydown', handleTabKey);
      container.removeEventListener('keydown', handleEscapeKey);
    };
  }

  /**
   * 为元素添加键盘快捷键
   */
  static addKeyboardShortcut(
    element: HTMLElement,
    shortcut: string,
    callback: () => void,
    description?: string
  ) {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = shortcut.toLowerCase().split('+');
      const ctrl = keys.includes('ctrl');
      const shift = keys.includes('shift');
      const alt = keys.includes('alt');
      const key = keys[keys.length - 1];

      if (
        e.ctrlKey === ctrl &&
        e.shiftKey === shift &&
        e.altKey === alt &&
        e.key.toLowerCase() === key
      ) {
        e.preventDefault();
        callback();
      }
    };

    element.addEventListener('keydown', handleKeyDown);

    // 添加title属性或aria-label
    if (description && !element.getAttribute('aria-label') && !element.getAttribute('title')) {
      element.setAttribute('title', `${description} (${shortcut})`);
    }

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }
}

// 屏幕阅读器支持
export class ScreenReaderSupport {
  /**
   * 为动态内容更新添加实时区域
   */
  static announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // 清理
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * 跳转到主要内容
   */
  static createSkipLink(targetId: string, text: string = '跳转到主要内容') {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = text;
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50';

    document.body.insertBefore(skipLink, document.body.firstChild);
    return skipLink;
  }

  /**
   * 为表单错误添加屏幕阅读器支持
   */
  static announceFormErrors(errors: Record<string, string>) {
    const errorMessages = Object.entries(errors)
      .map(([field, message]) => `${field}: ${message}`)
      .join(', ');

    this.announceToScreenReader(`表单验证失败: ${errorMessages}`, 'assertive');
  }
}

// 颜色对比度检查
export class ColorContrast {
  /**
   * 计算相对亮度
   */
  static getLuminance(hexColor: string): number {
    const rgb = this.hexToRgb(hexColor);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * 十六进制颜色转RGB
   */
  static hexToRgb(hexColor: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  }

  /**
   * 计算对比度
   */
  static getContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * 检查WCAG合规性
   */
  static checkWCAGCompliance(foreground: string, background: string): {
    ratio: number;
    aaNormal: boolean;
    aaLarge: boolean;
    aaaNormal: boolean;
    aaaLarge: boolean;
  } {
    const ratio = this.getContrastRatio(foreground, background);

    return {
      ratio,
      aaNormal: ratio >= 4.5,
      aaLarge: ratio >= 3,
      aaaNormal: ratio >= 7,
      aaaLarge: ratio >= 4.5
    };
  }

  /**
   * 获取建议的颜色组合
   */
  static getSuggestedColors(baseColor: string): {
    foreground: string;
    background: string;
    ratio: number;
  }[] {
    const colors = [
      '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
      '#FFFF00', '#FF00FF', '#00FFFF', '#800000', '#008000',
      '#000080', '#808000', '#800080', '#008080', '#C0C0C0'
    ];

    return colors
      .map(color => ({
        foreground: baseColor,
        background: color,
        ratio: this.getContrastRatio(baseColor, color)
      }))
      .filter(item => item.ratio >= 4.5)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 5);
  }
}

// 可访问性测试工具
export class AccessibilityTester {
  /**
   * 检查图片alt属性
   */
  static checkImageAlts(): {
    missing: HTMLImageElement[];
    empty: HTMLImageElement[];
    good: HTMLImageElement[];
  } {
    const images = document.querySelectorAll('img');
    const result = { missing: [], empty: [], good: [] } as {
      missing: HTMLImageElement[];
      empty: HTMLImageElement[];
      good: HTMLImageElement[];
    };

    images.forEach(img => {
      const alt = img.getAttribute('alt');
      if (alt === null) {
        result.missing.push(img);
      } else if (alt === '') {
        result.empty.push(img);
      } else {
        result.good.push(img);
      }
    });

    return result;
  }

  /**
   * 检查标题层级
   */
  static checkHeadingStructure(): {
    issues: Array<{
      element: HTMLHeadingElement;
      issue: string;
    }>;
    headings: HTMLHeadingElement[];
  } {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const issues: Array<{ element: HTMLHeadingElement; issue: string }> = [];

    let previousLevel = 0;

    headings.forEach((heading, index) => {
      const currentLevel = parseInt(heading.tagName.substring(1));

      // 检查是否跳过层级
      if (previousLevel > 0 && currentLevel > previousLevel + 1) {
        issues.push({
          element: heading,
          issue: `跳过了标题层级 (从 H${previousLevel} 到 H${currentLevel})`
        });
      }

      // 检查是否有多个H1
      if (currentLevel === 1 && index > 0) {
        issues.push({
          element: heading,
          issue: '页面有多个H1标题'
        });
      }

      previousLevel = currentLevel;
    });

    return { issues, headings: Array.from(headings) as HTMLHeadingElement[] };
  }

  /**
   * 检查表单标签
   */
  static checkFormLabels(): {
    unlabeled: HTMLInputElement[];
    labeled: HTMLInputElement[];
  } {
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="search"], textarea, select');
    const result = { unlabeled: [], labeled: [] } as {
      unlabeled: HTMLInputElement[];
      labeled: HTMLInputElement[];
    };

    inputs.forEach(input => {
      const hasLabel = document.querySelector(`label[for="${input.id}"]`) ||
                       input.getAttribute('aria-label') ||
                       input.getAttribute('title') ||
                       input.getAttribute('aria-labelledby');

      if (hasLabel) {
        result.labeled.push(input as HTMLInputElement);
      } else {
        result.unlabeled.push(input as HTMLInputElement);
      }
    });

    return result;
  }

  /**
   * 生成可访问性报告
   */
  static generateReport(): {
    images: ReturnType<typeof this.checkImageAlts>;
    headings: ReturnType<typeof this.checkHeadingStructure>;
    forms: ReturnType<typeof this.checkFormLabels>;
    timestamp: string;
  } {
    return {
      images: this.checkImageAlts(),
      headings: this.checkHeadingStructure(),
      forms: this.checkFormLabels(),
      timestamp: new Date().toISOString()
    };
  }
}

// 可访问性增强组件Props生成器
export class AccessibilityProps {
  /**
   * 为按钮生成可访问性属性
   */
  static button(options: {
    children?: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
    ariaLabel?: string;
    ariaDescribedBy?: string;
  }) {
    return {
      type: 'button' as const,
      disabled: options.disabled || options.loading,
      'aria-label': options.ariaLabel,
      'aria-describedby': options.ariaDescribedBy,
      'aria-busy': options.loading,
      role: 'button' as const,
      tabIndex: options.disabled ? -1 : 0
    };
  }

  /**
   * 为链接生成可访问性属性
   */
  static link(options: {
    href?: string;
    external?: boolean;
    ariaLabel?: string;
    ariaDescribedBy?: string;
  }) {
    return {
      href: options.href || '#',
      'aria-label': options.ariaLabel,
      'aria-describedby': options.ariaDescribedBy,
      ...(options.external && {
        target: '_blank' as const,
        rel: 'noopener noreferrer'
      })
    };
  }

  /**
   * 为输入框生成可访问性属性
   */
  static input(options: {
    id: string;
    label: string;
    required?: boolean;
    error?: string;
    describedBy?: string;
  }) {
    const describedBy = [
      options.describedBy,
      options.error ? `${options.id}-error` : undefined
    ].filter(Boolean).join(' ');

    return {
      id: options.id,
      'aria-label': options.label,
      'aria-describedby': describedBy || undefined,
      'aria-required': options.required,
      'aria-invalid': !!options.error,
      'aria-errormessage': options.error ? `${options.id}-error` : undefined
    };
  }

  /**
   * 为列表生成可访问性属性
   */
  static list(options: {
    label?: string;
    orientation?: 'horizontal' | 'vertical';
  }) {
    return {
      role: 'list' as const,
      'aria-label': options.label,
      'aria-orientation': options.orientation || 'vertical'
    };
  }
}

export default {
  AriaUtils,
  KeyboardNavigation,
  ScreenReaderSupport,
  ColorContrast,
  AccessibilityTester,
  AccessibilityProps
};