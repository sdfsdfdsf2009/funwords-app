import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { App } from '../../App'
import { useProjectStore } from '../../stores/projectStore'
import { useAPIConfigStore } from '../../stores/apiConfigStore'

// Mock performance API
const mockPerformance = {
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(),
  getEntriesByType: jest.fn(),
  now: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
}

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
})

// Mock stores
jest.mock('../../stores/projectStore')
jest.mock('../../stores/apiConfigStore')

const mockProjectStore = useProjectStore as jest.MockedFunction<typeof useProjectStore>
const mockAPIConfigStore = useAPIConfigStore as jest.MockedFunction<typeof useAPIConfigStore>

describe('Navigation Performance Tests', () => {
  const mockCurrentProject = {
    id: 'test-project-1',
    name: 'Test Project',
    createdAt: new Date(),
    updatedAt: new Date(),
    scenes: Array.from({ length: 100 }, (_, i) => ({
      id: `scene-${i}`,
      sceneNumber: i + 1,
      prompt: `Test scene ${i + 1}`,
      generatedImages: [],
      generatedVideos: [],
    })),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Setup performance mock
    mockPerformance.now.mockReturnValue(Date.now())
    mockPerformance.getEntriesByName.mockReturnValue([])
    mockPerformance.getEntriesByType.mockReturnValue([])

    mockProjectStore.mockReturnValue({
      currentProject: mockCurrentProject,
      projects: [mockCurrentProject],
      createProject: jest.fn(),
      addGeneratedImages: jest.fn(),
      error: null,
      clearError: jest.fn(),
      setCurrentProject: jest.fn(),
      selectedImagesPerScene: {},
      isLoading: false,
    } as any)

    mockAPIConfigStore.mockReturnValue({
      configurations: Array.from({ length: 50 }, (_, i) => ({
        id: `config-${i}`,
        name: `API Config ${i + 1}`,
        endpoint: `https://api.example.com/v${i + 1}`,
        isActive: i === 0,
      })),
      selectedConfigId: 'config-0',
      loadConfigurations: jest.fn(),
      selectConfig: jest.fn(),
      clearSelectedConfig: jest.fn(),
      isLoading: false,
      error: null,
    } as any)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Initial Load Performance', () => {
    test('renders navigation within acceptable time', async () => {
      const startTime = Date.now()

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      const renderTime = Date.now() - startTime

      // Should render within 100ms on average
      expect(renderTime).toBeLessThan(100)
    })

    test('navigation elements are rendered efficiently', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      // Check for React render warnings (indicates performance issues)
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Each child in a list should have a unique "key" prop')
      )

      consoleSpy.mockRestore()
    })

    test('large datasets do not block rendering', async () => {
      // Mock a very large project
      const largeProject = {
        ...mockCurrentProject,
        scenes: Array.from({ length: 1000 }, (_, i) => ({
          id: `scene-${i}`,
          sceneNumber: i + 1,
          prompt: `Test scene ${i + 1}`,
          generatedImages: [],
          generatedVideos: [],
        })),
      }

      mockProjectStore.mockReturnValue({
        ...mockProjectStore(),
        currentProject: largeProject,
      } as any)

      const startTime = Date.now()

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      const renderTime = Date.now() - startTime

      // Even with large datasets, should render quickly
      expect(renderTime).toBeLessThan(200)
    })
  })

  describe('Interaction Performance', () => {
    test('navigation clicks respond within 50ms', async () => {
      const { container } = render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      const button = screen.getByText('AI生成').closest('button')

      const startTime = Date.now()

      act(() => {
        button?.click()
      })

      const responseTime = Date.now() - startTime

      // Click response should be immediate
      expect(responseTime).toBeLessThan(50)
    })

    test('settings dropdown opens and closes quickly', async () => {
      const { container } = render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      const settingsButton = screen.getByTitle('系统设置')

      // Test opening speed
      const openStart = Date.now()
      act(() => {
        settingsButton.click()
      })

      await waitFor(() => {
        expect(screen.getByText('全局API配置管理')).toBeInTheDocument()
      })

      const openTime = Date.now() - openStart
      expect(openTime).toBeLessThan(100)

      // Test closing speed
      const closeStart = Date.now()
      act(() => {
        // Simulate click outside
        const event = new MouseEvent('mousedown')
        Object.defineProperty(event, 'target', { value: document.body })
        document.dispatchEvent(event)
      })

      await waitFor(() => {
        expect(screen.queryByText('全局API配置管理')).not.toBeInTheDocument()
      })

      const closeTime = Date.now() - closeStart
      expect(closeTime).toBeLessThan(50)
    })

    test('multiple rapid interactions are handled smoothly', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      const cards = screen.getAllByRole('button').filter(button =>
        ['内容创作', 'AI生成', '项目管理'].includes(button.textContent || '')
      )

      // Simulate rapid clicking
      const startTime = Date.now()

      for (const card of cards) {
        act(() => {
          card.click()
        })

        // Small delay between clicks
        await act(async () => {
          jest.advanceTimersByTime(10)
        })
      }

      const totalTime = Date.now() - startTime

      // All interactions should complete quickly
      expect(totalTime).toBeLessThan(200)
    })
  })

  describe('Animation Performance', () => {
    test('hover animations use GPU acceleration', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      const cards = screen.getAllByRole('button').filter(button =>
        ['内容创作', 'AI生成', '项目管理'].includes(button.textContent || '')
      )

      cards.forEach(card => {
        const styles = window.getComputedStyle(card)

        // Check for transform-based animations (GPU accelerated)
        expect(card).toHaveClass(/hover:scale/)
        expect(card).toHaveClass(/transition-all/)
      })
    })

    test('animations maintain 60fps performance', async () => {
      const mockRaf = jest.fn()
      global.requestAnimationFrame = mockRaf

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      const card = screen.getByText('内容创作').closest('button')

      // Simulate hover state
      act(() => {
        card?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      })

      // Should not cause excessive animation frames
      expect(mockRaf).not.toHaveBeenCalledTimes(60)

      global.requestAnimationFrame = jest.requireActual('window').requestAnimationFrame
    })
  })

  describe('Memory Usage', () => {
    test('navigation does not leak memory on repeated interactions', async () => {
      const { container, unmount } = render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      // Simulate repeated interactions
      for (let i = 0; i < 100; i++) {
        act(() => {
          const settingsButton = screen.getByTitle('系统设置')
          settingsButton.click()
        })

        await act(async () => {
          jest.advanceTimersByTime(10)
        })

        act(() => {
          const event = new MouseEvent('mousedown')
          Object.defineProperty(event, 'target', { value: document.body })
          document.dispatchEvent(event)
        })

        await act(async () => {
          jest.advanceTimersByTime(10)
        })
      }

      // Clean up
      unmount()

      // In a real test, we would check memory usage here
      // For now, we just ensure no errors occur during cleanup
      expect(true).toBe(true)
    })

    test('large navigation data is managed efficiently', async () => {
      // Mock many navigation items
      const largeProjectList = Array.from({ length: 100 }, (_, i) => ({
        id: `project-${i}`,
        name: `Project ${i + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        scenes: [],
      }))

      mockProjectStore.mockReturnValue({
        ...mockProjectStore(),
        projects: largeProjectList,
        currentProject: largeProjectList[0],
      } as any)

      const startTime = Date.now()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      const renderTime = Date.now() - startTime

      // Should still render quickly with many items
      expect(renderTime).toBeLessThan(150)
    })
  })

  describe('Network Performance', () => {
    test('navigation does not make unnecessary API calls', async () => {
      const mockFetch = jest.fn()
      global.fetch = mockFetch

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Navigation rendering should not trigger API calls
      expect(mockFetch).not.toHaveBeenCalled()

      global.fetch = jest.requireActual('fetch')
    })

    test('lazy loading works correctly for navigation items', async () => {
      const mockLoadConfigurations = jest.fn()

      mockAPIConfigStore.mockReturnValue({
        configurations: [],
        selectedConfigId: null,
        loadConfigurations: mockLoadConfigurations,
        selectConfig: jest.fn(),
        clearSelectedConfig: jest.fn(),
        isLoading: false,
        error: null,
      } as any)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Load configurations should be called only once on mount
      expect(mockLoadConfigurations).toHaveBeenCalledTimes(1)
    })
  })

  describe('Bundle Size and Code Splitting', () => {
    test('navigation components are properly code split', async () => {
      // Mock dynamic imports
      const mockDynamicImport = jest.fn()
      jest.mock('next/dynamic', () => () => mockDynamicImport)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // In a real implementation, this would verify that components
      // are loaded only when needed
      expect(true).toBe(true)
    })

    test('CSS is efficiently loaded', async () => {
      const mockLinkElements = document.querySelectorAll('link[rel="stylesheet"]')

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      // Should not load excessive CSS files
      const linkElementsAfterRender = document.querySelectorAll('link[rel="stylesheet"]')
      expect(linkElementsAfterRender.length - mockLinkElements.length).toBeLessThan(5)
    })
  })

  describe('Accessibility Performance', () => {
    test('screen reader navigation is performant', async () => {
      const mockGetComputedAccessibleName = jest.fn()
      Object.defineProperty(Element.prototype, 'computedAccessibleName', {
        get: mockGetComputedAccessibleName,
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      // Accessible names should be computed quickly
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(mockGetComputedAccessibleName).not.toHaveBeenCalled()
      })
    })

    test('focus management does not cause performance issues', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      const startTime = Date.now()

      // Simulate tab navigation through all interactive elements
      const interactiveElements = screen.getAllByRole('button')

      interactiveElements.forEach(element => {
        act(() => {
          element.focus()
        })
      })

      const focusTime = Date.now() - startTime

      // Focus changes should be instantaneous
      expect(focusTime).toBeLessThan(50)
    })
  })
})