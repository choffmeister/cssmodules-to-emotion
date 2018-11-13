export interface SastNodePosition {
  start: {
    line: number
    column: number
  }
  end: {
    line: number
    column: number
  }
}

export interface SastNode {
  type: string
  children: SastNode[]
  value: string
  position?: SastNodePosition
}

export interface ConvertResult {
  output: string[]
  hoist: Array<{
    node: SastNode,
    parents: SastNode[],
  }>
}

export type ConvertFunction = (child: SastNode, parents: SastNode[]) => ConvertResult
