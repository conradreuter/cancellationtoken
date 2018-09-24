import * as fs from 'fs'
import * as path from 'path'

const example: string = process.argv[2]
if (!example) {
  console.error('Usage: npm run example <name>')
  console.error()
  console.error('Available examples:')
  for (const dir of fs.readdirSync(__dirname)) {
    if (fs.statSync(path.join(__dirname, dir)).isDirectory()) {
      console.error(` - ${dir}`)
    }
  }
  process.exit(0)
}

try {
  require('./' + example)
} catch (err) {
  if (err.message !== `Cannot find module './${example}'`) throw err
  console.error(`Example '${example}' does not exist`)
}
