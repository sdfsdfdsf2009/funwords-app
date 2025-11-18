import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  ReactNode,
  CSSProperties
} from 'react';

// 虚拟滚动项目接口
export interface VirtualItem {
  id: string | number;
  index: number;
  value: any;
  height?: number;
}

// 虚拟滚动组件属性
export interface VirtualScrollProps {
  // 数据相关
  items: any[];
  itemHeight?: number | ((index: number, item: any) => number);
  renderItem: (item: any, index: number, style: CSSProperties) => ReactNode;

  // 容器配置
  height: number;
  width?: number | string;
  className?: string;

  // 滚动配置
  overscan?: number; // 预渲染项目数量
  threshold?: number; // 滚动阈值

  // 性能优化
  estimatedItemHeight?: number;
  scrollToIndex?: number;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  onItemsRendered?: (startIndex: number, endIndex: number) => void;

  // 无限滚动
  hasNextPage?: boolean;
  isNextPageLoading?: boolean;
  loadNextPage?: () => void;

  // 其他
  getItemKey?: (item: any, index: number) => string | number;
  stickyIndices?: number[]; // 粘性项目索引
}

// 虚拟滚动组件
export const VirtualScroll: React.FC<VirtualScrollProps> = ({
  items,
  itemHeight = 50,
  renderItem,
  height,
  width = '100%',
  className = '',
  overscan = 5,
  threshold = 3,
  estimatedItemHeight = 50,
  scrollToIndex,
  onScroll,
  onItemsRendered,
  hasNextPage = false,
  isNextPageLoading = false,
  loadNextPage,
  getItemKey = (item, index) => index,
  stickyIndices = []
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height });

  // 计算项目高度
  const getItemHeight = useCallback((index: number, item: any): number => {
    if (typeof itemHeight === 'function') {
      return itemHeight(index, item);
    }
    return itemHeight;
  }, [itemHeight]);

  // 计算项目位置和大小
  const itemMetadata = useMemo(() => {
    const metadata: Array<{ offset: number; size: number }> = [];
    let offset = 0;

    for (let i = 0; i < items.length; i++) {
      const size = getItemHeight(i, items[i]);
      metadata.push({ offset, size });
      offset += size;
    }

    return metadata;
  }, [items, getItemHeight]);

  // 总高度
  const totalHeight = useMemo(() => {
    if (itemMetadata.length === 0) return 0;
    const lastItem = itemMetadata[itemMetadata.length - 1];
    return lastItem.offset + lastItem.size;
  }, [itemMetadata]);

  // 查找项目索引
  const findItemIndex = useCallback((scrollTop: number): number => {
    let low = 0;
    let high = itemMetadata.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const item = itemMetadata[mid];

      if (item.offset <= scrollTop && item.offset + item.size > scrollTop) {
        return mid;
      } else if (item.offset < scrollTop) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return Math.max(0, Math.min(low, itemMetadata.length - 1));
  }, [itemMetadata]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const startIndex = findItemIndex(scrollTop);
    const endIndex = findItemIndex(scrollTop + containerSize.height + threshold * estimatedItemHeight);

    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex: Math.min(items.length - 1, endIndex + overscan)
    };
  }, [scrollTop, containerSize.height, findItemIndex, threshold, estimatedItemHeight, overscan, items.length]);

  // 处理滚动事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    const scrollLeft = e.currentTarget.scrollLeft;

    scrollTopRef.current = newScrollTop;
    setScrollTop(newScrollTop);

    onScroll?.(newScrollTop, scrollLeft);

    // 检查是否需要加载更多数据
    if (hasNextPage && !isNextPageLoading && loadNextPage) {
      const scrollPercentage = (newScrollTop + containerSize.height) / totalHeight;
      if (scrollPercentage > 0.8) { // 滚动到80%时触发
        loadNextPage();
      }
    }
  }, [onScroll, hasNextPage, isNextPageLoading, loadNextPage, containerSize.height, totalHeight]);

  // 滚动到指定索引
  const scrollToItem = useCallback((index: number, alignment: 'auto' | 'smart' | 'center' | 'end' | 'start' = 'auto') => {
    if (!containerRef.current || index < 0 || index >= items.length) return;

    const itemMeta = itemMetadata[index];
    if (!itemMeta) return;

    const container = containerRef.current;
    const containerHeight = container.clientHeight;
    const itemTop = itemMeta.offset;
    const itemBottom = itemTop + itemMeta.size;

    let scrollTop: number;

    switch (alignment) {
      case 'start':
        scrollTop = itemTop;
        break;
      case 'end':
        scrollTop = itemBottom - containerHeight;
        break;
      case 'center':
        scrollTop = itemTop - (containerHeight - itemMeta.size) / 2;
        break;
      case 'smart':
        if (itemTop < scrollTop) {
          scrollTop = itemTop;
        } else if (itemBottom > scrollTop + containerHeight) {
          scrollTop = itemBottom - containerHeight;
        } else {
          return; // 项目已在视图中
        }
        break;
      case 'auto':
      default:
        if (itemTop < scrollTop) {
          scrollTop = itemTop;
        } else if (itemBottom > scrollTop + containerHeight) {
          scrollTop = itemBottom - containerHeight;
        } else {
          return;
        }
    }

    scrollTop = Math.max(0, Math.min(scrollTop, totalHeight - containerHeight));
    container.scrollTop = scrollTop;
  }, [itemMetadata, items.length, totalHeight]);

  // 监听scrollToIndex变化
  useEffect(() => {
    if (scrollToIndex !== undefined && scrollToIndex >= 0 && scrollToIndex < items.length) {
      scrollToItem(scrollToIndex);
    }
  }, [scrollToIndex, scrollToItem, items.length]);

  // 监听容器大小变化
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 通知渲染项目
  useEffect(() => {
    onItemsRendered?.(visibleRange.startIndex, visibleRange.endIndex);
  }, [visibleRange, onItemsRendered]);

  // 渲染可见项目
  const visibleItems = useMemo(() => {
    const items: ReactNode[] = [];

    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (i >= items.length) break;

      const item = items[i];
      const itemMeta = itemMetadata[i];
      const key = getItemKey(item, i);
      const isSticky = stickyIndices.includes(i);

      let style: CSSProperties = {
        position: isSticky ? 'sticky' : 'absolute',
        top: isSticky ? 0 : itemMeta.offset,
        left: 0,
        right: 0,
        height: itemMeta.size,
        zIndex: isSticky ? 10 : 1
      };

      items.push(
        <div key={key} style={style}>
          {renderItem(item, i, style)}
        </div>
      );
    }

    return items;
  }, [visibleRange, items, itemMetadata, getItemKey, renderItem, stickyIndices]);

  return (
    <div
      ref={containerRef}
      className={`virtual-scroll-container ${className}`}
      style={{
        height,
        width,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      {/* 总高度占位符 */}
      <div style={{ height: totalHeight, width: 1, position: 'absolute' }} />

      {/* 渲染可见项目 */}
      {visibleItems}

      {/* 加载更多指示器 */}
      {hasNextPage && (
        <div
          style={{
            position: 'absolute',
            top: totalHeight,
            left: 0,
            right: 0,
            height: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isNextPageLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">加载更多...</span>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              滚动加载更多
            </div>
          )}
        </div>
      )}

      {/* 空状态 */}
      {items.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="text-center text-gray-500">
            <div className="text-lg font-medium mb-2">暂无数据</div>
            <div className="text-sm">请检查数据源或筛选条件</div>
          </div>
        </div>
      )}
    </div>
  );
};

// 简化的虚拟列表组件
export interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight?: number;
  height: number;
  className?: string;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualList<T>({
  items,
  renderItem,
  itemHeight = 50,
  height,
  className = '',
  getItemKey = (item, index) => index
}: VirtualListProps<T>) {
  return (
    <VirtualScroll
      items={items}
      itemHeight={itemHeight}
      height={height}
      className={className}
      getItemKey={getItemKey}
      renderItem={(item, index, style) => (
        <div style={style}>
          {renderItem(item, index)}
        </div>
      )}
    />
  );
}

// 虚拟网格组件
export interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight: number;
  itemWidth: number;
  height: number;
  gap?: number;
  className?: string;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualGrid<T>({
  items,
  renderItem,
  itemHeight,
  itemWidth,
  height,
  gap = 10,
  className = '',
  getItemKey = (item, index) => index
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // 计算列数
  const columns = useMemo(() => {
    if (containerWidth === 0) return 1;
    return Math.floor((containerWidth + gap) / (itemWidth + gap));
  }, [containerWidth, itemWidth, gap]);

  // 将数据转换为行
  const rows = useMemo(() => {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += columns) {
      result.push(items.slice(i, i + columns));
    }
    return result;
  }, [items, columns]);

  // 监听容器宽度变化
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <div ref={containerRef} className={className}>
      <VirtualScroll
        items={rows}
        itemHeight={itemHeight + gap}
        height={height}
        getItemKey={(row, index) => `row-${index}`}
        renderItem={(row, rowIndex, style) => (
          <div style={style}>
            <div
              className="grid-row"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, ${itemWidth}px)`,
                gap: `${gap}px`,
                justifyContent: 'center'
              }}
            >
              {row.map((item, colIndex) => {
                const itemIndex = rowIndex * columns + colIndex;
                return (
                  <div key={getItemKey(item, itemIndex)}>
                    {renderItem(item, itemIndex)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      />
    </div>
  );
}

VirtualScroll.displayName = 'VirtualScroll';
VirtualList.displayName = 'VirtualList';
VirtualGrid.displayName = 'VirtualGrid';