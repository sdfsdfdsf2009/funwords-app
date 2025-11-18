import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Menu,
  Home,
  Plus,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Grid,
  List,
  Heart,
  Share2,
  Download,
  X,
  ArrowUp,
  Smartphone,
  Tablet,
  Monitor
} from 'lucide-react';

interface MobileOptimizedInterfaceProps {
  children: React.ReactNode;
  className?: string;
  onDeviceChange?: (device: 'mobile' | 'tablet' | 'desktop') => void;
}

// 设备检测 Hook
const useDeviceDetection = () => {
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setScreenSize({ width, height });
      setOrientation(width < height ? 'portrait' : 'landscape');

      if (width < 768) {
        setDevice('mobile');
      } else if (width < 1024) {
        setDevice('tablet');
      } else {
        setDevice('desktop');
      }
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);

    return () => window.removeEventListener('resize', updateDeviceInfo);
  }, []);

  return { device, orientation, screenSize };
};

// 手势处理 Hook
const useGestures = (elementRef: React.RefObject<HTMLElement>) => {
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;

    setDragEnd({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    const deltaX = dragEnd.x - dragStart.x;
    const deltaY = dragEnd.y - dragStart.y;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > minSwipeDistance) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    } else if (Math.abs(deltaY) > minSwipeDistance) {
      setSwipeDirection(deltaY > 0 ? 'down' : 'up');
    }

    setIsDragging(false);
    setTimeout(() => setSwipeDirection(null), 300);
  }, [isDragging, dragStart, dragEnd]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { swipeDirection, isDragging, dragStart, dragEnd };
};

// 触摸反馈组件
const TouchFeedback: React.FC<{
  children: React.ReactNode;
  onTouch?: () => void;
  className?: string;
}> = ({ children, onTouch, className = "" }) => {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <div
      className={`touch-manipulation ${className} ${isPressed ? 'scale-95 opacity-80' : ''}`}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => {
        setIsPressed(false);
        onTouch?.();
      }}
      style={{
        transition: 'transform 0.1s ease-in-out, opacity 0.1s ease-in-out'
      }}
    >
      {children}
    </div>
  );
};

// 底部导航栏
const MobileBottomNavigation: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
}> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', icon: Home, label: '首页' },
    { id: 'projects', icon: FolderOpen, label: '项目' },
    { id: 'create', icon: Plus, label: '创建' },
    { id: 'favorites', icon: Heart, label: '收藏' },
    { id: 'settings', icon: Settings, label: '设置' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
      <div className="flex justify-around items-center h-16">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <TouchFeedback
              key={tab.id}
              onTouch={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{tab.label}</span>
            </TouchFeedback>
          );
        })}
      </div>
    </div>
  );
};

// 滑动手势容器
const SwipeContainer: React.FC<{
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  className?: string;
}> = ({ children, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { swipeDirection } = useGestures(containerRef);

  useEffect(() => {
    if (!swipeDirection) return;

    switch (swipeDirection) {
      case 'left':
        onSwipeLeft?.();
        break;
      case 'right':
        onSwipeRight?.();
        break;
      case 'up':
        onSwipeUp?.();
        break;
      case 'down':
        onSwipeDown?.();
        break;
    }
  }, [swipeDirection, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      style={{
        touchAction: 'pan-y',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {children}
    </div>
  );
};

// 拖拽排序列表
const DragSortableList: React.FC<{
  items: any[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  renderItem: (item: any, index: number) => React.ReactNode;
  className?: string;
}> = ({ items, onReorder, renderItem, className = "" }) => {
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverItem(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedItem !== null && draggedItem !== dropIndex) {
      onReorder(draggedItem, dropIndex);
    }
    setDraggedItem(null);
    setDragOverItem(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item, index) => (
        <div
          key={index}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          className={`touch-manipulation ${
            dragOverItem === index ? 'border-t-2 border-blue-500' : ''
          } ${
            draggedItem === index ? 'opacity-50' : ''
          }`}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
};

// 下拉刷新组件
const PullToRefreshComponent: React.FC<{
  onRefresh: () => void;
  children: React.ReactNode;
  isRefreshing: boolean;
  className?: string;
}> = ({ onRefresh, children, isRefreshing, className = "" }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(distance, 100));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60 && !isRefreshing) {
      onRefresh();
    }
    setPullDistance(0);
    setIsPulling(false);
  };

  return (
    <div
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="absolute top-0 left-0 right-0 bg-white flex items-center justify-center transition-transform duration-200"
        style={{
          transform: `translateY(${pullDistance > 0 ? pullDistance - 60 : -60}px)`,
          height: '60px'
        }}
      >
        {isRefreshing ? (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        ) : (
          <ArrowUp className={`w-6 h-6 text-gray-400 transition-transform duration-200 ${
            pullDistance > 60 ? 'rotate-180' : ''
          }`} />
        )}
      </div>

      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${Math.min(pullDistance, 60)}px)`
        }}
      >
        {children}
      </div>
    </div>
  );
};

// 响应式布局组件
const ResponsiveLayout: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  const { device, orientation } = useDeviceDetection();

  const getLayoutClasses = () => {
    switch (device) {
      case 'mobile':
        return 'px-4 py-2 max-w-full';
      case 'tablet':
        return 'px-6 py-4 max-w-4xl mx-auto';
      case 'desktop':
        return 'px-8 py-6 max-w-6xl mx-auto';
      default:
        return 'px-4 py-2';
    }
  };

  return (
    <div className={`transition-all duration-300 ${getLayoutClasses()} ${className}`}>
      {children}
    </div>
  );
};

// 移动端优化主界面
export const MobileOptimizedInterface: React.FC<MobileOptimizedInterfaceProps> = ({
  children,
  className = "",
  onDeviceChange
}) => {
  const [activeTab, setActiveTab] = useState('home');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { device, orientation, screenSize } = useDeviceDetection();
  const containerRef = useRef<HTMLDivElement>(null);

  // 通知设备变化
  useEffect(() => {
    onDeviceChange?.(device);
  }, [device, onDeviceChange]);

  // 处理刷新
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // 模拟刷新操作
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  }, []);

  // 处理滑动手势
  const handleSwipeLeft = useCallback(() => {
    if (device === 'mobile') {
      // 切换到下一个标签
      const tabs = ['home', 'projects', 'create', 'favorites', 'settings'];
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1]);
      }
    }
  }, [device, activeTab]);

  const handleSwipeRight = useCallback(() => {
    if (device === 'mobile') {
      // 切换到上一个标签
      const tabs = ['home', 'projects', 'create', 'favorites', 'settings'];
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1]);
      }
    }
  }, [device, activeTab]);

  // 移动端特有组件
  const MobileComponents = () => (
    <>
      {/* 移动端顶部栏 */}
      {device === 'mobile' && (
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center space-x-3">
              <TouchFeedback onTouch={() => setShowMobileMenu(!showMobileMenu)}>
                <Menu className="w-6 h-6 text-gray-700" />
              </TouchFeedback>
              <h1 className="text-lg font-semibold text-gray-900">AI视频创作</h1>
            </div>
            <div className="flex items-center space-x-3">
              <TouchFeedback>
                <Search className="w-5 h-5 text-gray-600" />
              </TouchFeedback>
              <TouchFeedback>
                <Filter className="w-5 h-5 text-gray-600" />
              </TouchFeedback>
            </div>
          </div>
        </header>
      )}

      {/* 移动端侧边栏 */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-lg">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">菜单</h2>
                <TouchFeedback onTouch={() => setShowMobileMenu(false)}>
                  <X className="w-5 h-5 text-gray-500" />
                </TouchFeedback>
              </div>
            </div>
            <nav className="p-4 space-y-2">
              {[
                { icon: Home, label: '首页', id: 'home' },
                { icon: FolderOpen, label: '我的项目', id: 'projects' },
                { icon: Plus, label: '快速创建', id: 'create' },
                { icon: Heart, label: '我的收藏', id: 'favorites' },
                { icon: Settings, label: '设置', id: 'settings' }
              ].map(item => (
                <TouchFeedback
                  key={item.id}
                  onTouch={() => {
                    setActiveTab(item.id);
                    setShowMobileMenu(false);
                  }}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg ${
                    activeTab === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </TouchFeedback>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* 下拉刷新 */}
      {device === 'mobile' && (
        <PullToRefreshComponent
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        >
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </PullToRefreshComponent>
      )}

      {/* 底部导航 */}
      {device === 'mobile' && (
        <MobileBottomNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}
    </>
  );

  return (
    <div ref={containerRef} className={`min-h-screen bg-gray-50 ${className}`}>
      {/* 设备信息显示（开发用） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50 bg-white p-2 rounded-lg shadow-md text-xs">
          <div className="flex items-center space-x-2">
            {device === 'mobile' ? <Smartphone className="w-4 h-4" /> :
             device === 'tablet' ? <Tablet className="w-4 h-4" /> :
             <Monitor className="w-4 h-4" />}
            <span>{device}</span>
            <span>{orientation}</span>
            <span>{screenSize.width}x{screenSize.height}</span>
          </div>
        </div>
      )}

      {/* 手势容器 */}
      <SwipeContainer
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        className="h-full"
      >
        {/* 响应式布局包装 */}
        <ResponsiveLayout>
          {device === 'mobile' ? <MobileComponents /> : children}
        </ResponsiveLayout>
      </SwipeContainer>

      {/* 移动端专用样式 */}
      <style jsx>{`
        @media (max-width: 767px) {
          .touch-manipulation {
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }

          body {
            overscroll-behavior-y: contain;
          }
        }

        @media (hover: none) {
          .no-hover:hover {
            background: none !important;
          }
        }
      `}</style>
    </div>
  );
};

// 导出子组件
export {
  TouchFeedback,
  SwipeContainer,
  DragSortableList,
  PullToRefreshComponent,
  ResponsiveLayout,
  useDeviceDetection,
  useGestures
};

export default MobileOptimizedInterface;