/**
 * Trims and removes indent.
 */
export function normalize(str: string): string {
  const measure = (str: string) => str.match(/^(\s*)/)![0].length
  const ignoreEmptyLines = (str: string) => str.trim() !== ''

  const lines = str.split('\n')
  const margin = lines.filter(ignoreEmptyLines).map(measure).reduce((acc, m) => Math.min(acc, m), Infinity)
  return Number.isFinite(margin)
    ? lines.map(l => l.substr(margin)).join('\n').trim()
    : str.trim()
}

export function commentLines(str: string): string {
  return normalize(str).split('\n').map(l => '// ' + l).join('\n')
}

export function indentLines(str: string): string {
  return str.split('\n').map(l => '  ' + l).join('\n')
}
