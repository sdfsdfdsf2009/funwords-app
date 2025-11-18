import { useState, useEffect, useCallback } from 'react';
import {
  ViewportDetector,
  DeviceDetector,
  breakpoints,
  MediaQueries,
  ResponsiveValueParser,
  ResponsiveValue
} from '../utils/responsive';

// 响应式Hook
export function useResponsive() {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0
  });

  const [breakpoint, setBreakpoint] = useState<keyof typeof breakpoints>('lg');

  useEffect(() => {
    ViewportDetector.init();

    const updateState = () => {
      setDimensions({
        width: ViewportDetector.getWidth(),
        height: ViewportDetector.getHeight()
      });
      setBreakpoint(ViewportDetector.getCurrentBreakpoint());
    };

    updateState();

    const unsubscribe = ViewportDetector.addListener(updateState);
    return unsubscribe;
  }, []);

  const isBreakpoint = useCallback((bp: keyof typeof breakpoints) => {
    return ViewportDetector.isBreakpoint(bp);
  }, []);

  const isBetween = useCallback((
    minBreakpoint: keyof typeof breakpoints,
    maxBreakpoint: keyof typeof breakpoints
  ) => {
    return ViewportDetector.isBetween(minBreakpoint, maxBreakpoint);
  }, []);

  const isMobile = useCallback(() => DeviceDetector.isMobile(), []);
  const isTablet = useCallback(() => DeviceDetector.isTablet(), []);
  const isDesktop = useCallback(() => DeviceDetector.isDesktop(), []);

  const isTouchDevice = useCallback(() => DeviceDetector.isTouchDevice(), []);
  const isHighDensity = useCallback(() => DeviceDetector.isHighDensity(), []);

  const prefersDarkMode = useCallback(() => DeviceDetector.getPreferredColorScheme() === 'dark', []);
  const prefersReducedMotion = useCallback(() => DeviceDetector.getReducedMotion(), []);

  const parseResponsiveValue = useCallback(<T>(
    value: ResponsiveValue<T>,
    defaultBreakpoint?: keyof typeof breakpoints
  ) => {
    return ResponsiveValueParser.parse(value, defaultBreakpoint || breakpoint);
  }, [breakpoint]);

  return {
    dimensions,
    breakpoint,
    isBreakpoint,
    isBetween,
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    isHighDensity,
    prefersDarkMode,
    prefersReducedMotion,
    parseResponsiveValue
  };
}

// 媒体查询Hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

// 特定断点Hook
export function useBreakpoint(bp: keyof typeof breakpoints): boolean {
  return useMediaQuery(MediaQueries.min(bp));
}

export function useIsMobile(): boolean {
  return useMediaQuery(MediaQueries.max('sm'));
}

export function useIsTablet(): boolean {
  return useMediaQuery(MediaQueries.between('sm', 'lg'));
}

export function useIsDesktop(): boolean {
  return useMediaQuery(MediaQueries.min('lg'));
}

// 方向Hook
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateOrientation();

    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
}

// 滚动位置Hook
export function useScrollPosition(): { x: number; y: number } {
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateScrollPosition = () => {
      setScrollPosition({
        x: window.scrollX,
        y: window.scrollY
      });
    };

    window.addEventListener('scroll', updateScrollPosition);
    updateScrollPosition();

    return () => window.removeEventListener('scroll', updateScrollPosition);
  }, []);

  return scrollPosition;
}

// 元素尺寸Hook
export function useElementSize<T extends HTMLElement>(): [
  (node: T | null) => void,
  { width: number; height: number }
] {
  const [element, setElement] = useState<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [element]);

  return [setElement, size];
}

// 元素可见性Hook
export function useElementVisibility<T extends HTMLElement>(
  options: IntersectionObserverInit = {}
): [
  (node: T | null) => void,
  boolean
] {
  const [element, setElement] = useState<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => observer.disconnect();
  }, [element, options]);

  return [setElement, isVisible];
}

// 焦点管理Hook
export function useFocusManagement<T extends HTMLElement>(): [
  (node: T | null) => void,
  {
    focusFirst: () => void;
    focusLast: () => void;
    focusNext: () => void;
    focusPrevious: () => void;
  }
] {
  const [container, setContainer] = useState<T | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!container) return [];

    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'details',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  }, [container]);

  const focusFirst = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    }
  }, [getFocusableElements]);

  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[elements.length - 1].focus();
    }
  }, [getFocusableElements]);

  const focusNext = useCallback(() => {
    const elements = getFocusableElements();
    const currentIndex = elements.findIndex(el => el === document.activeElement);

    if (currentIndex < elements.length - 1) {
      elements[currentIndex + 1].focus();
    } else {
      elements[0].focus(); // 循环到第一个
    }
  }, [getFocusableElements]);

  const focusPrevious = useCallback(() => {
    const elements = getFocusableElements();
    const currentIndex = elements.findIndex(el => el === document.activeElement);

    if (currentIndex > 0) {
      elements[currentIndex - 1].focus();
    } else {
      elements[elements.length - 1].focus(); // 循环到最后一个
    }
  }, [getFocusableElements]);

  return [setContainer, { focusFirst, focusLast, focusNext, focusPrevious }];
}

// 防抖Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// 节流Hook
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setInterval(() => {
      if (Date.now() - lastExecuted.current >= delay) {
        setThrottledValue(value);
        lastExecuted.current = Date.now();
      }
    }, 50); // 每50ms检查一次

    return () => clearInterval(handler);
  }, [value, delay]);

  return throttledValue;
}

// 本地存储Hook (响应式安全)
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

// 会话存储Hook
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting sessionStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

export default {
  useResponsive,
  useMediaQuery,
  useBreakpoint,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useOrientation,
  useScrollPosition,
  useElementSize,
  useElementVisibility,
  useFocusManagement,
  useDebounce,
  useThrottle,
  useLocalStorage,
  useSessionStorage
};