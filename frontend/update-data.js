import { copyFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const source = join(__dirname, '..', 'results_quick.json')
const destination = join(__dirname, 'public', 'results_quick.json')

try {
  copyFileSync(source, destination)
  console.log('✅ Successfully copied results_quick.json to public directory')
} catch (error) {
  console.error('❌ Error copying file:', error.message)
  process.exit(1)
}
