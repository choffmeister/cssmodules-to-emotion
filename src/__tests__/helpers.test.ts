import { indentLines, normalize } from '../helpers'

it('normalizes', () => {
  expect(normalize('')).toBe('')
  expect(normalize('hello')).toBe('hello')
  expect(normalize('hello\nworld')).toBe('hello\nworld')
  expect(normalize('  hello\n  world')).toBe('hello\nworld')
  expect(normalize('  hello\n    world')).toBe('hello\n  world')
  expect(normalize('    hello\n  world')).toBe('  hello\nworld')
  expect(normalize('    hello\n    world')).toBe('hello\nworld')
})

it('indents lines', () => {
  expect(indentLines('')).toBe('  ')
  expect(indentLines('hello')).toBe('  hello')
  expect(indentLines('hello\nworld')).toBe('  hello\n  world')
  expect(indentLines('hello\n  world')).toBe('  hello\n    world')
})
