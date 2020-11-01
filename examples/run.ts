import * as FS from 'fs'
import * as Path from 'path'

const example = process.argv[2]
if (example == null) {
  console.error('Usage: yarn example <name>')
  console.error()
  console.error('Available examples:')
  for (const dir of FS.readdirSync(__dirname)) {
    if (FS.statSync(Path.join(__dirname, dir)).isDirectory()) {
      console.error(` - ${dir}`)
    }
  }
  process.exit(0)
}

try {
  require(Path.resolve(__dirname, example))
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    console.error(`Example '${example}' does not exist`)
    process.exit(404)
  }
  throw err
}
