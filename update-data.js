const { copyFileSync } = require('fs')
const { join } = require('path')

const source = join(__dirname, 'results_quick.json')
const destination = join(__dirname, 'next-app', 'public', 'results_quick.json')

try {
  copyFileSync(source, destination)
  console.log('✅ Copied results_quick.json → next-app/public/')
} catch (error) {
  console.error('❌ Error copying file:', error.message)
  process.exit(1)
}
