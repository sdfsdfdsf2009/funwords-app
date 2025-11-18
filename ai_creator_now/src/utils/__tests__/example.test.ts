// 简单的测试用例，验证测试框架是否正常工作
describe('Example Test Suite', () => {
  test('should add two numbers correctly', () => {
    const result = 2 + 3
    expect(result).toBe(5)
  })

  test('should handle string manipulation', () => {
    const input = 'hello world'
    const result = input.toUpperCase()
    expect(result).toBe('HELLO WORLD')
  })

  test('should handle async operations', async () => {
    const asyncFunction = () => {
      return new Promise(resolve => {
        setTimeout(() => resolve('async result'), 100)
      })
    }

    const result = await asyncFunction()
    expect(result).toBe('async result')
  })
})

describe('Date Utils', () => {
  test('should create valid date', () => {
    const date = new Date('2023-01-01')
    expect(date.getFullYear()).toBe(2023)
    expect(date.getMonth() + 1).toBe(1)
    expect(date.getDate()).toBe(1)
  })

  test('should format date correctly', () => {
    const date = new Date('2023-01-01T12:00:00.000Z')
    const formatted = date.toISOString().split('T')[0]
    expect(formatted).toBe('2023-01-01')
  })
})