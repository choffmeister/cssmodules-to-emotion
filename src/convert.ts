import * as camelcase from 'camelcase'
import 'colors'
import * as sast from 'sast'
import { commentLines, indentLines, normalize, repeat } from './helpers'
import { ConvertFunction, ConvertResult, SastNode } from './types'

export type Syntax = 'css' | 'less' | 'scss'

export function convert(input: string, filename: string, syntax: Syntax): string {
  return convertRoot(rewriteVariables(sast.parse(input, { syntax }))).join('\n\n')

  function convertRoot(node: SastNode): string[] {
    if (node.type === 'stylesheet') {
      const { hoist, output } = node.children.reduce<ConvertResult>((acc, node) => {
        const { output, hoist } = convertNode(node, [])
        return {
          output: [...acc.output, ...output],
          hoist: [...acc.hoist, ...hoist]
        }
      }, {
          output: [],
          hoist: []
        })
      // deferred have fallen through until the root, so we remove the parents
      const result = resolveHoist({ output, hoist: hoist.map(n => ({ ...n, parents: [] })) }, (n, p) => {
        const { output, hoist } = convertNode(n, p)
        return { output, hoist: hoist.map(n => ({ ...n, parents: [] })) }
      }).output
      // detect which imports are needed
      const imports = [
        !!result.find(r => !!r.match(/css`/)) ? 'css' : undefined,
        !!result.find(r => !!r.match(/injectGlobal`/)) ? 'injectGlobal' : undefined,
      ].filter(i => !!i).map(i => i!)
      const importResult = imports.length > 0 ? [`import { ${imports.join(', ')} } from 'emotion'`] : []
      return [...importResult, ...result]
    } else {
      throw new Error()
    }
  }

  function convertNode(node: SastNode, parents: SastNode[]): ConvertResult {
    if (node.type === 'ruleset' && node.children[0].type === 'selector') {

      const selector = sast.stringify(node.children[0])
      const block = node.children.find(sub => sub.type === 'block')!

      if (node.children[0].children[0].type === 'class' && parents.length === 0) {
        if (node.children[0].children.length === 1) {
          const { output, hoist } = traverseChildren(block, [...parents, node], convertNode)
          return {
            output: output.length > 0 ? [`export const ${camelcase(selector)} = css\`\n${indentLines(output.join('\n'))}\n\``] : [],
            hoist,
          }
        } else {
          return unsupported(filename, node)
        }
      } else if (node.children[0].children[0].type !== 'parentSelector' && parents.length > 0 && parents[0].children[0].children[0].type === 'pseudoClass' && parents[0].children[0].children[0].children[0].value === 'global') {
        const { output, hoist } = traverseChildren(block, [...parents, node], convertNode)
        return {
          output: output.length > 0 ? [`${selector} {\n${indentLines(output.join('\n'))}\n}`] : [],
          hoist,
        }
      } else if (node.children[0].children[0].type === 'pseudoClass' && node.children[0].children[0].children[0].value === 'global') {
        const traversed = traverseChildren(block, [...parents, node], convertNode)
        const traversedWithRulesetHoist = {
          output: traversed.output,
          hoist: traversed.hoist.filter(h => h.node.type === 'ruleset')
        }
        const nonRulesetHoist = traversed.hoist.filter(h => h.node.type !== 'ruleset')
        const traversedWithResolvedRulesetHoist = resolveHoist(traversedWithRulesetHoist, convertNode)
        const { output, hoist } = {
          output: traversedWithResolvedRulesetHoist.output,
          hoist: [...nonRulesetHoist, ...traversedWithResolvedRulesetHoist.hoist]
        }
        return {
          output: output.length > 0 ? [`// tslint:disable-next-line no-unused-expression\ninjectGlobal\`\n${indentLines(output.join('\n'))}\n\``] : [],
          hoist,
        }
      } else if (node.children[0].children[0].type === 'parentSelector') {
        if (node.children[0].children[1].type === 'parentSelectorExtension' && node.children[0].children.length === 2) {
          // resolve parent selector extension
          const parentSelector = sast.stringify(parents[parents.length - 1].children[0].children[0].children[0])
          const resolvedNode = {
            node: {
              ...node,
              children: [
                {
                  type: 'selector',
                  position: {},
                  children: [
                    {
                      type: 'class',
                      children: [
                        {
                          type: 'ident',
                          value: parentSelector + node.children[0].children[1].children[0].value,
                        }
                      ],
                    }
                  ],
                } as any,
                ...node.children.slice(1),
              ]
            },
            parents
          }
          return {
            output: [],
            hoist: [resolvedNode],
          }
        } else if (node.children[0].children.slice(1).every(n => n.type === 'pseudoClass')) {
          const { output, hoist } = traverseChildren(block, [...parents, node], convertNode)
          return {
            output: output.length > 0 ? [`${selector} {\n${indentLines(output.join('\n'))}\n}`] : [],
            hoist,
          }
        } else {
          return unsupported(filename, node)
        }
      } else if (node.children[0].children[0].type === 'typeSelector') {
        const { output, hoist } = traverseChildren(block, [...parents, node], convertNode)
        return {
          output: output.length > 0 ? [`${selector} {\n${indentLines(output.join('\n'))}\n}`] : [],
          hoist,
        }
      } else if (node.children[0].children[0].type === 'universalSelector') {
        const { output, hoist } = traverseChildren(block, [...parents, node], convertNode)
        return {
          output: output.length > 0 ? [`${selector} {\n${indentLines(output.join('\n'))}\n}`] : [],
          hoist,
        }
      } else {
        return unsupported(filename, node)
      }
    } else if (node.type === 'declaration') {
      return convertDeclaration(node, parents)
    } else if (node.type === 'atrule') {
      return convertAtRule(node, parents)
    } else if (node.type === 'singlelineComment' || node.type === 'multilineComment') {
      return convertComment(node, parents)
    } else if (node.type === 'declarationDelimiter') {
      return ignore()
    } else if (node.type === 'space') {
      return ignore()
    } else {
      return unsupported(filename, node)
    }
  }

  function convertDeclaration(node: SastNode, parents: SastNode[]): ConvertResult {
    if (node.children[0].type === 'property' && node.children[0].children[0].type === 'ident') {
      return simple([`${sast.stringify(node)};`])
    } else if (node.children[0].children[0].type === 'variable' && parents.length === 0) {
      const name = sast.stringify(node.children[0]).match(/^\$\{(.*)\}$/)![1]
      const value = sast.stringify(node.children.find(n => n.type === 'value')!)
      return simple([`// TODO const ${name} = '${value}'`])
    } else if (node.children[0].children[0].type === 'variable' && parents.length > 0) {
      return {
        output: [],
        hoist: [{
          node,
          parents: [],
        }]
      }
    } else {
      return unsupported(filename, node)
    }
  }

  function convertAtRule(node: SastNode, _parents: SastNode[]): ConvertResult {
    if (node.children[0].children[0].type === 'ident' && node.children[0].children[0].value === 'media') {
      return simple([sast.stringify(node)])
    } else {
      return unsupported(filename, node)
    }
  }

  function convertComment(node: SastNode, _parents: SastNode[]): ConvertResult {
    return simple([`/* ${node.value.replace('\n', ' ').replace(/\s{2,}/g, ' ').trim()} */`])
  }

  function traverseChildren(node: SastNode, parents: SastNode[], fn: ConvertFunction): ConvertResult {
    return node.children.reduce((acc, child) => {
      const { output, hoist } = fn(child, parents)
      return { output: [...acc.output, ...output], hoist: [...acc.hoist, ...hoist] }
    }, ignore())
  }

  function resolveHoist(result: ConvertResult, fn: ConvertFunction): ConvertResult {
    if (result.hoist.length === 0) {
      return result
    } else {
      const { output, hoist } = fn(result.hoist[0].node, result.hoist[0].parents)
      return resolveHoist({
        output: [...result.output, ...output],
        hoist: [...result.hoist.slice(1), ...hoist],
      }, fn)
    }
  }

  function rewriteVariables(node: SastNode): SastNode {
    if (node.type === 'variable') {
      return {
        ...node,
        children: [
          {
            ...node.children[0],
            value: '{' + camelcase(node.children[0].value) + '}'
          }
        ]
      }
    } else if (!node.children) {
      return node
    } else {
      return {
        ...node,
        children: node.children.map(rewriteVariables)
      }
    }
  }
}

function unsupported(filename: string, node: SastNode): ConvertResult {
  const position = node.position ? `${node.position.start.line}:${node.position.start.column}` : '?'
  const location = `${filename}:${position}`
  // tslint:disable-next-line no-console
  console.log('Unsupported node '.yellow + node.type + ' at '.yellow + location.blue + '\n' + indentLines(normalize(sast.stringify(node))).gray)
  const initialIndent = node.position ? node.position.start.column - 1 : 0
  return simple(['// TODO\n' + commentLines(repeat(' ', initialIndent).join('') + sast.stringify(node))])
}

function ignore(): ConvertResult {
  return { output: [], hoist: [] }
}

function simple(output: string[]): ConvertResult {
  return { output, hoist: [] }
}
