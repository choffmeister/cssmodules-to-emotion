import * as fs from 'fs'
import * as path from 'path'
import * as yargs from 'yargs'
import { convert, Syntax } from './src/convert'

function run(directory: string, syntax: Syntax, write: boolean): void {
  const files = listFiles(directory)
  files.forEach(file => {
    if (file.match(/\.scss$/)) {
      const input = fs.readFileSync(file, 'utf8')
      const output = convert(input, file, syntax)
      if (write) {
        fs.writeFileSync(file.substr(0, file.length - 5) + '.css.ts', output, 'utf8')
        fs.unlinkSync(file)
      }
    } else if (file.match(/\.tsx$/)) {
      const input = fs.readFileSync(file, 'utf8')
      const output = input.replace(/([^']+)\.scss/g, (_, f) => f + '.css')
      if (write) {
        fs.writeFileSync(file, output, 'utf8')
      }
    }
  })
}

function listFiles(dir: string): string[] {
  const ignore = [/node_modules/, /\.git/]
  if (!ignore.some(regex => !!dir.match(regex))) {
    return fs.readdirSync(dir).map(child => path.resolve(dir, child)).reduce<string[]>((acc, child) => {
      try {
        const stat = fs.statSync(child)
        if (stat.isDirectory()) {
          return [...acc, ...listFiles(child)]
        } else if (stat.isFile()) {
          return [...acc, child]
        } else {
          throw new Error()
        }
      } catch (err) {
        return acc
      }
    }, [])
  } else {
    return []
  }
}

const cli = yargs
  .option('d', { alias: 'directory', type: 'string' })
  .coerce('d', path.resolve)
  .option('s', { alias: 'syntax' })
  .coerce('s', mode => {
    switch (mode) {
      case 'css': return 'css'
      case 'scss': return 'scss'
      case 'less': return 'less'
      default: throw new Error('The supported syntaxes are css, scss and less!')
    }
  })
  .option('w', { alias: 'write', type: 'boolean' })
  .demandOption(['d', 's'])
  .strict()

run(cli.argv.directory, cli.argv.syntax, cli.argv.write)
