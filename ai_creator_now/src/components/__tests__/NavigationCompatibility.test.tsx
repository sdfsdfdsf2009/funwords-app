import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../../App'
import { useProjectStore } from '../../stores/projectStore'
import { useAPIConfigStore } from '../../stores/apiConfigStore'

// Mock stores
jest.mock('../../stores/projectStore')
jest.mock('../../stores/apiConfigStore')

const mockProjectStore = useProjectStore as jest.MockedFunction<typeof useProjectStore>
const mockAPIConfigStore = useAPIConfigStore as jest.MockedFunction<typeof useAPIConfigStore>

describe('Navigation Compatibility Tests', () => {
  const mockCurrentProject = {
    id: 'test-project-1',
    name: 'Test Project',
    createdAt: new Date(),
    updatedAt: new Date(),
    scenes: [
      {
        id: 'scene-1',
        sceneNumber: 1,
        prompt: 'Test scene prompt',
        generatedImages: [],
        generatedVideos: [],
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()

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
      configurations: [],
      selectedConfigId: null,
      loadConfigurations: jest.fn(),
      selectConfig: jest.fn(),
      clearSelectedConfig: jest.fn(),
      isLoading: false,
      error: null,
    } as any)
  })

  describe('Browser Compatibility', () => {
    describe('Modern Browser Support', () => {
      test('works in Chrome environment', async () => {
        // Mock Chrome user agent
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          configurable: true,
        })

        render(<App />)

        await waitFor(() => {
          expect(screen.getByText('视频工作站')).toBeInTheDocument()
        })

        // Check CSS Grid support
        expect(screen.getByText('内容创作')).toBeInTheDocument()
        expect(screen.getByText('AI生成')).toBeInTheDocument()
        expect(screen.getByText('项目管理')).toBeInTheDocument()
      })

      test('works in Firefox environment', async () => {
        // Mock Firefox user agent
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
          configurable: true,
        })

        render(<App />)

        await waitFor(() => {
          expect(screen.getByText('视频工作站')).toBeInTheDocument()
        })

        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      test('works in Safari environment', async () => {
        // Mock Safari user agent
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
          configurable: true,
        })

        render(<App />)

        await waitFor(() => {
          expect(screen.getByText('视频工作站')).toBeInTheDocument()
        })

        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      test('works in Edge environment', async () => {
        // Mock Edge user agent
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
          configurable: true,
        })

        render(<App />)

        await waitFor(() => {
          expect(screen.getByText('视频工作站')).toBeInTheDocument()
        })

        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })
    })

    describe('Legacy Browser Support', () => {
      test('gracefully degrades in IE11', async () => {
        // Mock IE11 user agent and lack of modern features
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Windows NT 6.1; Trident/7.0; AS; rv:11.0) like Gecko',
          configurable: true,
        })

        // Mock lack of modern CSS features
        const originalSupports = window.CSS?.supports
        Object.defineProperty(window, 'CSS', {
          value: {
            supports: jest.fn(() => false),
          },
          configurable: true,
        })

        render(<App />)

        await waitFor(() => {
          expect(screen.getByText('视频工作站')).toBeInTheDocument()
        })

        // Should still render basic functionality
        expect(screen.getByText('内容创作')).toBeInTheDocument()

        // Restore original CSS.supports
        Object.defineProperty(window, 'CSS', {
          value: { supports: originalSupports },
          configurable: true,
        })
      })

      test('handles missing CSS Grid support', async () => {
        const originalSupports = window.CSS?.supports
        Object.defineProperty(window, 'CSS', {
          value: {
            supports: jest.fn((property) => {
              if (property.includes('grid')) return false
              return true
            }),
          },
          configurable: true,
        })

        render(<App />)

        await waitFor(() => {
          expect(screen.getByText('视频工作站')).toBeInTheDocument()
        })

        // Should still render navigation items
        expect(screen.getByText('内容创作')).toBeInTheDocument()

        Object.defineProperty(window, 'CSS', {
          value: { supports: originalSupports },
          configurable: true,
        })
      })

      test('handles missing backdrop-blur support', async () => {
        const originalSupports = window.CSS?.supports
        Object.defineProperty(window, 'CSS', {
          value: {
            supports: jest.fn((property) => {
              if (property.includes('backdrop-filter')) return false
              return true
            }),
          },
          configurable: true,
        })

        render(<App />)

        await waitFor(() => {
          expect(screen.getByText('视频工作站')).toBeInTheDocument()
        })

        // Should still render with fallback
        expect(screen.getByText('内容创作')).toBeInTheDocument()

        Object.defineProperty(window, 'CSS', {
          value: { supports: originalSupports },
          configurable: true,
        })
      })
    })
  })

  describe('Device and Screen Size Compatibility', () => {
    test('handles ultra-wide displays', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 3840, // 4K width
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 2160, // 4K height
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Should maintain proper layout on ultra-wide displays
      expect(screen.getByText('内容创作')).toBeInTheDocument()
    })

    test('handles small mobile screens', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320, // iPhone SE width
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 568, // iPhone SE height
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Should show mobile navigation
      const mobileNav = screen.getByText('内容创作').closest('nav')
      expect(mobileNav).toHaveClass(/md:hidden/)
      expect(mobileNav).toHaveClass(/fixed/)
      expect(mobileNav).toHaveClass(/bottom-0/)
    })

    test('handles tablet-sized screens', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768, // iPad width
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024, // iPad height
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Should show desktop navigation on tablet
      expect(screen.getByText('内容创作')).toBeInTheDocument()
      expect(screen.getByText('AI生成')).toBeInTheDocument()
      expect(screen.getByText('项目管理')).toBeInTheDocument()
    })

    test('handles unusual aspect ratios', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 256, // Very short height
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Should still be functional despite unusual aspect ratio
      expect(screen.getByText('内容创作')).toBeInTheDocument()
    })
  })

  describe('Input Method Compatibility', () => {
    test('works with mouse input', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      // Test mouse interactions
      const card = screen.getByText('AI生成').closest('button')

      fireEvent.mouseEnter(card!)
      expect(card).toHaveClass(/hover/)

      await user.click(card!)
      expect(screen.getByText('图片生成')).toBeInTheDocument()
    })

    test('works with keyboard input', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      const card = screen.getByText('AI生成').closest('button')

      // Test keyboard navigation
      card?.focus()
      expect(card).toHaveFocus()

      fireEvent.keyDown(card!, { key: 'Enter' })
      fireEvent.keyUp(card!, { key: 'Enter' })

      await waitFor(() => {
        expect(screen.getByText('图片生成')).toBeInTheDocument()
      })
    })

    test('works with touch input', async () => {
      // Mock touch device
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 1,
        configurable: true,
      })

      Object.defineProperty(window, 'ontouchstart', {
        value: () => {},
        configurable: true,
      })

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // Mobile width
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      const mobileButton = screen.getByText('AI生成').closest('button')

      // Test touch events
      fireEvent.touchStart(mobileButton!)
      fireEvent.touchEnd(mobileButton!)

      await waitFor(() => {
        expect(screen.getByText('图片生成')).toBeInTheDocument()
      })
    })

    test('works with pen/stylus input', async () => {
      // Mock pen device
      Object.defineProperty(navigator, 'pointerEnabled', {
        value: true,
        configurable: true,
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      const card = screen.getByText('AI生成').closest('button')

      // Test pointer events
      fireEvent.pointerEnter(card!)
      fireEvent.pointerDown(card!)
      fireEvent.pointerUp(card!)

      await waitFor(() => {
        expect(screen.getByText('图片生成')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility Technology Compatibility', () => {
    test('works with screen readers', async () => {
      // Mock screen reader
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 NVDA/2021.1',
        configurable: true,
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Check ARIA attributes
      const settingsButton = screen.getByTitle('系统设置')
      expect(settingsButton).toHaveAttribute('title')

      const cards = screen.getAllByRole('button').filter(button =>
        ['内容创作', 'AI生成', '项目管理'].includes(button.textContent || '')
      )
      expect(cards.length).toBe(3)
    })

    test('works with voice control software', async () => {
      // Mock voice control
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Dragon/12.5',
        configurable: true,
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Check that elements have predictable names for voice control
      expect(screen.getByRole('button', { name: /内容创作/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /AI生成/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /项目管理/ })).toBeInTheDocument()
    })

    test('works with switch control software', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Check that all interactive elements are focusable
      const interactiveElements = screen.getAllByRole('button')
      interactiveElements.forEach(element => {
        expect(element).toHaveAttribute('tabindex')
      })
    })
  })

  describe('Network Conditions', () => {
    test('works on slow connections', async () => {
      // Mock slow network
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: 'slow-2g',
          downlink: 0.1,
          rtt: 2000,
        },
        configurable: true,
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Should still render navigation
      expect(screen.getByText('内容创作')).toBeInTheDocument()
    })

    test('works offline', async () => {
      // Mock offline status
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Should still render navigation without network dependencies
      expect(screen.getByText('内容创作')).toBeInTheDocument()
    })
  })

  describe('Language and Locale Compatibility', () => {
    test('handles different system languages', async () => {
      // Mock different language
      Object.defineProperty(navigator, 'language', {
        value: 'zh-CN',
        configurable: true,
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Should display Chinese text correctly
      expect(screen.getByText('内容创作')).toBeInTheDocument()
      expect(screen.getByText('AI生成')).toBeInTheDocument()
      expect(screen.getByText('项目管理')).toBeInTheDocument()
    })

    test('handles RTL languages', async () => {
      // Mock RTL language
      Object.defineProperty(navigator, 'language', {
        value: 'ar',
        configurable: true,
      })

      Object.defineProperty(document.documentElement, 'dir', {
        value: 'rtl',
        configurable: true,
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Should still be functional in RTL
      expect(screen.getByText('内容创作')).toBeInTheDocument()

      // Restore LTR
      Object.defineProperty(document.documentElement, 'dir', {
        value: 'ltr',
        configurable: true,
      })
    })
  })
})