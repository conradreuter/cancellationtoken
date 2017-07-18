const example: string = process.argv[2]
if (!example) {
  console.error('Usage: npm run example <name>')
  process.exit(1)
}

try {
  require('./' + example)
} catch (err) {
  if (err.message !== `Cannot find module './${example}'`) throw err
  console.error(`Example '${example}' does not exist`)
}
