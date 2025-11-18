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

describe('Navigation UI/UX Tests', () => {
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

  describe('Visual Design Consistency', () => {
    test('navigation cards have consistent styling', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Get all navigation cards
      const navCards = screen.getAllByRole('button').filter(button =>
        ['内容创作', 'AI生成', '项目管理'].includes(button.textContent || '')
      )

      // Check consistent classes
      navCards.forEach(card => {
        expect(card).toHaveClass(/bg-white\/70/)
        expect(card).toHaveClass(/border/)
        expect(card).toHaveClass(/rounded-apple-lg/)
        expect(card).toHaveClass(/shadow-apple-lg/)
        expect(card).toHaveClass(/backdrop-blur-apple/)
        expect(card).toHaveClass(/transition-all/)
      })
    })

    test('active navigation cards have distinct styling', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      // Click to activate
      const contentCard = screen.getByText('内容创作').closest('button')
      await user.click(contentCard!)

      // Check active styling
      await waitFor(() => {
        const activeCard = screen.getByText('内容创作').closest('button')
        expect(activeCard).toHaveClass(/bg-gradient-to-br.*from-blue-500.*to-blue-700/)
        expect(activeCard).toHaveClass(/text-white/)
      })
    })

    test('hover effects work correctly', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      const card = screen.getByText('内容创作').closest('button')

      // Test hover state
      fireEvent.mouseEnter(card!)
      expect(card).toHaveClass(/hover:shadow-apple-xl/)
      expect(card).toHaveClass(/hover:scale-\[1\.02\]/)

      // Test mouse leave
      fireEvent.mouseLeave(card!)
      expect(card).toHaveClass(/transition-all/)
    })

    test('icons are properly sized and positioned', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Check main card icons
      const iconContainers = screen.getAllByRole('button')
        .filter(button => ['内容创作', 'AI生成', '项目管理'].includes(button.textContent || ''))
        .map(button => button.querySelector('[class*="w-16"]'))

      expect(iconContainers.length).toBe(3)
      iconContainers.forEach(container => {
        expect(container).toHaveClass(/w-16/)
        expect(container).toHaveClass(/h-16/)
        expect(container).toHaveClass(/flex/)
        expect(container).toHaveClass(/items-center/)
        expect(container).toHaveClass(/justify-center/)
      })
    })
  })

  describe('Responsive Layout', () => {
    test('layout adapts correctly on desktop', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Check grid layout
      const desktopNav = screen.getByText('内容创作').closest('nav')
      const gridContainer = desktopNav?.querySelector('.grid')
      expect(gridContainer).toHaveClass(/grid-cols-3/)
      expect(gridContainer).toHaveClass(/gap-apple-lg/)
    })

    test('layout adapts correctly on tablet', async () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Desktop navigation should still be visible at tablet size
      expect(screen.getByText('内容创作')).toBeInTheDocument()
    })

    test('layout adapts correctly on mobile', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Check mobile bottom navigation
      const mobileNav = screen.getByText('内容创作').closest('nav')
      expect(mobileNav).toHaveClass(/fixed/)
      expect(mobileNav).toHaveClass(/bottom-0/)
      expect(mobileNav).toHaveClass(/md:hidden/)

      // Check bottom padding for mobile content
      const bottomPadding = document.querySelector('.md:hidden.h-20')
      expect(bottomPadding).toBeInTheDocument()
    })
  })

  describe('Interactive Elements', () => {
    test('buttons have appropriate click feedback', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      const card = screen.getByText('内容创作').closest('button')

      // Test active state on click
      fireEvent.mouseDown(card!)
      expect(card).toHaveClass(/active/)

      fireEvent.mouseUp(card!)
      await user.click(card!)

      await waitFor(() => {
        expect(card).toHaveClass(/bg-gradient-to-br/)
      })
    })

    test('sub-items show correct active states', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      // Click content creation card
      const contentCard = screen.getByText('内容创作').closest('button')
      await user.click(contentCard!)

      // Check sub-item active states
      await waitFor(() => {
        const importItem = screen.getByText('CSV导入').closest('div')
        expect(importItem).toHaveClass(/bg-white\/20/)
      })
    })

    test('disabled elements are properly indicated', async () => {
      // Mock project with no scenes (should disable AI generation)
      const projectWithoutScenes = {
        ...mockCurrentProject,
        scenes: [],
      }

      mockProjectStore.mockReturnValue({
        ...mockProjectStore(),
        currentProject: projectWithoutScenes,
      } as any)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('AI生成')).toBeInTheDocument()
      })

      const aiCard = screen.getByText('AI生成').closest('button')
      expect(aiCard).toBeDisabled()
      expect(aiCard).toHaveClass(/opacity-50/)
      expect(aiCard).toHaveClass(/cursor-not-allowed/)
    })
  })

  describe('Touch Interaction', () => {
    beforeEach(() => {
      // Mock touch events
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        value: () => {},
      })

      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
    })

    test('mobile navigation has appropriate touch targets', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      const mobileButtons = screen.getAllByRole('button').filter(button =>
        button.closest('nav')?.classList.contains('md:hidden')
      )

      mobileButtons.forEach(button => {
        // Check minimum touch target size (44px recommended by Apple)
        const styles = window.getComputedStyle(button)
        expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44)
        expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(44)
      })
    })

    test('touch interactions work on mobile', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      const mobileButton = screen.getByText('AI生成').closest('button')

      // Test touch start
      fireEvent.touchStart(mobileButton!)
      expect(mobileButton).toHaveClass(/active/)

      // Test touch end
      fireEvent.touchEnd(mobileButton!)

      await waitFor(() => {
        expect(screen.getByText('图片生成')).toBeInTheDocument()
      })
    })
  })

  describe('Visual Polish and Animations', () => {
    test('transitions are smooth and performant', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      const cards = screen.getAllByRole('button').filter(button =>
        ['内容创作', 'AI生成', '项目管理'].includes(button.textContent || '')
      )

      cards.forEach(card => {
        // Check for GPU-accelerated properties
        expect(card).toHaveClass(/transition-all/)
        expect(card).toHaveClass(/duration-300/)
      })
    })

    test('backdrop blur effects are applied', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Check header backdrop blur
      const header = document.querySelector('header')
      expect(header).toHaveClass(/backdrop-blur-apple/)

      // Check desktop navigation backdrop blur
      const desktopNav = screen.getByText('内容创作').closest('nav')
      expect(desktopNav).toHaveClass(/backdrop-blur-apple/)

      // Check mobile navigation backdrop blur
      const mobileNav = screen.getByText('内容创作').closest('nav')
      expect(mobileNav).toHaveClass(/backdrop-blur-apple/)
    })

    test('gradients and visual effects are consistent', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Check app background gradient
      const appContainer = document.querySelector('.min-h-screen')
      expect(appContainer).toHaveClass(/bg-gradient-to-br/)
      expect(appContainer).toHaveClass(/from-gray-50/)
      expect(appContainer).toHaveClass(/via-white/)
      expect(appContainer).toHaveClass(/to-gray-100/)
    })
  })

  describe('Content Hierarchy and Typography', () => {
    test('typography follows design system', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Check main title typography
      const title = screen.getByText('视频工作站')
      expect(title).toHaveClass(/text-xl/)
      expect(title).toHaveClass(/font-sf-pro-display/)
      expect(title).toHaveClass(/font-semibold/)

      // Check card titles
      const cardTitles = screen.getAllByRole('button').filter(button =>
        ['内容创作', 'AI生成', '项目管理'].includes(button.textContent || '')
      ).map(button => button.querySelector('h3'))

      cardTitles.forEach(title => {
        expect(title).toHaveClass(/text-lg/)
        expect(title).toHaveClass(/font-sf-pro-display/)
        expect(title).toHaveClass(/font-semibold/)
      })
    })

    test('descriptions have appropriate styling', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Find description texts
      const descriptions = screen.getAllByText(/CSV导入、场景管理|图片生成、视频生成|项目选择、任务跟踪/)

      descriptions.forEach(desc => {
        expect(desc).toHaveClass(/text-sm/)
        expect(desc).toHaveClass(/font-sf-pro-text/)
      })
    })

    test('information hierarchy is clear', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Check that main elements are visually distinct
      const cards = screen.getAllByRole('button').filter(button =>
        ['内容创作', 'AI生成', '项目管理'].includes(button.textContent || '')
      )

      // Each card should have icon, title, description, and sub-items
      cards.forEach(card => {
        const icon = card.querySelector('[class*="w-16"]')
        const title = card.querySelector('h3')
        const description = card.querySelector('p')
        const subItems = card.querySelectorAll('[class*="text-xs"]')

        expect(icon).toBeInTheDocument()
        expect(title).toBeInTheDocument()
        expect(description).toBeInTheDocument()
        expect(subItems.length).toBeGreaterThan(0)
      })
    })
  })
})