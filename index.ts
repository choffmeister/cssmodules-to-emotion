import * as fs from 'fs'
import * as path from 'path'
import * as yargs from 'yargs'
import { convert } from './src/convert'

function run(directory: string): void {
  const files = listFiles(directory)
  files.forEach(file => {
    if (file.match(/\.scss$/)) {
      const input = fs.readFileSync(file, 'utf8')
      const output = convert(input, file, 'scss')
      fs.writeFileSync(file.substr(0, file.length - 5) + '.css.ts', output, 'utf8')
    } else if (file.match(/\.tsx$/)) {
      const input = fs.readFileSync(file, 'utf8')
      const output = input.replace(/([^']+)\.scss/g, (_, f) => f + '.css')
      fs.writeFileSync(file, output, 'utf8')
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
  .demandOption(['d'])
  .strict()

run(cli.argv.directory)
