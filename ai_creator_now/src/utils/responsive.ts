/**
 * 响应式设计工具模块
 * 提供响应式设计相关的实用函数和Hook
 */

// 断点定义
export const breakpoints = {
  xs: '0px',      // 超小屏幕 (手机)
  sm: '640px',    // 小屏幕 (平板竖屏)
  md: '768px',    // 中等屏幕 (平板横屏)
  lg: '1024px',   // 大屏幕 (小型笔记本)
  xl: '1280px',   // 超大屏幕 (桌面)
  '2xl': '1536px' // 超超大屏幕 (大型桌面)
} as const;

// 媒体查询生成器
export class MediaQueries {
  static min(breakpoint: keyof typeof breakpoints): string {
    return `(min-width: ${breakpoints[breakpoint]})`;
  }

  static max(breakpoint: keyof typeof breakpoints): string {
    return `(max-width: ${breakpoints[breakpoint]})`;
  }

  static between(
    minBreakpoint: keyof typeof breakpoints,
    maxBreakpoint: keyof typeof breakpoints
  ): string {
    return `(min-width: ${breakpoints[minBreakpoint]}) and (max-width: ${breakpoints[maxBreakpoint]})`;
  }

  static only(breakpoint: keyof typeof breakpoints): string {
    const breakpointKeys = Object.keys(breakpoints) as (keyof typeof breakpoints)[];
    const index = breakpointKeys.indexOf(breakpoint);

    if (index === 0) {
      return this.max(breakpointKeys[1]);
    }

    if (index === breakpointKeys.length - 1) {
      return this.min(breakpoint);
    }

    return this.between(breakpoint, breakpointKeys[index + 1]);
  }
}

// 响应式值类型
export type ResponsiveValue<T> = T | Partial<Record<keyof typeof breakpoints, T>>;

// 响应式值解析器
export class ResponsiveValueParser {
  static parse<T>(value: ResponsiveValue<T>, defaultBreakpoint: keyof typeof breakpoints = 'lg'): T {
    if (typeof value === 'object' && value !== null) {
      // 找到最匹配的断点
      const breakpointKeys = Object.keys(breakpoints) as (keyof typeof breakpoints)[];
      const currentIndex = breakpointKeys.indexOf(defaultBreakpoint);

      // 从当前断点向下查找
      for (let i = currentIndex; i >= 0; i--) {
        const bp = breakpointKeys[i];
        if (value[bp] !== undefined) {
          return value[bp]!;
        }
      }

      // 如果没找到，返回第一个定义的值
      const firstDefined = Object.values(value).find(v => v !== undefined);
      return firstDefined as T;
    }

    return value as T;
  }

  static getResponsiveClasses<T extends Record<string, string>>(
    value: ResponsiveValue<keyof T>,
    classMap: T,
    defaultBreakpoint: keyof typeof breakpoints = 'lg'
  ): string {
    if (typeof value === 'object' && value !== null) {
      const classes: string[] = [];

      Object.entries(value).forEach(([breakpoint, className]) => {
        if (className && classMap[className]) {
          if (breakpoint === 'xs') {
            classes.push(classMap[className]);
          } else {
            classes.push(`${breakpoint}:${classMap[className]}`);
          }
        }
      });

      return classes.join(' ');
    }

    return classMap[value as keyof T] || '';
  }
}

// 视口尺寸检测
export class ViewportDetector {
  private static listeners: Set<() => void> = new Set();
  private static currentWidth = 0;
  private static currentHeight = 0;
  private static initialized = false;

  static init() {
    if (this.initialized) return;

    this.initialized = true;
    this.updateDimensions();

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize);
      window.addEventListener('orientationchange', this.handleResize);
    }
  }

  private static handleResize = () => {
    this.updateDimensions();
    this.listeners.forEach(listener => listener());
  };

  private static updateDimensions() {
    if (typeof window !== 'undefined') {
      this.currentWidth = window.innerWidth;
      this.currentHeight = window.innerHeight;
    }
  }

  static getWidth(): number {
    return this.currentWidth;
  }

  static getHeight(): number {
    return this.currentHeight;
  }

  static isBreakpoint(breakpoint: keyof typeof breakpoints): boolean {
    const width = this.getWidth();
    return width >= parseInt(breakpoints[breakpoint]);
  }

  static isBetween(
    minBreakpoint: keyof typeof breakpoints,
    maxBreakpoint: keyof typeof breakpoints
  ): boolean {
    const width = this.getWidth();
    return width >= parseInt(breakpoints[minBreakpoint]) &&
           width <= parseInt(breakpoints[maxBreakpoint]);
  }

  static getCurrentBreakpoint(): keyof typeof breakpoints {
    const breakpointKeys = Object.keys(breakpoints) as (keyof typeof breakpoints)[];

    for (let i = breakpointKeys.length - 1; i >= 0; i--) {
      if (this.isBreakpoint(breakpointKeys[i])) {
        return breakpointKeys[i];
      }
    }

    return 'xs';
  }

  static addListener(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

// 设备类型检测
export class DeviceDetector {
  static isMobile(): boolean {
    return ViewportDetector.getWidth() < 768;
  }

  static isTablet(): boolean {
    const width = ViewportDetector.getWidth();
    return width >= 768 && width < 1024;
  }

  static isDesktop(): boolean {
    return ViewportDetector.getWidth() >= 1024;
  }

  static isTouchDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  static isHighDensity(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-resolution: 2dppx)').matches;
  }

  static getPixelRatio(): number {
    if (typeof window === 'undefined') return 1;
    return window.devicePixelRatio || 1;
  }

  static getPreferredColorScheme(): 'light' | 'dark' | 'no-preference' {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }

    return 'no-preference';
  }

  static getReducedMotion(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  static getPrefersContrast(): 'high' | 'low' | 'no-preference' {
    if (typeof window === 'undefined' || !window.matchMedia) return 'no-preference';

    if (window.matchMedia('(prefers-contrast: high)').matches) {
      return 'high';
    } else if (window.matchMedia('(prefers-contrast: low)').matches) {
      return 'low';
    }

    return 'no-preference';
  }
}

// 响应式间距系统
export class ResponsiveSpacing {
  private static baseSpacing = {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
    '3xl': '4rem'   // 64px
  } as const;

  static getSpacing(
    size: keyof typeof ResponsiveSpacing.baseSpacing,
    multiplier: number = 1
  ): string {
    const base = this.baseSpacing[size];
    const value = parseFloat(base) * multiplier;
    return `${value}${base.replace(/[0-9.]/g, '')}`;
  }

  static getResponsivePadding(
    vertical: ResponsiveValue<keyof typeof ResponsiveSpacing.baseSpacing>,
    horizontal: ResponsiveValue<keyof typeof ResponsiveSpacing.baseSpacing>
  ): { paddingTop: string; paddingBottom: string; paddingLeft: string; paddingRight: string } {
    const vSize = ResponsiveValueParser.parse(vertical);
    const hSize = ResponsiveValueParser.parse(horizontal);

    return {
      paddingTop: this.getSpacing(vSize),
      paddingBottom: this.getSpacing(vSize),
      paddingLeft: this.getSpacing(hSize),
      paddingRight: this.getSpacing(hSize)
    };
  }

  static getResponsiveMargin(
    vertical: ResponsiveValue<keyof typeof ResponsiveSpacing.baseSpacing>,
    horizontal: ResponsiveValue<keyof typeof ResponsiveSpacing.baseSpacing>
  ): { marginTop: string; marginBottom: string; marginLeft: string; marginRight: string } {
    const vSize = ResponsiveValueParser.parse(vertical);
    const hSize = ResponsiveValueParser.parse(horizontal);

    return {
      marginTop: this.getSpacing(vSize),
      marginBottom: this.getSpacing(vSize),
      marginLeft: this.getSpacing(hSize),
      marginRight: this.getSpacing(hSize)
    };
  }
}

// 响应式字体大小
export class ResponsiveTypography {
  private static baseSizes = {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',   // 48px
    '6xl': '3.75rem'  // 60px
  } as const;

  static getFontSize(
    size: ResponsiveValue<keyof typeof ResponsiveTypography.baseSizes>
  ): string {
    return ResponsiveValueParser.parse(size);
  }

  static getLineHeight(fontSize: string): string {
    const size = parseFloat(fontSize);
    // 根据字体大小计算行高
    if (size <= 12) return '1.4';
    if (size <= 16) return '1.5';
    if (size <= 20) return '1.6';
    if (size <= 24) return '1.7';
    return '1.8';
  }

  static getResponsiveStyles(size: ResponsiveValue<keyof typeof ResponsiveTypography.baseSizes>) {
    const fontSize = this.getFontSize(size);
    const lineHeight = this.getLineHeight(fontSize);

    return {
      fontSize,
      lineHeight
    };
  }
}

// 响应式布局工具
export class ResponsiveLayout {
  static getGridColumns(
    columns: ResponsiveValue<number>,
    defaultBreakpoint: keyof typeof breakpoints = 'lg'
  ): number {
    return ResponsiveValueParser.parse(columns, defaultBreakpoint);
  }

  static getGridGap(
    gap: ResponsiveValue<keyof typeof ResponsiveSpacing.baseSizes>
  ): string {
    const size = ResponsiveValueParser.parse(gap);
    return ResponsiveSpacing.getSpacing(size);
  }

  static getFlexDirection(
    direction: ResponsiveValue<'row' | 'column'>,
    defaultBreakpoint: keyof typeof breakpoints = 'lg'
  ): 'row' | 'column' {
    return ResponsiveValueParser.parse(direction, defaultBreakpoint);
  }

  static getContainerMaxWidth(): string {
    const breakpoint = ViewportDetector.getCurrentBreakpoint();

    switch (breakpoint) {
      case 'xs': return '100%';
      case 'sm': return '640px';
      case 'md': return '768px';
      case 'lg': return '1024px';
      case 'xl': return '1280px';
      case '2xl': return '1536px';
      default: return '100%';
    }
  }
}

// 图片响应式处理
export class ResponsiveImage {
  static getSrcSet(
    baseSrc: string,
    widths: number[] = [320, 640, 768, 1024, 1280, 1536]
  ): string {
    return widths
      .map(width => `${baseSrc}?w=${width} ${width}w`)
      .join(', ');
  }

  static getSizes(
    breakpoints: Partial<Record<keyof typeof breakpoints, string>>
  ): string {
    const sizeQueries: string[] = [];

    Object.entries(breakpoints).forEach(([bp, size]) => {
      if (bp === 'xs') {
        sizeQueries.push(size);
      } else {
        sizeQueries.push(`${MediaQueries.min(bp as keyof typeof breakpoints)} ${size}`);
      }
    });

    return sizeQueries.join(', ');
  }

  static getOptimalWidth(
    containerWidth: number,
    devicePixelRatio: number = 1
  ): number {
    // 考虑设备像素比，但不要超过合理的最大值
    const maxWidth = Math.min(containerWidth * devicePixelRatio, 2560);

    // 找到最接近的标准宽度
    const standardWidths = [320, 640, 768, 1024, 1280, 1536, 1920, 2560];

    return standardWidths.reduce((prev, curr) =>
      Math.abs(curr - maxWidth) < Math.abs(prev - maxWidth) ? curr : prev
    );
  }
}

// 滚动条优化
export class ScrollOptimization {
  static isSmoothScrollSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'scrollBehavior' in document.documentElement.style;
  }

  static enableSmoothScroll(enable: boolean = true) {
    if (typeof document === 'undefined') return;

    if (enable && this.isSmoothScrollSupported()) {
      document.documentElement.style.scrollBehavior = 'smooth';
    } else {
      document.documentElement.style.scrollBehavior = 'auto';
    }
  }

  static hideScrollbar(element: HTMLElement, hide: boolean = true) {
    if (hide) {
      element.style.overflow = 'hidden';
      // 添加padding来补偿滚动条宽度
      const scrollbarWidth = element.offsetWidth - element.clientWidth;
      element.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      element.style.overflow = '';
      element.style.paddingRight = '';
    }
  }
}

export default {
  breakpoints,
  MediaQueries,
  ResponsiveValueParser,
  ViewportDetector,
  DeviceDetector,
  ResponsiveSpacing,
  ResponsiveTypography,
  ResponsiveLayout,
  ResponsiveImage,
  ScrollOptimization
};