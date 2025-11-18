import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { APIConfigManager } from '../APIConfigManager'

// Mock the child components to focus on testing the manager logic
jest.mock('../APIConfigEditor', () => {
  return function MockAPIConfigEditor({ config, onSave, onCancel }: any) {
    return (
      <div data-testid="api-config-editor">
        <input
          data-testid="config-name-input"
          defaultValue={config?.name || ''}
          placeholder="配置名称"
        />
        <input
          data-testid="config-endpoint-input"
          defaultValue={config?.endpoint || ''}
          placeholder="API端点"
        />
        <button data-testid="save-button" onClick={() => onSave({ name: 'Test Config', endpoint: 'https://test.com' })}>
          保存
        </button>
        <button data-testid="cancel-button" onClick={onCancel}>
          取消
        </button>
      </div>
    )
  }
})

jest.mock('../APIConfigList', () => {
  return function MockAPIConfigList({ configs, onEdit, onDelete, onDuplicate }: any) {
    return (
      <div data-testid="api-config-list">
        {configs.map((config: any) => (
          <div key={config.id} data-testid={`config-item-${config.id}`}>
            <span>{config.name}</span>
            <button data-testid={`edit-button-${config.id}`} onClick={() => onEdit(config)}>
              编辑
            </button>
            <button data-testid={`delete-button-${config.id}`} onClick={() => onDelete(config.id)}>
              删除
            </button>
            <button data-testid={`duplicate-button-${config.id}`} onClick={() => onDuplicate(config)}>
              复制
            </button>
          </div>
        ))}
        <button data-testid="add-new-config-button" onClick={() => onEdit(null)}>
          添加新配置
        </button>
      </div>
    )
  }
})

describe('APIConfigManager', () => {
  const mockConfigs = [
    {
      id: '1',
      name: 'OpenAI DALL-E 3',
      type: 'image',
      provider: 'OpenAI',
      endpoint: 'https://api.openai.com/v1/images/generations',
      isActive: true,
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z'
    },
    {
      id: '2',
      name: 'Stable Diffusion',
      type: 'image',
      provider: 'Stability AI',
      endpoint: 'https://api.stability.ai/v1/generation',
      isActive: false,
      createdAt: '2023-01-02T00:00:00.000Z',
      updatedAt: '2023-01-02T00:00:00.000Z'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders configuration list by default', () => {
    render(<APIConfigManager />)

    expect(screen.getByTestId('api-config-list')).toBeInTheDocument()
    expect(screen.getByTestId('add-new-config-button')).toBeInTheDocument()
  })

  test('switches to edit mode when add new config button is clicked', async () => {
    const user = userEvent.setup()
    render(<APIConfigManager />)

    const addButton = screen.getByTestId('add-new-config-button')
    await user.click(addButton)

    expect(screen.getByTestId('api-config-editor')).toBeInTheDocument()
    expect(screen.getByTestId('config-name-input')).toBeInTheDocument()
    expect(screen.getByTestId('config-endpoint-input')).toBeInTheDocument()
  })

  test('switches to edit mode when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(<APIConfigManager />)

    // Wait for configs to load and be displayed
    await waitFor(() => {
      expect(screen.getByTestId('config-item-1')).toBeInTheDocument()
    })

    const editButton = screen.getByTestId('edit-button-1')
    await user.click(editButton)

    expect(screen.getByTestId('api-config-editor')).toBeInTheDocument()
    expect(screen.getByTestId('config-name-input')).toHaveValue('OpenAI DALL-E 3')
  })

  test('returns to list view when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<APIConfigManager />)

    // Start editing
    const addButton = screen.getByTestId('add-new-config-button')
    await user.click(addButton)

    expect(screen.getByTestId('api-config-editor')).toBeInTheDocument()

    // Cancel editing
    const cancelButton = screen.getByTestId('cancel-button')
    await user.click(cancelButton)

    expect(screen.getByTestId('api-config-list')).toBeInTheDocument()
    expect(screen.queryByTestId('api-config-editor')).not.toBeInTheDocument()
  })

  test('handles duplicate configuration', async () => {
    const user = userEvent.setup()
    render(<APIConfigManager />)

    await waitFor(() => {
      expect(screen.getByTestId('config-item-1')).toBeInTheDocument()
    })

    const duplicateButton = screen.getByTestId('duplicate-button-1')
    await user.click(duplicateButton)

    expect(screen.getByTestId('api-config-editor')).toBeInTheDocument()
    // Should populate form with duplicated config data
    expect(screen.getByTestId('config-name-input')).toHaveValue('OpenAI DALL-E 3')
  })

  test('validates form before saving', async () => {
    const user = userEvent.setup()
    render(<APIConfigManager />)

    // Start editing
    const addButton = screen.getByTestId('add-new-config-button')
    await user.click(addButton)

    // Try to save with empty name
    const nameInput = screen.getByTestId('config-name-input')
    await user.clear(nameInput)

    const saveButton = screen.getByTestId('save-button')
    await user.click(saveButton)

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/请输入配置名称/)).toBeInTheDocument()
    })
  })

  test('handles successful save operation', async () => {
    const user = userEvent.setup()
    render(<APIConfigManager />)

    // Start editing
    const addButton = screen.getByTestId('add-new-config-button')
    await user.click(addButton)

    // Fill form
    const nameInput = screen.getByTestId('config-name-input')
    await user.clear(nameInput)
    await user.type(nameInput, 'New Test Config')

    const endpointInput = screen.getByTestId('config-endpoint-input')
    await user.clear(endpointInput)
    await user.type(endpointInput, 'https://api.test.com/v1')

    // Save
    const saveButton = screen.getByTestId('save-button')
    await user.click(saveButton)

    // Should return to list view and show success message
    await waitFor(() => {
      expect(screen.getByTestId('api-config-list')).toBeInTheDocument()
    })

    expect(screen.getByText(/配置保存成功/)).toBeInTheDocument()
  })

  test('handles delete operation with confirmation', async () => {
    const user = userEvent.setup()
    render(<APIConfigManager />)

    await waitFor(() => {
      expect(screen.getByTestId('config-item-1')).toBeInTheDocument()
    })

    // Start delete
    const deleteButton = screen.getByTestId('delete-button-1')
    await user.click(deleteButton)

    // Should show confirmation dialog
    expect(screen.getByText(/确认删除此配置？/)).toBeInTheDocument()

    // Confirm deletion
    const confirmButton = screen.getByText(/确认删除/)
    await user.click(confirmButton)

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/配置删除成功/)).toBeInTheDocument()
    })
  })

  test('searches configurations by name', async () => {
    const user = userEvent.setup()
    render(<APIConfigManager />)

    await waitFor(() => {
      expect(screen.getByTestId('config-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('config-item-2')).toBeInTheDocument()
    })

    // Search for specific config
    const searchInput = screen.getByPlaceholderText(/搜索配置/)
    await user.type(searchInput, 'OpenAI')

    // Should filter results
    await waitFor(() => {
      expect(screen.getByTestId('config-item-1')).toBeInTheDocument()
      expect(screen.queryByTestId('config-item-2')).not.toBeInTheDocument()
    })
  })

  test('filters configurations by type', async () => {
    const user = userEvent.setup()
    render(<APIConfigManager />)

    await waitFor(() => {
      expect(screen.getByTestId('config-item-1')).toBeInTheDocument()
    })

    // Filter by type
    const typeFilter = screen.getByLabelText(/配置类型/)
    await user.selectOptions(typeFilter, 'video')

    // Should update filter and potentially show different results
    expect(typeFilter).toHaveValue('video')
  })

  test('exports configurations to CSV', async () => {
    const user = userEvent.setup()
    render(<APIConfigManager />)

    await waitFor(() => {
      expect(screen.getByTestId('config-item-1')).toBeInTheDocument()
    })

    // Export configurations
    const exportButton = screen.getByText(/导出配置/)
    await user.click(exportButton)

    // Should trigger download (mock implementation would verify this)
    expect(screen.getByText(/配置导出成功/)).toBeInTheDocument()
  })

  test('handles network errors gracefully', async () => {
    // Mock network error
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')))

    render(<APIConfigManager />)

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText(/加载配置失败/)).toBeInTheDocument()
    })

    // Should have retry button
    const retryButton = screen.getByText(/重试/)
    expect(retryButton).toBeInTheDocument()
  })
})