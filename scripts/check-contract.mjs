import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const document = readFileSync('docs/contracts/openapi.v1.json')
const expectedHash = readFileSync('docs/contracts/openapi.v1.sha256', 'utf8').trim()
const actualHash = createHash('sha256').update(document).digest('hex')
if (actualHash !== expectedHash) {
  throw new Error('Pinned API contract checksum does not match the snapshot')
}
const contract = JSON.parse(document.toString('utf8'))
if (contract.info.version !== '0.3.0-draft') {
  throw new Error('Unexpected API contract version')
}
console.log(`API contract ${contract.info.version}: checksum verified`)
